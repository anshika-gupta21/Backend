import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Subscription } from "../models/subscription.models.js";
import { User } from "../models/user.models.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId || !isValidObjectId(channelId))
    throw new ApiError(400, "Invalid channel Id");

  const channel = await User.findById(channelId);

  if (!channel) throw new ApiError(404, "Channel not found!");

  if (channelId.toString() === req.user?._id.toString())
    throw new ApiError(400, "Cannot subscribe to your own channel!");

  const isSubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user?._id,
  });

  try {
    if (isSubscribed) {
      const unsubscribe = await Subscription.findByIdAndDelete(isSubscribed);

      if (!unsubscribe) throw new ApiError(500, "Problem while unsubscribing.");

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Unsubscribed successfully!"));
    } else {
      const subscribe = await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id,
      });

      if (!subscribe) throw new ApiError(500, "Problem while subscribing.");

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Subscribed successfully!"));
    }
  } catch (error) {
    throw new ApiError(500, error.message || "Error while toggling status.");
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId || !isValidObjectId(channelId))
    throw new ApiError(400, "Invalid channel Id");

  const channel = await User.findById(channelId);

  if (!channel) throw new ApiError(404, "Channel not found!");

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              _id: 0,
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribers",
    },
    {
      $project: {
        subscribers: 1,
        _id: 0,
      },
    },
  ]);

  if (!subscribers || subscribers.length === 0)
    throw new ApiError(404, "No subscribers found.");

  const info = {
    subscribers: subscribers || [],
    totalSubscribers: subscribers.length || 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, info, "Subscribers fetched successfully"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId || !isValidObjectId(subscriberId))
    throw new ApiError(400, "Invalid subscriber id.");

  const subscriber = await User.findById(subscriberId);

  if (!subscriber) throw new ApiError(404, "Subscriber not found");

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channels",
        pipeline: [
          {
            $project: {
              _id: 0,
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$channels",
    },
    {
      $project: {
        _id: 0,
        channels: 1,
      },
    },
  ]);
  if (!channels || channels.length === 0)
    throw new ApiError(404, "No channels found.");

  const info = {
    channel: channels || [],
    totalSubscribedChannels: channels.length || 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, info, "Channels fetched successfully!"));
});
export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
