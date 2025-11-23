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
    const { facilityImage, crowdImage, prompt, pedestrianFlow, scenario } = req.body;

    console.log(`[generate-single] Generating Scenario ${scenario}...`);
    console.log('[generate-single] Facility:', facilityImage, 'Crowd:', crowdImage);
    console.log('[generate-single] Prompt:', prompt);
    console.log('[generate-single] Pedestrian Flow:', pedestrianFlow);

    const crowdDir = path.join(process.cwd(), "images", "crowd");
    const facilityDir = path.join(process.cwd(), "images", "facility");

    // Ensure directories exist
    if (!fs.existsSync(crowdDir)) {
      fs.mkdirSync(crowdDir, { recursive: true });
    }
    if (!fs.existsSync(facilityDir)) {
      fs.mkdirSync(facilityDir, { recursive: true });
    }

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

    console.log('[generate-single] Using facility:', facilityFileName);
    console.log('[generate-single] Using crowd:', crowdFileName || 'none');

    // Read and upload facility image
    const facilityImagePath = path.join(facilityDir, facilityFileName);
    const facilityBuffer = fs.readFileSync(facilityImagePath);
    const facilityMimeType = getMimeType(facilityFileName);
    const facilityBlob = new Blob([facilityBuffer], { type: facilityMimeType });

    console.log('[generate-single] Uploading facility image to fal.storage...');
    console.log('[generate-single] Facility size:', facilityBuffer.length, 'bytes');
    const facilityUrl = await fal.storage.upload(facilityBlob);
    console.log('[generate-single] Facility uploaded:', facilityUrl);

    const imageUrls = [facilityUrl];

    // Upload crowd image if available (skip if fails)
    if (crowdFileName) {
      try {
        const crowdImagePath = path.join(crowdDir, crowdFileName);
        const crowdBuffer = fs.readFileSync(crowdImagePath);
        const crowdMimeType = getMimeType(crowdFileName);
        const crowdBlob = new Blob([crowdBuffer], { type: crowdMimeType });

        console.log('[generate-single] Uploading crowd image to fal.storage...');
        console.log('[generate-single] Crowd image size:', crowdBuffer.length, 'bytes');
        console.log('[generate-single] Crowd MIME type:', crowdMimeType);

        const crowdUrl = await fal.storage.upload(crowdBlob);
        console.log('[generate-single] Crowd uploaded:', crowdUrl);

        imageUrls.unshift(crowdUrl); // Add crowd first
      } catch (crowdError) {
        console.error('[generate-single] Failed to upload crowd image, continuing without it:', crowdError.message);
        // Continue without crowd image
        crowdFileName = null;
      }
    }

    // Generate the scenario
    console.log(`[generate-single] Calling fal API for Scenario ${scenario}...`);
    console.log('[generate-single] Image URLs:', imageUrls);

    const flow = pedestrianFlow || 25;

    const result = await fal.subscribe("fal-ai/alpha-image-232/edit-image", {
      input: {
        prompt: prompt,
        image_urls: imageUrls,
        pedestrian_flow: flow
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[generate-single] Scenario ${scenario} update:`, update.status);
      }
    });

    console.log('[generate-single] Generation complete!');
    console.log(`[generate-single] Scenario ${scenario}:`, result.data.images?.[0] ? 'Success' : 'Failed');

    if (!result.data.images || result.data.images.length === 0) {
      throw new Error(`No images generated for Scenario ${scenario}`);
    }

    return res.status(200).json({
      success: true,
      image: result.data.images[0],
      scenario: scenario
    });

  } catch (error) {
    console.error("[generate-single] Error:", error);
    return res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  }
}
