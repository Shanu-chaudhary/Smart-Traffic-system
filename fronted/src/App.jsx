// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App




// import React, { useEffect, useState } from 'react';
// import { io } from 'socket.io-client';
// import axios from 'axios';

// const BACKEND_URL = 'http://127.0.0.1:5000/';  // Backend URL
// const socket = io(BACKEND_URL, {
//   transports: ['websocket'],      // Use WebSocket transport directly
//   reconnection: true,              // Enable reconnection
//   reconnectionAttempts: 5,         // Retry 5 times
//   reconnectionDelay: 1000          // Delay between retries
// });

// function App() {
//   const [status, setStatus] = useState('Connecting...');
//   const [trafficData, setTrafficData] = useState(null);

//   useEffect(() => {
//     socket.on('connect', () => {
//       console.log('Connected to backend');
//       setStatus('Connected successfully');
//     });

//     socket.on('disconnect', () => {
//       console.log('Disconnected');
//       setStatus('Disconnected');
//     });

//     socket.on('traffic_update', (data) => {
//       console.log('Traffic Data:', data);
//       setTrafficData(data);
//     });

//     socket.on('connect_error', (error) => {
//       console.error('Connection error:', error);
//       setStatus('Connection failed');
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, []);

//   const fetchData = async () => {
//     try {
//       const response = await axios.get(`${BACKEND_URL}/`);
//       console.log('API Data:', response.data);
//       alert(`API Response: ${JSON.stringify(response.data)}`);
//     } catch (error) {
//       console.error('Error fetching data:', error);
//     }
//   };

//   return (
//     <div style={{ padding: '20px' }}>
//       <h1>Smart Traffic System</h1>
//       <p>WebSocket Status: {status}</p>

//       {trafficData && (
//         <div>
//           <h2>Traffic Data:</h2>
//           <pre>{JSON.stringify(trafficData, null, 2)}</pre>
//         </div>
//       )}

//       <button onClick={fetchData} style={{ marginTop: '10px' }}>
//         Fetch API Data
//       </button>
//     </div>
//   );
// }

// export default App;



import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import TrafficMap from './components/TrafficMap';
import TrafficDashboard from './components/TrafficDashboard';
import Navbar from './components/Navbar';


// Backend URL configuration
const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [trafficData, setTrafficData] = useState({
    intersection: {
      location: { lat: 12.9716, lng: 77.5946 },
      signals: {
        'North': { 
          status: 'Green', 
          vehicle_count: 0, 
          last_green_time: new Date().toISOString(),
          vehicle_types: { car: 0, bus: 0, truck: 0 }
        },
        'South': { 
          status: 'Green', 
          vehicle_count: 0, 
          last_green_time: new Date().toISOString(),
          vehicle_types: { car: 0, bus: 0, truck: 0 }
        },
        'East': { 
          status: 'Red', 
          vehicle_count: 0, 
          last_green_time: null,
          vehicle_types: { car: 0, bus: 0, truck: 0 }
        },
        'West': { 
          status: 'Red', 
          vehicle_count: 0, 
          last_green_time: null,
          vehicle_types: { car: 0, bus: 0, truck: 0 }
        }
      },
      current_phase: 'North-South',
      phase_start_time: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true,
      path: '/socket.io',
      autoConnect: true,
      withCredentials: false
    });

    // Debug socket state
    console.log('Initializing socket connection...', BACKEND_URL);

    newSocket.on('connect', () => {
      console.log('Connected to backend');
      console.log('Socket ID:', newSocket.id);
      setStatus('Connected successfully');
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from backend:', reason);
      setStatus(`Disconnected (${reason}) - Attempting to reconnect...`);
    });

    newSocket.on('traffic_update', (data) => {
      console.log('Received traffic data:', data);
      if (data && data.intersection) {
        // Ensure at least one direction has a green signal
        const signals = data.intersection.signals;
        const hasGreenSignal = Object.values(signals).some(signal => signal.status === 'Green');
        
        if (!hasGreenSignal) {
          console.warn('Received invalid signal state with all reds, maintaining current phase');
          return;
        }
        
        setTrafficData(prevData => {
          console.log('Updating traffic data:', data);
          return data;
        });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setStatus('Connection failed');
      setError(`Failed to connect to server: ${error.message}`);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(`Socket error: ${error.message}`);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection...');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Debug render
  console.log('Current traffic data:', trafficData);

  const getTrafficColor = (level) => {
    switch (level) {
      case 'Low': return '#4CAF50';
      case 'Medium': return '#FFC107';
      case 'High': return '#FF9800';
      case 'Very High': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getSignalColor = (status) => {
    switch (status) {
      case 'Green': return '#4CAF50';
      case 'Yellow': return '#FFC107';
      case 'Red': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const calculateTimeRemaining = (lastGreenTime, status) => {
    if (!lastGreenTime) return 0;
    if (status !== 'Green') return 0;
    const currentTime = new Date().getTime();
    const elapsedTime = (currentTime - new Date(lastGreenTime).getTime()) / 1000;
    return Math.max(0, Math.floor(60 - elapsedTime));
  };

  const calculateWaitTime = (lastGreenTime, status) => {
    if (!lastGreenTime) return 0;
    if (status !== 'Red') return 0;
    const currentTime = new Date().getTime();
    const elapsedTime = (currentTime - new Date(lastGreenTime).getTime()) / 1000;
    return Math.floor(elapsedTime);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Navbar />
      {/* <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Smart Traffic System</h1> */}
      
      <div style={{ 
        padding: '10px', 
        backgroundColor: status === 'Connected successfully' ? '	#E0E0E0' : '#fff5d3',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        
        <strong style={{ color: '#000',  marginRight: '10px'}}>Status:</strong>  
        <span style={{ color: status === 'Connected successfully' ? '#008000' : '#FF0000' }}>
       {status}
      </span>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          margin: '10px 0', 
          padding: '10px', 
          border: '1px solid red', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <TrafficMap trafficData={trafficData} />
      </div>

      <TrafficDashboard trafficData={trafficData} />

      <div style={{ 
  padding: '10px', 
  backgroundColor: status === 'Connected successfully' ? '#E0E0E0' : '#fff5d3',
  borderRadius: '4px',
  marginBottom: '20px',
  marginTop: '20px',
  textAlign: 'center',
  color: 'black'  // Ensure text color doesn't affect root font color
}}>
  <div 
    style={{ 
      marginTop: '10px', 
      fontSize: '14px', 
      fontWeight: 'bold', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}
  >
     Real-Time Traffic Signal Tracking Using Live Traffic Images
    <box-icon 
      name='link-external' 
      style={{ 
        marginLeft: '5px', 
        cursor: 'pointer', 
        transition: 'transform 0.2s ease-in-out' 
      }} 
      onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'} 
      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      onClick={() => window.open('https://your-link-here.com', '_blank')}  
    ></box-icon>
  </div>
</div>


      {/* Debug info */}
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#000000', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <strong>Debug Info:</strong>
        <pre style={{ margin: '5px 0' }}>
          Socket Connected: {socket?.connected ? 'Yes' : 'No'}
          {'\n'}Last Update: {trafficData.timestamp}
          {'\n'}Current Phase: {trafficData.intersection.current_phase}
        </pre>
      </div>
    </div>
  );
}

export default App;


// // 🚦 frontend/src/App.jsx
// import React, { useState, useEffect } from 'react';
// import socket from './socket';  // Import the WebSocket connection

// const App = () => {
//   const [connected, setConnected] = useState(false);
//   const [trafficData, setTrafficData] = useState([]);

//   useEffect(() => {
//     // ✅ Listen for WebSocket connection
//     socket.on('connect', () => {
//       console.log('✅ Connected to WebSocket Server');
//       setConnected(true);
//     });

//     // ✅ Listen for WebSocket disconnection
//     socket.on('disconnect', () => {
//       console.log('❌ Disconnected from WebSocket Server');
//       setConnected(false);
//     });

//     // ✅ Listen for real-time traffic updates
//     socket.on('traffic_update', (data) => {
//       console.log('🚦 Traffic Update:', data);
//       setTrafficData((prevData) => [...prevData, data]);
//     });

//     // ✅ Clean up WebSocket listeners on unmount
//     return () => {
//       socket.off('connect');
//       socket.off('disconnect');
//       socket.off('traffic_update');
//     };
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center justify-center p-4">
//       <h1 className="text-4xl font-bold mb-4">🚦 Smart Traffic Signal Optimization</h1>

//       {/* ✅ Connection status */}
//       <div className={`p-3 rounded-lg text-white mb-4 ${connected ? 'bg-green-500' : 'bg-red-500'}`}>
//         {connected ? 'Connected to WebSocket' : 'Disconnected'}
//       </div>

//       {/* ✅ Real-time traffic data display */}
//       <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-4">
//         <h2 className="text-2xl font-semibold mb-2">🔴 Traffic Data</h2>
//         <ul className="overflow-auto max-h-96">
//           {trafficData.length > 0 ? (
//             trafficData.map((data, index) => (
//               <li key={index} className="p-2 border-b">
//                 {JSON.stringify(data)}
//               </li>
//             ))
//           ) : (
//             <li className="p-2 text-gray-500">No traffic data yet...</li>
//           )}
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default App;

