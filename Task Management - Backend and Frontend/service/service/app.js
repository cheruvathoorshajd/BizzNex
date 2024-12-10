import mongoose from "mongoose";
import cors from "cors";
import express from "express";
import initializeRoutes from "./routers/index.js";

/**
 * Application initializer.
 *
 * Configures and initializes the Express application with:
 * - Middleware for CORS, JSON parsing, and URL-encoded data.
 * - Connection to MongoDB using environment variables.
 * - Application routes.
 *
 * @module app
 */

/**
 * Initializes the Express application with necessary configurations.
 *
 * @function
 * @param {express.Application} app - The Express application instance.
 * 
 * @throws {Error} If MongoDB connection fails.
 * 
 * @example
 * import express from "express";
 * import initialize from "./app.js";
 * 
 * const app = express();
 * initialize(app);
 * 
 * app.listen(3000, () => {
 *   console.log("Server is running on port 3000");
 * });
 */
const initialize = (app) => {
  // Enable CORS to handle cross-origin requests
  app.use(cors());

  // Middleware for parsing incoming JSON requests
  app.use(express.json());

  // Middleware for parsing URL-encoded form data
  app.use(express.urlencoded({ extended: true }));

  // Connect to MongoDB
  const mongoConnection = process.env.MONGO_CONNECTION;
  if (!mongoConnection) {
    throw new Error("MongoDB connection string is missing in environment variables.");
  }

   // Connect to MongoDB using the connection string from environment variables
   mongoose.connect(process.env.MONGO_CONNECTION)
   .then(() => {
       console.log("MongoDB connected successfully.");
   })
   .catch((error) => {
       console.error("Error connecting to MongoDB:", error);
       throw new Error("MongoDB connection failed");
   });



  // Initialize application routes
  initializeRoutes(app);
};

export default initialize;
