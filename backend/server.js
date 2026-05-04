const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());           // allows frontend (port 3000) to call backend (port 5000)
app.use(express.json());   // parses incoming JSON request bodies

// Routes
app.use('/api/login',     require('./routes/auth'));
app.use('/api/requests',  require('./routes/requests'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/carbon',    require('./routes/carbon'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Start server
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
});