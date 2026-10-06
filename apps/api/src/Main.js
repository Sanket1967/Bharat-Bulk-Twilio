import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import logger from './utils/logger.js';
import { BodyLimit } from './constants/common.js';
const app = express();
app.set('trust proxy', true);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Authorization','Content-Type','x-api-key','X-API-KEY','x-bharat-key'],
  exposedHeaders: ['Content-Range'],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(globalRateLimit);
app.use(express.json({ limit: BodyLimit }));
app.use(express.urlencoded({ extended: true, limit: BodyLimit }));
app.use('/', routes());
app.use(errorMiddleware);
app.use((req,res)=>{ res.status(404).json({error:'Route not found: '+req.method+' '+req.path}); });
const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', ()=>{ logger.info(`🚀 API Server running on 0.0.0.0:${port}`); });
export default app;
