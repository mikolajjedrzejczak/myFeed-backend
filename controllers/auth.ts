import { db } from '../db/db';
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import Mail from 'nodemailer/lib/mailer';
import { userInfoProps } from '../types/user';
import { CookieResponse } from '../types/cookie';

export const signup = (req: Request, res: Response) => {
  const { email, name, username, password } = req.body;

  if (!email.length || !name.length || !username.length || !password.length) {
    return res.status(409).json({
      message: 'Fill up all sign up inputs properly!',
    });
  }

  const generateVerificationToken = () => {
    return crypto.randomBytes(32).toString('hex');
  };

  const q = 'SELECT * FROM user WHERE email = ?;';
  db.query(q, [req.body.email], (err, data) => {
    if (err) return res.status(500).json(err);
    if (Array.isArray(data) && data.length)
      return res
        .status(409)
        .json({ message: 'User with that email already exists!' });

    const q = 'SELECT * FROM user WHERE username = ?;';

    db.query(q, [username], (err, data) => {
      if (err) return res.status(500).json(err);
      if (Array.isArray(data) && data.length)
        return res.status(409).json({
          message: 'User with this username already exists!',
        });

      const q =
        'INSERT INTO user(`id`, `username`, `name`, `email`, `password`, `email_verify`, `verified`, `created_at`) VALUES(?);';

      if (password.length < 5)
        return res.status(409).json({
          message: 'Too short password!',
        });

      const verificationToken = generateVerificationToken();

      const mailOptions = {
        from: process.env.VERIFY_EMAIL,
        to: email,
        subject: 'MyFeed verify your account!',
        html: ` 
            <p>Click the following link to verify your email:</p>
            <a href="https://devdomain.site/api/auth/verify?token=${verificationToken}">Verify Email</a>
            `,
      };

      const salt = bcrypt.genSaltSync(10);
      const hashedPass = bcrypt.hashSync(password, salt);

      const values = [
        uuidv4(),
        username,
        name,
        email,
        hashedPass,
        verificationToken,
        0,
        dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
      ];

      db.query(q, [values], async (err, data) => {
        if (err) return res.status(500).json(err);

        sendEmail(mailOptions);

        return res.status(200).json({
          message:
            'User has been created successfully! Verify yout account on email!',
        });
      });
    });
  });
};

export const verify = (req: Request, res: Response) => {
  const { token } = req.query;

  const q = 'SELECT * FROM user WHERE email_verify=?;';

  db.query(q, [token], async (err, results) => {
    if (err) {
      console.error(err);
      // return res.redirect('/signin?verified=failed');
      console.log('Email verify failed1');
    }

    if (Array.isArray(results) && results.length > 0) {
      const username = (results as RowDataPacket[])[0].username; // Assuming 'username' is the correct field

      try {
        await markEmailAsVerified(username);
        console.log('Email verified successfully');

        // res.redirect('/signin?verified=success');
      } catch (error) {
        console.error(error);
        console.log('Email verify failed2');
        // res.redirect('/signin?verified=failed');
      }
    } else {
      // res.redirect('/signin?verified=failed');
      console.log('Email verify failed3');
    }
  });
};

export const signin = (req: Request, res: CookieResponse) => {
  const { email, password } = req.body;

  if (!email.length || !password.length)
    return res
      .status(409)
      .json({ message: 'Fill up all sign in inputs properly!' });

  const q = 'SELECT * FROM user WHERE email = ?;';

  db.query(q, [email], async (err, output) => {
    if (err) return res.status(500).json(err);

    const data = output as RowDataPacket[];

    if (Array.isArray(data) && data.length === 0)
      return res.status(404).json({ message: 'User not found!' });

    const comparePass = bcrypt.compareSync(req.body.password, data[0].password);

    if (!comparePass)
      return res.status(400).json({ message: 'Wrong password or email!' });

    const verified = await checkIfUserIsVerified(email);

    if (Array.isArray(verified) && verified.length === 0)
      return res.status(409).json({ message: 'Verify your account by email!' });

    const token = jwt.sign(
      { id: data[0].id, username: data[0].username },
      process.env.JWT_SECRET_KEY as Secret
    );

    const { password, ...others } = data[0];

    res
      .cookie('access_token', token, {
        httpOnly: true,
        cookie: { domain: 'devdomain.site' },
        maxAge: 3600 * 60 * 60 * 60,
      })
      .status(200)
      .json(others);
  });
};

export const signout = (req: Request, res: Response) => {
  res
    .clearCookie('access_token', {
      secure: true,
      sameSite: 'none',
    })
    .status(200)
    .json({ message: 'Signed Out!' });
};

const checkIfUserIsVerified = (email: string) => {
  const q = 'SELECT * FROM user WHERE email=? AND verified=1;';

  return new Promise((resolve, reject) => {
    db.query(q, [email], (err, result) => {
      if (err) {
        reject({ message: err });
      } else {
        resolve(result);
      }
    });
  });
};

const markEmailAsVerified = (username: string) => {
  const q = 'UPDATE user SET verified=1 WHERE username=?;';

  return new Promise((resolve, reject) => {
    db.query(q, [username], (err, data) => {
      if (err) {
        console.error(err);
        reject({ verified: 'failed' });
      } else {
        resolve({ verified: 'success' });
      }
    });
  });
};

const sendEmail = (options: Mail.Options) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.VERIFY_EMAIL,
      pass: process.env.VERIFY_EMAIL_PASSWORD,
    },
  });

  transporter.sendMail(options, (error, info) => {
    if (error) console.log(error);
    if (info) console.log(info);
  });
};

// delete account
export const deleteAccount = (req: Request, res: Response) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ message: 'You are not signed in!' });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET_KEY as Secret,
    async (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      if (err) {
        return res.status(403).json({ message: 'Token is not valid!' });
      }

      const userInfo: userInfoProps = decoded as userInfoProps;
      const q = 'DELETE FROM user WHERE id = ?;';

      db.query(q, [userInfo.id], (err, data) => {
        if (err) return res.status(500).json(err);

        return res.status(200).json({ message: 'account has been deleted!' });
      });
    }
  );
};
