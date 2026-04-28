import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import { translateText } from "../services/translate.js";

const commentBodyPattern = /^[\p{L}\p{N}\s]+$/u;

const buildReactionPayload = (commentDoc, userId) => ({
  comment: commentDoc,
  dislikes: commentDoc.dislikes,
  dislikesReachedLimit: commentDoc.dislikes >= 2,
  liked: commentDoc.likedBy.some((id) => String(id) === String(userId)),
  removed: false,
});

export const postcomment = async (req, res) => {
  const { commentbody, userid } = req.body;

  if (!commentBodyPattern.test((commentbody || "").trim())) {
    return res.status(400).json({
      message:
        "Comments with special characters are not allowed. Use letters, numbers, and spaces only.",
    });
  }

  try {
    const user = await users.findById(userid);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const postcomment = new comment({
      ...req.body,
      likes: 0,
      dislikedBy: [],
      dislikes: 0,
      likedBy: [],
      usercity: user.city || "Unknown city",
      usercommented: user.name,
    });

    await postcomment.save();
    return res.status(200).json({ comment: true, commentData: postcomment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment
      .find({ videoid: videoid })
      .sort({ createdAt: -1 });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  if (!commentBodyPattern.test((commentbody || "").trim())) {
    return res.status(400).json({
      message:
        "Comments with special characters are not allowed. Use letters, numbers, and spaces only.",
    });
  }

  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      {
        $set: { commentbody: commentbody },
      },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reactToComment = async (req, res) => {
  const { id } = req.params;
  const { reactionType, userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid comment or user id." });
  }

  if (!["like", "dislike"].includes(reactionType)) {
    return res.status(400).json({ message: "Invalid reaction type." });
  }

  try {
    const commentDoc = await comment.findById(id);

    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (String(commentDoc.userid) === String(userId)) {
      return res.status(400).json({
        message: "You cannot react to your own comment.",
      });
    }

    const likedBy = commentDoc.likedBy.map((entry) => String(entry));
    const dislikedBy = commentDoc.dislikedBy.map((entry) => String(entry));

    if (reactionType === "like") {
      commentDoc.dislikedBy = commentDoc.dislikedBy.filter(
        (entry) => String(entry) !== String(userId)
      );

      if (likedBy.includes(String(userId))) {
        commentDoc.likedBy = commentDoc.likedBy.filter(
          (entry) => String(entry) !== String(userId)
        );
      } else {
        commentDoc.likedBy.push(userId);
      }
    }

    if (reactionType === "dislike") {
      commentDoc.likedBy = commentDoc.likedBy.filter(
        (entry) => String(entry) !== String(userId)
      );

      if (dislikedBy.includes(String(userId))) {
        commentDoc.dislikedBy = commentDoc.dislikedBy.filter(
          (entry) => String(entry) !== String(userId)
        );
      } else {
        commentDoc.dislikedBy.push(userId);
      }
    }

    commentDoc.likes = commentDoc.likedBy.length;
    commentDoc.dislikes = commentDoc.dislikedBy.length;

    if (commentDoc.dislikes >= 2) {
      await comment.findByIdAndDelete(id);
      return res.status(200).json({
        dislikes: commentDoc.dislikes,
        message: "Comment removed after reaching 2 dislikes.",
        removed: true,
      });
    }

    await commentDoc.save();

    return res.status(200).json(buildReactionPayload(commentDoc, userId));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translateComment = async (req, res) => {
  const { id } = req.params;
  const { targetLanguage } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid comment id." });
  }

  if (!targetLanguage) {
    return res.status(400).json({ message: "Target language is required." });
  }

  try {
    const commentDoc = await comment.findById(id);

    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const translation = await translateText({
      targetLanguage,
      text: commentDoc.commentbody,
    });

    return res.status(200).json({
      message: translation.message,
      translatedText: translation.translatedText,
      translationAvailable: translation.delivered,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Translation failed." });
  }
};
