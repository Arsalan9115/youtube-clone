import express from "express";

import {
  getUserDownloads,
  requestDownload,
} from "../controllers/download.js";

const routes = express.Router();

routes.get("/user/:userId", getUserDownloads);
routes.post("/video/:videoId", requestDownload);

export default routes;
