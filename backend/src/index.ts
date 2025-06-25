import express, { type Request,  type Response, type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'API is running successfully!',
    timestamp: new Date().toISOString()
  });
});

// Routes
// app.use('/api/auth', authRoutes); // We'll create this

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});