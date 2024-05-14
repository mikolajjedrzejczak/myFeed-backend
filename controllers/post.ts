import { Request, Response } from 'express';
import { db } from '../db/db';
import jwt, { Secret } from 'jsonwebtoken';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import {
  bufferToDataURI,
  handleMediaUpload,
  insertMedia,
  insertPost,
  queryDatabase,
} from '../utils/utils';
import { MediaType } from '../constants';
import { PostProps } from '../types/post';
import { userInfoProps } from '../types/user';

export const getPosts = async (req: Request, res: Response) => {
  const { page } = req.query;
  let postQuery =
    'SELECT post.*, user.name, user.username, user.avatar, ' +
    '(SELECT COUNT(likes.post_id) FROM likes GROUP BY likes.post_id HAVING likes.post_id = post.id) AS likes ' +
    'FROM post LEFT JOIN user ON post.username = user.username ORDER BY created_at DESC';

  if (page) {
    const amountOfpost = 4;
    postQuery += ` LIMIT ${
      (parseInt(page as string) - 1) * amountOfpost
    },${amountOfpost}`;
  }

  try {
    const post = (await queryDatabase(postQuery)) as PostProps[];
    const post_ids = post.map((post) => post.id);

    const mediaPromises = post_ids.map(async (post_id) => {
      const mediaQuery = `SELECT * FROM post_media WHERE post_id = ?`;
      return await queryDatabase(mediaQuery, [post_id]);
    });

    const mediaData = await Promise.all(mediaPromises);

    const postWithMedia = post.map((post, index) => ({
      ...post,
      media: mediaData[index],
    }));

    return res.status(200).json(postWithMedia);
  } catch (err) {
    console.error('Error fetching post:', err);
    return res
      .status(500)
      .json({ error: 'An error occurred while fetching post.' });
  }
};

export const getFollowingPosts = async (req: Request, res: Response) => {
  const { page } = req.query;
  let postQuery =
    'SELECT post.*, user.name, user.avatar FROM post JOIN follower ON follower.followed_username = post.username JOIN user ON user.username = post.username WHERE follower.follower_username=?';

  if (page) {
    const amountOfpost = 4;
    postQuery += ` LIMIT ${(+page - 1) * 4},${amountOfpost}`;
  }

  try {
    const post = (await queryDatabase(postQuery, [
      req.body.sendData,
    ])) as PostProps[];
    const post_id = post.map((post) => post.id);

    const mediaPromises = post_id.map(async (post_id) => {
      const mediaQuery = `SELECT * FROM post_media WHERE post_id = ?`;
      return await queryDatabase(mediaQuery, [post_id]);
    });

    const mediaData = await Promise.all(mediaPromises);

    const postWithMedia = post.map((post, index) => ({
      ...post,
      media: mediaData[index],
    }));

    return res.status(200).json(postWithMedia);
  } catch (err) {
    console.error('Error fetching post:', err);
    return res
      .status(500)
      .json({ error: 'An error occurred while fetching post.' });
  }
};

export const getSinglePost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const token = req.cookies.access_token;
  const postQuery =
    'SELECT post.*, name, user.username, avatar, ' +
    '(SELECT COUNT(likes.post_id) FROM likes GROUP BY likes.post_id HAVING likes.post_id = ?) AS likes ' +
    'FROM post JOIN user ON post.username = user.username WHERE post.id = ?';

  try {
    const post = (await queryDatabase(postQuery, [
      postId,
      postId,
    ])) as PostProps[];

    if (!post.length) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const mediaQuery = 'SELECT * FROM post_media WHERE post_id = ?';
    const mediaData = await queryDatabase(mediaQuery, [postId]);

    const postWithMedia = {
      ...post[0],
      media: mediaData,
    };

    return res.status(200).json(postWithMedia);
  } catch (err) {
    console.error('Error fetching post:', err);
    return res
      .status(500)
      .json({ error: 'An error occurred while fetching the post.' });
  }
};

export const getUserPosts = async (req: Request, res: Response) => {
  const { username } = req.params;
  const q =
    'SELECT post.*, name, user.username, user.avatar FROM post JOIN user ON user.username = post.username WHERE user.username = ? ORDER BY created_at DESC;';

  try {
    const post = (await queryDatabase(q, [username])) as PostProps[];
    const post_ids = post.map((post) => post.id);

    const mediaPromises = post_ids.map(async (post_id) => {
      const mediaQuery = `SELECT * FROM post_media WHERE post_id = ?`;
      return await queryDatabase(mediaQuery, [post_id]);
    });

    const mediaData = await Promise.all(mediaPromises);

    const postWithMedia = post.map((post, index) => ({
      ...post,
      media: mediaData[index],
    }));

    return res.status(200).json(postWithMedia);
  } catch (err) {
    console.error('Error fetching post:', err);
    return res
      .status(500)
      .json({ error: 'An error occurred while fetching post.' });
  }
};

export const createPost = async (req: Request, res: Response) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ message: 'You are not signed in!' });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) {
        return res.status(403).json({ message: 'Token is not valid!' });
      }
      const userInfo: userInfoProps = decoded as userInfoProps;

      handlePostUpload(req, res, userInfo);
    }
  );
};

const handlePostUpload = async (
  req: Request,
  res: Response,
  userInfo: userInfoProps
) => {
  const { text, gif } = req.body;
  const files = req.files;

  if (!(files || text || gif))
    return res.status(403).json({ message: "Can't upload an empty post!" });

  try {
    const post_id = uuidv4();
    const created_at = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');

    // Insert the post into the database
    await insertPost(post_id, text, created_at, userInfo.username);

    if (gif) {
      await insertMedia(post_id, gif, MediaType.Gif);
    }

    // Handle media files
    if (files) {
      await handleMediaUpload(files, post_id);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Post has been uploaded!',
      post_id: post_id,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res
      .status(500)
      .json({ error: 'An error occurred while creating the post.' });
  }
};

export const editPost = (req: Request, res: Response) => {
  const token = req.cookies.access_token;

  if (!token) return res.status(401).json({ message: 'You are not Sign in!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    async (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { public_id, text } = req.body;
      const { postId } = req.params;
      const file = req.file;

      if (file) {
        const fileFormat = file.mimetype.split('/')[1];
        const uniqueFilename = `${uuidv4()}`;
        const { base64 } = bufferToDataURI(fileFormat, file.buffer);

        // Upload the image to Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(
          `data:image/${fileFormat};base64,${base64}`,
          {
            public_id: uniqueFilename,
          }
        );

        if (public_id) {
          await cloudinary.uploader.destroy(public_id);
        }

        let q = '';

        if (fileFormat === MediaType.Gif) {
          q = 'UPDATE post SET description=?, updated_at=? WHERE id=?;';
        } else {
          q = 'UPDATE post SET description=?, updated_at=? WHERE id=?;';
        }

        const values = [
          text,
          cloudinaryResponse.secure_url,
          dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
          postId,
        ];

        db.query(q, values, (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json({
            status: 'success',
            message: 'Post has been updated!',
          });
        });
      }

      if (!file) {
        const q = 'UPDATE post SET description=?, updated_at=? WHERE id=?;';
        const values = [
          text,
          dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
          postId,
        ];

        db.query(q, values, (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json({
            status: 'success',
            message: 'Post has been updated!',
          });
        });
      }
    }
  );
};

export const deletePost = (req: Request, res: Response) => {
  const token = req.cookies.access_token;

  if (!token) return res.status(401).json({ message: 'You are not Sign in!' });

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    async (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json({ message: 'Token is not valid!' });

      const { post_media } = req.body;
      const { postId } = req.params;

      const deleteMediaFromCloud = async () => {
        try {
          if (post_media.length) {
            for (let i = 0; i < post_media.length; i++) {
              if (post_media[i].post_img !== null) {
                await cloudinary.uploader.destroy(post_media[i].post_img);
              }

              if (post_media[i].post_video !== null) {
                console.log(post_media[i].post_video);
                await cloudinary.uploader.destroy(post_media[i].post_video, {
                  resource_type: 'video',
                });
              }
            }
          }
        } catch (err) {
          console.log(err);
        }
      };

      deleteMediaFromCloud();

      const q = 'DELETE FROM post WHERE id=?;';
      console.log(postId);

      db.query(q, [postId], (err, data) => {
        if (err) return res.status(500).json(err);

        return res.status(200).json({ message: 'Post has been deleted!' });
      });
    }
  );
};

export const createComment = async (req: Request, res: Response) => {
  const token = req.cookies.access_token;

  if (!token) return res.status(401).json('You are not Sign in!');

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    async (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) return res.status(403).json('Token is not valid!');

      const { text, gif, parentId } = req.body;
      const { postId } = req.params;
      const userInfo: userInfoProps = decoded as userInfoProps;

      const parentID = parentId === 'undefined' ? null : parentId;

      const file = req.file;
      let uniqueFilename = null;
      if (!(postId || text))
        return res.status(500).json({ message: 'error with post_id or desc' });

      if (file) {
        const fileFormat = file.mimetype.split('/')[1];
        uniqueFilename = `${uuidv4()}`;
        const { base64 } = bufferToDataURI(fileFormat, file.buffer);
        // Upload the image to Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(
          `data:image/${fileFormat};base64,${base64}`,
          {
            public_id: uniqueFilename,
          }
        );
        const commentQuery =
          'INSERT INTO comment(`id`, `username`, `post_id`, `parent_id`, `comment_img`, `description`, `created_at`) VALUES(?)';

        const values = [
          uuidv4(),
          userInfo.username,
          postId,
          parentID,
          cloudinaryResponse.secure_url,
          text,
          dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
        ];

        db.query(commentQuery, [values], async (err, data) => {
          if (err) return res.status(500).json(err);

          return res.status(200).json({
            status: 'success',
            message: 'Comment has been created!',
            data: cloudinaryResponse,
          });
        });
        return;
      }

      const commentQuery =
        'INSERT INTO comment(`id`, `username`, `post_id`, `parent_id`, `comment_gif`, `description`, `created_at`) VALUES(?)';

      const values = [
        uuidv4(),
        userInfo.username,
        postId,
        parentID,
        gif,
        text,
        dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
      ];

      db.query(commentQuery, [values], (err, data) => {
        if (err) return res.status(500).json(err);

        return res.status(200).json({
          status: 'success',
          message: 'Comment has been created!',
        });
      });
    }
  );
};

export const deleteComment = (req: Request, res: Response) => {
  const { commentId } = req.body;

  // Recursively delete comment
  // deletecommentRecursive(commentId, (err, data) => {
  //     if (err) {
  //         console.error(err);
  //         return res.status(500).json({ error: "An internal server error occurred." });
  //     }
  //     return res.status(200).json({ message: "comment deleted successfully." });
  // });
};

// const deletecommentRecursive =  (commentId: string, callback: CallableFunction) => {
//     // Delete the comment
//     let q = "DELETE FROM comment WHERE id = ?";
//      db.query(q, [commentId], (err, data) => {
//         if (err) return callback(err);

//         // Find child comment of this comment
//         q = "SELECT id FROM comment WHERE parent_id = ?";
//         db.query(q, [commentId], (err, rows) => {
//             if (err) return callback(err);

//             // If there are child comment, recursively delete them

//         });
//     });
// };

export const getComments = (req: Request, res: Response) => {
  let commentQuery =
    'SELECT comment.*, user.avatar, user.name, user.username FROM comment LEFT JOIN post ON post.id = comment.post_id LEFT JOIN user ON user.username = comment.username WHERE comment.post_id = ? ORDER BY created_at DESC';

  db.query(commentQuery, [req.params.postId], (err, data) => {
    if (err) return res.status(500).json(err);

    return res.status(200).json(data);
  });
};

export const getComment = (req: Request, res: Response) => {
  let commentQuery =
    'SELECT comment.*, user.avatar, user.name FROM comment LEFT JOIN post ON post.id = comment.post_id LEFT JOIN user ON user.username = comments.username WHERE comment.parent_id = ? ORDER BY created_at DESC';

  db.query(commentQuery, [req.params.parentId], (err, data) => {
    if (err) return res.status(500).json(err);

    return res.status(200).json(data);
  });
};
