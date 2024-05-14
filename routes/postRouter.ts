import express from 'express';
import multer from 'multer';
import { createComment, createPost, deleteComment, deletePost, editPost, getComment, getComments, getFollowingPosts, getPosts, getSinglePost, getUserPosts } from '../controllers/post';

const router = express.Router();

const memoryStorage = multer.memoryStorage();

const upload = multer({
    storage: memoryStorage,
});

router.get('/', getPosts);
router.post('/following', getFollowingPosts);
router.get('/:postId', getSinglePost);
router.get('/user/:username', getUserPosts);
router.post('/create', upload.array('post', 4), createPost);
router.post('/edit/:postId', upload.single('post'), editPost);
router.post('/delete/:postId', deletePost);
router.get('/post/comments/:postId', getComments);
router.get('/comments/:parentId', getComment);
router.post('/post/comment/:postId', upload.single('post'), createComment);
router.post('/comments/delete', deleteComment)

export default router;