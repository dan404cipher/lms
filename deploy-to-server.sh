#!/bin/bash

# LMS Production Deployment Script
# This script helps deploy the LMS application to your Ubuntu server

set -e

echo "🚀 Starting LMS Production Deployment..."

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ docker-compose.prod.yml not found. Please run this script from the LMS directory."
    exit 1
fi

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
    echo "⚠️ SSL certificates not found in ssl/ directory"
    echo "Please run ./setup-ssl.sh first to generate SSL certificates"
    exit 1
fi

echo "✅ SSL certificates found"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check health status
echo "🔍 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
echo "🏥 Testing health endpoints..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ LMS health check passed"
else
    echo "⚠️ LMS health check failed - check logs"
fi

# Show logs
echo "📋 Showing recent logs..."
docker-compose -f docker-compose.prod.yml logs --tail=50

echo "✅ LMS deployment completed!"
echo ""
echo "🌐 Your LMS application should be available at:"
echo "   - Internal: http://localhost:8080"
echo "   - External: https://axessupskill.v-accel.ai (after Nginx configuration)"
echo ""
echo "📝 Next steps:"
echo "   1. Update your main Nginx configuration using nginx-main-server.conf"
echo "   2. Test both HireAccel and LMS applications"
echo "   3. Monitor logs for any issues"
