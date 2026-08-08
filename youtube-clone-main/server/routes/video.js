import express from "express";
import { uploadvideo, getallvideo } from "../controllers/video.js";
import upload from "../middleware/multer.js";

const routes = express.Router();

// Keep the legacy paths, but expose the names used by the frontend too.
routes.post(["/upload", "/uploadvideo"], upload.single("video"), uploadvideo);
routes.get(["/getall", "/getallvideo"], getallvideo);

export default routes;
