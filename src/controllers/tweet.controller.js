import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(500, "Tweet not created");
  }
  return res.status(200).json(new ApiResponse(200, tweet, "Tweet created"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }
  //   const tweets = await User.aggregate([
  //     {
  //       $match: {
  //         _id: new mongoose.Types.ObjectId(userId),
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "owner",
  //         foreignField: "_id",
  //         as: "tweets",
  //       },
  //     },
  //     {
  //       $unwind: "$tweets",
  //     },
  //     {
  //       $project: {
  //         owner: "$tweets.owner",
  //         content: 1,
  //       },
  //     },
  //   ]);
  const tweets = await Tweet.find({ owner: userId }).select("-createdAt -updatedAt");

  if (!tweets) {
    throw new ApiError(404, "No tweets found for this user");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!content) throw new ApiError(400, "Content is required!");
  if (!tweetId || !isValidObjectId(tweetId))
    throw new ApiError(400, "Invalid Tweet Id");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "No tweet found!");

  if (tweet.owner.toString() !== req.user?._id.toString())
    throw new ApiError(400, "You don't have permission to update this tweet.");

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: content,
      },
    },
    { new: true }
  );
  if (!updatedTweet) throw new ApiError(500, "Error while updating tweet!");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully!"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId || !isValidObjectId(tweetId))
    throw new ApiError(400, "Invalid Tweet Id");
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "NO tweet found!");

  if (tweet.owner.toString() !== req.user?._id.toString())
    throw new ApiError(400, "You don't have permission to update this tweet.");

  const isDeleted = await Tweet.findByIdAndDelete(tweetId);
  if (!isDeleted)
    throw new ApiError(500, "Some error while deleting the tweet");

  return res.status(200).json(200, {}, "Tweet deleted successfully!");
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
