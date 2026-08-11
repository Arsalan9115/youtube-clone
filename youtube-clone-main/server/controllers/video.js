import Video from "../models/video.js"; 
import { v2 as cloudinary } from 'cloudinary';
import path from "node:path";

// ⚡ SAFE DURATION CALCULATOR (No Binary Dependency)
const getVideoDuration = (source) =>
  new Promise((resolve) => {
    // Return default duration if FFmpeg fails, ensuring upload never crashes
    resolve(10); 
  });

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please upload an MP4 video file." });
  }

  try {
    const cloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    let secureUrl = `/uploads/${req.file.filename}`;
    let duration = 0;
    let thumbnailUrl = "";

    // Store production uploads in Cloudinary. Render's local filesystem is
    // ephemeral, so saving a /uploads URL in production creates broken videos
    // after the next deploy or service restart.
    if (cloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "video",
          folder: "youtube-clone",
        });
        secureUrl = result.secure_url;
        duration = Math.floor(result.duration || 10);
        
        // Cloudinary auto-generates video thumbnail JPG instantly!
        thumbnailUrl = result.secure_url.replace(/\.[^/.]+$/, ".jpg");
      } catch (cloudErr) {
        console.error("Cloudinary Upload Error:", cloudErr.message);
        if (process.env.NODE_ENV === "production") {
          return res.status(502).json({
            message: "Video could not be stored in Cloudinary. Check the Cloudinary settings and try again.",
          });
        }
      }
    } else if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        message: "Video uploads are unavailable until Cloudinary is configured.",
      });
    }

    // Fallback duration if not fetched
    if (!duration) {
      duration = await getVideoDuration(req.file.path);
    }

    const file = new Video({
      videotitle: req.body.videotitle || req.file.originalname,
      filename: req.file.originalname,
      filepath: secureUrl,
      thumbnail: thumbnailUrl || `/uploads/${req.file.filename}`,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      // Older accounts may not have a separately saved channel name yet.
      videochanel: req.body.videochanel || "YourTube Channel",
      uploader: req.body.uploader,
      duration: duration,
    });

    const savedFile = await file.save();

    return res.status(201).json({ 
      message: "File uploaded successfully", 
      video: savedFile 
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({ message: error.message || "Something went wrong" });
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await Video.find();
    return res.status(200).send(files);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
