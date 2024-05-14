import { Request, Response } from 'express';
import { db } from '../db/db';
import jwt, { Secret } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export const sendFollow = (req: Request, res: Response) => {
  const token = req.cookies.access_token;

  if (!token) return res.status(401).json({ message: 'You are not Sign in!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { username } = req.params;
      const { followerUsername } = req.body;

      const followQuery =
        'INSERT INTO follower(`id`,`followed_username`, `follower_username`) VALUES(?);';

      const values = [uuidv4(), username, followerUsername];

      db.query(followQuery, [values], (err, data) => {
        if (err) return res.status(500).json(err);

        return res.status(200).json({ message: 'User has been followed!' });
      });
    }
  );
};

export const unFollow = (req: Request, res: Response) => {
  const token = req.cookies.access_token;

  if (!token) return res.status(401).json({ message: 'You are not Sign in!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { username } = req.params;
      const { followerUsername } = req.body;

      const followQuery =
        'DELETE FROM follower WHERE followed_username = ? AND follower_username = ?';

      db.query(followQuery, [username, followerUsername], (err, data) => {
        if (err) return res.status(500).json(err);

        return res.status(200).json({ message: 'User has been unfollowed!' });
      });
    }
  );
};

export const getFollow = (req: Request, res: Response) => {
  const { username } = req.params;
  const { followerUsername } = req.body;

  const followQuery =
    'SELECT * FROM follower WHERE followed_username = ? AND follower_username = ?';

  db.query(followQuery, [username, followerUsername], (err, data) => {
    if (err) return res.status(500).json(err);

    return res.status(200).json(data);
  });
};

export const getFollowers = (req: Request, res: Response) => {
  const { followerUsername } = req.params;
  const followQuery =
    'SELECT user.id, name, username, avatar FROM follower JOIN user ON user.username = follower.follower_username WHERE followed_username = ?;';

  db.query(followQuery, [followerUsername], (err, data) => {
    if (err) res.status(500).json(err);

    return res.status(200).json(data);
  });
};
