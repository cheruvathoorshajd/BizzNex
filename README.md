
# BizzNex: Business Management Suite 

A comprehensive business management suite designed to streamline and centralize essential operations. This tool provides an all-in-one platform for task management, budgeting, invoicing, and analytics. With intuitive interfaces and interactive dashboards, users can oversee projects, track expenses, manage customer relationships, and analyze key metrics, making it perfect for businesses seeking to enhance productivity and gain a 360° view of operations.


**BizzNex** is an all-in-one business management suite designed to streamline and centralize essential operations. This tool provides a 360° platform to support businesses by combining functionalities for task management, CRM, inventory tracking, budgeting, invoicing, and analytics. Built with a modular approach and Domain-Driven Design principles, BizzNex aims to enhance productivity and provide comprehensive insights into daily operations.


---

## Table of Contents

- [Project Overview](#project-overview)
- [Domain Model](#domain-model)
- [REST API Documentation](#rest-api-documentation)
- [API Modules](#api-modules)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)

---

## Project Overview

BizzNex is a comprehensive suite developed to address key operational needs of small and medium-sized enterprises. With its focus on modularity and maintainability, the project uses **Domain-Driven Design (DDD)** to separate core business domains and enhance scalability. BizzNex offers a cohesive API ecosystem that lets businesses interact with tasks, projects, customer information, expenses, invoices, and analytics in one place.

### Key Features
- **Task & Project Management**: Organize tasks and track project timelines.
- **Inventory & Resource Management**: Monitor inventory levels, costs, and supplies.
- **Budget & Expense Tracking**: Keep track of expenses for projects and overall business.
- **Invoicing & Billing**: Generate, view, and update invoices.

---

# Task Management Application 

## Overview

This project is a **Task Management System** designed to help users create, manage, and organize projects and tasks. It includes tools like a calculator, chatbot, notes tool, content publisher, notifications, email newsletter, and event tracker. The application is built using **React**, styled with **Fluent UI** and **Sass**, and supports localization for multiple languages.

---

## Features

- **Project Management**: Create, edit, and delete projects.
- **Task Management**: Add tasks to projects with details like name, description, start date, and end date.
- **Localization**: Switch between multiple languages (e.g., English and Spanish).
- **Integrated Tools**:
  - Calculator
  - Chatbot
  - Notes Tool
  - Content Publisher
  - Multi-platform Notifications
  - Email Newsletter Manager
  - Event Tracker
- **Responsive Design**: Optimized for desktop and mobile devices.
- **Animations**: Smooth transitions using `framer-motion`.

---

## Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (v8 or higher)

---

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/cheruvathoorshajd/BizzNex.git
  ```

2. Install dependencies: (if needed)

   ```bash
   npm install node
   npm install axios --save
   npm install @fluentui/react --save
   npm install @fluentui/react/lib/Icons --save
   npm install @fluentui/react/lib/DataPicker --save
   npm install react framer-motion styled-components
   npm install '@vis.gl/react-google-maps'
   npm install @deck.gl/react
   npm install @deck.gl/google-maps
   npm install @vis.gl/react-google-maps library
   npm install --save-dev @type/google.maps @types/node
   npm install framer-motion
   npm install -D sass-embedded
   npm install sass node-sass --save
   npm install --save-dev vitest
   npm install react-router-dom axios express body-parser cors dotenv
   npm install --save-dev typescript ts-node @types/node @types/express @cors
   npm i -s react-router @reduxjs/toolkit react-redux
   ```

---

## Running the Application

Make sure your inside the app directory in your Vscode 

```bash
cd app
```

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:

   ```
   http://localhost:3005/
   ```

---

## Project Structure

```
src/
├── components/         # Reusable components like Chatbot, NotesTool, etc.
├── pages/              # Page-level components (e.g., Calculator, EmailNewsletter)
├── store/              # Redux store setup for state management
├── styles/             # Global styles (Sass files)
├── i18/                # Localization files for multilingual support
├── App.tsx             # Main application component
└── index.tsx           # Entry point of the application
```

---

## Usage Guide

### Creating a Project

1. Enter a project name in the "Create a Project" section.
2. Click the "Create Project" button.

### Adding Tasks to a Project

1. Select a project from the dropdown menu in the "Create a Task" section.
2. Fill in the task details:
   - Name
   - Description
   - Start Date (using the date picker)
   - End Date (using the date picker)
3. Click "Create Task" to add the task.

### Editing or Deleting Tasks

- Use the **Edit** button to modify task details.
- Use the **Delete** button to remove a task.

### Switching Languages

- Click on "English" or "Español" buttons in the header to toggle between languages.

### Using Integrated Tools

- Access tools like Calculator, Chatbot, or Event Tracker via the navigation bar.

---

## Example Code Snippets

### Running Tests

The project uses `vitest` for testing. To run tests:

```bash
npm test
```

### Adding a New Feature (e.g., New Tool)

1. Create a new component in `src/components/`.
2. Import and integrate it into `App.tsx`.
3. Add styling in `styles/styles.scss`.

---

## Dependencies

Below are key libraries used in this project:

| Dependency                  | Purpose                                   |
|-----------------------------|-------------------------------------------|
| `react`                     | Core library for building UI             |
| `@fluentui/react`           | Fluent UI components                     |
| `framer-motion`             | Animations                               |
| `styled-components`         | Styling                                  |
| `redux`, `react-redux`      | State management                         |
| `sass`, `node-sass`         | Styling with Sass                        |
| `axios`                     | HTTP requests                            |
| `react-router-dom`          | Routing                                  |
| `express`, `body-parser`    | Backend server setup                     |

---

## Contributing - Dennis Sharon Cheruvathoor Shaj

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push them to your fork.
4. Submit a pull request.

---

## License

This project is licensed under the MIT License.

© 2024 BizzNex. All rights reserved.


