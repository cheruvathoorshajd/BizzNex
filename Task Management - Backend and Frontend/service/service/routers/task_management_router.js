import express from "express";
import * as taskManagementController from "../controllers/task_management_controller.js";

const router = express.Router();

/**
 * POST /projects
 * Create a new project.
 */
router.route('/')
    .post(taskManagementController.createProject)  // Fixed: Point to the correct controller function
    .get(taskManagementController.getAllProjects);  // List all projects

/**
 * GET /projects/:projectId
 * Retrieve a specific project by ID.
 */
router.route('/:projectId')
    .get(taskManagementController.getProjectById)  // Retrieve project details by ID
    .patch(taskManagementController.updateProject)  // Update project details
    .delete(taskManagementController.deleteProject);  // Delete project by ID

/**
 * POST /projects/:projectId/tasks
 * Add a new task to a specific project.
 */
router.route('/:projectId/tasks')
    .post(taskManagementController.addTask);  // Add task to a project

/**
 * PATCH /projects/:projectId/tasks/:taskId
 * Update a specific task within a project.
 */
router.route('/:projectId/tasks/:taskId')
    .patch(taskManagementController.updateTask);  // Update task within a project

/**
 * DELETE /projects/:projectId/tasks/:taskId
 * Delete a specific task from a project.
 */
router.route('/:projectId/tasks/:taskId')
    .delete(taskManagementController.deleteTask);  // Delete task from a project

export default router;
