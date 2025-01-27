import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Comment } from "../models/comment.models.js";
import { Like } from "../models/like.models.js";
import { Tweet } from "../models/tweet.models.js";
import { Description } from "@headlessui/react";

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId || !isValidObjectId(commentId))
    throw new ApiError(400, "Invalid Comment Id");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found!");

  const isLiked = await Like.findOne({
    likedBy: req.user?._id,
    comment: commentId,
  });

  if (!isLiked) {
    try {
      await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
      });

      return res.status(200).json(new ApiResponse(200, "Liked", "Like added!"));
    } catch (error) {
      throw new ApiError(500, "Something went wrong while liking the comment!");
    }
  } else {
    try {
      await Like.findByIdAndDelete(isLiked._id);
      return res.status(200).json(new ApiResponse(200, {}, "Like removed!"));
    } catch (error) {
      throw new ApiError(
        500,
        "Something went wrong while unliking the comment!"
      );
    }
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId || !isValidObjectId(tweetId))
    throw new ApiError(400, "Invalid Tweet Id");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "Tweet not found!");

  const isLiked = await Like.findOne({
    likedBy: req.user?._id,
    tweet: tweetId,
  });
  if (!isLiked) {
    try {
      await Like.create({
        likedBy: req.user?._id,
        tweet: tweetId,
      });
      return res.status(200).json(new ApiResponse(200, "Liked", "Like added!"));
    } catch (error) {
      throw new ApiError(500, "Something went wrong while liking the tweet!");
    }
  } else {
    try {
      await Like.findByIdAndDelete(isLiked._id);
      return res.status(200).json(new ApiResponse(200, {}, "Like removed!"));
    } catch (error) {
      throw new ApiError(500, "Something went wrong while unliking the tweet!");
    }
  }
});

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid Video Id");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found!");

  const isLiked = await Like.findOne({
    likedBy: req.user?._id,
    video: videoId,
  });
  if (!isLiked) {
    try {
      await Like.create({
        likedBy: req.user?._id,
        video: videoId,
      });
      return res.status(200).json(new ApiResponse(200, "Liked", "Like added!"));
    } catch (error) {
      throw new ApiError(500, "Something went wrong while liking the video!");
    }
  } else {
    try {
      await Like.findByIdAndDelete(isLiked._id);
      return res.status(200).json(new ApiResponse(200, {}, "Like removed!"));
    } catch (error) {
      throw new ApiError(500, "Something went wrong while unliking the video!");
    }
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$owner",
          },
          {
            $project: {
              thumbnail: 1,
              title: 1,
              description: 1,
              duration: 1,
              videoFile: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
  ]);
    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched!"));
});

export { toggleCommentLike, toggleVideoLike, toggleTweetLike, getLikedVideos };
