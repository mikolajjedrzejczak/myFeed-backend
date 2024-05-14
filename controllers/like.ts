import { Request, Response } from 'express';
import { db } from '../db/db';
import jwt, { JsonWebTokenError, Secret } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { userInfoProps } from '../types/user';

export const sendLike = (req: Request, res: Response) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: 'You are not signin!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { postId } = req.params;
      const { commentId } = req.body;
      const userInfo: userInfoProps = decoded as userInfoProps;

      if (postId) {
        const q = 'INSERT INTO likes(`id`, `post_id`, `username`) VALUES(?);';

        const values = [uuidv4(), postId, userInfo.username];

        db.query(q, [values], (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json({ message: 'Post has been likesd!' });
        });
      }

      if (commentId) {
        const q =
          'INSERT INTO likes(`id`, `comment_id`, `username`) VALUES(?);';

        const values = [uuidv4(), commentId, userInfo.username];

        db.query(q, [values], (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json({ message: 'Comment has been likesd!' });
        });
      }
    }
  );
};

export const disLike = (req: Request, res: Response) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: 'You are not singin!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { postId } = req.params;
      const { commentId } = req.body;
      const userInfo: userInfoProps = decoded as userInfoProps;

      if (postId) {
        const q = 'DELETE FROM likes WHERE post_id = ? AND username = ?;';

        db.query(q, [postId, userInfo.username], (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json({ message: 'Post has been unlikesd!' });
        });
      }

      if (commentId) {
        const q = 'DELETE FROM likes WHERE comment_id = ? AND username = ?;';

        db.query(q, [commentId, userInfo.username], (err, data) => {
          if (err) return res.status(500).json(err);

          return res
            .status(200)
            .json({ message: 'Comment has been unlikesd!' });
        });
      }
    }
  );
};

export const getLike = (req: Request, res: Response) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: 'You are not singin!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { postId } = req.params;
      const { commentId } = req.body;
      const userInfo: userInfoProps = decoded as userInfoProps;

      if (postId) {
        const q = 'SELECT * FROM likes WHERE post_id = ? AND username = ?';

        db.query(q, [postId, userInfo.username], (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json(data);
        });
      }

      if (commentId) {
        const q = 'SELECT * FROM likes WHERE comment_id = ? AND username = ?';

        db.query(q, [commentId, userInfo.username], (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json(data);
        });
      }
    }
  );
};

export const getLikes = (req: Request, res: Response) => {
  const { username } = req.params;
  const q =
    'SELECT COUNT(post_id) AS likes, user.username AS username FROM likes JOIN post ON post.id = likes.post_id JOIN user ON user.username = post.username GROUP BY user.username HAVING user.username = ? ';
  db.query(q, [username], (err, data) => {
    if (err) return res.status(500).json(err);

    return res.status(200).json(data);
  });
};

export const getPostLikes = (req: Request, res: Response) => {
  const { postId } = req.params;
  const q =
    'SELECT user.id, user.username, user.name, user.avatar FROM likes JOIN user ON user.username = likes.username WHERE post_id = ?';

  db.query(q, [postId], (err, data) => {
    if (err) return res.status(500).json(err);

    return res.status(200).json(data);
  });
};
