import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Like } from "../models/like.models.js";
import { User } from "../models/user.models.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { _isDomSupported } from "chart.js/helpers";

const addVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === ""))
    throw new ApiError(400, "Title and description are required.");

  console.log(req.files);
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  const videoLocalPath = req.files?.videoFile[0]?.path;
  if (!thumbnailLocalPath || !videoLocalPath)
    throw new ApiError(400, "Thumbnail or Video File is missing!");

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  const videoFile = await uploadOnCloudinary(videoLocalPath);
  if (!thumbnail)
    throw new ApiError(400, "Something went wrong while uploading thumbnail!");
  if (!videoFile)
    throw new ApiError(500, "Something went wrong while uploading video!");

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    owner: req.user?._id,
    duration: videoFile.duration,
  });
  if (!video) throw new ApiError(500, "Error while uploading the video!");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video added successfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid Video id.");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found!");

  if (video.owner.toString() !== req.user?._id.toString())
    throw new ApiError(400, "You do not have permission to delete this video!");
  try {
    await deleteFromCloudinary(video.videoFile);
    await deleteFromCloudinary(video.thumbnail);

    const isDeleted = await Video.findByIdAndDelete(videoId);
    if (!isDeleted)
      throw new ApiError(500, "Some error occurred while deleting the video.");

    await Like.deleteMany({ video: videoId });
    await Comment.deleteMany({ video: videoId });
    await User.updateMany(
      {
        watchHistory: videoId,
      },
      {
        $pull: {
          watchHistory: videoId,
        },
      }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video deleted successfully!"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong...");
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid Video id.");
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found.");

  const toggleStatus = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  );
  if (!toggleStatus)
    throw new ApiError(
      500,
      "Some error occured while toggling publish status."
    );

  return res
    .status(200)
    .json(new ApiResponse(200, toggleStatus, "Status updated successfully!"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid Video id.");
  const { title, description } = req.body;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  if (!title && !description && !thumbnailLocalPath)
    throw new ApiError(400, "No field provided!");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "No video found.");

  let updatedFields = {};

  if (title) {
    updatedFields.title = title;
  }

  if (description) {
    updatedFields.description = description;
  }
  if (thumbnailLocalPath) {
    const currentThumbnail = video?.thumbnail;
    if (currentThumbnail) await deleteFromCloudinary(currentThumbnail);

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail.url)
      throw new ApiError(500, "Error while uploading thumbnail.");

    updatedFields.thumbnail = thumbnail.url;
  }
  const isUpdated = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updatedFields,
    },
    { new: true }
  );

  if (!isUpdated) throw new ApiError(500, "Error while updating details!");

  return res
    .status(200)
    .json(new ApiResponse(200, isUpdated, "Details updated successfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId))
    throw new ApiError(400, "Invalid video id.");
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
        pipeline: [
          {
            $project: {
              content: 1,
              owner: 1,
            },
          },
        ],
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
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        isLiked: {
          $in: [req.user?._id, "$likes.likedBy"],
        },
        subscriptionsCount: {
          $size: "$subscribers",
        },
        isSubscribed: {
          $in: [req.user?._id, "$subscribers.subscriber"],
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        likesCount: 1,
        duration: 1,
        thumbnail: 1,
        subscriptionsCount: 1,
        isSubscribed: 1,
        isLiked: 1,
        views: 1,
        createdAt: 1,
        owner: 1,
        comments: 1,
      },
    },
  ]);

  if (!video) throw new ApiError(404, "Video not found");

  const videoViews = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: {
        views: 1,
      },
    },
    { new: true }
  );

  let user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $addToSet: {
        watchHistory: videoId,
      },
    },
    {
      new: true,
      select: "fullName username watchHistory avatar",
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video: video[0], videoViews: videoViews.views, user: user },
        "Video fetched successfully!"
      )
    );
});
export {
  addVideo,
  deleteVideo,
  togglePublishStatus,
  updateVideo,
  getVideoById,
};
