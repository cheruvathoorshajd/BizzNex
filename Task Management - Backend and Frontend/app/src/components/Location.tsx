import React, { useState } from 'react';
import { Stack, Text, TextField, PrimaryButton } from "@fluentui/react";
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface LocationProps {
  onLocationAdd: (location: string, lat: number, lng: number) => void;
}

/**
 * Location component allows users to add a location by entering a name and selecting a position on a map.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onLocationAdd - Callback function to handle the addition of a new location
 *
 * @returns {JSX.Element} The rendered Location component
 */
const Location: React.FC<LocationProps> = ({ onLocationAdd }) => {
  const [location, setLocation] = useState<string>("");
  const [mapCenter] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationSubmit = () => {
    if (location.trim() && markerPosition) {
      onLocationAdd(location, markerPosition.lat, markerPosition.lng);
      setLocation("");
      setMarkerPosition(null);
    }
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setMarkerPosition({ lat, lng });
    }
  };

  return (
    <Stack tokens={{ childrenGap: 10 }} styles={{
      root: {
        background: 'var(--neutral-lighter-alt)',
        borderRadius: 5,
        padding: 10,
      },
    }}>
      <Text variant="medium">Add Location</Text>
      <TextField
        placeholder="Enter location name"
        value={location}
        onChange={(_, value) => setLocation(value || "")}
      />
      <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
        <div style={{ height: '300px', width: '100%' }}>
          <Map
            center={mapCenter}
            zoom={3}
            onClick={handleMapClick}
            mapId={process.env.REACT_APP_GOOGLE_MAPS_MAP_ID}
          >
            {markerPosition && <Marker position={markerPosition} />}
          </Map>
        </div>
      </APIProvider>
      <PrimaryButton
        text="Add Location"
        onClick={handleLocationSubmit}
        disabled={!location.trim() || !markerPosition}
      />
    </Stack>
  );
};

export default Location;