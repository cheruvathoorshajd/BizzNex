import React, { useState } from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  TextField,
  ComboBox,
  IComboBoxOption,
  Image,
  ProgressIndicator,
} from '@fluentui/react';

interface ContentPublisherProps {
  onPublish?: (content: ContentData) => void;
}

interface ContentData {
  title: string;
  description: string;
  mediaFile: File | null;
  platforms: string[];
  scheduledTime?: Date;
}

/**
 * `ContentPublisher` is a React functional component that provides a UI for publishing content.
 * It allows users to input a title, description, upload a media file, and select social media platforms
 * to publish the content to. It also provides a preview of the uploaded media file and a progress indicator
 * while the content is being published.
 *
 * @param {ContentPublisherProps} props - The props for the `ContentPublisher` component.
 * @param {function} props.onPublish - Callback function to be called when the content is published.
 *
 * @returns {JSX.Element} The rendered `ContentPublisher` component.
 */
/**
 * `ContentPublisher` is a React functional component that provides a UI for publishing content to various social media platforms.
 * 
 * @component
 * 
 * @param {ContentPublisherProps} props - The props for the component.
 * @param {function} props.onPublish - Callback function to handle the publish action.
 * 
 * @returns {JSX.Element} The rendered component.
 * 
 * @example
 * <ContentPublisher onPublish={handlePublish} />
 * 
 * @typedef {Object} ContentPublisherProps
 * @property {function} onPublish - Callback function to handle the publish action.
 * 
 * @typedef {Object} ContentData
 * @property {string} title - The title of the content.
 * @property {string} description - The description of the content.
 * @property {File | null} mediaFile - The media file to be uploaded.
 * @property {string[]} platforms - The selected platforms for publishing.
 * 
 * @typedef {Object} IComboBoxOption
 * @property {string} key - The key of the option.
 * @property {string} text - The display text of the option.
 */
const ContentPublisher: React.FC<ContentPublisherProps> = ({ onPublish }) => {
  const [content, setContent] = useState<ContentData>({
    title: '',
    description: '',
    mediaFile: null,
    platforms: [],
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);

  const socialPlatforms: IComboBoxOption[] = [
    { key: 'facebook', text: 'Facebook' },
    { key: 'instagram', text: 'Instagram' },
    { key: 'twitter', text: 'Twitter' },
    { key: 'linkedin', text: 'LinkedIn' },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setContent({ ...content, mediaFile: file });
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePublish = () => {
    setIsPublishing(true);
    // Simulate publishing
    setTimeout(() => {
      if (onPublish) {
        onPublish(content);
      }
      setIsPublishing(false);
      // Reset form
      setContent({
        title: '',
        description: '',
        mediaFile: null,
        platforms: [],
      });
      setPreviewUrl('');
    }, 2000);
  };

  return (
    <Stack tokens={{ childrenGap: 15 }} className="content-publisher">
      <Text variant="xLarge">Content Publisher</Text>
      
      <TextField
        label="Content Title"
        value={content.title}
        onChange={(_, value) => setContent({ ...content, title: value || '' })}
      />

      <TextField
        label="Description"
        multiline
        rows={3}
        value={content.description}
        onChange={(_, value) => setContent({ ...content, description: value || '' })}
      />

      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <input
          type="file"
          accept="image/*,video/*"
          id="media-upload"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <PrimaryButton
          text="Upload Media"
          onClick={() => document.getElementById('media-upload')?.click()}
        />
      </Stack>

      {previewUrl && (
        <Stack className="preview-container">
          <Text>Preview:</Text>
          <Image
            src={previewUrl}
            alt="Content preview"
            width={300}
            height={200}
            style={{ objectFit: 'cover' }}
          />
        </Stack>
      )}

      <ComboBox
        label="Select Platforms"
        multiSelect
        options={socialPlatforms}
        selectedKey={content.platforms}
        onChange={(_, option) => {
          if (option) {
            const platforms = option.selected
              ? [...content.platforms, option.key as string]
              : content.platforms.filter(p => p !== option.key);
            setContent({ ...content, platforms });
          }
        }}
      />

      {isPublishing && <ProgressIndicator label="Publishing..." />}

      <PrimaryButton
        text="Publish Content"
        onClick={handlePublish}
        disabled={isPublishing || !content.title || !content.mediaFile || content.platforms.length === 0}
      />
    </Stack>
  );
};

export default ContentPublisher;