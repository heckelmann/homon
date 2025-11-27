#!/bin/bash

# Check if a tag is provided
if [ -z "$1" ]; then
  echo "Usage: ./build_multi_arch.sh <image-name:tag>"
  echo "Example: ./build_multi_arch.sh myuser/homon:latest"
  exit 1
fi

IMAGE_NAME=$1

# Create a new builder instance if it doesn't exist
if ! docker buildx inspect homon-builder > /dev/null 2>&1; then
  echo "Creating new buildx builder..."
  docker buildx create --name homon-builder --use
fi

# Boot the builder
docker buildx inspect --bootstrap

# Build and push
echo "Building and pushing $IMAGE_NAME for linux/amd64 and linux/arm64..."
docker buildx build --platform linux/amd64,linux/arm64 -t "$IMAGE_NAME" --push .

echo "Done!"
