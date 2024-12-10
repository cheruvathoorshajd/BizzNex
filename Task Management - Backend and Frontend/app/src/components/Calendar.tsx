import React from 'react';
import { DatePicker, IDatePickerStrings } from "@fluentui/react";

/**
 * Props for the Calendar component.
 * 
 * @interface CalendarProps
 * @property {string} label - The label for the calendar.
 * @property {Date | null} selectedDate - The currently selected date. Can be null if no date is selected.
 * @property {(date: Date | null) => void} onSelectDate - Callback function to handle date selection. Receives the selected date or null.
 */
interface CalendarProps {
  label: string;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

/**
 * An object containing localized strings for the DatePicker component.
 * 
 * @property {string[]} months - Full names of the months.
 * @property {string[]} shortMonths - Abbreviated names of the months.
 * @property {string[]} days - Full names of the days of the week.
 * @property {string[]} shortDays - Abbreviated names of the days of the week.
 * @property {string} goToToday - Label for the "Go to today" button.
 * @property {string} prevMonthAriaLabel - ARIA label for the button to go to the previous month.
 * @property {string} nextMonthAriaLabel - ARIA label for the button to go to the next month.
 * @property {string} prevYearAriaLabel - ARIA label for the button to go to the previous year.
 * @property {string} nextYearAriaLabel - ARIA label for the button to go to the next year.
 * @property {string} closeButtonAriaLabel - ARIA label for the button to close the date picker.
 */
const datePickerStrings: IDatePickerStrings = {
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  shortDays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  goToToday: 'Go to today',
  prevMonthAriaLabel: 'Go to previous month',
  nextMonthAriaLabel: 'Go to next month',
  prevYearAriaLabel: 'Go to previous year',
  nextYearAriaLabel: 'Go to next year',
  closeButtonAriaLabel: 'Close date picker',
};

/**
 * Calendar component that renders a DatePicker.
 *
 * @param {CalendarProps} props - The properties for the Calendar component.
 * @param {string} props.label - The label for the DatePicker.
 * @param {Date | null} props.selectedDate - The currently selected date.
 * @param {(date: Date | null) => void} props.onSelectDate - Callback function to handle date selection.
 *
 * @returns {JSX.Element} The rendered DatePicker component.
 */
const Calendar: React.FC<CalendarProps> = ({ label, selectedDate, onSelectDate }) => {
  return (
    <DatePicker
      label={label}
      strings={datePickerStrings}
      value={selectedDate || undefined}
      onSelectDate={(date) => onSelectDate(date || null)}
    />
  );
};

export default Calendar;