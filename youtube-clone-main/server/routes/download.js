import express from "express";

import {
  getUserDownloads,
  getDownloadStatus,
  requestDownload,
} from "../controllers/download.js";
import { requireAuth } from "../middleware/auth.js";

const routes = express.Router();

routes.get("/user/:userId", requireAuth, getUserDownloads);
routes.get("/video/:videoId/status", requireAuth, getDownloadStatus);
routes.post("/video/:videoId", requireAuth, requestDownload);

export default routes;
