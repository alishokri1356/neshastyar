#!/bin/bash

echo "🔄 Restarting backend server..."

# Kill any existing Node.js processes
pkill -f "node.*server.js" || true

# Wait a moment
sleep 2

# Start the server
cd backend
npm start

echo "✅ Backend server restarted!"
