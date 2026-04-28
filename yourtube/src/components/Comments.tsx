import React, { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Globe2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  usercity?: string;
  commentedon: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
}
const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Tamil", value: "ta" },
  { label: "Telugu", value: "te" },
  { label: "Kannada", value: "kn" },
  { label: "Malayalam", value: "ml" },
];
const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [translationLanguage, setTranslationLanguage] = useState("en");
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div>Loading history...</div>;
  }
  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
      });
      if (res.data.comment && res.data.commentData) {
        setComments([res.data.commentData, ...comments]);
      }
      setNewComment("");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Error adding comment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to edit comment.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleReaction = async (
    commentId: string,
    reactionType: "like" | "dislike"
  ) => {
    if (!user?._id) {
      toast.error("Please sign in to react to comments.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/comment/react/${commentId}`, {
        reactionType,
        userId: user._id,
      });

      if (res.data.removed) {
        setComments((prev) => prev.filter((item) => item._id !== commentId));
        toast.info(res.data.message);
        return;
      }

      setComments((prev) =>
        prev.map((item) =>
          item._id === commentId
            ? {
                ...item,
                dislikes: res.data.comment.dislikedBy.length,
                dislikedBy: res.data.comment.dislikedBy,
                likedBy: res.data.comment.likedBy,
                likes: res.data.comment.likedBy.length,
              }
            : item
        )
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to react.");
    }
  };

  const handleTranslate = async (commentId: string) => {
    setTranslatingId(commentId);

    try {
      const res = await axiosInstance.post(`/comment/translate/${commentId}`, {
        targetLanguage: translationLanguage,
      });
      setTranslatedMap((prev) => ({
        ...prev,
        [commentId]: res.data.translatedText,
      }));

      if (!res.data.translationAvailable && res.data.message) {
        toast.info(res.data.message);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to translate comment."
      );
    } finally {
      setTranslatingId(null);
    }
  };
  return (
    <div id="comments-section" className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              ref={inputRef}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>
                  <span className="text-xs text-gray-500">
                    {comment.usercity || "Unknown city"}
                  </span>
                  <span className="text-xs text-gray-600">
                    | {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{comment.commentbody}</p>
                    {translatedMap[comment._id] ? (
                      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {translatedMap[comment._id]}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full bg-gray-100"
                        onClick={() => handleReaction(comment._id, "like")}
                      >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        {comment.likes || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full bg-gray-100"
                        onClick={() => handleReaction(comment._id, "dislike")}
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        {comment.dislikes || 0}
                      </Button>
                      <select
                        className="h-9 rounded-full border border-slate-200 bg-white px-3 text-sm"
                        value={translationLanguage}
                        onChange={(event) =>
                          setTranslationLanguage(event.target.value)
                        }
                      >
                        {LANGUAGE_OPTIONS.map((language) => (
                          <option key={language.value} value={language.value}>
                            {language.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full bg-gray-100"
                        onClick={() => handleTranslate(comment._id)}
                        disabled={translatingId === comment._id}
                      >
                        <Globe2 className="mr-2 h-4 w-4" />
                        {translatingId === comment._id ? "Translating..." : "Translate"}
                      </Button>
                    </div>
                    {comment.userid === user?._id && (
                      <div className="flex gap-2 mt-2 text-sm text-gray-500">
                        <button onClick={() => handleEdit(comment)}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(comment._id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
