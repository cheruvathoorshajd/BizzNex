/**
 * @fileoverview Entry point for the React application.
 * 
 * This file sets up the root of the React application by importing necessary modules,
 * creating a root element, and rendering the main App component within a StrictMode wrapper.
 * 
 * @module main
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * Renders the React application into the root DOM element.
 * 
 * The application is wrapped in React's StrictMode to help identify potential problems
 * in the application and provide additional checks and warnings.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
