"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { toast } from "sonner";

import { useUser } from "@/lib/AuthContext";
import { PLAN_CONFIG, type PlanCode } from "@/lib/plans";
import { Button } from "./ui/button";

type GestureZone = "left" | "center" | "right";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onNextVideo?: () => void;
  onOpenComments?: () => void;
}

export default function VideoPlayer({
  video,
  onNextVideo,
  onOpenComments,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  const [isLocked, setIsLocked] = useState(false);
  const [gestureMessage, setGestureMessage] = useState("");
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapStateRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({
    count: 0,
    timer: null,
  });

  const currentPlan = ((user?.currentPlan as PlanCode) || "free") as PlanCode;
  const activePlan = useMemo(
    () => PLAN_CONFIG[currentPlan] || PLAN_CONFIG.free,
    [currentPlan]
  );

  useEffect(() => {
    setIsLocked(false);
  }, [video._id]);

  useEffect(() => {
    return () => {
      if (tapStateRef.current.timer) {
        clearTimeout(tapStateRef.current.timer);
      }

      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  const showGestureMessage = (message: string) => {
    setGestureMessage(message);

    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }

    gestureTimeoutRef.current = setTimeout(() => {
      setGestureMessage("");
    }, 1400);
  };

  const handleTimeUpdate = () => {
    const videoElement = videoRef.current;
    if (!videoElement || !activePlan.watchLimitLabel) {
      return;
    }

    const watchLimitSeconds = user?.watchLimitSeconds ?? (currentPlan === "gold" ? null : currentPlan === "silver" ? 600 : currentPlan === "bronze" ? 420 : 300);

    if (watchLimitSeconds && videoElement.currentTime >= watchLimitSeconds) {
      videoElement.pause();
      videoElement.currentTime = watchLimitSeconds;
      setIsLocked(true);
    }
  };

  const togglePlayback = () => {
    const videoElement = videoRef.current;
    if (!videoElement || isLocked) {
      return;
    }

    if (videoElement.paused) {
      void videoElement.play();
      showGestureMessage("Playing");
    } else {
      videoElement.pause();
      showGestureMessage("Paused");
    }
  };

  const seekVideo = (seconds: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const nextTime = Math.max(
      0,
      Math.min(videoElement.currentTime + seconds, videoElement.duration || Infinity)
    );
    videoElement.currentTime = nextTime;
    showGestureMessage(seconds > 0 ? "Forward 10s" : "Back 10s");
  };

  const attemptCloseWebsite = () => {
    showGestureMessage("Attempting to close");

    window.open("", "_self");
    window.close();

    window.setTimeout(() => {
      if (!window.closed) {
        window.location.replace("about:blank");
        toast.info(
          "Your browser blocked automatic close, so the app navigated away instead."
        );
      }
    }, 200);
  };

  const runGesture = (zone: GestureZone, tapCount: number) => {
    if (tapCount >= 3) {
      if (zone === "center") {
        onNextVideo?.();
        showGestureMessage("Next video");
        return;
      }

      if (zone === "left") {
        onOpenComments?.();
        showGestureMessage("Comments opened");
        return;
      }

      attemptCloseWebsite();
      return;
    }

    if (tapCount >= 2) {
      if (zone === "left") {
        seekVideo(-10);
        return;
      }

      if (zone === "right") {
        seekVideo(10);
      }

      return;
    }

    if (zone === "center") {
      togglePlayback();
    }
  };

  const handleZoneTap = (zone: GestureZone) => {
    const tapState = tapStateRef.current;
    tapState.count += 1;

    if (tapState.timer) {
      clearTimeout(tapState.timer);
    }

    tapState.timer = setTimeout(() => {
      runGesture(zone, tapState.count);
      tapState.count = 0;
      tapState.timer = null;
    }, 260);
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        onPlay={() => {
          if (isLocked) {
            videoRef.current?.pause();
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${String(video?.filepath || "").replace(/\\/g, "/")}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
        {activePlan.displayName} plan | {activePlan.watchLimitLabel}
      </div>

      {!isLocked ? (
        <div className="absolute inset-x-0 top-0 bottom-14 grid grid-cols-3">
          <button
            type="button"
            aria-label="Left gesture zone"
            className="h-full w-full"
            onClick={() => handleZoneTap("left")}
          />
          <button
            type="button"
            aria-label="Center gesture zone"
            className="h-full w-full"
            onClick={() => handleZoneTap("center")}
          />
          <button
            type="button"
            aria-label="Right gesture zone"
            className="h-full w-full"
            onClick={() => handleZoneTap("right")}
          />
        </div>
      ) : null}

      {gestureMessage ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-18 flex justify-center">
          <div className="rounded-full bg-black/75 px-4 py-2 text-sm font-medium text-white">
            {gestureMessage}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-18 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-xs text-white/90 md:block">
        Double tap left/right to seek, single tap center to play-pause, triple tap center for next
      </div>

      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/86 p-6 text-white">
          <div className="max-w-md rounded-[28px] border border-white/10 bg-white/10 p-6 text-center backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-200">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold">
              Watch limit reached
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Your {activePlan.displayName} plan allows {activePlan.watchLimitLabel.toLowerCase()} per video. Upgrade to Bronze, Silver, or Gold to continue watching longer.
            </p>
            <Button asChild className="mt-5 bg-red-600 hover:bg-red-700">
              <Link href="/downloads">
                <Crown className="h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
