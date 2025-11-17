const { server } = require('./app');
const { initializeSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
const io = initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
  console.log(`Frontend should be running on http://localhost:3000`);
  console.log(`WebSocket server initialized`);
});
