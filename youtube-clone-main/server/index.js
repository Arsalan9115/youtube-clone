import 'dotenv/config'
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import { regionMiddleware } from "./middleware/region.js";
import webhookroutes from "./routes/webhook.js";

const app = express();

// ✅ Fixed CORS for All Vercel Domains + Local
const allowedOrigins = [
  "https://youtube-clone-a12w.vercel.app",
  "https://youtube-clone-a12w-a63tlsujs-arsalan9115s-projects.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
]

app.use(cors({
  origin: function (origin, callback) {
    // mobile app ya postman ke liye origin nahi hota
    if(!origin) return callback(null, true);
    if(allowedOrigins.includes(origin)) {
      return callback(null, true)
    } else {
      return callback(new Error('Not allowed by CORS: ' + origin))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Theme'],
  exposedHeaders: ['X-App-Theme'],
  credentials: true
}));

app.use("/webhook", express.raw({type: "application/json"}));
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.use(regionMiddleware);

app.get("/", (req, res) => {
  res.send("YouTube backend is working");
});

app.get("/user/region", (req, res) => res.json({
  city: req.location?.city || "",
  state: req.location?.region || "",
  theme: req.theme || "dark",
}));

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/downloads", downloadroutes);
app.use("/payments", paymentroutes);
app.use("/webhook", webhookroutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || process.env.DB_URL)
  .then(() => {
    console.log("Mongodb connected");
    app.listen(PORT, () => {
      console.log(`server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("DB Error:", err.message);
  });