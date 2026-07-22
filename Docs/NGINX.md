# Nginx Commands Reference

This document explains how to manage Nginx directly from the terminal.

## Basic Commands

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### Start Nginx

```bash
sudo systemctl start nginx
```

### Stop Nginx

```bash
sudo systemctl stop nginx
```

### Restart Nginx

```bash
sudo systemctl restart nginx
```

### Reload Nginx (Graceful)

```bash
sudo systemctl reload nginx
# or
sudo nginx -s reload
```

Reload applies configuration changes without dropping connections.

### Test Configuration

```bash
sudo nginx -t
```

Validates the configuration without applying changes.

## Site Management

### List Available Sites

```bash
ls -la /etc/nginx/sites-available/
```

### List Enabled Sites

```bash
ls -la /etc/nginx/sites-enabled/
```

### Enable a Site

```bash
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Disable a Site

```bash
sudo rm /etc/nginx/sites-enabled/example.com
sudo systemctl reload nginx
```

### Create a New Site

```bash
sudo nano /etc/nginx/sites-available/example.com
```

## Server Block Examples

### Static Files

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/example.com;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL / HTTPS

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /var/www/example.com;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Redirect HTTP to HTTPS

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

## Logs

### View Access Log

```bash
sudo tail -f /var/log/nginx/access.log
```

### View Error Log

```bash
sudo tail -f /var/log/nginx/error.log
```

### View Last 100 Lines

```bash
sudo tail -100 /var/log/nginx/access.log
```

### Clear Logs

```bash
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log
```

## SSL Certificates

### Generate Self-Signed Certificate

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/example.com.key \
    -out /etc/ssl/certs/example.com.crt
```

### Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## Process Information

### View Nginx Processes

```bash
ps aux | grep nginx
```

### Active Connections

To enable the stub_status module, add to your Nginx config:

```nginx
location /nginx_status {
    stub_status;
    allow 127.0.0.1;
    deny all;
}
```

Then check:

```bash
curl http://127.0.0.1/nginx_status
```

## Common Configuration Options

### Increase Upload Size

```nginx
client_max_body_size 50M;
```

### Set Timeouts

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### Enable Gzip Compression

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 256;
```

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

server {
    location / {
        limit_req zone=one burst=20;
    }
}
```
