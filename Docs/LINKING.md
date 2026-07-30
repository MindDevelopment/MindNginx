# Linking MindNginx

This guide explains how to link MindNginx globally so you can use the `mindnginx` command from anywhere in your terminal.

## Method 1: npm link (Recommended)

The easiest way to make `mindnginx` available globally:

```bash
# Navigate to the MindNginx directory
cd /path/to/MindNginx

# Create global symlink
npm link
```

After linking, you can run MindNginx from anywhere:

```bash
sudo mindnginx
```

To unlink later:

```bash
npm unlink -g mind-nginx
```

## Method 2: Manual Symlink

Create a manual symlink in your system's binary directory:

```bash
# Create symlink in /usr/local/bin
sudo ln -s /path/to/MindNginx/nginx.js /usr/local/bin/mindnginx

# Make sure it's executable
chmod +x /path/to/MindNginx/nginx.js
```

To remove:

```bash
sudo rm /usr/local/bin/mindnginx
```

## Method 3: Alias

Add an alias to your shell configuration file (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
# Add to ~/.bashrc or ~/.zshrc
alias mindnginx='sudo node /path/to/MindNginx/nginx.js'
```

Reload your shell configuration:

```bash
source ~/.bashrc
# or
source ~/.zshrc
```

## Method 4: PATH Variable

Add the MindNginx directory to your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$PATH:/path/to/MindNginx"
```

Then make the script executable:

```bash
chmod +x /path/to/MindNginx/nginx.js
```

Reload your shell configuration:

```bash
source ~/.bashrc
```

## Verification

After linking using any method, verify it works:

```bash
# Check if mindnginx command is available
which mindnginx

# Run MindNginx
sudo mindnginx
```

## Troubleshooting

### Command not found

If `mindnginx` command is not found after linking:

1. Check if the symlink exists:
   ```bash
   ls -la /usr/local/bin/mindnginx
   ```

2. Verify the script is executable:
   ```bash
   chmod +x /path/to/MindNginx/nginx.js
   ```

3. Check your PATH:
   ```bash
   echo $PATH
   ```

### Permission denied

If you get permission errors:

```bash
# Make script executable
chmod +x /path/to/MindNginx/nginx.js

# Run with sudo (required for Nginx config access)
sudo mindnginx
```
