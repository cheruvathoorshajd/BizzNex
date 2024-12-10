import React, { useState } from 'react';
import { Stack, TextField, PrimaryButton, Text, IStackStyles, ITextStyles, IButtonStyles, ITextFieldStyles } from '@fluentui/react';
import { initializeIcons } from '@fluentui/font-icons-mdl2';

initializeIcons();

/**
 * Chatbot component that provides a simple chat interface for users to interact with.
 * Users can type in their queries, and the chatbot will respond and open search results
 * in Google, YouTube, and Reddit.
 *
 * @component
 * @example
 * return (
 *   <Chatbot />
 * )
 *
 * @returns {JSX.Element} The rendered Chatbot component.
 */
const Chatbot: React.FC = () => {
  /**
   * State to manage the list of messages in the chat.
   * Each message has a text and a boolean indicating if it's from the user.
   */
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([
    { text: "வணக்கம்!", isUser: false },
    { text: "I'm Brenda, Your Personalized Assistant. Please type in what you want to know about.", isUser: false },
  ]);

  /**
   * State to manage the current input text from the user.
   */
  const [inputText, setInputText] = useState('');

  /**
   * Adds a new message to the chat.
   *
   * @param {string} message - The message text to add.
   * @param {boolean} isUser - Indicates if the message is from the user.
   */
  const addMessage = (message: string, isUser: boolean) => {
    setMessages((prevMessages) => [...prevMessages, { text: message, isUser }]);
  };

  /**
   * Opens a new tab with Google search results for the given query.
   *
   * @param {string} query - The search query.
   */
  const searchGoogle = (query: string) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
  };

  /**
   * Opens a new tab with YouTube search results for the given query.
   *
   * @param {string} query - The search query.
   */
  const searchYoutube = (query: string) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
  };

  /**
   * Opens a new tab with Reddit search results for the given query.
   *
   * @param {string} query - The search query.
   */
  const searchReddit = (query: string) => {
    const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
  };

  /**
   * Handles sending the user's input as a message and performing searches.
   * Adds the user's message to the chat, clears the input, and triggers searches.
   */
  const handleSend = () => {
    if (inputText.trim()) {
      addMessage(inputText, true);
      setInputText('');

      setTimeout(() => {
        addMessage(`Searching for -  ${inputText}`, false);
        searchGoogle(inputText);
        searchYoutube(inputText);
        searchReddit(inputText);
      }, 500);
    }
  };

  // Styles for various components in the Chatbot
  const containerStyles: IStackStyles = {
    root: {
      maxWidth: 400,
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
  };

  const headerStyles: ITextStyles = {
    root: {
      fontSize: 28,
      fontWeight: 600,
      color: '#1d1d1f',
      marginBottom: 20,
    },
  };

  const chatContainerStyles: IStackStyles = {
    root: {
      height: 400,
      overflowY: 'auto',
      padding: 20,
      backgroundColor: '#fbfbfd',
      borderRadius: 12,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
  };

  /**
   * Generates styles for a message based on whether it is from the user.
   *
   * @param {boolean} isUser - Indicates if the message is from the user.
   * @returns {ITextStyles} The styles for the message.
   */
  const messageStyles = (isUser: boolean): ITextStyles => ({
    root: {
      backgroundColor: isUser ? '#007aff' : '#e5e5ea',
      color: isUser ? '#ffffff' : '#1d1d1f',
      padding: '10px 14px',
      borderRadius: 18,
      maxWidth: '80%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    },
  });

  const inputStyles: ITextFieldStyles = {
    fieldGroup: {
      borderRadius: 20,
      border: '1px solid #d2d2d7',
      height: 40,
    },
    field: {
      fontSize: 16,
    },
  };

  const buttonStyles: IButtonStyles = {
    root: {
      borderRadius: 20,
      height: 40,
      backgroundColor: '#007aff',
      border: 'none',
    },
    rootHovered: {
      backgroundColor: '#0056b3',
    },
    label: {
      fontSize: 16,
      fontWeight: 400,
    },
  };

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={containerStyles}>
      <Text styles={headerStyles}>Your Personalized Assistant</Text>
      <Stack styles={chatContainerStyles}>
        {messages.map((message, index) => (
          <Text key={index} styles={messageStyles(message.isUser)}>
            {message.text}
          </Text>
        ))}
      </Stack>
      <Stack horizontal tokens={{ childrenGap: 8 }}>
        <TextField
          placeholder="Type your search..."
          value={inputText}
          onChange={(_, newValue) => setInputText(newValue || '')}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          styles={inputStyles}
        />
        <PrimaryButton
          text="Search"
          onClick={handleSend}
          disabled={!inputText.trim()}
          styles={buttonStyles}
        />
      </Stack>
    </Stack>
  );
};

export default Chatbot;