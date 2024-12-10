import TaskManagement from "../models/task_management.js";

/**
 * Save a new task management entry to the database.
 */
export const save = async (newTaskManagement) => {
  try {
    const taskManagement = new TaskManagement(newTaskManagement);
    return await taskManagement.save();
  } catch (error) {
    console.error("Error saving task management:", error);
    throw new Error("Error saving task management: " + error.message);
  }
};

/**
 * Get all task management entries from the database.
 */
export const getAllProjects = async () => {
  try {
    return await TaskManagement.find({});
  } catch (error) {
    console.error("Error fetching all projects:", error);
    throw new Error("Error fetching all projects: " + error.message);
  }
};

/**
 * Get a specific task management entry by ID.
 */
export const getProjectById = async (projectId) => {
  try {
    return await TaskManagement.findById(projectId);
  } catch (error) {
    console.error(`Error fetching project with ID ${projectId}:`, error);
    throw new Error(`Error fetching project with ID ${projectId}: ${error.message}`);
  }
};

/**
 * Update a specific project by ID.
 */
export const updateProject = async (projectId, updates) => {
  try {
    return await TaskManagement.findByIdAndUpdate(projectId, updates, { new: true });
  } catch (error) {
    console.error(`Error updating project with ID ${projectId}:`, error);
    throw new Error(`Error updating project with ID ${projectId}: ${error.message}`);
  }
};

/**
 * Delete a specific project by ID.
 */
export const deleteProject = async (projectId) => {
  try {
    return await TaskManagement.findByIdAndDelete(projectId);
  } catch (error) {
    console.error(`Error deleting project with ID ${projectId}:`, error);
    throw new Error(`Error deleting project with ID ${projectId}: ${error.message}`);
  }
};

/**
 * Add a new task to a specific project.
 */
export const addTask = async (projectId, newTask) => {
  try {
    const project = await TaskManagement.findById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    project.tasks.push(newTask);
    return await project.save();
  } catch (error) {
    console.error(`Error adding task to project with ID ${projectId}:`, error);
    throw new Error(`Error adding task to project with ID ${projectId}: ${error.message}`);
  }
};

/**
 * Update a specific task within a project.
 */
export const updateTask = async (projectId, taskId, updates) => {
  try {
    const project = await TaskManagement.findById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    const task = project.tasks.id(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    Object.assign(task, updates);
    return await project.save();
  } catch (error) {
    console.error(`Error updating task with ID ${taskId} in project ${projectId}:`, error);
    throw new Error(`Error updating task with ID ${taskId}: ${error.message}`);
  }
};

/**
 * Delete a specific task within a project.
 */
export const deleteTask = async (projectId, taskId) => {
  try {
    const project = await TaskManagement.findById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    project.tasks.id(taskId).remove();
    return await project.save();
  } catch (error) {
    console.error(`Error deleting task with ID ${taskId} in project ${projectId}:`, error);
    throw new Error(`Error deleting task with ID ${taskId}: ${error.message}`);
  }
};
