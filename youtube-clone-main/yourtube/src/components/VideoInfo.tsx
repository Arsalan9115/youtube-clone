import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useRouter } from "next/router";

const DOWNLOAD_LIMITS: Record<string, number> = {
  free: 5 * 60,
  bronze: 7 * 60,
  silver: 10 * 60,
  gold: Number.POSITIVE_INFINITY,
};

const getBrowserVideoDuration = (source: string) =>
  new Promise<number>((resolve, reject) => {
    const media = document.createElement("video");
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      const duration = media.duration;
      media.remove();
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("Video duration is unavailable."));
    };
    media.onerror = () => {
      media.remove();
      reject(new Error("Video duration is unavailable."));
    };
    media.src = source;
  });

// TypeScript Props Type Definition - Fixed by adding onDownload
type VideoInfoProps = {
  video: any;
  isLocalVideo?: boolean;
  onDownload?: () => void; // <-- 1. Type error fix
};

const VideoInfo = ({ video, isLocalVideo = false, onDownload }: VideoInfoProps) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    if (isLocalVideo && user?._id) {
      const reactions = JSON.parse(localStorage.getItem("yourtube-local-reactions") || "{}");
      const reaction = reactions[`${user._id}:${video._id}`];
      setIsLiked(reaction === "like");
      setIsDisliked(reaction === "dislike");
      return;
    }
    setIsLiked(false);
    setIsDisliked(false);
  }, [video, isLocalVideo, user?._id]);

  useEffect(() => {
    if (!user?._id) {
      setIsDownloaded(false);
      return;
    }

    if (isLocalVideo) {
      const localDownloads = JSON.parse(localStorage.getItem("yourtube-local-downloads") || "[]");
      setIsDownloaded(localDownloads.some((item: any) => item.userId === user._id && item.videoId?._id === video._id));
      return;
    }

    axiosInstance
      .get(`/downloads/video/${video._id}/status`)
      .then((response) => setIsDownloaded(Boolean(response.data?.downloaded)))
      .catch(() => setIsDownloaded(false));
  }, [isLocalVideo, user?._id, video._id]);

  const saveLocalVideo = (nextLikes: number, nextDislikes: number) => {
    const storedVideos = JSON.parse(localStorage.getItem("yourtube-videos") || "[]");
    localStorage.setItem(
      "yourtube-videos",
      JSON.stringify(
        storedVideos.map((item: any) =>
          item._id === video._id
            ? { ...item, Like: nextLikes, Dislike: nextDislikes }
            : item
        )
      )
    );
  };

  const handleLocalReaction = (reactionType: "like" | "dislike") => {
    if (!user?._id) {
      toast.error("Please sign in to react to videos.");
      return;
    }

    const reactions = JSON.parse(localStorage.getItem("yourtube-local-reactions") || "{}");
    const reactionKey = `${user._id}:${video._id}`;
    const previousReaction = reactions[reactionKey];
    const nextReaction = previousReaction === reactionType ? null : reactionType;
    const nextLikes = Math.max(0, likes + (previousReaction === "like" ? -1 : 0) + (nextReaction === "like" ? 1 : 0));
    const nextDislikes = Math.max(0, dislikes + (previousReaction === "dislike" ? -1 : 0) + (nextReaction === "dislike" ? 1 : 0));

    if (nextReaction) reactions[reactionKey] = nextReaction;
    else delete reactions[reactionKey];
    localStorage.setItem("yourtube-local-reactions", JSON.stringify(reactions));
    saveLocalVideo(nextLikes, nextDislikes);
    setlikes(nextLikes);
    setDislikes(nextDislikes);
    setIsLiked(nextReaction === "like");
    setIsDisliked(nextReaction === "dislike");
  };

  useEffect(() => {
    const handleviews = async () => {
      const isLocalUpload =
        typeof video?._id === "string" && !/^[a-f\d]{24}$/i.test(video._id);

      if (isLocalUpload) {
        return;
      }

      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user, video?._id]);

  const handleLike = async () => {
    if (isLocalVideo) {
      handleLocalReaction("like");
      return;
    }
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user?._id) {
      toast.error("Please sign in to save videos.");
      return;
    }

    if (isLocalVideo) {
      const storageKey = "yourtube-local-watch-later";
      const savedVideos = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const alreadySaved = savedVideos.some(
        (item: any) => item.userId === user._id && item.videoId === video._id
      );
      const nextVideos = alreadySaved
        ? savedVideos.filter((item: any) => !(item.userId === user._id && item.videoId === video._id))
        : [{ userId: user._id, videoId: video._id, savedAt: new Date().toISOString(), video }, ...savedVideos];
      localStorage.setItem(storageKey, JSON.stringify(nextVideos));
      setIsWatchLater(!alreadySaved);
      toast.success(alreadySaved ? "Removed from Watch later." : "Saved to Watch later.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async () => {
    if (isLocalVideo) {
      handleLocalReaction("dislike");
      return;
    }
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    // Agar external onDownload passed hai, toh pehle use call karo
    if (onDownload) {
      onDownload();
      return;
    }

    if (!user?._id) {
      toast.error("Please sign in to download videos.");
      return;
    }

    setIsDownloading(true);

    try {
      if (isLocalVideo) {
        const plan = String(user.currentPlan || (user.isPremium ? "gold" : "free")).toLowerCase();
        const maxDuration = DOWNLOAD_LIMITS[plan] ?? DOWNLOAD_LIMITS.free;
        const duration = await getBrowserVideoDuration(video.filepath);
        if (duration > maxDuration) {
          const requiredPlan = plan === "bronze" ? "Silver" : plan === "silver" ? "Gold" : "Bronze";
          toast.error(`Your ${plan[0].toUpperCase()}${plan.slice(1)} plan allows ${maxDuration / 60} minutes. Upgrade to ${requiredPlan} for this ${Math.ceil(duration / 60)} minute video.`);
          router.push("/downloads");
          return;
        }

        const localDownloads = JSON.parse(localStorage.getItem("yourtube-local-downloads") || "[]");
        const today = new Date().toDateString();
        const todaysDownloads = localDownloads.filter(
          (item: any) => item.userId === user._id && new Date(item.downloadedAt).toDateString() === today
        );

        if (!user.isPremium && todaysDownloads.length >= 1) {
          toast.error("Free users can download only one video per day. Upgrade to premium for unlimited downloads.");
          router.push("/downloads");
          return;
        }

        localStorage.setItem(
          "yourtube-local-downloads",
          JSON.stringify([
            { _id: `${user._id}:${video._id}`, downloadedAt: new Date().toISOString(), userId: user._id, videoId: video, isLocal: true },
            ...localDownloads.filter((item: any) => !(item.userId === user._id && item.videoId?._id === video._id)),
          ])
        );
        setIsDownloaded(true);
        const link = document.createElement("a");
        link.href = video.filepath;
        link.download = `${video.videotitle || "video"}.mp4`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Video download started.");
        return;
      }

      const response = await axiosInstance.post(`/downloads/video/${video._id}`, {
        userId: user._id,
      });

      if (!response.data?.success || !response.data?.downloadUrl) {
        if (response.data?.alreadyDownloaded) {
          setIsDownloaded(true);
          toast.info("This video is already downloaded.");
          return;
        }
        toast.error(response.data?.message || "Upgrade your plan to download this video.");
        if (response.data?.needUpgrade || response.data?.code === "UPGRADE_NEEDED") {
          const neededPlan = response.data?.neededPlan || "bronze";
          router.push(`/downloads?upgrade=${encodeURIComponent(neededPlan)}`);
        }
        return;
      }

      const link = document.createElement("a");
      link.href = response.data.downloadUrl;
      link.download = `${video.videotitle || "video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setIsDownloaded(true);
      toast.success("Video download started.");
    } catch (error: any) {
      if (error?.response?.data?.requiresPremium) {
        toast.error(error.response.data.message);
        router.push("/downloads");
        return;
      }

      toast.error(
        error?.response?.data?.message || "Unable to download this video."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full bg-slate-800 text-white">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full text-white hover:bg-slate-700 hover:text-white"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-slate-600" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full text-white hover:bg-slate-700 hover:text-white"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-slate-800 text-white hover:bg-slate-700 hover:text-white rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-slate-800 text-white hover:bg-slate-700 hover:text-white rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-slate-800 text-white hover:bg-slate-700 hover:text-white rounded-full"
            onClick={handleDownload}
            disabled={isDownloading || isDownloaded}
          >
            <Download className="w-5 h-5 mr-2" />
            {isDownloaded ? "Downloaded" : isDownloading ? "Downloading..." : "Download"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-slate-800 text-white hover:bg-slate-700 hover:text-white rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg bg-slate-800 p-4 text-white">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{(video.views || 0).toLocaleString()} views</span>
          {video.createdAt ? <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span> : null}
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;