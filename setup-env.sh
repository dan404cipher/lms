#!/bin/bash

# Environment Setup Script for LMS
# This script creates the necessary environment files for deployment

echo "🔧 Setting up environment files for LMS deployment..."

# Create API production environment file
if [ ! -f "api/.env.production" ]; then
    echo "📝 Creating API production environment file..."
    cp api/.env.production.example api/.env.production
    echo "✅ Created api/.env.production from example"
else
    echo "✅ API production environment file already exists"
fi

# Create client production environment file  
if [ ! -f "client/.env.production" ]; then
    echo "📝 Creating client production environment file..."
    cat > client/.env.production << 'EOF'
# Production Environment Configuration for AxessUpskill LMS
# API Configuration
VITE_API_URL=https://axessupskill.v-accel.ai/api

# App Configuration
VITE_APP_NAME=AxessUpskill LMS
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false

# File Upload Configuration
VITE_MAX_FILE_SIZE=0
VITE_ALLOWED_FILE_TYPES=image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,application/zip

# Upload Storage Configuration
VITE_UPLOAD_STORAGE_TYPE=local
VITE_UPLOAD_BASE_URL=https://axessupskill.v-accel.ai/uploads

# File Size Limits by Type
VITE_MAX_MATERIAL_SIZE=104857600
VITE_MAX_LESSON_CONTENT_SIZE=1073741824
VITE_MAX_RECORDING_SIZE=2147483648

# Upload Folders
VITE_MATERIALS_UPLOAD_FOLDER=materials
VITE_LESSON_CONTENT_FOLDER=lesson-content
VITE_RECORDINGS_FOLDER=recordings

# UI Configuration
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true

# Security Configuration
VITE_ENABLE_HTTPS_REDIRECT=true
VITE_SESSION_TIMEOUT=3600000

# Zoom Integration
VITE_ZOOM_CLIENT_ID=${ZOOM_CLIENT_ID:-your_zoom_client_id}
VITE_ZOOM_REDIRECT_URI=https://axessupskill.v-accel.ai/auth/zoom/callback

# Socket.IO Configuration
VITE_SOCKET_URL=https://axessupskill.v-accel.ai
EOF
    echo "✅ Created client/.env.production"
else
    echo "✅ Client production environment file already exists"
fi

echo "🎉 Environment setup completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Review and update credentials in api/.env.production if needed"
echo "   2. Run ./setup-ssl.sh to generate SSL certificates"
echo "   3. Run ./deploy-to-server.sh to deploy the application"
