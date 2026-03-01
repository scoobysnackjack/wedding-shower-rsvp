require('dotenv').config();
const path = require('path');
const express = require('express');

const rsvpRoutes = require('./src/routes/rsvp');
const adminRoutes = require('./src/routes/admin');
const guestsRoutes = require('./src/routes/guests');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use('/api/rsvp', rsvpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/guests', guestsRoutes);

app.get('/rsvp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rsvp.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/terms-and-conditions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms-and-conditions.html'));
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Wedding Shower RSVP server running at http://localhost:${PORT}`);
  console.log(`  RSVP page: http://localhost:${PORT}/rsvp`);
  console.log(`  Admin:     http://localhost:${PORT}/admin`);
});
