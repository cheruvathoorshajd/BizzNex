import taskManagementRouter from "./task_management_router.js";  

/**
 * Initializes and configures the routes for the application.
 * 
 * @function initializeRoutes
 * @param {Object} app - The Express application instance.
 * 
 * @description
 * Sets up the routing for the application by associating specific route paths
 * with corresponding routers. It connects the `/projects` and related endpoints
 * to the `taskManagementRouter` for handling task management, resource allocation,
 * time tracking, and other project management operations.
 * 
 * @example
 * import express from 'express';
 * import initializeRoutes from './index.js';
 * 
 * const app = express();
 * initializeRoutes(app);
 * 
 * app.listen(3000, () => {
 *   console.log("Server is running on port 3005");
 * });
 */
const initializeRoutes = (app) => {
  // Attach the taskManagementRouter to handle all routes related to task management
  app.use('/projects', taskManagementRouter); // Main route for project management
};

export default initializeRoutes;
