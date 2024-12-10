import * as taskManagementService from "../services/task_management_service.js";

/**
 * Create a new project.
 */
export const createProject = async (request, response) => {
  try {
    const newProject = { ...request.body };
    const createdProject = await taskManagementService.save(newProject);  // Use save function from service
    response.status(201).json(createdProject);
  } catch (error) {
    console.error("Error creating project:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};

/**
 * Get all projects.
 */
export const getAllProjects = async (request, response) => {
  try {
    const projects = await taskManagementService.getAllProjects();
    response.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};

/**
 * Get a specific project by ID.
 */
export const getProjectById = async (request, response) => {
  try {
    const { projectId } = request.params;
    const project = await taskManagementService.getProjectById(projectId);
    if (!project) {
      return response.status(404).json({ error: `Project with ID ${projectId} not found` });
    }
    response.status(200).json(project);
  } catch (error) {
    console.error("Error retrieving project:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};

/**
 * Update project details.
 */
export const updateProject = async (request, response) => {
  try {
    const { projectId } = request.params;
    const updates = { ...request.body };
    const updatedProject = await taskManagementService.updateProject(projectId, updates);
    if (!updatedProject) {
      return response.status(404).json({ error: `Project with ID ${projectId} not found` });
    }
    response.status(200).json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};

/**
 * Delete a project.
 */
export const deleteProject = async (request, response) => {
  try {
    const { projectId } = request.params;
    const deletedProject = await taskManagementService.deleteProject(projectId);
    if (!deletedProject) {
      return response.status(404).json({ error: `Project with ID ${projectId} not found` });
    }
    response.status(200).json({ message: "Project deleted successfully." });
  } catch (error) {
    console.error("Error deleting project:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};

/**
 * Add a new task to a project.
 */
export const addTask = async (request, response) => {
  try {
    const { projectId } = request.params;
    const newTask = { ...request.body };
    const updatedProject = await taskManagementService.addTask(projectId, newTask);
    response.status(201).json(updatedProject);
  } catch (error) {
    console.error("Error adding task:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};

/**
 * Update a specific task within a project.
 */
export const updateTask = async (request, response) => {
  try {
    const { projectId, taskId } = request.params;
    const updates = { ...request.body };
    const updatedProject = await taskManagementService.updateTask(projectId, taskId, updates);
    if (!updatedProject) {
      return response.status(404).json({ error: `Task with ID ${taskId} not found` });
    }
    response.status(200).json(updatedProject);
  } catch (error) {
    console.error("Error updating task:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};

/**
 * Delete a task from a project.
 */
export const deleteTask = async (request, response) => {
  try {
    const { projectId, taskId } = request.params;
    const updatedProject = await taskManagementService.deleteTask(projectId, taskId);
    if (!updatedProject) {
      return response.status(404).json({ error: `Task with ID ${taskId} not found` });
    }
    response.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Error deleting task:", error);
    response.status(500).json({ error: "Internal server error", details: error.message });
  }
};
