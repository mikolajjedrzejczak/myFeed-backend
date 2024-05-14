import express from 'express';
import { sendLike, getLikes, getLike, disLike, getPostLikes } from '../controllers/like';

const router = express.Router();

router.get('/profile/:username', getLikes);
router.get('/:postId', getLike);
router.get('/post/:postId', getPostLikes);
router.post('/:postId', sendLike);
router.delete('/:postId', disLike);

export default router;