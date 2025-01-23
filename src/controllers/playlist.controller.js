import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description || name.trim() === "")
    throw new ApiError(400, "Name and description of playlist is required!");

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist)
    throw new ApiError(500, "Error occured while creating playlist!");
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully!!"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId || !isValidObjectId(playlistId))
    throw new ApiError(400, "Playlist Id incorrect!");

  const playlist = await Playlist.findById({ playlistId });

  if (!playlist) throw new ApiError(400, "Playlist does not exist!!");
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist found successfully!"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId || !isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlist Id!");

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(400, "Playlist does not exist!");
  if (playlist.owner !== req.user?._id)
    throw new ApiError(402, "You cannot delete this playlist!");

  const isDeleted = await Playlist.findByIdAndDelete({ playlistId });
  if (!isDeleted)
    throw new ApiError(500, "Some error occured while deleting the playlist!");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully!"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!playlistId || !isValidObjectId(playlistId))
    throw new ApiError(400, "Playlist Id incorrect!");
  if (!name || !description)
    throw new ApiError(400, "All fields are required!");

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(400, "Playlist does not exist!!");

  if (playlist.owner !== req.user?._id)
    throw new ApiError(402, "You cannot update the playlist!");
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfullt!")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const userId = req.params;
  if (!userId) throw new ApiError(400, "Invalid user Id");

  // const playlist = await Playlist.find({ owner: userId });
  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  if (!playlist.length) throw new ApiError(400, "User has no playlists!");
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlists fetched succesfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || !videoId)
    throw new ApiError(400, "Invalid Playlist Id or Video Id.");

  const playlist = await Playlist.findById({ playlistId });
  if (!playlist) throw new ApiError(400, "Playlist does not exist!!");

  const video = await Video.findById({ videoId });
  if (!video) throw new ApiError(400, "Video does not exist!!");

  if (playlist.owner !== req.user?._id)
    throw new ApiError(400, "User does not have access to this playlist!!");

  if (playlist.videos.includes(videoId))
    throw new ApiError(400, "Video is already in the playlist!");

  const isVideoAdded = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        //Adds elements to an array only if they do not already exist in the set.
        videos: videoId,
      },
    },
    { new: true }
  );
  if (!isVideoAdded)
    throw new ApiError(500, "Some error occured while adding video!!");
  return res
    .status(200)
    .json(new ApiResponse(200, isVideoAdded, "Video added successfully!"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !videoId)
    throw new ApiError(400, "Invalid Playlist Id or Video id");
  const playlist = await Playlist.findById({ playlistId });
  if (!playlist) throw new ApiError(400, "Playlist does not exist!!");
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(400, "Video does not exist!!");

  if (playlist?.owner !== req.user?._id)
    throw new ApiError(402, "User does not have access to this playlist!!");

  if (!playlist?.videos.includes(videoId))
    throw new ApiError(
      400,
      "Video you want to delete is not present in the playlist!!"
    );

  const removedVideo = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        //The $pull operator is used to remove items from an array
        videos: {
          $in: [`${videoId}`], //$in operator checks if any element in the array matches the given value(
        },
      },
    },
    { new: true }
  );
  if (!removedVideo)
    throw new ApiError(500, "Some error occured while removing the video.");

  return res
    .status(200)
    .json(new ApiResponse(200, removedVideo, "Video removed successfully!"));
});
export {
  createPlaylist,
  getPlaylistById,
  deletePlaylist,
  updatePlaylist,
  getUserPlaylists,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
};
