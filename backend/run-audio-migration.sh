#!/bin/bash

# Script to run the audio storage migration on the server
# This script should be run on the VPS server

echo "🚀 Starting audio storage migration..."

# Navigate to the backend directory
cd /root/modiryar/backend

# Run the migration script
node migrations/run_audio_storage_migration.js

echo "✅ Migration completed!"
