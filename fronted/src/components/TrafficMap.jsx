import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons for traffic signals
const signalIcons = {
  green: {
    html: '<div style="width: 30px; height: 30px; background-color: #28a745; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
    color: '#28a745'
  },
  yellow: {
    html: '<div style="width: 30px; height: 30px; background-color: #ffc107; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
    color: '#ffc107'
  },
  red: {
    html: '<div style="width: 30px; height: 30px; background-color: #dc3545; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
    color: '#dc3545'
  }
};

// Offset positions for each direction
const directionOffsets = {
  'North': [0, -0.0002],
  'South': [0, 0.0002],
  'East': [0.0002, 0],
  'West': [-0.0002, 0]
};

const TrafficMap = ({ trafficData }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Default location (Bangalore) if no location data is available
      const defaultLocation = { lat: 12.9716, lng: 77.5946 };
      const location = trafficData?.intersection?.location || defaultLocation;

      // Initialize the map
      const map = L.map(mapRef.current).setView([location.lat, location.lng], 15);
      
      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !trafficData?.intersection?.signals) return;

    const map = mapInstanceRef.current;
    const location = trafficData.intersection.location || { lat: 12.9716, lng: 77.5946 };

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      marker.remove();
    });
    markersRef.current = {};

    // Define signal positions relative to the intersection center
    const signalOffsets = {
      'North': { lat: 0.001, lng: 0 },
      'South': { lat: -0.001, lng: 0 },
      'East': { lat: 0, lng: 0.001 },
      'West': { lat: 0, lng: -0.001 }
    };

    // Add markers for each signal
    Object.entries(trafficData.intersection.signals).forEach(([direction, signal]) => {
      const offset = signalOffsets[direction];
      const signalLocation = {
        lat: location.lat + offset.lat,
        lng: location.lng + offset.lng
      };

      const markerColor = signal.status === 'Green' ? '#4CAF50' : 
                         signal.status === 'Yellow' ? '#FFC107' : '#F44336';

      const signalIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(signalLocation, { icon: signalIcon });
      
      // Create popup content
      const popupContent = `
        <div style="min-width: 150px;">
          <h4 style="margin: 0 0 8px 0;">${direction} Signal</h4>
          <p style="margin: 4px 0;">Status: <span style="color: ${markerColor}">${signal.status}</span></p>
          <p style="margin: 4px 0;">Vehicles: ${signal.vehicle_count}</p>
          <p style="margin: 4px 0;">Types:</p>
          <ul style="margin: 4px 0; padding-left: 20px;">
            <li>Cars: ${signal.vehicle_types.car}</li>
            <li>Buses: ${signal.vehicle_types.bus}</li>
            <li>Trucks: ${signal.vehicle_types.truck}</li>
          </ul>
          ${signal.emergency_vehicle ? '<p style="color: #F44336; margin: 4px 0;">🚨 Emergency Vehicle Present</p>' : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(map);
      markersRef.current[direction] = marker;
    });
  }, [trafficData]);

  return (
    <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '8px', marginBottom: '20px' }} />
  );
};

export default TrafficMap; 