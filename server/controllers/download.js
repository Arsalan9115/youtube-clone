import mongoose from "mongoose";

import downloads from "../Modals/download.js";
import users from "../Modals/Auth.js";
import videos from "../Modals/video.js";

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const normalizeFilePath = (filepath = "") => filepath.replace(/\\/g, "/");

export const requestDownload = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(videoId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({ message: "Invalid video or user id." });
  }

  try {
    const [user, video] = await Promise.all([
      users.findById(userId),
      videos.findById(videoId),
    ]);

    if (!user || !video) {
      return res.status(404).json({ message: "User or video not found." });
    }

    if (!user.isPremium) {
      const todayDownloads = await downloads.countDocuments({
        downloadedAt: { $gte: startOfToday() },
        userId,
      });

      if (todayDownloads >= 1) {
        return res.status(403).json({
          message:
            "Free users can download only one video per day. Upgrade to premium for unlimited downloads.",
          requiresPremium: true,
        });
      }
    }

    const downloadEntry = await downloads.create({
      userId,
      videoId,
    });

    return res.status(201).json({
      download: downloadEntry,
      downloadUrl: `${req.protocol}://${req.get("host")}/${normalizeFilePath(
        video.filepath
      )}`,
      isPremium: user.isPremium,
      message: "Download is ready.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
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

    return res.status(200).json({
      downloads: downloadList,
      todayDownloads,
      canDownloadToday: user?.isPremium || todayDownloads < 1,
      currentPlan: user?.currentPlan || "free",
      isPremium: user?.isPremium || false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};
