import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router.route("/create-playlist").post(verifyJWT, createPlaylist);
router.route("/get-playlist/:playlistId").get(verifyJWT, getPlaylistById);
router.route("/delete-playlist/:playlistId").delete(verifyJWT, deletePlaylist);
router.route("/update-playlist").patch(verifyJWT, updatePlaylist);
router.route("/show-playlists/:userId").get(verifyJWT, getUserPlaylists);
router
  .route("/add-video/:playlistId/:videoId")
  .post(verifyJWT, addVideoToPlaylist);
router
  .route("/remove-video/:playlistId/:videoId")
  .post(verifyJWT, removeVideoFromPlaylist);

export default router;
