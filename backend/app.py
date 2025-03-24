from flask import Flask, render_template, request
from flask_socketio import SocketIO
from flask_cors import CORS
import time
import random
from datetime import datetime
import threading
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, 
    cors_allowed_origins="*",
    logger=True, 
    engineio_logger=True,
    ping_timeout=5000,
    ping_interval=2500,
    async_mode='threading'
)

# Traffic signal states
class TrafficSignal:
    def __init__(self, direction):
        self.direction = direction
        self.status = "Red"  # Red, Yellow, Green
        self.vehicle_count = 0
        self.last_green_time = None
        self.emergency_vehicle = False
        self.vehicle_types = {
            "car": 0,
            "bus": 0,
            "truck": 0
        }
        self.last_vehicle_update = datetime.now()
        self.expected_wait_time = 0

    def update_vehicle_count(self):
        current_time = datetime.now()
        time_diff = (current_time - self.last_vehicle_update).total_seconds()
        self.last_vehicle_update = current_time

        # If signal is green, reduce vehicles (they're passing through)
        if self.status == 'Green':
            # Clear 1 vehicle per second during green
            vehicles_to_clear = min(int(time_diff), self.vehicle_count)
            self.vehicle_count = max(0, self.vehicle_count - vehicles_to_clear)
        
        # Add new vehicles randomly
        if random.random() < 0.3:  # 30% chance of new vehicle arriving
            self.vehicle_count = min(30, self.vehicle_count + 1)  # Cap at 30 vehicles

        # Update vehicle types distribution
        total_vehicles = self.vehicle_count
        self.vehicle_types["bus"] = random.randint(0, min(2, total_vehicles))
        total_vehicles -= self.vehicle_types["bus"]
        self.vehicle_types["truck"] = random.randint(0, min(2, total_vehicles))
        total_vehicles -= self.vehicle_types["truck"]
        self.vehicle_types["car"] = total_vehicles

        logger.debug(f"{self.direction}: {self.vehicle_count} vehicles")

    def get_green_duration(self):
        # Return green light duration based on vehicle count
        if self.vehicle_count > 15:
            return 35  # High traffic
        elif self.vehicle_count > 5:
            return 20  # Medium traffic
        else:
            return 10  # Low traffic

    def to_dict(self):
        return {
            "status": self.status,
            "vehicle_count": self.vehicle_count,
            "last_green_time": self.last_green_time.isoformat() if self.last_green_time else None,
            "emergency_vehicle": self.emergency_vehicle,
            "vehicle_types": self.vehicle_types,
            "expected_wait_time": self.expected_wait_time
        }

    def clear_emergency(self):
        self.emergency_vehicle = False

class Intersection:
    def __init__(self):
        self.signals = {
            'North': TrafficSignal('North'),
            'South': TrafficSignal('South'),
            'East': TrafficSignal('East'),
            'West': TrafficSignal('West')
        }
        # Initialize with North signal green
        self.signals['North'].status = 'Green'
        self.signals['North'].last_green_time = datetime.now()
        self.current_direction = 'North'
        self.previous_direction = None  # Store direction before emergency vehicle
        self.phase_start_time = datetime.now()
        self.yellow_start_time = None
        self.rotation_order = ['North', 'East', 'South', 'West']
        self.emergency_active = False
        self.emergency_start_time = None  # Track when emergency signal started
        self.emergency_direction = None   # Track which direction has emergency
        self.location = {'lat': 12.9716, 'lng': 77.5946}  # Default location (Bangalore)
        self.rotation_count = 0  # Track number of complete rotations
        self.last_emergency_time = datetime.now()  # Track when last emergency occurred

    def get_next_direction(self):
        current_index = self.rotation_order.index(self.current_direction)
        next_index = (current_index + 1) % 4
        # If completing a full rotation
        if next_index == 0:
            self.rotation_count += 1
            logger.debug(f"Completed rotation {self.rotation_count}")
        return self.rotation_order[next_index]

    def calculate_wait_times(self):
        current_signal = self.signals[self.current_direction]
        current_remaining = current_signal.get_green_duration()
        
        # Calculate elapsed time
        if self.phase_start_time:
            elapsed = (datetime.now() - self.phase_start_time).total_seconds()
            current_remaining = max(0, current_signal.get_green_duration() - elapsed)

        # Calculate wait times for each signal
        current_pos = self.rotation_order.index(self.current_direction)
        for direction in self.rotation_order:
            signal = self.signals[direction]
            if direction == self.current_direction:
                signal.expected_wait_time = 0
                continue

            pos = self.rotation_order.index(direction)
            if pos <= current_pos:
                pos += len(self.rotation_order)
            
            # Calculate wait time
            wait_time = current_remaining + 3  # Current green remaining + yellow
            
            # Add times for signals in between
            for i in range(current_pos + 1, pos):
                i = i % len(self.rotation_order)
                intermediate_signal = self.signals[self.rotation_order[i]]
                wait_time += intermediate_signal.get_green_duration() + 3

            signal.expected_wait_time = int(wait_time)

    def update_signal_timing(self):
        current_time = datetime.now()
        logger.debug(f"Updating signal timing. Current direction: {self.current_direction}")

        # Check for emergency vehicles first
        for direction, signal in self.signals.items():
            if signal.emergency_vehicle and not self.emergency_active:
                if signal.status != 'Green':
                    logger.debug(f"Emergency vehicle detected at {direction}")
                    self.emergency_active = True
                    self.emergency_start_time = current_time
                    self.emergency_direction = direction
                    self.previous_direction = self.current_direction
                    # Set all signals to red first
                    for d, s in self.signals.items():
                        s.status = 'Red'
                    # Set the signal with emergency vehicle to green
                    signal.status = 'Green'
                    signal.last_green_time = current_time
                    self.current_direction = direction
                    self.phase_start_time = current_time
                    self.yellow_start_time = None
                return
            elif self.emergency_active and direction == self.current_direction:
                # Check if emergency green time (10 seconds) has elapsed
                emergency_elapsed = (current_time - self.emergency_start_time).total_seconds()
                if emergency_elapsed >= 10:  # 10 seconds for emergency vehicle
                    if not self.yellow_start_time:
                        logger.debug("Emergency vehicle time complete, starting yellow phase")
                        self.yellow_start_time = current_time
                        signal.status = 'Yellow'
                        # Clear emergency vehicle flag
                        signal.clear_emergency()
                    else:
                        yellow_elapsed = (current_time - self.yellow_start_time).total_seconds()
                        if yellow_elapsed >= 3:  # Yellow duration is 3 seconds
                            logger.debug("Emergency vehicle cleared, returning to normal operation")
                            self.emergency_active = False
                            self.emergency_start_time = None
                            self.emergency_direction = None
                            self.current_direction = self.previous_direction
                            self.phase_start_time = current_time
                            self.yellow_start_time = None
                            # Reset all signals to their normal states
                            for d, s in self.signals.items():
                                if d == self.current_direction:
                                    s.status = 'Green'
                                    s.last_green_time = current_time
                                else:
                                    s.status = 'Red'
                return

        # Normal signal timing logic
        elapsed_time = (current_time - self.phase_start_time).total_seconds()
        current_signal = self.signals[self.current_direction]
        phase_duration = current_signal.get_green_duration()

        # Update wait times
        self.calculate_wait_times()

        # Handle yellow phase
        if self.yellow_start_time:
            yellow_elapsed = (current_time - self.yellow_start_time).total_seconds()
            if yellow_elapsed >= 3:  # Yellow duration is 3 seconds
                logger.debug("Yellow phase complete, switching to next direction")
                next_direction = self.get_next_direction()
                self.current_direction = next_direction
                self.phase_start_time = current_time
                self.yellow_start_time = None
                
                # Set all signals to red except the new green one
                for direction, signal in self.signals.items():
                    if direction == next_direction:
                        signal.status = 'Green'
                        signal.last_green_time = current_time
                    else:
                        signal.status = 'Red'
                
                logger.debug(f"Switched to {next_direction} direction")
            return

        # Check if current phase should end
        if elapsed_time >= phase_duration:
            logger.debug("Starting yellow phase")
            self.yellow_start_time = current_time
            self.signals[self.current_direction].status = 'Yellow'

    def get_state(self):
        return {
            'intersection': {
                'current_direction': self.current_direction,
                'location': self.location,
                'signals': {
                    direction: signal.to_dict()
                    for direction, signal in self.signals.items()
                }
            },
            'timestamp': datetime.now().isoformat()
        }

# Create intersection instance
intersection = Intersection()

def generate_mock_data():
    while True:
        try:
            # Update vehicle counts
            for signal in intersection.signals.values():
                signal.update_vehicle_count()
            
            current_time = datetime.now()
            time_since_last_emergency = (current_time - intersection.last_emergency_time).total_seconds()
            
            # Only consider emergency vehicles if:
            # 1. No emergency is currently active
            # 2. At least 2 complete rotations have occurred since start
            # 3. At least 120 seconds (2 minutes) have passed since last emergency
            if (not intersection.emergency_active and 
                intersection.rotation_count >= 2 and 
                time_since_last_emergency >= 120):
                
                # 5% chance of emergency vehicle in one random direction
                if random.random() < 0.05:
                    # Choose a random direction that isn't the current green signal
                    available_directions = [d for d in intersection.rotation_order 
                                         if d != intersection.current_direction]
                    emergency_direction = random.choice(available_directions)
                    intersection.signals[emergency_direction].emergency_vehicle = True
                    intersection.last_emergency_time = current_time
                    logger.debug(f"Generated emergency vehicle in {emergency_direction} direction")

            # Update signal timing
            intersection.update_signal_timing()

            # Get and emit the current state
            current_state = intersection.get_state()
            socketio.emit('traffic_update', current_state)
            
            time.sleep(0.5)  # Update every 0.5 seconds
            
        except Exception as e:
            logger.error(f"Error in generate_mock_data: {e}", exc_info=True)
            time.sleep(1)  # Wait before retrying

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

if __name__ == '__main__':
    # Start mock data generation in a separate thread
    mock_thread = threading.Thread(target=generate_mock_data, daemon=True)
    mock_thread.start()

    # Run the Flask app
    logger.info("Starting Flask-SocketIO server...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True) 