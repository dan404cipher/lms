# LMS Production Deployment Guide

This guide will help you deploy the AxessUpskill LMS application alongside your existing HireAccel application on the same Ubuntu server.

## Overview

The LMS application consists of:
- **API Backend**: Node.js/TypeScript with MongoDB, Socket.IO, and Zoom integration
- **Frontend**: React/Vite application with modern UI components
- **Domain**: axessupskill.v-accel.ai

## Prerequisites

- Ubuntu server with Docker and Docker Compose installed
- Existing HireAccel application running on hireaccel.v-accel.ai
- Domain DNS configured for axessupskill.v-accel.ai
- SSL certificates for the new domain

## Directory Structure

```
/opt/
├── hireaccel/          # Existing HireAccel application
└── lms/                # New LMS application
    ├── docker-compose.prod.yml
    ├── nginx-lms-production.conf
    ├── api/
    │   ├── Dockerfile.prod
    │   ├── .env.production
    │   └── src/
    └── client/
        ├── Dockerfile.prod
        ├── .env.production
        ├── nginx.conf
        └── docker-entrypoint.sh
```

## Deployment Steps

### 1. Upload Files to Server

Transfer the LMS project files to your server:

```bash
# On your local machine
scp -r /path/to/lms/ user@your-server:/opt/

# Or use rsync for better transfer
rsync -avz --exclude node_modules /path/to/lms/ user@your-server:/opt/lms/
```

### 2. Configure Environment Variables

Update the production environment files with your actual values:

#### API Environment (`/opt/lms/api/.env.production`)
- Update `MONGODB_URI` with your production MongoDB connection string
- Update `JWT_SECRET` with a secure random string
- Verify email credentials (`SMTP_USER`, `SMTP_PASS`)
- Update Zoom API credentials if needed

#### Client Environment (`/opt/lms/client/.env.production`)
- All URLs should already be configured for `axessupskill.v-accel.ai`

### 3. Set Up SSL Certificates

Create SSL certificates for the new domain:

```bash
# Create SSL directory
sudo mkdir -p /opt/lms/ssl

# Option 1: Using Let's Encrypt (recommended)
sudo certbot certonly --nginx -d axessupskill.v-accel.ai

# Copy certificates to LMS directory
sudo cp /etc/letsencrypt/live/axessupskill.v-accel.ai/fullchain.pem /opt/lms/ssl/cert.pem
sudo cp /etc/letsencrypt/live/axessupskill.v-accel.ai/privkey.pem /opt/lms/ssl/key.pem

# Option 2: Using existing certificates
# Copy your certificate files to /opt/lms/ssl/cert.pem and /opt/lms/ssl/key.pem
```

### 4. Deploy LMS Application

```bash
# Navigate to LMS directory
cd /opt/lms

# Make deployment script executable
chmod +x deploy-to-server.sh

# Run deployment
./deploy-to-server.sh
```

### 5. Configure Main Nginx

Update your main Nginx configuration to handle both applications:

```bash
# Backup existing configuration
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Copy the main server configuration
sudo cp /opt/lms/nginx-main-server.conf /etc/nginx/sites-available/multi-app.conf

# Enable the new configuration
sudo ln -sf /etc/nginx/sites-available/multi-app.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6. Verify Deployment

Check that all services are running:

```bash
# Check Docker containers
docker ps

# Check LMS specific containers
cd /opt/lms
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=50

# Test health endpoints
curl http://localhost:8080/health
curl https://axessupskill.v-accel.ai/health
```

## Port Configuration

The LMS application uses different ports to avoid conflicts:

- **LMS Nginx**: 8080 (HTTP), 8443 (HTTPS)
- **LMS API**: 3002 (internal)
- **LMS Client**: 80 (internal, within Docker network)

- **HireAccel Nginx**: 80 (HTTP), 443 (HTTPS)
- **HireAccel API**: 3001 (internal)

## Database Configuration

The LMS uses its own MongoDB database. Make sure to:

1. Create a separate MongoDB database for LMS
2. Create appropriate user credentials
3. Configure connection string in `.env.production`

```javascript
// Example MongoDB URI
MONGODB_URI=mongodb+srv://lmsuser:password@cluster.mongodb.net/lms-production?retryWrites=true&w=majority
```

## Monitoring and Maintenance

### Viewing Logs

```bash
# LMS logs
cd /opt/lms
docker-compose -f docker-compose.prod.yml logs -f

# Specific service logs
docker-compose -f docker-compose.prod.yml logs -f lms-api
docker-compose -f docker-compose.prod.yml logs -f lms-client
```

### Updating the Application

```bash
# Pull latest changes
cd /opt/lms
git pull origin main  # or copy new files

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

### Backup Procedures

```bash
# Backup uploaded files
sudo tar -czf lms-uploads-$(date +%Y%m%d).tar.gz /opt/lms/api/uploads

# Backup MongoDB (if using local instance)
mongodump --uri="mongodb://localhost:27017/lms-production" --out=/backup/lms-$(date +%Y%m%d)
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 8080 and 8443 are available
2. **SSL Certificate Issues**: Verify certificate paths and permissions
3. **MongoDB Connection**: Check connection string and network access
4. **CORS Issues**: Verify CORS_ORIGIN in API environment

### Useful Commands

```bash
# Restart LMS services
cd /opt/lms
docker-compose -f docker-compose.prod.yml restart

# Check container resource usage
docker stats

# Access container shell
docker exec -it lms-api-prod /bin/sh
```

## Security Considerations

1. **Environment Variables**: Never commit production credentials to version control
2. **SSL/TLS**: Always use HTTPS in production
3. **Firewall**: Configure firewall to allow only necessary ports
4. **Updates**: Regularly update Docker images and dependencies
5. **Backup**: Implement regular backup procedures

## Support

For issues with deployment:
1. Check container logs
2. Verify environment configuration
3. Test network connectivity
4. Review Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Application URLs

After successful deployment:
- **HireAccel**: https://hireaccel.v-accel.ai
- **LMS**: https://axessupskill.v-accel.ai

Both applications will run independently on the same server with their own Docker containers and configurations.
