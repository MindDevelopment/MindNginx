# Troubleshooting

Common issues and solutions when using MindNginx.

## MindNginx Issues

### Command Not Found

**Problem:** `mindnginx` or `node nginx.js` command not found.

**Solution:**
1. Make sure you're in the correct directory:
   ```bash
   cd /path/to/MindNginx
   node nginx.js
   ```

2. If using the linked command, verify the link:
   ```bash
   which mindnginx
   ```

3. Re-link if necessary:
   ```bash
   npm link
   ```

### Permission Denied

**Problem:** Permission denied when accessing Nginx configuration files.

**Solution:**
```bash
# Run with sudo
sudo node nginx.js
```

MindNginx needs root access to read/write files in `/etc/nginx/`.

### Display Issues

**Problem:** Dashboard looks broken or misaligned.

**Solution:**
1. Ensure your terminal supports Unicode characters
2. Use a monospace font
3. Increase terminal width (minimum 80 columns recommended)
4. Use a terminal with proper ANSI color support

### Blank Screen

**Problem:** Nothing appears when running nginx.js.

**Solution:**
1. Check if Node.js is installed:
   ```bash
   node --version
   ```

2. Run with verbose output:
   ```bash
   sudo node --trace-warnings nginx.js
   ```

## Nginx Issues

### Nginx Not Found

**Problem:** Nginx command not found.

**Solution:**
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# Verify installation
nginx -v
```

### Nginx Won't Start

**Problem:** Nginx fails to start.

**Solution:**
1. Test configuration:
   ```bash
   sudo nginx -t
   ```

2. Check for port conflicts:
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

3. Check error log:
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

### Configuration Test Failed

**Problem:** `nginx -t` reports errors.

**Solution:**
1. Read the error message carefully — it usually tells you the file and line number
2. Check for common issues:
   - Missing semicolons (`;`)
   - Unclosed braces (`{}`)
   - Invalid directives
   - Wrong file paths

3. View the problematic file:
   ```bash
   sudo nano /etc/nginx/sites-available/example.com
   ```

### 502 Bad Gateway

**Problem:** Reverse proxy returns 502 error.

**Solution:**
1. Check if the backend service is running:
   ```bash
   curl http://localhost:3000
   ```

2. Verify the `proxy_pass` URL in your server block
3. Check Nginx error log:
   ```bash
   sudo tail -20 /var/log/nginx/error.log
   ```

### 403 Forbidden

**Problem:** Static site returns 403 error.

**Solution:**
1. Check file permissions:
   ```bash
   ls -la /var/www/example.com/
   ```

2. Ensure Nginx user can read files:
   ```bash
   sudo chown -R www-data:www-data /var/www/example.com/
   sudo chmod -R 755 /var/www/example.com/
   ```

3. Check if index file exists:
   ```bash
   ls /var/www/example.com/index.html
   ```

### SSL Certificate Errors

**Problem:** SSL-related errors in Nginx.

**Solution:**
1. Verify certificate paths:
   ```bash
   ls -la /etc/ssl/certs/example.com.crt
   ls -la /etc/ssl/private/example.com.key
   ```

2. Check certificate validity:
   ```bash
   sudo openssl x509 -in /etc/ssl/certs/example.com.crt -text -noout
   ```

3. Ensure key and certificate match:
   ```bash
   sudo openssl x509 -noout -modulus -in /etc/ssl/certs/example.com.crt | openssl md5
   sudo openssl rsa -noout -modulus -in /etc/ssl/private/example.com.key | openssl md5
   ```

## Sites-Available / Sites-Enabled Issues

### Sites Directory Missing

**Problem:** `/etc/nginx/sites-available/` or `/etc/nginx/sites-enabled/` doesn't exist.

**Solution:**
```bash
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

Make sure your `nginx.conf` includes these directories:
```nginx
include /etc/nginx/sites-enabled/*;
```

### Symlink Issues

**Problem:** Site shows as enabled but doesn't work.

**Solution:**
1. Check symlinks:
   ```bash
   ls -la /etc/nginx/sites-enabled/
   ```

2. Recreate symlink:
   ```bash
   sudo rm /etc/nginx/sites-enabled/example.com
   sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/
   ```

3. Test and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Backup Issues

### No Backups Found

**Problem:** No backups available to restore.

**Solution:**
1. Check backup directory:
   ```bash
   ls -la ~/.nginx_backups/
   ```

2. Create a manual backup:
   ```bash
   sudo cp -r /etc/nginx/sites-available ~/.nginx_backups/manual_backup/
   ```

### Backup Restore Failed

**Problem:** Cannot restore backup.

**Solution:**
1. Verify backup files exist:
   ```bash
   ls -la ~/.nginx_backups/backup_*/
   ```

2. Manually restore:
   ```bash
   sudo cp ~/.nginx_backups/backup_*/sites-available/* /etc/nginx/sites-available/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Getting Help

If you encounter issues not covered here:

1. Check Nginx documentation: https://nginx.org/en/docs/
2. Check Node.js documentation: https://nodejs.org/
3. Open an issue on GitHub
4. Contact MindDevelopment support
