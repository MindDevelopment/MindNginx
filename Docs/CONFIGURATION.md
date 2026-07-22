# Configuration

This document explains how MindNginx stores and manages Nginx configuration files.

## Nginx Configuration Paths

MindNginx manages the following standard Nginx paths:

| Path                        | Description                  |
|-----------------------------|------------------------------|
| `/etc/nginx/nginx.conf`     | Main Nginx configuration     |
| `/etc/nginx/sites-available`| Available site configurations|
| `/etc/nginx/sites-enabled`  | Enabled sites (symlinks)     |
| `/etc/nginx/conf.d`         | Additional configuration files|

## Backup Location

Backups are stored in:

```
~/.nginx_backups/
```

Each backup is a timestamped directory containing:

```
~/.nginx_backups/backup_2026-01-15_14-30-00/
├── nginx.conf
├── sites-available/
│   ├── example.com
│   └── api.example.com
├── sites-enabled/
│   └── example.com -> /etc/nginx/sites-available/example.com
└── conf.d/
    └── default.conf
```

## Server Block Structure

When you add a site through MindNginx, it creates a server block in `/etc/nginx/sites-available/`:

### Static Site Example

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Reverse Proxy Example

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

## Enabling and Disabling Sites

MindNginx uses the standard Nginx pattern of `sites-available` and `sites-enabled`:

- **sites-available/** — Contains all configuration files
- **sites-enabled/** — Contains symlinks to active configurations

When you enable a site, MindNginx creates a symlink from `sites-enabled/` to `sites-available/`. When you disable a site, it removes the symlink.

After any change, always test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Log Files

| Path                        | Description       |
|-----------------------------|-------------------|
| `/var/log/nginx/access.log` | Access log        |
| `/var/log/nginx/error.log`  | Error log         |

## Manual Configuration

You can manually edit Nginx configuration files:

```bash
sudo nano /etc/nginx/sites-available/example.com
```

After editing, test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Backup Management

### Create Backup

Using MindNginx:
1. Run `sudo node nginx.js`
2. Select option `8` (Create backup)

Using command line:
```bash
sudo mkdir -p ~/.nginx_backups/backup_$(date +%Y-%m-%d_%H-%M-%S)
sudo cp -r /etc/nginx/sites-available ~/.nginx_backups/backup_$(date +%Y-%m-%d_%H-%M-%S)/
sudo cp -r /etc/nginx/sites-enabled ~/.nginx_backups/backup_$(date +%Y-%m-%d_%H-%M-%S)/
sudo cp /etc/nginx/nginx.conf ~/.nginx_backups/backup_$(date +%Y-%m-%d_%H-%M-%S)/
```

### Restore Backup

Using MindNginx:
1. Run `sudo node nginx.js`
2. Select option `9` (Restore backup)
3. Choose the backup to restore

Using command line:
```bash
sudo cp ~/.nginx_backups/backup_YYYY-MM-DD_HH-MM-SS/sites-available/* /etc/nginx/sites-available/
sudo cp -a ~/.nginx_backups/backup_YYYY-MM-DD_HH-MM-SS/sites-enabled/* /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### List Backups

```bash
ls -la ~/.nginx_backups/
```

## File Permissions

Ensure proper permissions:

```bash
# Nginx config files
sudo chmod 644 /etc/nginx/sites-available/*
sudo chmod 644 /etc/nginx/nginx.conf

# Directories
sudo chmod 755 /etc/nginx/sites-available
sudo chmod 755 /etc/nginx/sites-enabled

# Backup directory
chmod 755 ~/.nginx_backups/
```
