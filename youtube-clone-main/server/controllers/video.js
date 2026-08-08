import Video from "../models/video.js"; 
import { v2 as cloudinary } from 'cloudinary';
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { execFile } from "node:child_process";
import path from "node:path";

const getVideoDuration = (source) =>
  new Promise((resolve, reject) => {
    // @ffmpeg-installer ships ffmpeg, not ffprobe. Ask ffmpeg itself for the
    // metadata so video uploads work on a fresh Windows install as well.
    execFile(ffmpegPath.path, ["-i", source], { windowsHide: true }, (error, stdout, stderr) => {
      const match = `${stdout}\n${stderr}`.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
      if (!match) {
        reject(error || new Error("Could not read video duration."));
        return;
      }
      const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      resolve(Math.floor(duration));
    });
  });

const createThumbnail = (source, filename) =>
  new Promise((resolve) => {
    const thumbnailFilename = `${path.parse(filename).name}.jpg`;
    const thumbnailPath = path.join(path.dirname(source), thumbnailFilename);
    execFile(
      ffmpegPath.path,
      ["-y", "-ss", "00:00:01", "-i", source, "-frames:v", "1", "-q:v", "2", thumbnailPath],
      { windowsHide: true },
      (error) => resolve(error ? null : `/uploads/${thumbnailFilename}`)
    );
  });

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res.status(404).json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      // Store the duration with the video document. Saving it later in the
      // background left a window where every video had duration 0 and could
      // bypass the plan download limit.
      let duration;
      try {
        duration = await getVideoDuration(req.file.path);
      } catch (durationError) {
        console.error("Video duration error:", durationError.message);
        return res.status(422).json({
          message: "Video duration could not be read. Please upload a valid video file.",
        });
      }

      const cloudinaryConfigured = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
      );
      const result = cloudinaryConfigured
        ? await cloudinary.uploader.upload(req.file.path, {
            resource_type: "video",
            folder: "youtube-clone",
          })
        : null;
      const thumbnail = await createThumbnail(req.file.path, req.file.filename);

      const file = new Video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        // Local development works without Cloudinary credentials. The server
        // already exposes this directory at /uploads.
        filepath: result?.secure_url || `/uploads/${req.file.filename}`,
        thumbnail,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
        duration,
      });

      const savedFile = await file.save();

      return res.status(201).json({ message: "file uploaded successfully", video: savedFile });
    } catch (error) {
      console.error("error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
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
