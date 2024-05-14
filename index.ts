import express, { NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import cloud from './db/cloud';
import 'dotenv/config';
cloud; // init db connection

// Routes
import authRouter from './routes/authRouter';
import userRouter from './routes/userRouter';
import postRouter from './routes/postRouter';
import likeRouter from './routes/likeRouter';
import followRouter from './routes/followRouter';

// Express server setup
const app = express();
const server = http.createServer(app);

// middlewares
app.use((req, res, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'https://devdomain.site');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization'
  );
  res.header('Access-Control-Allow-Credential', 'true');
  res.header('Content-Type', 'multipart/form-data');
  next();
});
app.use(
  cors({
    origin: 'https://devdomain.site',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.json());

// Routers
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);
app.use('/api/likes', likeRouter);
app.use('/api/follows', followRouter);

server.listen(process.env.PORT || 5000, () =>
  console.log(`Listening on port ${process.env.PORT}`)
);
