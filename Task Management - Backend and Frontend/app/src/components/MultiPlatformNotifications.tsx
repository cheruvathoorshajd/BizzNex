import React, { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  TextField,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  List,
} from '@fluentui/react';

interface Notification {
  id: string;
  platform: string;
  message: string;
  timestamp: Date;
}

/**
 * MultiPlatformNotifications component provides a user interface for logging in and viewing notifications
 * from multiple platforms. It includes a login form and a list of notifications fetched from a simulated API.
 *
 * @component
 * @example
 * return (
 *   <MultiPlatformNotifications />
 * )
 *
 * @returns {React.FC} A React functional component that renders the notifications UI.
 */
/**
 * MultiPlatformNotifications component handles user login and displays notifications from multiple platforms.
 * 
 * @component
 * @example
 * return (
 *   <MultiPlatformNotifications />
 * )
 * 
 * @returns {JSX.Element} The rendered component.
 * 
 * @remarks
 * This component uses React hooks such as `useState` and `useEffect` to manage state and side effects.
 * It simulates API calls for user login and fetching notifications using `setTimeout`.
 * 
 * @function
 * @name MultiPlatformNotifications
 * 
 * @typedef {Object} Notification
 * @property {string} id - The unique identifier for the notification.
 * @property {string} platform - The platform from which the notification originated.
 * @property {string} message - The message content of the notification.
 * @property {Date} timestamp - The timestamp when the notification was received.
 * 
 * @hook
 * @name useState
 * @description Manages the state of the component.
 * @hook
 * @name useEffect
 * @description Triggers side effects such as fetching notifications when the user logs in.
 * 
 * @function
 * @name handleLogin
 * @description Handles user login by validating credentials and updating the state.
 * 
 * @function
 * @name fetchNotifications
 * @description Fetches notifications from multiple platforms and updates the state.
 * 
 * @function
 * @name renderNotification
 * @description Renders a single notification item.
 * @param {Notification} [item] - The notification item to render. If not provided, returns null.
 * @returns {JSX.Element | null} The rendered notification component or null if no item is provided.
 */
const MultiPlatformNotifications: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    setIsLoading(true);
    // Simulating API call
    setTimeout(() => {
      if (username && password) {
        setIsLoggedIn(true);
        setError('');
      } else {
        setError('Invalid credentials');
      }
      setIsLoading(false);
    }, 1500);
  };

  const fetchNotifications = () => {
    setIsLoading(true);
    // Simulating API call to fetch notifications
    setTimeout(() => {
      const mockNotifications: Notification[] = [
        { id: '1', platform: 'Facebook', message: 'New friend request', timestamp: new Date() },
        { id: '2', platform: 'Twitter', message: 'Your tweet got 100 likes', timestamp: new Date() },
        { id: '3', platform: 'Instagram', message: 'Someone commented on your post', timestamp: new Date() },
      ];
      setNotifications(mockNotifications);
      setIsLoading(false);
    }, 1500);
  };

  /**
   * Renders a notification item.
   *
   * @param {Notification} [item] - The notification item to render. If not provided, returns null.
   * @returns {JSX.Element | null} The rendered notification component or null if no item is provided.
   */
  const renderNotification = (item?: Notification) => {
    if (!item) {
      return null;
    }
    return (
      <Stack tokens={{ padding: 10 }} styles={{ root: { borderBottom: '1px solid #eee' } }}>
        <Text variant="mediumPlus">{item.platform}</Text>
        <Text>{item.message}</Text>
        <Text variant="small">{item.timestamp.toLocaleString()}</Text>
      </Stack>
    );
  };

  return (
    <Stack tokens={{ childrenGap: 15 }} className="notifications-container">
      <Text variant="xLarge">Multi-Platform Notifications</Text>
      
      {!isLoggedIn ? (
        <Stack tokens={{ childrenGap: 10 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(_, value) => setUsername(value || '')}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(_, value) => setPassword(value || '')}
          />
          <PrimaryButton text="Login" onClick={handleLogin} disabled={isLoading} />
          {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
        </Stack>
      ) : (
        <Stack tokens={{ childrenGap: 10 }}>
          <Text>Welcome, {username}!</Text>
          <PrimaryButton text="Refresh Notifications" onClick={fetchNotifications} disabled={isLoading} />
          {isLoading ? (
            <Spinner size={SpinnerSize.large} label="Loading notifications..." />
          ) : (
            <List items={notifications} onRenderCell={renderNotification} />
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default MultiPlatformNotifications;