import mongoose from "mongoose";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { execFile } from "node:child_process";

import downloads from "../models/download.js";
import users from "../models/Auth.js";
import videos from "../models/video.js";

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const normalizeFilePath = (filepath = "") => filepath.replace(/\\/g, "/");

const getStoredVideoDuration = (video) =>
  new Promise((resolve, reject) => {
    const source = /^https?:\/\//i.test(video.filepath)
      ? video.filepath
      : `.${normalizeFilePath(video.filepath)}`;
    execFile(ffmpegPath.path, ["-i", source], { windowsHide: true }, async (error, stdout, stderr) => {
      const match = `${stdout}\n${stderr}`.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
      if (!match) {
        reject(error || new Error("Could not read video duration."));
        return;
      }
      const seconds = Math.floor(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
      await videos.findByIdAndUpdate(video._id, { duration: seconds });
      resolve(seconds);
    });
  });

// Plan ke hisaab se duration limit seconds me
const PLAN_LIMITS = {
  free: 5 * 60, // 5 min
  bronze: 7 * 60, // 7 min
  silver: 10 * 60, // 10 min
  gold: Number.POSITIVE_INFINITY, // unlimited
};

export const requestDownload = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId;

  if (
   !mongoose.Types.ObjectId.isValid(videoId) ||
   !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid video or user id." });
  }

  try {
    const [user, video] = await Promise.all([
      users.findById(userId),
      videos.findById(videoId), // ab ye videofiles collection me dhundega
    ]);

    if (!user ||!video) {
      return res.status(404).json({ success: false, message: "User or video not found." });
    }

    // ===== PLAN + DURATION LIMIT CHECK =====
    const plan = String(user.currentPlan || "free").toLowerCase();
    let videoDuration = Number(video.duration) || 0;
    // Existing documents created before the upload fix may have duration 0.
    // Never treat those as unlimited: calculate it now or reject the download.
    if (videoDuration <= 0) {
      try {
        videoDuration = await getStoredVideoDuration(video);
      } catch (durationError) {
        console.error("Download duration error:", durationError.message);
        return res.status(422).json({
          success: false,
          message: "This video's duration is not available yet. Please try again shortly.",
        });
      }
    }
    const maxDuration = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // 1. Duration limit check - Pop up ke liye 200 hi bhej rahe
    if(videoDuration > maxDuration){
        let neededPlan = 'bronze';
        if(plan === 'bronze') neededPlan = 'silver';
        else if(plan === 'silver') neededPlan = 'gold';
        else if(plan === 'gold') neededPlan = 'gold'; // already max

        return res.status(200).json({ 
            success: false,
            needUpgrade: true, // Frontend pop up ke liye
            message: `Upgrade Required: Aapke ${plan} plan me max ${maxDuration/60} min allowed hai. Ye video ${Math.floor(videoDuration/60)} min ki hai.`,
            code: "UPGRADE_NEEDED",
            currentPlan: plan,
            videoDuration: Math.floor(videoDuration/60),
            maxAllowed: maxDuration / 60, // minutes me
            neededPlan: neededPlan,
            paymentRequired: true,
        })
    }

    // 2. Free user daily 1 download limit
    if (plan === 'free') {
      const todayDownloads = await downloads.countDocuments({
        downloadedAt: { $gte: startOfToday() },
        userId,
      });

      if (todayDownloads >= 1) {
        return res.status(200).json({
          success: false,
          needUpgrade: true, // Frontend pop up ke liye
          message: "Free users can download only one video per day.",
          code: "DAILY_LIMIT",
          requiresPremium: true,
          neededPlan: "bronze",
          paymentRequired: true,
        });
      }
    }

    const existingDownload = await downloads.findOne({ userId, videoId });
    if (existingDownload) {
      return res.status(200).json({
        success: true,
        alreadyDownloaded: true,
        download: existingDownload,
        message: "This video has already been downloaded.",
      });
    }

    // ===== DOWNLOAD ENTRY CREATE =====
    const downloadEntry = await downloads.create({
      userId,
      videoId,
      downloadedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      download: downloadEntry,
      downloadUrl: `${req.protocol}://${req.get("host")}/${normalizeFilePath(
        video.filepath
      )}`,
      currentPlan: plan,
      message: "Download is ready.",
    });
  } catch (error) {
    console.error("Download Error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

export const getDownloadStatus = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.userId;

  if (!mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid video or user id." });
  }

  try {
    const download = await downloads.findOne({ userId, videoId }).select("_id downloadedAt");
    return res.status(200).json({ downloaded: Boolean(download), download });
  } catch (error) {
    console.error("Download status error:", error);
    return res.status(500).json({ message: "Unable to load download status." });
  }
};

export const getUserDownloads = async (req, res) => {
  const userId = req.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id." });
  }

  try {
    const downloadList = await downloads
     .find({ userId })
     .populate("videoId")
     .sort({ downloadedAt: -1 });

    const todayDownloads = await downloads.countDocuments({
      downloadedAt: { $gte: startOfToday() },
      userId,
    });

    const user = await users.findById(userId);
    const plan = user?.currentPlan || "free";

    return res.status(200).json({
      success: true,
      downloads: downloadList,
      todayDownloads,
      canDownloadToday: plan!== 'free' || todayDownloads < 1,
      currentPlan: plan,
      isPremium: plan!== 'free',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};
