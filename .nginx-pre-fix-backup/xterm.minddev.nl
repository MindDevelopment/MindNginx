server {
    if ($host = xterm.minddev.nl) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name xterm.minddev.nl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name xterm.minddev.nl;

    ssl_certificate /etc/letsencrypt/live/xterm.minddev.nl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xterm.minddev.nl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
