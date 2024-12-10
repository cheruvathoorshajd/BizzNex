import React, { useState } from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  TextField,
  DefaultButton,
  DatePicker,
  IDatePickerStrings,
  Dialog,
  DialogType,
  DialogFooter,
} from '@fluentui/react';

interface Note {
  id: string;
  title: string;
  date: Date;
  location: string;
  description: string;
  createdAt: Date;
}

/**
 * An object containing localized strings for the DatePicker component.
 * 
 * @property {string[]} months - Full names of the months.
 * @property {string[]} shortMonths - Abbreviated names of the months.
 * @property {string[]} days - Full names of the days of the week.
 * @property {string[]} shortDays - Abbreviated names of the days of the week.
 * @property {string} goToToday - Label for the "Go to today" button.
 * @property {string} prevMonthAriaLabel - Aria label for the button to navigate to the previous month.
 * @property {string} nextMonthAriaLabel - Aria label for the button to navigate to the next month.
 * @property {string} prevYearAriaLabel - Aria label for the button to navigate to the previous year.
 * @property {string} nextYearAriaLabel - Aria label for the button to navigate to the next year.
 */
const datePickerStrings: IDatePickerStrings = {
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  shortDays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  goToToday: 'Go to today',
  prevMonthAriaLabel: 'Previous month',
  nextMonthAriaLabel: 'Next month',
  prevYearAriaLabel: 'Previous year',
  nextYearAriaLabel: 'Next year',
};

/**
 * NotesTool component allows users to create, view, and delete notes.
 * 
 * This component maintains a list of notes in its state and provides a dialog for creating new notes.
 * Each note contains a title, date, location, description, and creation timestamp.
 * 
 * @component
 * @example
 * return (
 *   <NotesTool />
 * )
 * 
 * @returns {JSX.Element} The rendered NotesTool component.
 * 
 * @remarks
 * - The component uses Fluent UI components for styling and layout.
 * - Notes are stored in the component's state and are not persisted.
 * 
 * @function
 * @name handleCreateNote
 * @description Handles the creation of a new note. Checks if the new note has all required fields (`title`, `date`, `location`, and `description`). If valid, creates a new note object with a unique `id`, the provided fields, and the current date as `createdAt`. Adds the new note to the existing list of notes, closes the dialog, and resets the `newNote` state with a new date.
 * 
 * @function
 * @name handleDeleteNote
 * @param {string} id - The unique identifier of the note to be deleted.
 * @description Deletes a note from the list based on its unique identifier.
 */
const NotesTool: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Note>>({
    date: new Date(),
  });

  /**
   * Handles the creation of a new note.
   * 
   * This function checks if the new note has all the required fields (`title`, `date`, `location`, and `description`).
   * If all fields are present, it creates a new note object with a unique `id`, the provided fields, and the current date as `createdAt`.
   * The new note is then added to the existing list of notes, the dialog for creating a new note is closed, and the `newNote` state is reset with a new date.
   * 
   * @returns {void}
   */
  const handleCreateNote = () => {
    if (newNote.title && newNote.date && newNote.location && newNote.description) {
      const note: Note = {
        id: Date.now().toString(),
        title: newNote.title,
        date: newNote.date,
        location: newNote.location,
        description: newNote.description,
        createdAt: new Date(),
      };
      setNotes([...notes, note]);
      setIsDialogOpen(false);
      setNewNote({ date: new Date() });
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <Stack tokens={{ childrenGap: 20 }} className="notes-tool">
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="xLarge">Notes Tool</Text>
        <PrimaryButton 
          text="Create Note" 
          onClick={() => setIsDialogOpen(true)}
          iconProps={{ iconName: 'Add' }}
        />
      </Stack>

      <Dialog
        hidden={!isDialogOpen}
        onDismiss={() => setIsDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Create New Note',
        }}
        modalProps={{
          isBlocking: false,
          styles: { main: { maxWidth: 450 } }
        }}
      >
        <Stack tokens={{ childrenGap: 15 }}>
          <TextField
            label="Title"
            required
            value={newNote.title || ''}
            onChange={(_, value) => setNewNote({ ...newNote, title: value })}
          />
          <DatePicker
            label="Date"
            strings={datePickerStrings}
            value={newNote.date}
            onSelectDate={(date) => setNewNote({ ...newNote, date })}
          />
          <TextField
            label="Location"
            required
            value={newNote.location || ''}
            onChange={(_, value) => setNewNote({ ...newNote, location: value })}
          />
          <TextField
            label="Description"
            multiline
            rows={4}
            required
            value={newNote.description || ''}
            onChange={(_, value) => setNewNote({ ...newNote, description: value })}
          />
        </Stack>
        <DialogFooter>
          <PrimaryButton text="Create" onClick={handleCreateNote} />
          <DefaultButton text="Cancel" onClick={() => setIsDialogOpen(false)} />
        </DialogFooter>
      </Dialog>

      <Stack tokens={{ childrenGap: 10 }}>
        {notes.map((note) => (
          <Stack
            key={note.id}
            tokens={{ padding: 15 }}
            styles={{
              root: {
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                borderRadius: '4px',
              }
            }}
          >
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
                {note.title}
              </Text>
              <DefaultButton
                iconProps={{ iconName: 'Delete' }}
                onClick={() => handleDeleteNote(note.id)}
                styles={{
                  root: { color: '#d93025' },
                  rootHovered: { color: '#d93025' }
                }}
              />
            </Stack>
            <Text>Date: {note.date.toLocaleDateString()}</Text>
            <Text>Location: {note.location}</Text>
            <Text>Description: {note.description}</Text>
            <Text variant="small" styles={{ root: { color: '#666' } }}>
              Created: {note.createdAt.toLocaleString()}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

/**
 * NotesTool component
 *
 * This component is responsible for rendering the notes tool interface.
 * It allows users to create, edit, and manage their notes within the application.
 *
 * @component
 * @example
 * // Example usage:
 * <NotesTool />
 *
 * @returns {JSX.Element} The rendered NotesTool component.
 */
export default NotesTool;