#!/bin/bash

# LMS Production Deployment Script
# This script helps deploy the LMS application to your Ubuntu server

set -e

echo "🚀 Starting LMS Production Deployment..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
sudo mkdir -p /opt/lms
sudo mkdir -p /opt/lms/ssl

# Set proper permissions
sudo chown -R $USER:$USER /opt/lms

# Copy files to deployment directory
echo "📋 Copying configuration files..."
cp docker-compose.prod.yml /opt/lms/
cp nginx-lms-production.conf /opt/lms/
cp -r api /opt/lms/
cp -r client /opt/lms/

# Navigate to deployment directory
cd /opt/lms

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

# Show logs
echo "📋 Showing recent logs..."
docker-compose -f docker-compose.prod.yml logs --tail=50

echo "✅ LMS deployment completed!"
echo ""
echo "🌐 Your LMS application should be available at:"
echo "   - HTTP: http://your-server-ip:8080"
echo "   - HTTPS: https://axessupskill.v-accel.ai (after SSL setup)"
echo ""
echo "📝 Next steps:"
echo "   1. Configure SSL certificates in /opt/lms/ssl/"
echo "   2. Update your domain DNS to point to this server"
echo "   3. Configure your main Nginx to proxy to this LMS instance"
echo "   4. Test the application functionality"
