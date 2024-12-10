// routes/projectRoutes.js
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Project Schema
/**
 * @file projectRoutes.js
 * @description This file defines the schema for the Project model using Mongoose.
 * It includes the structure for projects and their associated tasks.
 */

/**
 * @typedef {Object} Task
 * @property {string} taskName - The name of the task.
 * @property {string} description - A brief description of the task.
 * @property {Object} timeline - The timeline for the task.
 * @property {Date} timeline.startDate - The start date of the task.
 * @property {Date} timeline.endDate - The end date of the task.
 */

/**
 * @typedef {Object} Project
 * @property {string} projectName - The name of the project.
 * @property {Task[]} tasks - An array of tasks associated with the project.
 */

/**
 * @constant {mongoose.Schema} projectSchema
 * @description Mongoose schema for the Project model.
 * @property {string} projectName - The name of the project. This field is required.
 * @property {Task[]} tasks - An array of tasks associated with the project.
 */
const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  tasks: [{
    taskName: String,
    description: String,
    timeline: {
      startDate: Date,
      endDate: Date
    }
  }]
});

const Project = mongoose.model('Project', projectSchema);

// Create project route
router.post('/api/projects', async (req, res) => {
  try {
    const project = new Project({
      projectName: req.body.projectName,
      tasks: []
    });
    const savedProject = await project.save();
    res.status(201).json(savedProject);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;