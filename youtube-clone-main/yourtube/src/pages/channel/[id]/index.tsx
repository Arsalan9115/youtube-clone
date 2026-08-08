import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;

    const savedVideos = JSON.parse(localStorage.getItem("yourtube-videos") || "[]");
    setVideos(savedVideos.filter((video: any) => video.uploader === id));
  }, [id]);

  const addUploadedVideo = (video: any) => {
    if (!video || typeof window === "undefined") return;

    setVideos((currentVideos) => [video, ...currentVideos]);
    const savedVideos = JSON.parse(localStorage.getItem("yourtube-videos") || "[]");
    localStorage.setItem("yourtube-videos", JSON.stringify([video, ...savedVideos]));
  };
  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  try {
    let channel = user;
   
    return (
      <div className="flex-1 min-h-screen bg-background text-foreground">
        <div className="max-w-full mx-auto">
          <ChannelHeader channel={channel} user={user} />
          <Channeltabs />
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={id}
              channelName={channel?.channelname}
              onUploadSuccess={addUploadedVideo}
            />
          </div>
          <div className="px-4 pb-8">
            <ChannelVideos videos={videos} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching channel data:", error);
   
  }
};

export default index;
