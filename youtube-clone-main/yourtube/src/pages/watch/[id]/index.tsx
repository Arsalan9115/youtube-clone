import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import axios from "axios"; // <-- 1. YE ADD KAR

import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import VideoPlayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";

type Video = {
  _id: string;
  videotitle: string;
  filepath: string;
  duration?: number; // <-- 2. YE ADD KAR
  videochanel?: string;
  views?: number;
  Like?: number;
  Dislike?: number;
  createdAt?: string;
  isLocal?: boolean;
};

const isLocalVideo = (video: Video) =>
  Boolean(video.isLocal) ||!/^[a-f\d]{24}$/i.test(String(video._id));

export default function WatchPage() {
  const router = useRouter();
  const { id } = router.query;
  const [video, setVideo] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const commentsRef = useRef<HTMLDivElement>(null);

  // 3. YE NAYA FUNCTION ADD KAR
  const handleDownload = async () => {
    if (!video) return;
    
    try {
      const token = localStorage.getItem("token")
      
      const res = await axios.get(`http://localhost:5001/download/${video._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if(res.data.success){
        window.location.href = res.data.downloadUrl 
      }
      
    } catch(err: any){
      if(err.response?.data?.needUpgrade){
        alert(err.response.data.message) // "Upgrade Required:..."
      } else {
        alert("Download failed")
      }
    }
  }

  useEffect(() => {
    if (typeof id!== "string") return;

    let active = true;
    const loadVideo = async () => {
      setLoading(true);
      const localVideos: Video[] = JSON.parse(
        localStorage.getItem("yourtube-videos") || "[]"
      ).map((item: Video) => ({...item, isLocal: true }));

      try {
        const response = await axiosInstance.get("/video/getall");
        const remoteVideos: Video[] = response.data?.videos || response.data || [];
        const remoteIds = new Set(remoteVideos.map((item) => item._id));
        const allVideos = [
         ...localVideos.filter((item) =>!remoteIds.has(item._id)),
         ...remoteVideos,
        ];

        if (active) {
          setVideos(allVideos);
          setVideo(allVideos.find((item) => String(item._id) === id) || null);
        }
      } catch {
        if (active) {
          setVideos(localVideos);
          setVideo(localVideos.find((item) => String(item._id) === id) || null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadVideo();
    return () => {
      active = false;
    };
  }, [id]);

  const openNextVideo = () => {
    if (!video || videos.length < 2) return;
    const index = videos.findIndex((item) => item._id === video._id);
    const nextVideo = videos[(index + 1) % videos.length];
    if (nextVideo) void router.push(`/watch/${nextVideo._id}`);
  };

  const openComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading || typeof id!== "string") {
    return <main className="flex-1 p-4 md:p-6">Loading video...</main>;
  }

  if (!video) {
    return <main className="flex-1 p-4 md:p-6">Video not found.</main>;
  }

  const relatedVideos = videos.filter((item) => item._id!== video._id);
  const localVideo = isLocalVideo(video);

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto grid max-w-[1600px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-5">
          <VideoPlayer
            video={video}
            onNextVideo={openNextVideo}
            onOpenComments={openComments}
          />
          {/* 4. YAHAN onDownload PROP ADD KAR */}
          <VideoInfo 
            video={video} 
            isLocalVideo={localVideo} 
            
          />
          <div ref={commentsRef} id="comments-section">
            <Comments videoId={video._id} />
          </div>
        </section>
        <aside className="min-w-0">
          <h2 className="mb-4 text-lg font-semibold">Related videos</h2>
          <RelatedVideos videos={relatedVideos} />
        </aside>
      </div>
    </main>
  );
}