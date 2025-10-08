const { server } = require('./app');

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
  console.log(`Frontend should be running on http://localhost:3000`);
});
