import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";

const getChannelStats = asyncHandler(async (req, res) => {
  try {
    const videoStats = await Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(req.user?._id),
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $project: {
          totalLikes: {
            $size: "$likes",
          },
          totalViews: { $ifNull: ["$views", 0] },
        },
      },
      {
        $group: {
          _id: null,
          totalLikesCount: { $sum: "$totalLikes" },
          totalViewsCount: { $sum: "$totalViews" },
          totalVideos: {
            $sum: 1,
          },
        },
      },
    ]);
    const subscriberStats = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(req.user?._id),
        },
      },
      {
        $group: {
          _id: null,
          subscriberCount: { $sum: 1 },
        },
      },
    ]);
    if (!videoStats.length && !subscriberStats.length)
      throw new ApiError(404, "Unable to fetch channel data.");

    const stats = {
      subscriberCount: subscriberStats[0]?.subscriberCount || 0,
      totalLikes: videoStats[0]?.totalLikesCount || 0,
      totalViews: videoStats[0]?.totalViewsCount || 0,
      totalVideos: videoStats[0]?.totalVideos || 0,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Channel data fetched successfullly!"));
  } catch (error) {
    throw new ApiError(500, "Error while fetching channel stats.");
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
      },
    },
    {
      $project: {
        VideoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        views: 1,
        duration: 1,
        createdAt: 1,
        likesCount: 1,
        owner: 1,
        isPublished: 1,
      },
    },
  ]);
  if (!videos || videos.length === 0)
    throw new ApiError(404, "No video found.");

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully!"));
});

export { getChannelStats, getChannelVideos };
