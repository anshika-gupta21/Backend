import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs, { unlinkSync } from "fs";
import { ApiError } from "./apiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file on cloudinary

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file uploaded successfully
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove locally saved temporary file as upload operation got failed
    return null;
  }
};

const deleteFromCloudinary = async (localFilePath) => {
  try {
    const publicId = localFilePath.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new ApiError(400, error?.message || "something went wrong...");
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
