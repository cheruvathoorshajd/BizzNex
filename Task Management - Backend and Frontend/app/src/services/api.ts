/**
 * @file api.ts
 * @description This file contains the API service methods for interacting with the backend server.
 * It includes methods for creating, updating, and deleting projects and tasks.
 */

const API_BASE_URL = 'http://localhost:3005/api'; // Base URL for the API endpoint

/**
 * @interface APIResponse
 * @template T
 * @description Generic interface for API responses.
 * @property {T} [data] - The data returned from the API.
 * @property {string} [error] - The error message if the API request fails.
 */
interface APIResponse<T> {
  data?: T;
  error?: string;
}

export const api = {
  /**
   * @function createProject
   * @description Creates a new project.
   * @param {string} projectName - The name of the project to be created.
   * @returns {Promise<APIResponse<any>>} - A promise that resolves to the API response.
   */
  async createProject(projectName: string): Promise<APIResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName })
      });
      if (!response.ok) throw new Error('Failed to create project');
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: 'Failed to create project' };
    }
  },

  /**
   * @function createTask
   * @description Creates a new task within a project.
   * @param {Object} taskData - The data for the task to be created.
   * @param {number} taskData.projectId - The ID of the project to which the task belongs.
   * @param {string} taskData.taskName - The name of the task.
   * @param {string} taskData.description - The description of the task.
   * @param {Object} taskData.timeline - The timeline for the task.
   * @param {string} taskData.timeline.startDate - The start date of the task.
   * @param {string} taskData.timeline.endDate - The end date of the task.
   * @returns {Promise<APIResponse<any>>} - A promise that resolves to the API response.
   */
  async createTask(taskData: {
    projectId: number;
    taskName: string;
    description: string;
    timeline: { startDate: string; endDate: string };
  }): Promise<APIResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: 'Failed to create task' };
    }
  },

  /**
   * @function updateTask
   * @description Updates an existing task.
   * @param {number} taskId - The ID of the task to be updated.
   * @param {Object} taskData - The updated data for the task.
   * @param {string} taskData.taskName - The updated name of the task.
   * @param {string} taskData.description - The updated description of the task.
   * @param {Object} taskData.timeline - The updated timeline for the task.
   * @param {string} taskData.timeline.startDate - The updated start date of the task.
   * @param {string} taskData.timeline.endDate - The updated end date of the task.
   * @returns {Promise<APIResponse<any>>} - A promise that resolves to the API response.
   */
  async updateTask(taskId: number, taskData: {
    taskName: string;
    description: string;
    timeline: { startDate: string; endDate: string };
  }): Promise<APIResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: 'Failed to update task' };
    }
  },

  /**
   * @function deleteTask
   * @description Deletes an existing task.
   * @param {number} taskId - The ID of the task to be deleted.
   * @returns {Promise<APIResponse<any>>} - A promise that resolves to the API response.
   */
  async deleteTask(taskId: number): Promise<APIResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: 'Failed to delete task' };
    }
  }
};