import video from "../Modals/video.js";
import { v2 as cloudinary } from 'cloudinary';

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      // Cloudinary pe video upload kar
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "youtube-clone"
      });

      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: result.secure_url, // Cloudinary URL save hoga
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      
      await file.save();
      return res.status(201).json({ message: "file uploaded successfully", file });
    } catch (error) {
      console.error("error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
