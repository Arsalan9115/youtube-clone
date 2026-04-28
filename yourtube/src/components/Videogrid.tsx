import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const Videogrid = () => {
  const [videos, setVideos] = useState<any[]>([]); // [] empty array se start kar
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        // Backend se data.videos aa raha hoga ya direct array
        setVideos(res.data?.videos || res.data || []); 
      } catch (error) {
        console.log("Error fetching videos:", error);
        setVideos([]); // Error pe bhi empty array set kar de
      } finally {
        setLoading(false);
      }
    };
    fetchvideo();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <div className="col-span-full text-center">Loading...</div>
      ) : videos.length > 0 ? (
        videos.map((video: any) => <Videocard key={video._id} video={video} />)
      ) : (
        <div className="col-span-full text-center text-gray-500">
          <p>No videos uploaded yet</p>
          <p className="text-sm mt-2">Upload your first video!</p>
        </div>
      )}
    </div>
  );
};

export default Videogrid;