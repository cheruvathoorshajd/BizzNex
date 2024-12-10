// src/store/projectsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Task {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

interface Project {
  id: number;
  name: string;
  tasks: Task[];
}

interface ProjectsState {
  projects: Project[];
  selectedProject: Project | null;
}

const initialState: ProjectsState = {
  projects: [],
  selectedProject: null
};

/**
 * A slice for managing projects in the Redux store.
 * 
 * @remarks
 * This slice includes actions for adding, deleting, and updating projects and tasks,
 * as well as setting the selected project.
 * 
 * @param {string} name - The name of the slice.
 * @param {object} initialState - The initial state of the slice.
 * @param {object} reducers - The reducers for handling actions.
 * 
 * @property {function} addProject - Adds a new project to the state.
 * @property {function} deleteProject - Deletes a project from the state by its ID.
 * @property {function} updateTask - Updates a task within a specific project.
 * @property {function} setSelectedProject - Sets the selected project in the state.
 * 
 * @example
 * // Adding a new project
 * dispatch(addProject(newProject));
 * 
 * @example
 * // Deleting a project by ID
 * dispatch(deleteProject(projectId));
 * 
 * @example
 * // Updating a task within a project
 * dispatch(updateTask({ projectId, task }));
 * 
 * @example
 * // Setting the selected project
 * dispatch(setSelectedProject(project));
 */
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload);
    },
    deleteProject: (state, action: PayloadAction<number>) => {
      state.projects = state.projects.filter(project => project.id !== action.payload);
      if (state.selectedProject && state.selectedProject.id === action.payload) {
        state.selectedProject = null;
      }
    },
    updateTask: (state, action: PayloadAction<{ projectId: number; task: Task }>) => {
      const { projectId, task } = action.payload;
      const project = state.projects.find(p => p.id === projectId);
      if (project) {
        const taskIndex = project.tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
          project.tasks[taskIndex] = task;
        } else {
          project.tasks.push(task);
        }
      }
    },
    setSelectedProject: (state, action: PayloadAction<Project | null>) => {
      state.selectedProject = action.payload;
    }
  }
});

export const { addProject, deleteProject, updateTask, setSelectedProject } = projectsSlice.actions;
export default projectsSlice.reducer;