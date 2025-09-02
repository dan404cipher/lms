# Quick LMS Deployment Guide

## 🚀 Super Simple 3-Step Deployment

### Prerequisites
- Your server already has HireAccel running on hireaccel.v-accel.ai
- DNS for `axessupskill.v-accel.ai` points to your server IP
- You're logged into your Ubuntu server as root

### Step 1: Clone and Setup
```bash
# Navigate to deployment directory
cd /opt
rm -rf lms  # Remove any existing directory
git clone https://github.com/dan404cipher/lms.git
cd lms

# Setup environment files
./setup-env.sh
```

### Step 2: Generate SSL Certificates
```bash
# Run the SSL setup script
./setup-ssl.sh
```
**This script will:**
- Create temporary Nginx config for the domain
- Generate Let's Encrypt SSL certificates
- Handle DNS verification issues automatically
- Fall back to self-signed certificates if needed

### Step 3: Deploy LMS
```bash
# Deploy the LMS application
./deploy-to-server.sh
```

### Step 4: Update Main Nginx (One-time setup)
```bash
# Backup existing config
cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup

# Copy new multi-app config
cp nginx-main-server.conf /etc/nginx/sites-available/multi-app.conf

# Update SSL certificate paths
nano /etc/nginx/sites-available/multi-app.conf
```

**Update these lines in the config:**
```nginx
# Around line 21 (HireAccel section) - keep existing paths
ssl_certificate /etc/letsencrypt/live/hireaccel.v-accel.ai/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/hireaccel.v-accel.ai/privkey.pem;

# Around line 81 (LMS section) - update to new domain
ssl_certificate /etc/letsencrypt/live/axessupskill.v-accel.ai/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/axessupskill.v-accel.ai/privkey.pem;
```

```bash
# Enable new config
rm /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/multi-app.conf /etc/nginx/sites-enabled/

# Test and reload
nginx -t
systemctl reload nginx
```

## ✅ Verification

After deployment, test both applications:

- **HireAccel**: https://hireaccel.v-accel.ai ✅
- **LMS**: https://axessupskill.v-accel.ai ✅

## 🔧 Troubleshooting

### SSL Issues
If SSL generation fails:
```bash
# Check if domain points to your server
nslookup axessupskill.v-accel.ai

# Check if port 80 is accessible
curl -I http://axessupskill.v-accel.ai
```

### Container Issues
```bash
# Check container status
cd /opt/lms
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Nginx Issues
```bash
# Check Nginx status
systemctl status nginx

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

## 📝 Important Notes

1. **DNS**: Ensure `axessupskill.v-accel.ai` points to your server IP before running setup-ssl.sh
2. **Firewall**: Ports 80 and 443 must be open
3. **Certificates**: The script handles both Let's Encrypt and self-signed certificates
4. **Isolation**: LMS runs on ports 8080/8443 internally, won't conflict with HireAccel
5. **Database**: Uses your existing MongoDB cluster with a new "LMS" database

## 🆘 Get Help

If you encounter issues:
1. Check the logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verify DNS: `nslookup axessupskill.v-accel.ai`
3. Test connectivity: `curl -I http://axessupskill.v-accel.ai`
