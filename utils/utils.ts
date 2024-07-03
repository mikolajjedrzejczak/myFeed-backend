import DatauriParser from 'datauri/parser.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import { MediaType } from '../constants';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
const parser = new DatauriParser();

export const bufferToDataURI = (fileFormat: any, buffer: Buffer) =>
  parser.format(fileFormat, buffer);

// Helper function to execute a database query and return a promise
export const queryDatabase = async (query: string, params: string[] = []) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

// Helper function to insert media into the database
export const insertMedia = async (
  postId: string,
  mediaURL: string,
  mediaType: MediaType = MediaType.Image
) => {
  let mediaQuery = '';

  if (mediaType === 'post_gif') {
    mediaQuery =
      'INSERT INTO post_media(`id`, `post_gif`, `post_id`) VALUES(?, ?, ?)';
  } else if (mediaType === 'post_video') {
    mediaQuery =
      'INSERT INTO post_media(`id`, `post_video`, `post_id`) VALUES(?, ?, ?)';
  } else {
    mediaQuery =
      'INSERT INTO post_media(`id`, `post_img`, `post_id`) VALUES(?, ?, ?)';
  }

  const values = [uuidv4(), mediaURL, postId];

  return await queryDatabase(mediaQuery, values);
};

// Helper function to handle media file uploads
export const handleMediaUpload = async (
  files:
    | any
    | Express.Multer.File[]
    | {
        [fieldname: string]: Express.Multer.File[];
      },
  postId: string
) => {
  const mediaPromises = files.map(async (file: Express.Multer.File) => {
    const fileFormat = file.mimetype.split('/')[1];
    const folder = fileFormat === 'gif' ? 'gifs' : 'photos';
    const uniqueFilename = uuidv4();

    if (file.mimetype.split('/')[0] === 'video') {
      cloudinary.uploader
        .upload_stream(
          { resource_type: 'video', folder: 'videos' },
          async (error, result) => {
            if (error) {
              console.error('Error uploading video:', error);
            } else {
              await insertMedia(postId, result!.secure_url, MediaType.Video);
            }
          }
        )
        .end(file.buffer);
    } else {
      const { base64 } = bufferToDataURI(fileFormat, file.buffer);

      const cloudinaryResponse = await cloudinary.uploader.upload(
        `data:image/${fileFormat};base64,${base64}`,
        {
          public_id: uniqueFilename,
          folder: folder,
        }
      );

      const mediaType =
        fileFormat === MediaType.Gif ? MediaType.Gif : MediaType.Image;
      await insertMedia(postId, cloudinaryResponse.secure_url, mediaType);
    }
  });

  await Promise.all(mediaPromises);
};

// Helper function to insert a post into the database
export const insertPost = async (
  postId: string,
  text: string,
  createdAt: string,
  username: string
) => {
  const postQuery =
    'INSERT INTO post(`id`, `description`, `created_at`, `username`) VALUES(?, ?, ?, ?);';
  return await queryDatabase(postQuery, [postId, text, createdAt, username]);
};

export const deleteMediaFromCloud = async (media: any) => {
  try {
    if (media.length) {
      for (let i = 0; i < media.length; i++) {
        if (media[i].post_img !== null) {
          await cloudinary.uploader.destroy(media[i].post_img);
        }

        if (media[i].post_video !== null) {
          console.log(media[i].post_video);
          await cloudinary.uploader.destroy(media[i].post_video, {
            resource_type: 'video',
          });
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};