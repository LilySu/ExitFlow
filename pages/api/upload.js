import * as fs from "fs";
import * as path from "path";
import { IncomingForm } from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    uploadDir: path.join(process.cwd(), "images", "temp"),
    keepExtensions: true,
  });

  try {
    const uploadDir = path.join(process.cwd(), "images", "temp");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file[0];
    const type = fields.type[0];

    if (!['crowd', 'facility'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "crowd" or "facility"' });
    }

    const targetDir = path.join(process.cwd(), "images", type);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.originalFilename}`;
    const targetPath = path.join(targetDir, fileName);

    fs.renameSync(file.filepath, targetPath);

    return res.status(200).json({
      success: true,
      fileName,
      type,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}
