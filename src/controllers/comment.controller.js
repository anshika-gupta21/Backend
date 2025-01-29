import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Comment } from "../models/comment.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video Id");
  const comments = await Comment.find({ video: videoId });
  if (comments.length === 0)
    throw new ApiError(404, "No comments found for this video!");
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully!"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;
  const { content } = req.body;

  if (!content) throw new ApiError(400, "Content is required!");

  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Video does not exist!");

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully!"));
});

const editComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) throw new ApiError(400, "Content is required!");

  const { commentId } = req.params;

  if (!commentId || !isValidObjectId(commentId))
    throw new ApiError(400, "Invalid comment Id!");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(400, "Comment does not exist!");
  if (req.user._id.toString() !== comment.owner.toString())
    throw new ApiError(402, "You cannot change this comment!");

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "Comment updated successfully!")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId || !isValidObjectId(commentId))
    throw new ApiError(400, "Comment Id invalid!");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(400, "Comment does not exist!");
  if (comment.owner.toString() !== req.user?._id.toString())
    throw new ApiError(402, "You cannot delete this comment!");
  const isDeleted = await Comment.findByIdAndDelete(commentId);
  if (!isDeleted)
    throw new ApiError(500, "Something went wrong while deleting the comment!");
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted succesfully!"));
});

export { addComment, editComment, deleteComment, getVideoComments };
