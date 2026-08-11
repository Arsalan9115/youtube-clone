import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getallvideo, uploadvideo } from "../controllers/video.js";

// Ensure 'uploads' directory exists on Render
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB video file limit
});

const routes = express.Router();

// The client posts the video under the `video` form-data field. Handle Multer
// errors here so a bad multipart request never becomes an unexplained 500.
routes.post("/upload", (req, res, next) => {
  console.log("Video upload request received");

  upload.single("video")(req, res, (error) => {
    if (error) {
      console.error("Video upload middleware error:", error.message);
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Video must be 100MB or smaller."
            : `Unable to process video upload: ${error.message}`,
      });
    }

    return uploadvideo(req, res, next);
  });
});
routes.get("/getall", getallvideo);

export default routes;
