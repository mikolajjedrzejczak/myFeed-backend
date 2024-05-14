import express from 'express';
import {
  deleteAccount,
  signin,
  signout,
  signup,
  verify,
} from '../controllers/auth';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/signout', signout);
router.get('/verify', verify);
router.delete('/delete', deleteAccount);

export default router;
