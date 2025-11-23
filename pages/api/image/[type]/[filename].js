import * as fs from "fs";
import * as path from "path";

export default async function handler(req, res) {
  const { type, filename } = req.query;

  if (!['crowd', 'facility'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    const imagePath = path.join(process.cwd(), "images", type, filename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const stat = fs.statSync(imagePath);
    const ext = path.extname(filename).toLowerCase();

    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const stream = fs.createReadStream(imagePath);
    stream.pipe(res);

  } catch (error) {
    console.error("Error serving image:", error);
    return res.status(500).json({ error: error.message });
  }
}
