import React, { useState } from 'react';
import { Stack, Text, TextField, PrimaryButton } from "@fluentui/react";

interface ProjectCreationProps {
  onProjectCreate: (projectName: string) => void;
}

/**
 * `ProjectCreation` is a React functional component that provides a form for creating a new project.
 * 
 * @component
 * @param {ProjectCreationProps} props - The props for the component.
 * @param {Function} props.onProjectCreate - Callback function to handle project creation.
 * 
 * @returns {JSX.Element} The rendered component.
 * 
 * @example
 * <ProjectCreation onProjectCreate={handleProjectCreate} />
 * 
 * @remarks
 * This component uses Fluent UI's `Stack`, `Text`, `TextField`, and `PrimaryButton` components for layout and styling.
 * 
 * @see https://developer.microsoft.com/en-us/fluentui#/controls/web
 */
 
/**
 * Handles the submission of the project creation form.
 * If the project name is not empty, it calls the `onProjectCreate` callback and resets the project name state.
 */
 
/**
 * Renders the project creation form with a title, input field for the project name, and a submit button.
 * The submit button is disabled if the project name is empty.
 * 
 * @returns {JSX.Element} The rendered project creation form.
 */
const ProjectCreation: React.FC<ProjectCreationProps> = ({ onProjectCreate }) => {
  const [projectName, setProjectName] = useState<string>("");

  const handleProjectSubmit = () => {
    if (projectName.trim()) {
      onProjectCreate(projectName);
      setProjectName("");
    }
  };

  return (
    <Stack tokens={{ childrenGap: 10, padding: 20 }} styles={{
      root: {
        background: 'var(--neutral-lighter-alt)',
        borderRadius: 5,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }}>
      <Text variant="large" styles={{ root: { fontWeight: 600 } }}>Create a Project</Text>
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
    </Stack>
  );
};

export default ProjectCreation;

