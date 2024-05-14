import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  searchUsers,
  searchQuery,
} from '../controllers/user';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
});

router.get('/', getUsers);
router.post('/search', searchUsers);
router.get('/filter', searchQuery);
router.get('/:username', getUser);
router.post(
  '/update/:userId',
  upload.fields([{ name: 'avatar' }, { name: 'profile' }]),
  updateUser
);

export default router;
