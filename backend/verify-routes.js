// Simple route verification script
const express = require('express');
const webhookRoutes = require('./src/routes/webhook');

const app = express();

// Register webhook routes
app.use('/', webhookRoutes);

// List all registered routes
console.log('🔍 Registered routes:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  }
});

console.log('✅ Webhook route should be: GET /sendmail/:meetingId');
