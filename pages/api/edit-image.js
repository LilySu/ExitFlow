import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

fal.config({
  credentials: process.env.FAL_KEY
});

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { facilityImage, crowdImage, promptA, promptB, pedestrianFlow } = req.body;

    console.log('[edit-image] Starting image generation...');
    console.log('[edit-image] Facility:', facilityImage, 'Crowd:', crowdImage);
    console.log('[edit-image] Prompt A:', promptA);
    console.log('[edit-image] Prompt B:', promptB);
    console.log('[edit-image] Pedestrian Flow:', pedestrianFlow);

    const crowdDir = path.join(process.cwd(), "images", "crowd");
    const facilityDir = path.join(process.cwd(), "images", "facility");

    let crowdFileName = crowdImage;
    let facilityFileName = facilityImage;

    // Get facility image
    if (!facilityFileName) {
      const facilityFiles = fs.readdirSync(facilityDir).filter(file =>
        /\.(jpg|jpeg|png|avif|webp)$/i.test(file) && file !== '.gitkeep'
      );
      if (facilityFiles.length === 0) {
        return res.status(400).json({ error: "No image files found in facility folder" });
      }
      facilityFileName = facilityFiles[0];
    }

    // Get crowd image (optional)
    if (!crowdFileName) {
      const crowdFiles = fs.readdirSync(crowdDir).filter(file =>
        /\.(jpg|jpeg|png|avif|webp)$/i.test(file) && file !== '.gitkeep'
      );
      if (crowdFiles.length > 0) {
        crowdFileName = crowdFiles[0];
      }
    }

    console.log('[edit-image] Using facility:', facilityFileName);
    console.log('[edit-image] Using crowd:', crowdFileName || 'none');

    // Read and upload facility image
    const facilityImagePath = path.join(facilityDir, facilityFileName);
    const facilityBuffer = fs.readFileSync(facilityImagePath);
    const facilityMimeType = getMimeType(facilityFileName);
    const facilityBlob = new Blob([facilityBuffer], { type: facilityMimeType });

    console.log('[edit-image] Uploading facility image to fal.storage...');
    console.log('[edit-image] Facility size:', facilityBuffer.length, 'bytes');
    const facilityUrl = await fal.storage.upload(facilityBlob);
    console.log('[edit-image] Facility uploaded:', facilityUrl);

    const imageUrls = [facilityUrl];

    // Upload crowd image if available (skip if fails)
    if (crowdFileName) {
      try {
        const crowdImagePath = path.join(crowdDir, crowdFileName);
        const crowdBuffer = fs.readFileSync(crowdImagePath);
        const crowdMimeType = getMimeType(crowdFileName);
        const crowdBlob = new Blob([crowdBuffer], { type: crowdMimeType });

        console.log('[edit-image] Uploading crowd image to fal.storage...');
        console.log('[edit-image] Crowd image size:', crowdBuffer.length, 'bytes');
        console.log('[edit-image] Crowd MIME type:', crowdMimeType);

        const crowdUrl = await fal.storage.upload(crowdBlob);
        console.log('[edit-image] Crowd uploaded:', crowdUrl);

        imageUrls.unshift(crowdUrl); // Add crowd first
      } catch (crowdError) {
        console.error('[edit-image] Failed to upload crowd image, continuing without it:', crowdError.message);
        // Continue without crowd image
        crowdFileName = null;
      }
    }

    // Generate both Scenario A and B in parallel
    console.log('[edit-image] Calling fal API for both scenarios...');
    console.log('[edit-image] Image URLs:', imageUrls);

    // Use custom prompts or fall back to defaults
    const scenarioAPrompt = promptA || "Show the crowd of people calmly exiting the facility through the main exit, photorealistic with natural lighting and full color";
    const scenarioBPrompt = promptB || "Show the crowd of people quickly evacuating the facility through emergency exits, photorealistic with natural lighting and full color";
    const flow = pedestrianFlow || 25;

    const [resultA, resultB] = await Promise.all([
      fal.subscribe("fal-ai/alpha-image-232/edit-image", {
        input: {
          prompt: scenarioAPrompt,
          image_urls: imageUrls,
          pedestrian_flow: flow
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log('[edit-image] Scenario A update:', update.status);
        }
      }),
      fal.subscribe("fal-ai/alpha-image-232/edit-image", {
        input: {
          prompt: scenarioBPrompt,
          image_urls: imageUrls,
          pedestrian_flow: flow
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log('[edit-image] Scenario B update:', update.status);
        }
      })
    ]);

    console.log('[edit-image] Generation complete!');
    console.log('[edit-image] Scenario A:', resultA.data.images?.[0] ? 'Success' : 'Failed');
    console.log('[edit-image] Scenario B:', resultB.data.images?.[0] ? 'Success' : 'Failed');

    if (!resultA.data.images || resultA.data.images.length === 0) {
      throw new Error('No images generated for Scenario A');
    }
    if (!resultB.data.images || resultB.data.images.length === 0) {
      throw new Error('No images generated for Scenario B');
    }

    return res.status(200).json({
      success: true,
      scenarioA: resultA.data.images[0],
      scenarioB: resultB.data.images[0],
      crowdImage: crowdFileName,
      facilityImage: facilityFileName
    });

  } catch (error) {
    console.error("[edit-image] Error:", error);
    return res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  }
}
