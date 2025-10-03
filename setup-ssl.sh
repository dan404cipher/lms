#!/bin/bash

# SSL Setup Script for AxessUpskill LMS
# This script handles SSL certificate generation for the new domain

set -e

echo "🔧 Setting up SSL for axessupskill.v-accel.ai..."

# Check if domain is provided
DOMAIN="axessupskill.v-accel.ai"

# Create SSL directory
echo "📁 Creating SSL directory..."
mkdir -p /opt/lms/ssl

# Create temporary Nginx configuration for the domain
echo "🌐 Creating temporary Nginx configuration..."
sudo tee /etc/nginx/sites-available/axessupskill-temp.conf > /dev/null <<EOF
server {
    listen 80;
    server_name axessupskill.v-accel.ai;
    
    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Temporary response for other requests
    location / {
        return 200 "AxessUpskill LMS - Setting up SSL...";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable temporary configuration
echo "⚙️ Enabling temporary configuration..."
sudo ln -sf /etc/nginx/sites-available/axessupskill-temp.conf /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

# Start Nginx if not running, or reload if running
if ! systemctl is-active --quiet nginx; then
    echo "🚀 Starting Nginx..."
    sudo systemctl start nginx
else
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
fi

# Create webroot directory with proper permissions
echo "📂 Setting up webroot directory..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html/.well-known
sudo chmod -R 755 /var/www/html/.well-known

# Wait a moment for Nginx to be ready
sleep 2

# Test if the domain is accessible
echo "🔍 Testing domain accessibility..."
if curl -f http://axessupskill.v-accel.ai/ > /dev/null 2>&1; then
    echo "✅ Domain is accessible"
else
    echo "⚠️ Domain might not be accessible yet. DNS propagation may be needed."
    echo "Please ensure axessupskill.v-accel.ai points to this server's IP"
    read -p "Press Enter to continue with SSL generation anyway..."
fi

# Generate SSL certificate
echo "🔒 Generating SSL certificate..."
if sudo certbot certonly --webroot -w /var/www/html -d axessupskill.v-accel.ai --non-interactive --agree-tos --email danush@v-accel.ai; then
    echo "✅ SSL certificate generated successfully"
    
    # Copy certificates to LMS directory
    echo "📋 Copying certificates to LMS directory..."
    sudo cp /etc/letsencrypt/live/axessupskill.v-accel.ai/fullchain.pem /opt/lms/ssl/cert.pem
    sudo cp /etc/letsencrypt/live/axessupskill.v-accel.ai/privkey.pem /opt/lms/ssl/key.pem
    
    # Set proper permissions
    chown -R $USER:$USER /opt/lms/ssl/
    chmod 644 /opt/lms/ssl/cert.pem
    chmod 600 /opt/lms/ssl/key.pem
    
    echo "✅ SSL certificates copied to /opt/lms/ssl/"
else
    echo "❌ SSL certificate generation failed"
    echo "This might be due to:"
    echo "1. DNS not pointing to this server yet"
    echo "2. Firewall blocking port 80"
    echo "3. Domain validation issues"
    echo ""
    echo "Alternative: Use self-signed certificates for testing"
    read -p "Generate self-signed certificates for testing? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📜 Generating self-signed certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /opt/lms/ssl/key.pem \
            -out /opt/lms/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=axessupskill.v-accel.ai"
        
        chown -R $USER:$USER /opt/lms/ssl/
        chmod 644 /opt/lms/ssl/cert.pem
        chmod 600 /opt/lms/ssl/key.pem
        
        echo "✅ Self-signed certificates generated"
        echo "⚠️ Browsers will show security warnings - this is normal for self-signed certs"
    fi
fi

# Remove temporary configuration
echo "🧹 Cleaning up temporary configuration..."
sudo rm -f /etc/nginx/sites-enabled/axessupskill-temp.conf
sudo rm -f /etc/nginx/sites-available/axessupskill-temp.conf

echo "🎉 SSL setup completed!"
echo "Next step: Run ./deploy-to-server.sh to deploy the LMS application"
