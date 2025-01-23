import {
  addComment,
  deleteComment,
  editComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { Router } from "express";

const router = Router();
router.route("/add-comment").post(verifyJWT, addComment);
router.route("/edit-comment").patch(verifyJWT, editComment);
router.route("/delete-comment").delete(verifyJWT, deleteComment);

export default router;
