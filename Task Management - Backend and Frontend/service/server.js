// Import necessary libraries and modules
import dotenv from "dotenv";                     // Loads environment variables from a .env file into process.env
import express from "express";                   // Express framework for building web applications
import initialize from "./service/app.js";       // Import custom initialization logic for setting up routes, middlewares, and services

// Load environment variables from .env file into process.env
dotenv.config();

// Create an instance of the Express application
const app = express();

// Get the port number for the application from environment variables
// The port value is set in the .env file (e.g., PORT=3002)
const port = process.env.PORT;

// Initialize the application (sets up middlewares, routes, and services)
initialize(app);

// Start the Express server and listen on the specified port
app.listen(port, () => {
    // Log the server's running port once the server is up
    console.log(`Listening to port ${port}`);
});
