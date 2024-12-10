import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import projectRoutes from './src/routes/projectRoutes.js';

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

// Use routes
app.use('/', projectRoutes);

const PORT = process.env.PORT || 3005;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bizzhub')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});