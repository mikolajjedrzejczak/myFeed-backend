import { db } from '../db/db';
import jwt, { Secret } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { bufferToDataURI } from '../utils/utils';
import { Response, Request } from 'express';
import { RowDataPacket } from 'mysql2';
import { userInfoProps } from '../types/user';

export const getUsers = (req: Request, res: Response) => {
  const q = 'SELECT id, username, name, email, avatar, location FROM user;';

  db.query(q, (err, data) => {
    if (err) return res.status(500).json(data);

    return res.status(200).json(data);
  });
};

export const getUser = (req: Request, res: Response) => {
  const { username } = req.params;
  const q =
    'SELECT * FROM user JOIN follower ON follower.followed_username = user.username WHERE user.username=?;';

  db.query(q, [username], (err, data) => {
    if (err) return res.status(500).json(err);

    const q =
      'SELECT id, username, name, bio, avatar, profile_img, location, x_url, instagram_url, youtube_url FROM user WHERE user.username=?;';

    db.query(q, [username], (err, data) => {
      if (err) return res.status(500).json(err);

      return res.status(200).json(data);
    });
  });
};

export const searchUsers = (req: Request, res: Response) => {
  const q = 'SELECT * FROM user;';

  db.query(q, (err, data) => {
    if (err) return res.status(500).json(data);

    return res.status(200).json(res.status(200).json(data));
  });
};

export const updateUser = (req: Request, res: Response) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: 'You are not singin!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    async (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { instagram, username, bio, name, location, x, youtube } = req.body;
      const userInfo: userInfoProps = decoded as userInfoProps;

      if (!req.files) return;

      const avatar =
        req.files['avatar' as keyof Object] &&
        (req.files['avatar' as keyof Object] as any)[0];
      const profile =
        req.files['profile' as keyof Object] &&
        (req.files['profile' as keyof Object] as any)[0];

      if (avatar !== undefined || profile !== undefined) {
        if (avatar === undefined && profile !== undefined) {
          const fileProfileFormat = profile.mimetype.split('/')[1];
          const uniqueFilenameProfile = `${uuidv4()}`;
          const { base64: base64Profile } = bufferToDataURI(
            fileProfileFormat,
            profile.buffer
          );

          // Upload the image to Cloudinary
          const cloudinaryResponse = await cloudinary.uploader.upload(
            `data:image/${fileProfileFormat};base64,${base64Profile}`,
            {
              public_id: uniqueFilenameProfile,
            }
          );

          const q = `UPDATE user SET profile_img=?, name=?, username=?, bio=?, location=? , x_url=?, instagram_url=?, youtube_url=? WHERE id=?;
          SELECT * FROM user WHERE id=?;`;

          const values = [
            cloudinaryResponse.secure_url,
            name,
            username,
            bio,
            location,
            x,
            instagram,
            youtube,
            userInfo.id,
            userInfo.id,
          ];

          db.query(q, values, (err, data) => {
            if (err) return res.status(500).json(err);
            return res.status(200).json({
              id: userInfo.id,
              instagram_url: instagram,
              username: username,
              name: name,
              bio: bio,
              location: location,
              x_url: x,
              profile_img: cloudinaryResponse.secure_url,
              avatar: (data as RowDataPacket[])[1][0].avatar,
              youtube_url: youtube,
              message: 'Profile has been updated!',
            });
          });
        }

        if (avatar !== undefined && profile === undefined) {
          const fileAvatarFormat = avatar.mimetype.split('/')[1];
          const uniqueFilenameAvatar = `${uuidv4()}`;
          const { base64: base64Avatar } = bufferToDataURI(
            fileAvatarFormat,
            avatar.buffer
          );

          // Upload the image to Cloudinary
          const cloudinaryResponse = await cloudinary.uploader.upload(
            `data:image/${fileAvatarFormat};base64,${base64Avatar}`,
            {
              public_id: uniqueFilenameAvatar,
              folder: 'avatars',
            }
          );

          const q = `UPDATE user SET avatar=?, name=?, username=?, bio=?, location=? , x_url=?, instagram_url=?, youtube_url=? WHERE id=?;
          SELECT * FROM user WHERE id=?;`;

          const values = [
            cloudinaryResponse.secure_url,
            name,
            username,
            bio,
            location,
            x,
            instagram,
            youtube,
            userInfo.id,
            userInfo.id,
          ];

          db.query(q, values, (err, data) => {
            if (err) return res.status(500).json(err);
            return res.status(200).json({
              id: userInfo.id,
              instagram_url: instagram,
              username: username,
              name: name,
              bio: bio,
              location: location,
              x_url: x,
              avatar: cloudinaryResponse.secure_url,
              prfoile_img: (data as RowDataPacket[])[1][0].profile_img,
              youtube_url: youtube,
              message: 'Profile has been updated!',
            });
          });
        }

        if (avatar !== undefined && profile !== undefined) {
          const fileProfileFormat = profile.mimetype.split('/')[1];
          const uniqueFilenameProfile = `${uuidv4()}`;
          const { base64: base64Profile } = bufferToDataURI(
            fileProfileFormat,
            profile.buffer
          );
          const fileAvatarFormat = avatar.mimetype.split('/')[1];
          const uniqueFilenameAvatar = `${uuidv4()}`;
          const { base64: base64Avatar } = bufferToDataURI(
            fileAvatarFormat,
            avatar.buffer
          );

          const cloudinaryProfileResponse = await cloudinary.uploader.upload(
            `data:image/${fileProfileFormat};base64,${base64Profile}`,
            {
              public_id: uniqueFilenameProfile,
            }
          );
          const cloudinaryAvatarResponse = await cloudinary.uploader.upload(
            `data:image/${fileAvatarFormat};base64,${base64Avatar}`,
            {
              public_id: uniqueFilenameAvatar,
              folder: 'avatars',
            }
          );

          const q = `UPDATE user SET avatar=?, profile_img=? , name=?, username=?, bio=?, location=? , x_url=?, instagram_url=?, youtube_url=? WHERE id=?;`;

          const values = [
            cloudinaryAvatarResponse.secure_url,
            cloudinaryProfileResponse.secure_url,
            name,
            username,
            bio,
            location,
            x,
            instagram,
            youtube,
            userInfo.id,
          ];

          await Promise.all([
            cloudinaryProfileResponse,
            cloudinaryAvatarResponse,
          ]);

          db.query(q, values, (err, data) => {
            if (err) return res.status(500).json(err);
            return res.status(200).json({
              id: userInfo.id,
              instagram_url: instagram,
              username: username,
              name: name,
              bio: bio,
              location: location,
              x_url: x,
              avatar: cloudinaryAvatarResponse.secure_url,
              profile_img: cloudinaryProfileResponse.secure_url,
              youtube_url: youtube,
              message: 'Profile has been updated!',
            });
          });
        }
      }

      if (!avatar && !profile) {
        const q = `UPDATE user SET name=?, username=?, bio=?, location=? , x_url=?, instagram_url=?, youtube_url=? WHERE id=?;
        SELECT * FROM user WHERE user.id=?;`;

        const values = [
          name,
          username,
          bio,
          location,
          x,
          instagram,
          youtube,
          userInfo.id,
          userInfo.id,
        ];

        db.query(q, values, (err, data) => {
          if (err) return res.status(500).json(err);
          return res.status(200).json({
            id: userInfo.id,
            instagram_url: instagram,
            username: username,
            name: name,
            bio: bio,
            location: location,
            x_url: x,
            avatar: (data as RowDataPacket[])[1][0].avatar,
            profile_img: (data as RowDataPacket[])[1][0].profile_img,
            youtube_url: youtube,
            message: 'Profile has been updated!',
          });
        });
      }
    }
  );
};

export const searchQuery = (req: Request, res: Response) => {
  const { q } = req.query;

  let query = 'SELECT id, username, name, email, avatar, location FROM user';

  if (q) {
    query += ` WHERE username LIKE '%${q}%' OR email LIKE '%${q}%' OR name LIKE '%${q}%';`;

    db.query(query, q, (err, data) => {
      if (err) return res.status(500).json(err);

      return res.status(200).json(data);
    });
  }

  if (!q) {
    query += ` LIMIT 5;`;

    db.query(query, q, (err, data) => {
      if (err) return res.status(500).json(err);

      return res.status(200).json(data);
    });
  }
};
