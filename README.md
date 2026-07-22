# MindNginx

<p align="center">
  <strong>Terminal-based Nginx Configuration Manager</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D10-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License">
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen.svg" alt="Zero Dependencies">
</p>

---

MindNginx is an interactive terminal UI (TUI) for managing Nginx configurations. It provides a visual dashboard to add, enable, disable, and monitor your Nginx server blocks — all from a single command.

## Features

- **Interactive Dashboard** — Real-time overview of all sites with status indicators
- **Site Management** — Add, enable, disable, and delete server blocks
- **Site Templates** — Static files, reverse proxy, or custom configurations
- **SSL Support** — Interactive SSL certificate configuration
- **Config Testing** — Validate Nginx configuration before applying
- **Log Viewer** — View access and error logs directly in the terminal
- **Backup & Restore** — Create and restore full Nginx configuration backups
- **Nginx Control** — Start, stop, restart, and reload Nginx from the dashboard
- **Zero Dependencies** — Uses only Node.js built-in modules
- **Single File** — Entire application in one portable `nginx.js` file

## Prerequisites

- [Node.js](https://nodejs.org/) (version 10 or higher)
- [Nginx](https://nginx.org/) installed

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

## Installation

Clone the repository and make the script executable:

```bash
git clone https://github.com/MindDevelopment/MindNginx.git
cd MindNginx
chmod +x nginx.js
```

Optionally, create a global symlink (see [Docs/LINKING.md](Docs/LINKING.md) for more options):

```bash
npm link
```

## Usage

Run MindNginx directly:

```bash
sudo node nginx.js
```

Or if linked globally:

```bash
sudo mindnginx
```

> **Note:** `sudo` is required because Nginx configuration files are in `/etc/nginx/`.

### Menu Options

| Key | Action              | Description                                    |
|-----|---------------------|------------------------------------------------|
| `1` | Add site            | Create a new server block configuration        |
| `2` | Enable / Disable    | Toggle a site on or off                        |
| `3` | Delete site         | Remove a site configuration                    |
| `4` | View site config    | Display the configuration of a site            |
| `5` | View logs           | View access and/or error logs                  |
| `6` | Nginx control       | Start, stop, restart, or reload Nginx          |
| `7` | Test configuration  | Validate Nginx configuration (`nginx -t`)      |
| `8` | Create backup       | Backup all Nginx configuration files           |
| `9` | Restore backup      | Restore a previous configuration backup        |
| `0` | Exit                | Close MindNginx                                |

## Configuration

MindNginx manages the following Nginx paths:

| Path                        | Description             |
|-----------------------------|-------------------------|
| `/etc/nginx/nginx.conf`     | Main Nginx config       |
| `/etc/nginx/sites-available`| Available site configs  |
| `/etc/nginx/sites-enabled`  | Enabled site symlinks   |
| `/etc/nginx/conf.d`         | Additional config files |
| `/var/log/nginx/access.log` | Access log              |
| `/var/log/nginx/error.log`  | Error log               |

Backups are stored in `~/.nginx_backups/`.

## File Structure

```
MindNginx/
├── nginx.js        # Main application (single file)
├── package.json    # Package configuration
├── README.md       # This file
└── Docs/           # Documentation
    ├── LINKING.md         # How to link mindnginx globally
    ├── NGINX.md           # Nginx command reference
    ├── CONFIGURATION.md   # Configuration guide
    ├── TROUBLESHOOTING.md # Common issues & solutions
    └── CONTRIBUTING.md    # Contribution guidelines
```

## Documentation

| Document | Description |
|----------|-------------|
| [LINKING.md](Docs/LINKING.md) | How to make `mindnginx` command available globally |
| [NGINX.md](Docs/NGINX.md) | Complete Nginx command reference |
| [CONFIGURATION.md](Docs/CONFIGURATION.md) | Configuration files, backups, and server block settings |
| [TROUBLESHOOTING.md](Docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [CONTRIBUTING.md](Docs/CONTRIBUTING.md) | Guidelines for contributing to the project |

## How It Works

MindNginx operates as a lightweight wrapper around Nginx:

- **Reading/Writing** — Manages server block files in `/etc/nginx/sites-available/`
- **Enable/Disable** — Creates/removes symlinks in `/etc/nginx/sites-enabled/`
- **Status** — Checks Nginx status via `systemctl` and `pgrep`
- **Config Test** — Runs `nginx -t` to validate configurations
- **Terminal UI** — Renders dashboard using ANSI escape codes and Unicode box-drawing characters

## Author

**MindDevelopment**

---

<p align="center">
  <sub>Built with Node.js and a love for clean terminal interfaces.</sub>
</p>
