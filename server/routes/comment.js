import express from "express";
import {
  deletecomment,
  editcomment,
  getallcomment,
  postcomment,
  reactToComment,
  translateComment,
} from "../controllers/comment.js";


const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.post("/react/:id", reactToComment);
routes.post("/translate/:id", translateComment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
export default routes;
