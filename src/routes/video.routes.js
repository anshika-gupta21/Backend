import Router from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  addVideo,
  deleteVideo,
  getVideoById,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);
router.route("/upload-video").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  addVideo
);
router.route("/:videoId").delete(deleteVideo).patch(upload.single("thumbnail"), updateVideo).get(getVideoById);
router.route("/toggle-publish-status/:videoId").patch(togglePublishStatus);
export default router;
