#!/bin/bash

# Script to update HireAccel Nginx to handle both domains

set -e

echo "🔧 Updating HireAccel Nginx to handle both domains..."

# Check if we're in the right place
if [ ! -f "nginx-hireaccel-lms-combined.conf" ]; then
    echo "❌ nginx-hireaccel-lms-combined.conf not found. Please run this from the LMS directory."
    exit 1
fi

# Navigate to HireAccel directory
cd /opt/hire-accel

# Backup current configuration
echo "💾 Backing up current Nginx configuration..."
cp nginx-production.conf nginx-production.conf.backup.$(date +%Y%m%d-%H%M%S)

# Copy new configuration
echo "📋 Copying new combined configuration..."
cp /opt/lms/nginx-hireaccel-lms-combined.conf ./nginx-production.conf

# Test the configuration by checking if containers are running
echo "🔍 Checking if HireAccel containers are running..."
if ! docker ps | grep -q hire-accel-nginx-prod; then
    echo "❌ HireAccel containers not running. Please start them first."
    exit 1
fi

# Restart the HireAccel Nginx container to load new config
echo "🔄 Restarting HireAccel Nginx container..."
docker-compose -f docker-compose.prod.yml restart hire-accel-nginx-prod

# Wait for container to be ready
echo "⏳ Waiting for Nginx to restart..."
sleep 10

# Check if container is healthy
echo "🏥 Checking container health..."
if docker ps | grep -q "hire-accel-nginx-prod.*healthy"; then
    echo "✅ Nginx container is healthy"
else
    echo "⚠️ Nginx container may not be healthy yet, checking status..."
    docker ps | grep hire-accel-nginx-prod
fi

# Test both domains
echo "🧪 Testing domain access..."

echo "Testing HireAccel..."
if curl -k -I https://hireaccel.v-accel.ai > /dev/null 2>&1; then
    echo "✅ HireAccel domain is accessible"
else
    echo "⚠️ HireAccel domain test failed"
fi

echo "Testing LMS..."
if curl -k -I https://axessupskill.v-accel.ai > /dev/null 2>&1; then
    echo "✅ LMS domain is accessible"
else
    echo "⚠️ LMS domain test failed"
fi

# Show final status
echo ""
echo "🎉 Nginx update completed!"
echo ""
echo "🌐 Your applications should now be accessible at:"
echo "   - HireAccel: https://hireaccel.v-accel.ai"
echo "   - LMS: https://axessupskill.v-accel.ai"
echo ""
echo "📋 If there are issues:"
echo "   - Check logs: docker logs hire-accel-nginx-prod"
echo "   - Restore backup: cp nginx-production.conf.backup.* nginx-production.conf"
echo "   - Restart container: docker-compose -f docker-compose.prod.yml restart hire-accel-nginx-prod"
