server {
    if ($host = stats.minddev.nl) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name stats.minddev.nl;

    location / {
        proxy_pass http://localhost:3105;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }


}
