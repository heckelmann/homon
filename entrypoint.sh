#!/bin/sh

# Ensure the data directory exists
mkdir -p /app/data

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start scheduler in background
echo "Starting scheduler..."
node dist/scheduler.js &

# Start main server
echo "Starting main server..."
node dist/server.js
