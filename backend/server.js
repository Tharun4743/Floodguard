const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Config / DB
const db = require('./config/db');
const { initDb } = require('./db/init');

// Middlewares
const errorHandler = require('./middleware/error');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const floodRoutes = require('./routes/floodRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const rescueRoutes = require('./routes/rescueRoutes');
const shelterRoutes = require('./routes/shelterRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const mapRoutes = require('./routes/mapRoutes');

// Services
const { startTelemetrySimulator } = require('./services/telemetrySimulator');

const app = express();
const server = http.createServer(app);

// Configure CORS Options
const corsOptions = {
  origin: '*', // In production, replace with specific frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Set up security headers (disable contentSecurityPolicy in dev if it interferes with visual tests)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io Setup
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Expose Socket.io instance on app object for controllers
app.set('io', io);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle coordination chat message sending
  socket.on('send_message', async (data) => {
    try {
      const { user_id, message } = data;

      if (!user_id || !message) return;

      // Insert message into database
      const result = await db.query(
        `INSERT INTO chat_messages (user_id, message, timestamp)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING *`,
        [user_id, message]
      );

      const newMessage = result.rows[0];

      // Fetch sender details to append to message payload
      const userResult = await db.query('SELECT name, role FROM users WHERE id = $1', [user_id]);
      if (userResult.rows.length > 0) {
        newMessage.user_name = userResult.rows[0].name;
        newMessage.user_role = userResult.rows[0].role;
      }

      // Broadcast message to all connected clients
      io.emit('new_message', newMessage);

    } catch (error) {
      console.error('Socket send_message error:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/flood', floodRoutes);
app.use('/api/ai', floodRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/rescue', rescueRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/map', mapRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FloodGuard Evacuation Coordination Swarm API is running.'
  });
});

// Fallback Route (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize DB and start server
const startServer = async () => {
  try {
    // Run schema initialization/seeding
    await initDb();

    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      // Start IoT Telemetry swarm simulator
      startTelemetrySimulator(io);
    });
  } catch (error) {
    console.error('Failed to initialize and start server:', error.message);
    process.exit(1);
  }
};

startServer();
