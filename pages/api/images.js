import * as fs from "fs";
import * as path from "path";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const crowdDir = path.join(process.cwd(), "images", "crowd");
    const facilityDir = path.join(process.cwd(), "images", "facility");

    const crowdFiles = fs.existsSync(crowdDir)
      ? fs.readdirSync(crowdDir).filter(file =>
          /\.(jpg|jpeg|png|avif|webp)$/i.test(file) && file !== '.gitkeep'
        )
      : [];

    const facilityFiles = fs.existsSync(facilityDir)
      ? fs.readdirSync(facilityDir).filter(file =>
          /\.(jpg|jpeg|png|avif|webp)$/i.test(file) && file !== '.gitkeep'
        )
      : [];

    return res.status(200).json({
      crowd: crowdFiles,
      facility: facilityFiles,
    });

  } catch (error) {
    console.error("Error listing images:", error);
    return res.status(500).json({ error: error.message });
  }
}
