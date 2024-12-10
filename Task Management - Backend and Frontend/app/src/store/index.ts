import { configureStore } from '@reduxjs/toolkit';
import projectsReducer from './projectsSlice';

/**
 * @file This file sets up the Redux store for the application.
 * It configures the store with the necessary reducers.
 */
/**
 * Configures the Redux store for the application.
 * 
 * The store is created using `configureStore` from Redux Toolkit.
 * It includes a single reducer for managing the state of projects.
 * 
 * @constant
 * @type {EnhancedStore}
 * @property {Object} reducer - An object containing the reducers for the store.
 * @property {Function} reducer.projects - The reducer function for managing the projects state.
 */
export const store = configureStore({
  reducer: {
    projects: projectsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;