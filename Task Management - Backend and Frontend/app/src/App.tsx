import React, { useState } from "react";
import {
  ThemeProvider,
  createTheme,
  Stack,
  Text,
  PrimaryButton,
  TextField,
  IconButton,
  DatePicker,
  IDatePickerStrings,
  Dropdown,
  IDropdownOption,
  CommandBar,
} from "@fluentui/react";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import "./style/styles.scss";
import Chatbot from "./components/Chatbot";
import Calculator from "./pages/Calculator";
import NotesTool from "./components/NotesTool";
import ContentPublisher from "./components/ContentPublisher";
import MultiPlatformNotifications from "./components/MultiPlatformNotifications";
import EmailNewsletter from "./pages/EmailNewsletter";
import EventTracker from "./pages/EventTracker";
import { motion } from "framer-motion";
import { Provider } from "react-redux";
import { store } from "./store";
import { IntlProvider, FormattedMessage } from "react-intl";
import { messages } from "./i18/messages";

initializeIcons();

const theme = createTheme({
  palette: {
    themePrimary: "#7e86d9",
    themeLighterAlt: "#f7f8fc",
    themeLighter: "#e1e3f7",
    themeLight: "#c9ccf1",
    themeTertiary: "#9ba1e2",
    themeSecondary: "#7e86d9",
    themeDarkAlt: "#7279c3",
    themeDark: "#6066a4",
    themeDarker: "#464b79",
    neutralLighterAlt: "#faf9f8",
    neutralLighter: "#f3f2f1",
    neutralLight: "#edebe9",
    neutralQuaternaryAlt: "#e1dfdd",
    neutralQuaternary: "#d0d0d0",
    neutralTertiaryAlt: "#c8c6c4",
    neutralTertiary: "#86868b",
    neutralSecondary: "#605e5c",
    neutralPrimaryAlt: "#3b3a39",
    neutralPrimary: "#323130",
    neutralDark: "#201f1e",
    black: "#000000",
    white: "#ffffff",
  },
});


/**
 * Represents a task within a project.
 */
interface Task {
  /** Unique identifier for the task */
  id: number;
  /** Name of the task */
  name: string;
  /** Detailed description of the task */
  description: string;
  /** Date when the task is scheduled to start */
  startDate: Date;
  /** Date when the task is scheduled to end */
  endDate: Date;
  /** Date when the task was created */
  createdAt: Date;
}

/**
 * Represents a project containing multiple tasks.
 */
interface Project {
  /** Unique identifier for the project */
  id: number;
  /** Name of the project */
  name: string;
  /** Array of tasks associated with the project */
  tasks: Task[];
}

/**
 * Initial array of projects with their associated tasks.
 */
const initialProjects: Project[] = [
  {
    id: 1,
    name: "Thanksgiving Gifts",
    tasks: [
      {
        id: 1,
        name: "Task 1",
        description: "Buy gift wrappers and cardboard.",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-01-10"),
        createdAt: new Date("2023-01-01"),
      },
      {
        id: 2,
        name: "Task 2",
        description: "Don't forget to buy chocolates.",
        startDate: new Date("2023-01-11"),
        endDate: new Date("2023-01-20"),
        createdAt: new Date("2023-01-11"),
      },
    ],
  },
  {
    id: 2,
    name: "Christmas Decorations",
    tasks: [
      {
        id: 3,
        name: "Task 1",
        description: "Buy Christmas lights and ornaments.",
        startDate: new Date("2023-12-01"),
        endDate: new Date("2023-12-10"),
        createdAt: new Date("2023-12-01"),
      },
      {
        id: 4,
        name: "Task 2",
        description: "Set up the Christmas tree.",
        startDate: new Date("2023-12-11"),
        endDate: new Date("2023-12-20"),
        createdAt: new Date("2023-12-11"),
      },
    ],
  }
];
/** Calendar stepup for marking dates */
const datePickerStrings: IDatePickerStrings = {
  months: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],
  shortMonths: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["S", "M", "T", "W", "T", "F", "S"],
  goToToday: "Go to today",
  prevMonthAriaLabel: "Go to previous month",
  nextMonthAriaLabel: "Go to next month",
  prevYearAriaLabel: "Go to previous year",
  nextYearAriaLabel: "Go to next year",
  closeButtonAriaLabel: "Close date picker",
};
/** Main App component for project and task management */
/**
 * The main application component for the Task Management system.
 * 
 * This component handles the state and UI for managing projects and tasks,
 * including creating, editing, and deleting projects and tasks. It also 
 * provides localization support and various tool modals such as a calculator,
 * chatbot, notes tool, content publisher, notifications, email newsletter, 
 * and event tracker.
 * 
 * @component
 * @example
 * return (
 *   <App />
 * )
 * 
 * @returns {JSX.Element} The rendered component.
 */
const App: React.FC = () => {
    // State variables for managing projects, tasks, UI visibility, and localization
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [taskName, setTaskName] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [taskStartDate, setTaskStartDate] = useState<Date | null>(null);
  const [taskEndDate, setTaskEndDate] = useState<Date | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isNotesToolOpen, setIsNotesToolOpen] = useState(false);
  const [isContentPublisherOpen, setIsContentPublisherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isEmailNewsletterOpen, setIsEmailNewsletterOpen] = useState(false);
  const [isEventTrackerOpen, setIsEventTrackerOpen] = useState(false);
  const [locale, setLocale] = useState("en");
/** Handles the submission of a new project */
  const handleProjectSubmit = () => {
    if (projectName.trim()) {
      const newProject: Project = {
        id: Date.now(),
        name: projectName,
        tasks: [],
      };
      setProjects((prevProjects) => [...prevProjects, newProject]);
      setProjectName("");
    }
  };
/** Handles the submission of a new task or updates an existing task */
  const handleTaskSubmit = () => {
      
    if (selectedProject && taskName.trim() && taskStartDate && taskEndDate) {
      const newTask: Task = {
        id: editingTaskId || Date.now(),
        name: taskName,
        description: taskDescription,
        startDate: taskStartDate,
        endDate: taskEndDate,
        createdAt: editingTaskId // Implementation...
          ? (selectedProject.tasks.find(t => t.id === editingTaskId)?.createdAt || new Date())
          : new Date(),
      };
      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === selectedProject.id
            ? {
                ...project,
                tasks: editingTaskId
                  ? project.tasks.map((task) => (task.id === editingTaskId ? newTask : task))
                  : [...project.tasks, newTask],
              }
            : project
        )
      );
      setTaskName("");
      setTaskDescription("");
      setTaskStartDate(null);
      setTaskEndDate(null);
      setEditingTaskId(null);
    }
  };
/** Deletes a specific task from a project */

  const handleDeleteTask = (projectId: number, taskId: number) => {
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === projectId
          ? { ...project, tasks: project.tasks.filter((task) => task.id !== taskId) }
          : project// Implementation...
      )
    );
  };
/** Prepares a task for editing by populating the form fields */
  const handleEditTask = (projectId: number, taskId: number) => {
    const projectToEdit = projects.find((project) => project.id === projectId);
    const taskToEdit = projectToEdit?.tasks.find((task) => task.id === taskId);
    if (taskToEdit) {
      setTaskName(taskToEdit.name);
      setTaskDescription(taskToEdit.description);
      setTaskStartDate(taskToEdit.startDate);
      setTaskEndDate(taskToEdit.endDate);
      setEditingTaskId(taskId);
    }
  };
/** Removes a project from the list and clears selection if it was selected */
  const handleDeleteProject = (projectId: number) => {
    setProjects((prevProjects) => prevProjects.filter((project) => project.id !== projectId));
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  };
/** Maps projects to dropdown options for selection */
  const projectOptions: IDropdownOption[] = projects.map((project) => ({
    key: project.id,
    text: project.name,
  }));
/** Renders the main application UI */
  return (
         <Provider store={store}>
      <IntlProvider messages={messages[locale]} locale={locale}>
        <ThemeProvider theme={theme}>
          <Stack className="app-container">
            <motion.header
              className="app-header"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <motion.div
                className="title-container"
                whileHover={{ scale: 1.20 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Text variant="mega" className="gradient-text">
                  <FormattedMessage id="app.title" />
                </Text>
                <Text variant="large" className="description-text">
                  <FormattedMessage id="app.subtitle" />
                </Text>
              </motion.div>
            </motion.header>
            <Stack horizontal tokens={{ childrenGap: 10 }}>
              <PrimaryButton
                text="English"
                onClick={() => setLocale('en')}
                className={locale === 'en' ? 'active' : ''}
              />
              <PrimaryButton
                text="Español"
                onClick={() => setLocale('es')}
                className={locale === 'es' ? 'active' : ''}
              />
            </Stack>            
            <CommandBar
              items={[ 
                {//structure...
                  key: "calculator",
                  text: "Calculator",
                  iconProps: { iconName: isCalculatorOpen ? "Cancel" : "Calculator" },
                  onClick: () => setIsCalculatorOpen(!isCalculatorOpen),
                },
                {
                  key: "chatbot",
                  text: "Chatbot",
                  iconProps: { iconName: isChatbotOpen ? "Cancel" : "ChatBot" },
                  onClick: () => setIsChatbotOpen(!isChatbotOpen),
                },
                {
                  key: "notesTool",
                  text: "Notes",
                  iconProps: { iconName: isNotesToolOpen ? "Cancel" : "Calendar" },
                  onClick: () => setIsNotesToolOpen(!isNotesToolOpen),
                },
                {
                  key: "contentPublisher",
                  text: "Publisher",
                  iconProps: { iconName: isContentPublisherOpen ? "Cancel" : "Upload" },
                  onClick: () => setIsContentPublisherOpen(!isContentPublisherOpen),
                },
                {
                  key: "notifications",
                  text: "Notifications",
                  iconProps: { iconName: isNotificationsOpen ? "Cancel" : "Ringer" },
                  onClick: () => setIsNotificationsOpen(!isNotificationsOpen),
                },
                {
                  key: "emailNewsletter",
                  text: "Newsletter",
                  iconProps: { iconName: isEmailNewsletterOpen ? "Cancel" : "Mail" },
                  onClick: () => setIsEmailNewsletterOpen(!isEmailNewsletterOpen),
                },
                {
                  key: "eventTracker",
                  text: "Event Tracker",
                  iconProps: { iconName: isEventTrackerOpen ? "Cancel" : "Calendar" },
                  onClick: () => setIsEventTrackerOpen(!isEventTrackerOpen),
                }
              ]}
              className="app-navbar"
            />
            {isCalculatorOpen && (
              <div className="tool-modal">
                <Calculator />
              </div>
            )}
            {isChatbotOpen && (
              <div className="tool-modal">
                <Chatbot />
              </div>
            )}
            {isNotesToolOpen && (
              <div className="tool-modal">
                <NotesTool />
              </div>
            )}
            {isContentPublisherOpen && (
              <div className="tool-modal">
                <ContentPublisher />
              </div>
            )}
            {isNotificationsOpen && (
              <div className="tool-modal">
                <MultiPlatformNotifications />
              </div>
            )}
            {isEmailNewsletterOpen && (
              <div className="tool-modal full-screen">
                <EmailNewsletter />
              </div>
            )}
            {isEventTrackerOpen && (
              <div className="tool-modal">
                <EventTracker />
              </div>
            )}
            <main className="app-main">
              <section className="app-section">
                <Text variant="xLarge">Create a Project</Text>
                <TextField
                  placeholder="Project Name"
                  value={projectName}
                  onChange={(_, value) => setProjectName(value || "")}
                />
                <PrimaryButton
                  text="Create Project"
                  onClick={handleProjectSubmit}
                  disabled={!projectName.trim()}
                />
              </section>
              <section className="app-section">
                <Text variant="xLarge">{editingTaskId !== null ? "Edit Task" : "Create a Task"}</Text>
                <Dropdown
                  placeholder="Select a Project"
                  options={projectOptions}
                  selectedKey={selectedProject?.id}
                  onChange={(_, option) => {
                    const project = projects.find((p) => p.id === option?.key);
                    setSelectedProject(project || null);
                  }}
                />
                <TextField
                  placeholder="Task Name"
                  value={taskName}
                  onChange={(_, value) => setTaskName(value || "")}
                />
                <TextField
                  placeholder="Task Description"
                  multiline
                  rows={3}
                  value={taskDescription}
                  onChange={(_, value) => setTaskDescription(value || "")}
                />
                <DatePicker
                  label="Start Date"
                  strings={datePickerStrings}
                  value={taskStartDate || undefined}
                  onSelectDate={(date) => setTaskStartDate(date || null)}
                />
                <DatePicker
                  label="End Date"
                  strings={datePickerStrings}
                  value={taskEndDate || undefined}
                  onSelectDate={(date) => setTaskEndDate(date || null)}
                />
                <PrimaryButton
                  text={editingTaskId !== null ? "Update Task" : "Create Task"}
                  onClick={handleTaskSubmit}
                  disabled={!selectedProject || !taskName.trim() || !taskStartDate || !taskEndDate}
                />
              </section>
          <section className="app-section projects-tasks">
            <Text variant="xLarge">Projects and Tasks</Text>
            
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                  <Text variant="large">{project.name}</Text>
                  <IconButton
                  iconProps={{ iconName: "Delete", styles: { root: { color: 'red' } } }}
                  title="Delete Project"
                  ariaLabel="Delete Project"
                  onClick={() => handleDeleteProject(project.id)}
                  />
                </Stack>
                {project.tasks.map((task) => (
                  <div key={task.id} className="task-card">
                    <Stack horizontal horizontalAlign="space-between">
                      <Text styles={{ root: { fontWeight: 600 } }}>{task.name}</Text>
                        <Stack horizontal>
                        <IconButton iconProps={{ iconName: "Edit" }} title="Edit" ariaLabel="Edit Task" onClick={() => handleEditTask(project.id, task.id)} />
                        <IconButton iconProps={{ iconName: "Delete", styles: { root: { color: 'red' } } }} title="Delete" ariaLabel="Delete Task" onClick={() => handleDeleteTask(project.id, task.id)} />
                        </Stack>
                    </Stack>
                    <Text>{task.description}</Text>
                    <Text>Start: {task.startDate.toLocaleDateString()}</Text>
                    <Text>End: {task.endDate.toLocaleDateString()}</Text>
                    <Text>Created: {task.createdAt.toLocaleString()}</Text>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </main>
        <footer className="app-footer">
          <Text variant="small">© 2024 BizzHub. All rights reserved.</Text>
        </footer>
          </Stack>
        </ThemeProvider>
      </IntlProvider>
    </Provider>
  );
};
/* Renders a list of projects and their associated tasks 
Displays each project with its name and a delete button
For each project, renders its tasks with details and edit/delete options
Renders the application footer
Displays copyright information */
export default App;

