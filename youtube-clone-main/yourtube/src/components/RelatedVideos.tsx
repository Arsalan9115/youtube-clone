import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    filepath?: string;
    thumbnail?: string;
    videochanel?: string;
    views?: number;
    createdAt?: string;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  return (
    <div className="space-y-2">
      {videos.map((video) => {
        const source = video.filepath?.startsWith("http")
          ? video.filepath
          : `${
              /^[a-f\d]{24}$/i.test(video._id)
                ? process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ""
                : ""
            }${video.filepath || ""}`;
        const thumbnail = video.thumbnail?.startsWith("http")
          ? video.thumbnail
          : `${/^[a-f\d]{24}$/i.test(video._id) ? process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "" : ""}${video.thumbnail || ""}`;

        return (
          <Link key={video._id} href={`/watch/${video._id}`} className="flex gap-2 group">
            <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {video.thumbnail ? (
                <img src={thumbnail} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
              ) : (
                <video src={source} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
                {video.videotitle}
              </h3>
              <p className="text-xs text-gray-600 mt-1">{video.videochanel || "YourTube"}</p>
              <p className="text-xs text-gray-600">
                {(video.views || 0).toLocaleString()} views · {video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : "recently"} ago
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
