import React, { useState } from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  TextField,
  Dropdown,
  IDropdownOption,
  DetailsList,
  IColumn,
  SelectionMode,
  MessageBar,
  MessageBarType,
} from '@fluentui/react';

interface Event {
  id: string;
  name: string;
  type: string;
  date: Date;
  location: string;
  description: string;
  distance: string;
}

/**
 * EventTracker component is a React functional component that allows users to search for events
 * within a specified radius and category. It displays the events in a list format.
 *
 * @component
 * @example
 * return (
 *   <EventTracker />
 * )
 *
 * @returns {JSX.Element} The rendered EventTracker component.
 */
 
/**
 * @typedef {Object} Event
 * @property {string} id - The unique identifier for the event.
 * @property {string} name - The name of the event.
 * @property {string} type - The category/type of the event.
 * @property {Date} date - The date of the event.
 * @property {string} location - The location where the event is held.
 * @property {string} description - A brief description of the event.
 * @property {string} distance - The distance from the user's location to the event.
 */

/**
 * @typedef {Object} IDropdownOption
 * @property {string} key - The unique key for the dropdown option.
 * @property {string} text - The display text for the dropdown option.
 */

/**
 * @typedef {Object} IColumn
 * @property {string} key - The unique key for the column.
 * @property {string} name - The display name for the column.
 * @property {string} fieldName - The field name in the data source.
 * @property {number} minWidth - The minimum width of the column.
 * @property {function} [onRender] - Optional custom render function for the column.
 */

/**
 * @typedef {Object} IStackTokens
 * @property {number} childrenGap - The gap between children elements in the stack.
 */

/**
 * @typedef {Object} ITextStyles
 * @property {Object} root - The root styles for the text component.
 * @property {string} root.color - The color of the text.
 */

/**
 * @typedef {Object} IDetailsListStyles
 * @property {Object} root - The root styles for the details list component.
 * @property {string} root.backgroundColor - The background color of the details list.
 * @property {string} root.borderRadius - The border radius of the details list.
 * @property {string} root.padding - The padding inside the details list.
 */

/**
 * @typedef {Object} ITextFieldStyles
 * @property {Object} root - The root styles for the text field component.
 * @property {string} root.width - The width of the text field.
 */

/**
 * @typedef {Object} IDropdownStyles
 * @property {Object} root - The root styles for the dropdown component.
 * @property {string} root.width - The width of the dropdown.
 */

/**
 * @typedef {Object} IStackStyles
 * @property {Object} root - The root styles for the stack component.
 */

/**
 * @typedef {Object} IMessageBarStyles
 * @property {Object} root - The root styles for the message bar component.
 */

/**
 * @typedef {Object} IPrimaryButtonStyles
 * @property {Object} root - The root styles for the primary button component.
 */

/**
 * @typedef {Object} IStackProps
 * @property {boolean} horizontal - Whether the stack is horizontal.
 * @property {string} horizontalAlign - The horizontal alignment of the stack.
 * @property {string} verticalAlign - The vertical alignment of the stack.
 * @property {IStackTokens} tokens - The tokens for the stack.
 */

/**
 * @typedef {Object} ITextProps
 * @property {string} variant - The variant of the text.
 * @property {ITextStyles} styles - The styles for the text component.
 */

/**
 * @typedef {Object} IDetailsListProps
 * @property {Event[]} items - The items to display in the details list.
 * @property {IColumn[]} columns - The columns to display in the details list.
 * @property {number} selectionMode - The selection mode for the details list.
 * @property {IDetailsListStyles} styles - The styles for the details list component.
 */

/**
 * @typedef {Object} ITextFieldProps
 * @property {string} placeholder - The placeholder text for the text field.
 * @property {string} value - The value of the text field.
 * @property {function} onChange - The function to call when the text field value changes.
 * @property {string} type - The type of the text field.
 * @property {ITextFieldStyles} styles - The styles for the text field component.
 */

/**
 * @typedef {Object} IDropdownProps
 * @property {string} placeholder - The placeholder text for the dropdown.
 * @property {IDropdownOption[]} options - The options for the dropdown.
 * @property {string} selectedKey - The selected key for the dropdown.
 * @property {function} onChange - The function to call when the dropdown value changes.
 * @property {IDropdownStyles} styles - The styles for the dropdown component.
 */

/**
 * @typedef {Object} IPrimaryButtonProps
 * @property {string} text - The text to display on the button.
 * @property {function} onClick - The function to call when the button is clicked.
 * @property {IPrimaryButtonStyles} styles - The styles for the primary button component.
 */

/**
 * @typedef {Object} IMessageBarProps
 * @property {string} messageBarType - The type of the message bar.
 * @property {IMessageBarStyles} styles - The styles for the message bar component.
 */

/**
 * @function handleSearch
 * @description Simulates an API call to fetch events based on the selected category and search radius.
 * Updates the events state with the fetched events and displays a success message.
 */
const EventTracker: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchRadius, setSearchRadius] = useState('10');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMessage, setShowMessage] = useState(false);

  const eventCategories: IDropdownOption[] = [
    { key: 'all', text: 'All Events' },
    { key: 'festivals', text: 'Festivals & Carnivals' },
    { key: 'concerts', text: 'Concerts' },
    { key: 'sports', text: 'Sports Events' },
    { key: 'food', text: 'Food & Drink' },
    { key: 'business', text: 'Business & Networking' }
  ];

  const columns: IColumn[] = [
    { 
      key: 'name', 
      name: 'Event', 
      fieldName: 'name', 
      minWidth: 150 
    },
    { 
      key: 'type', 
      name: 'Category', 
      fieldName: 'type', 
      minWidth: 100 
    },
    { 
      key: 'date', 
      name: 'Date', 
      fieldName: 'date', 
      minWidth: 100,
      onRender: (item: Event) => item.date.toLocaleDateString()
    },
    { 
      key: 'location', 
      name: 'Location', 
      fieldName: 'location', 
      minWidth: 150 
    },
    { 
      key: 'distance', 
      name: 'Distance', 
      fieldName: 'distance', 
      minWidth: 80 
    }
  ];

  const handleSearch = () => {
    // Simulated API call to fetch events
    const mockEvents: Event[] = [
      {
        id: '1',
        name: 'Local Food Festival',
        type: 'Food & Drink',
        date: new Date(Date.now() + 86400000),
        location: 'Central Park',
        description: 'Annual food festival featuring local vendors',
        distance: '2.3 miles'
      },
      {
        id: '2',
        name: 'Business Networking Mixer',
        type: 'Business & Networking',
        date: new Date(Date.now() + 172800000),
        location: 'Downtown Convention Center',
        description: 'Monthly networking event for local businesses',
        distance: '3.5 miles'
      }
    ];

    setEvents(mockEvents);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  return (
    <Stack className="event-tracker" tokens={{ childrenGap: 15 }}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="xLarge">Event Tracker</Text>
      </Stack>

      {showMessage && (
        <MessageBar messageBarType={MessageBarType.success}>
          Found events in your area!
        </MessageBar>
      )}

      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <Dropdown
          placeholder="Select event category"
          options={eventCategories}
          selectedKey={selectedCategory}
          onChange={(_, option) => setSelectedCategory(option?.key as string)}
          styles={{ root: { width: 200 } }}
        />
        <TextField
          placeholder="Search radius (miles)"
          value={searchRadius}
          onChange={(_, value) => setSearchRadius(value || '')}
          type="number"
          styles={{ root: { width: 150 } }}
        />
        <PrimaryButton 
          text="Find Events" 
          onClick={handleSearch}
        />
      </Stack>

      <DetailsList
        items={events}
        columns={columns}
        selectionMode={SelectionMode.none}
        styles={{
          root: {
            backgroundColor: '#f8f8f8',
            borderRadius: '8px',
            padding: '10px'
          }
        }}
      />

      <Stack horizontal horizontalAlign="center">
        <Text variant="small" styles={{ root: { color: '#666' } }}>
          Events are updated in real-time based on your location
        </Text>
      </Stack>
    </Stack>
  );
};

export default EventTracker;