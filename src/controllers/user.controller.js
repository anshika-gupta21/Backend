import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateRefreshAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    let refreshToken, accessToken;
    try {
      refreshToken = user.generateRefreshToken();
      accessToken = user.generateAccessToken();
    } catch (err) {
      throw new ApiError(500, "Error generating tokens");
    }

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while accessing tokens...");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // - get user details from frontend
  // - validation-not empty
  // - check if user already exists (username/email)
  // - check for images, check for avatar
  // - upload them to cloudinary
  // - crreate user object - create entry in db
  // - remove password and refresh token field from response
  // - check for user creation
  // - return response

  const { fullName, email, username, password } = req.body;
  console.log(username);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  )
    throw new ApiError(400, "All fields are required!");

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser)
    throw new ApiError(409, "User with email or username already exists!");

  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalPath = req.files.coverImage[0]?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Avatar is required!");

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering user!");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered succesfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body->data
  //username or email
  //find the user
  //password check
  //access and refresh token to user
  //send cookie

  const { username, email, password } = req.body;

  if (!username && !email)
    throw new ApiError(400, "Email or username is required");

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(401, "User does not exist!!");

  console.log(password);

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid)
    throw new ApiError(401, "User credentials do not match!");

  const { refreshToken, accessToken } = await generateRefreshAndAccessToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully!!"
      )
    );
});

const loggedOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      // $set: {
      //   refreshToken: undefined,
      // },
      $unset: {
        refreshToken: 1, //this removes the field from the document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "Invalid Refresh Token!");

    if (incomingRefreshToken !== decodedToken)
      throw new ApiError(401, "Refresh token is expired or used.");

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { newRefreshToken, accessToken } =
      await generateRefreshAndAccessToken(user._id);
    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          { refreshToken: newRefreshToken, accessToken },
          "Access Token refreshed."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!(newPassword === confirmPassword))
    throw new ApiError(400, "Passwords do not match...");
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found!");
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password!");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully!");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) throw new ApiError(400, "All fields are required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    {
      new: true, // Return the updated document instead of the original
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Details updated successfully!!"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing!");

  //delete old avatar

  const user = await User.findById(req.user?._id).select("avatar");
  const currentAvatarUrl = user?.avatar;

  if (currentAvatarUrl) await deleteFromCloudinary(currentAvatarUrl);

  //updating new avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) throw new ApiError(400, "Error while uploading on avatar!");

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated Successfully!!"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Cover Image file is missing. Update cannot be performed."
        )
      );
  }

  //deleting

  const user = await User.findById(req.user?._id).select("coverImage");
  currentCoverUrl = user?.coverImage;

  if (currentCoverUrl) await deleteFromCloudinary(currentCoverUrl);

  //updating
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new ApiError(400, "Error while uploading on Cover Image!");

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Cover Image updated Successfully!!")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) throw new ApiError(400, "Username not found.");

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase,
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) throw new ApiError(404, "Channel does not exist.");

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully!")
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
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
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully!!"
      )
    );
});

export {
  registerUser,
  loginUser,
  loggedOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};
