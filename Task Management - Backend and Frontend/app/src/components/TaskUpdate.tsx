import React, { useState, useEffect } from 'react';
import { Stack, Text, TextField, PrimaryButton, Dropdown, IDropdownOption } from "@fluentui/react";
import Calendar from './Calendar.tsx';
import Location from './Location.tsx';

interface Task {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
}

interface Project {
  id: number;
  name: string;
  tasks: Task[];
}

interface TaskUpdateProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
  onTaskSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  editingTask: Task | null;
  taskLocation: { name: string; lat: number; lng: number } | null;
}

/**
 * TaskUpdate component allows users to create or edit a task.
 * 
 * @component
 * @param {TaskUpdateProps} props - The properties for the TaskUpdate component.
 * @param {Project[]} props.projects - List of available projects.
 * @param {Project | null} props.selectedProject - The currently selected project.
 * @param {function} props.onProjectSelect - Callback function to handle project selection.
 * @param {function} props.onTaskSubmit - Callback function to handle task submission.
 * @param {Task | null} props.editingTask - The task being edited, if any.
 * @param {{ name: string; lat: number; lng: number } | null} props.taskLocation - The location of the task.
 * 
 * @returns {JSX.Element} The rendered TaskUpdate component.
 * 
 * @example
 * <TaskUpdate
 *   projects={projects}
 *   selectedProject={selectedProject}
 *   onProjectSelect={handleProjectSelect}
 *   onTaskSubmit={handleTaskSubmit}
 *   editingTask={editingTask}
 *   taskLocation={taskLocation}
 * />
 */
/**
 * TaskUpdate component allows users to create or edit a task within a selected project.
 * It provides fields for task name, description, start and end dates, and location.
 * 
 * @component
 * @param {TaskUpdateProps} props - The properties for the TaskUpdate component.
 * @param {Project[]} props.projects - The list of available projects.
 * @param {Project | null} props.selectedProject - The currently selected project.
 * @param {(project: Project | null) => void} props.onProjectSelect - Callback to handle project selection.
 * @param {(task: Task) => void} props.onTaskSubmit - Callback to handle task submission.
 * @param {Task | null} [props.editingTask] - The task being edited, if any.
 * @param {{ name: string; lat: number; lng: number } | null} [props.taskLocation] - The location of the task.
 * 
 * @returns {JSX.Element} The rendered TaskUpdate component.
 * 
 * @example
 * <TaskUpdate
 *   projects={projects}
 *   selectedProject={selectedProject}
 *   onProjectSelect={handleProjectSelect}
 *   onTaskSubmit={handleTaskSubmit}
 *   editingTask={editingTask}
 *   taskLocation={taskLocation}
 * />
 * 
 * @remarks
 * This component uses the `useState` and `useEffect` hooks to manage form state and side effects.
 * It also uses Fluent UI components such as `Stack`, `Text`, `Dropdown`, `TextField`, `Calendar`, and `PrimaryButton`.
 */
const TaskUpdate: React.FC<TaskUpdateProps> = ({
  projects,
  selectedProject,
  onProjectSelect,
  onTaskSubmit,
  editingTask,
  taskLocation,
}) => {
  const [taskName, setTaskName] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [taskStartDate, setTaskStartDate] = useState<Date | null>(null);
  const [taskEndDate, setTaskEndDate] = useState<Date | null>(null);
  const [localTaskLocation, setLocalTaskLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (editingTask) {
      setTaskName(editingTask.name);
      setTaskDescription(editingTask.description);
      setTaskStartDate(editingTask.startDate);
      setTaskEndDate(editingTask.endDate);
      setLocalTaskLocation(editingTask.location || null);
    } else {
      setTaskName("");
      setTaskDescription("");
      setTaskStartDate(null);
      setTaskEndDate(null);
      setLocalTaskLocation(null);
    }
  }, [editingTask]);

  useEffect(() => {
    setLocalTaskLocation(taskLocation);
  }, [taskLocation]);

  const handleTaskSubmit = () => {
    if (selectedProject && taskName.trim() && taskStartDate && taskEndDate) {
      onTaskSubmit({
        name: taskName,
        description: taskDescription,
        startDate: taskStartDate,
        endDate: taskEndDate,
        location: localTaskLocation || undefined,
      });
      setTaskName("");
      setTaskDescription("");
      setTaskStartDate(null);
      setTaskEndDate(null);
      setLocalTaskLocation(null);
    }
  };

  const handleLocationAdd = (name: string, lat: number, lng: number) => {
    setLocalTaskLocation({ name, lat, lng });
  };

  const projectOptions: IDropdownOption[] = projects.map((project) => ({
    key: project.id,
    text: project.name,
  }));

  return (
    <Stack tokens={{ childrenGap: 10, padding: 20 }} styles={{
      root: {
        background: 'var(--neutral-lighter-alt)',
        borderRadius: 5,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }}>
      <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
        {editingTask ? "Edit Task" : "Create a Task"}
      </Text>
      <Dropdown
        placeholder="Select a Project"
        options={projectOptions}
        selectedKey={selectedProject?.id}
        onChange={(_, option) => {
          const project = projects.find((p) => p.id === option?.key);
          onProjectSelect(project || null);
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
      <Calendar
        label="Start Date"
        selectedDate={taskStartDate}
        onSelectDate={setTaskStartDate}
      />
      <Calendar
        label="End Date"
        selectedDate={taskEndDate}
        onSelectDate={setTaskEndDate}
      />
      <Location onLocationAdd={handleLocationAdd} />
      {localTaskLocation && (
        <TextField
          label="Selected Location"
          value={`${localTaskLocation.name} (${localTaskLocation.lat}, ${localTaskLocation.lng})`}
          readOnly
        />
      )}
      <PrimaryButton
        text={editingTask ? "Update Task" : "Create Task"}
        onClick={handleTaskSubmit}
        disabled={!selectedProject || !taskName.trim() || !taskStartDate || !taskEndDate}
      />
    </Stack>
  );
};

/**
 * TaskUpdate component
 * 
 * This component is responsible for handling the update of tasks within the application.
 * It provides the UI and functionality to modify existing tasks.
 * 
 * @component
 * @example
 * ```tsx
 * <TaskUpdate task={task} onUpdate={handleUpdate} />
 * ```
 * 
 * @param {Object} props - The properties object.
 * @param {Task} props.task - The task object that needs to be updated.
 * @param {Function} props.onUpdate - The callback function to handle the task update.
 * 
 * @returns {JSX.Element} The rendered TaskUpdate component.
 */
export default TaskUpdate;