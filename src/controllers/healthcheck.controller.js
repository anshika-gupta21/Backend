import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthCheck = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(new ApiResponse(200, "OK", "Everything is fine..."));
  } catch (error) {
    throw new ApiError(400, error.message || "Something went wrong!");
  }
});

export { healthCheck };
