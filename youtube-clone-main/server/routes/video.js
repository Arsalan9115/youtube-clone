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

// The client posts the video under the `video` form-data field.
routes.post("/upload", upload.single("video"), uploadvideo);
routes.get("/getall", getallvideo);

export default routes;
