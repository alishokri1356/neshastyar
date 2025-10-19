#!/bin/bash

# Run email timestamp migration
echo "🔄 Running email timestamp migration..."

# Navigate to the migrations directory
cd "$(dirname "$0")"

# Run the migration
node run_email_timestamp_migration.js

echo "✅ Migration completed!"
