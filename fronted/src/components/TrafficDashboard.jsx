import React from 'react';

const TrafficDashboard = ({ trafficData }) => {
  if (!trafficData?.intersection?.signals) {
    return <div>Waiting for traffic data...</div>;
  }

  const getSignalColor = (status) => {
    switch (status) {
      case 'Green': return '#4CAF50';
      case 'Yellow': return '#FFC107';
      case 'Red': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getVehicleCountColor = (count) => {
    if (count > 15) return '#F44336';  // High
    if (count > 5) return '#FFC107';   // Medium
    return '#4CAF50';                  // Low
  };

  const formatTime = (seconds) => {
    if (seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const calculateTimeRemaining = (signal) => {
    if (signal.status !== 'Green') return 0;
    if (!signal.last_green_time) return 0;

    const currentTime = new Date().getTime();
    const lastGreenTime = new Date(signal.last_green_time).getTime();
    const elapsedTime = (currentTime - lastGreenTime) / 1000;

    // Get duration based on vehicle count
    let totalDuration;
    if (signal.vehicle_count > 15) totalDuration = 35;
    else if (signal.vehicle_count > 5) totalDuration = 20;
    else totalDuration = 10;

    return Math.max(0, Math.floor(totalDuration - elapsedTime));
  };

  const currentDirection = trafficData.intersection.current_direction;
  const nextDirection = (() => {
    const rotation = ['North', 'East', 'South', 'West'];
    const currentIndex = rotation.indexOf(currentDirection);
    return rotation[(currentIndex + 1) % 4];
  })();

  return (
    <div>
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#000000' }}>Signal Rotation</h2>
        <div style={{ fontSize: '1.2em', color: '#000000' }}>
          Current Green: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{currentDirection}</span>
          <span style={{ margin: '0 10px' }}>→</span>
          Next: <span style={{ fontWeight: 'bold' }}>{nextDirection}</span>
        </div>
        <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
          Rotation Order: North → East → South → West
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {Object.entries(trafficData.intersection.signals).map(([direction, signal]) => (
          <div
            key={direction}
            style={{
              padding: '20px',
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: `2px solid ${getSignalColor(signal.status)}`,
              position: 'relative'
            }}
          >
            {direction === currentDirection && (
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8em'
              }}>
                Active
              </div>
            )}
            
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>{direction} Signal</h3>
            
            <div style={{ marginBottom: '10px', color: '#000000' }}>
              <strong>Status: </strong>
              <span style={{ color: getSignalColor(signal.status) }}>{signal.status}</span>
            </div>

            <div style={{ 
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              color: '#000000'
            }}>
              <div style={{ marginBottom: '5px' }}>
                <strong>Vehicles: </strong>
                <span style={{ color: getVehicleCountColor(signal.vehicle_count) }}>
                  {signal.vehicle_count}
                </span>
              </div>
              <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                🚗 Cars: {signal.vehicle_types.car}<br />
                🚌 Buses: {signal.vehicle_types.bus}<br />
                🚛 Trucks: {signal.vehicle_types.truck}
              </div>
            </div>

            {signal.status === 'Green' && (
              <div style={{ marginBottom: '10px', color: '#000000' }}>
                <strong>Time Remaining: </strong>
                <span style={{ color: '#4CAF50' }}>
                  {formatTime(calculateTimeRemaining(signal))}
                </span>
              </div>
            )}

            {signal.status === 'Red' && (
              <div style={{ marginBottom: '10px', color: '#000000' }}>
                <strong>Expected Wait Time: </strong>
                <span style={{ color: '#F44336' }}>
                  {formatTime(signal.expected_wait_time)}
                </span>
              </div>
            )}

            {signal.emergency_vehicle && (
              <div style={{
                marginTop: '10px',
                padding: '5px',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                🚨 Emergency Vehicle Present
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrafficDashboard; 