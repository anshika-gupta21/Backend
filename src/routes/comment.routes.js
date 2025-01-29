import {
  addComment,
  deleteComment,
  editComment,
  getVideoComments,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { Router } from "express";

const router = Router();
router.route("/add-comment/:videoId").post(verifyJWT, addComment);
router.route("/edit-comment/:commentId").patch(verifyJWT, editComment);
router.route("/delete-comment/:commentId").delete(verifyJWT, deleteComment);
router.route("/get-comments/:videoId").get(verifyJWT, getVideoComments);

export default router;
