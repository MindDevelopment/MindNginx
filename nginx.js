#!/usr/bin/env node
'use strict';

/*
 ================================================================
  MINDNGINX
  Author: MindDevelopment
   Nginx configuration manager with full CLI interface
 ================================================================
*/

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const readline = require('readline');
const { exec, spawn } = require('child_process');

// ─── CONFIG ────────────────────────────────────────────────
const HOME = os.homedir();
const CONFIG = {
    VERSION:          '1.0.0',
    REPO_OWNER:       'MindDevelopment',
    REPO_NAME:        'MindNginx',
    HOME,
    NGINX_CONF:       '/etc/nginx/nginx.conf',
    SITES_AVAILABLE:   '/etc/nginx/sites-available',
    SITES_ENABLED:     '/etc/nginx/sites-enabled',
    CONF_D:           '/etc/nginx/conf.d',
    ACCESS_LOG:       '/var/log/nginx/access.log',
    ERROR_LOG:        '/var/log/nginx/error.log',
    BACKUP_DIR:       path.join(HOME, '.nginx_backups'),
    MAX_NAME_LENGTH:  40,
    LOGS_LINES:       50,
};

// ─── KLEUREN ───────────────────────────────────────────────
const rgb = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

const C = {
    reset:      '\x1b[0m',
    bold:       '\x1b[1m',
    dim:        '\x1b[2m',
    italic:     '\x1b[3m',
    underline:  '\x1b[4m',
    red:        '\x1b[31m',
    green:      '\x1b[32m',
    yellow:     '\x1b[33m',
    blue:       '\x1b[34m',
    magenta:    '\x1b[35m',
    cyan:       '\x1b[36m',
    white:      '\x1b[37m',
    gray:       '\x1b[90m',
};

const THEME = {
    primary:    rgb(0, 150, 200),
    secondary:  rgb(100, 200, 230),
    success:    rgb(80, 220, 120),
    danger:     rgb(220, 60, 80),
    info:       rgb(60, 170, 255),
    warning:    rgb(240, 200, 60),
    border:     rgb(0, 130, 180),
    highlight:  rgb(180, 230, 255),
    muted:      rgb(80, 120, 150),
    active:     rgb(80, 255, 120),
    inactive:   rgb(180, 150, 80),
    error:      rgb(255, 60, 60),
};

// ─── READLINE ──────────────────────────────────────────────
let rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
});

function ask(q) {
    return new Promise(resolve => rl.question(q, answer => resolve(answer)));
}

function recreateReadline() {
    rl.close();
    rl = readline.createInterface({
        input:  process.stdin,
        output: process.stdout,
    });
}

// ─── HELPERS ───────────────────────────────────────────────
const repeat = (c, n) => n > 0 ? c.repeat(Math.max(0, n)) : '';

function getTerminalWidth() {
    return process.stdout.columns || 80;
}

async function pause() {
    await ask(`${THEME.muted}  Press ENTER to continue...${C.reset}`);
}

function error(text) {
    return `${THEME.danger}${C.bold}✖${C.reset} ${THEME.danger}${text}${C.reset}`;
}

function success(text) {
    return `${THEME.success}${C.bold}✔${C.reset} ${THEME.success}${text}${C.reset}`;
}

function warn(text) {
    return `${THEME.warning}${C.bold}⚠${C.reset} ${THEME.warning}${text}${C.reset}`;
}

function info(text) {
    return `${THEME.info}${C.bold}ℹ${C.reset} ${THEME.info}${text}${C.reset}`;
}

// ─── VERSION CHECK ────────────────────────────────────────
async function checkForUpdates() {
    return new Promise((resolve) => {
        const https = require('https');
        const url = `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/releases/latest`;

        const options = {
            headers: {
                'User-Agent': 'MindNginx-Version-Check',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        const req = https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const release = JSON.parse(data);
                        const latestVersion = release.tag_name.replace(/^v/, '');
                        const downloadUrl = release.html_url;
                        const isOutdated = latestVersion !== CONFIG.VERSION;
                        resolve({
                            isOutdated,
                            currentVersion: CONFIG.VERSION,
                            latestVersion,
                            downloadUrl
                        });
                    } else {
                        resolve({ isOutdated: false, currentVersion: CONFIG.VERSION, error: 'Could not check for updates' });
                    }
                } catch (e) {
                    resolve({ isOutdated: false, currentVersion: CONFIG.VERSION, error: 'Could not parse update info' });
                }
            });
        });

        req.on('error', () => {
            resolve({ isOutdated: false, currentVersion: CONFIG.VERSION, error: 'Could not connect to GitHub' });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ isOutdated: false, currentVersion: CONFIG.VERSION, error: 'Connection timeout' });
        });
    });
}

// Visual length - strip ANSI codes, handle wide chars
function vlen(str) {
    const clean = str.replace(/\x1b\[[0-9;]*m/g, '');
    let len = 0;
    for (const ch of clean) {
        const code = ch.codePointAt(0);
        if ((code >= 0x1100 && code <= 0x115F) || (code >= 0x2E80 && code <= 0x9FFF) ||
            (code >= 0xAC00 && code <= 0xD7AF) || (code >= 0xF900 && code <= 0xFAFF) ||
            (code >= 0xFE10 && code <= 0xFE6F) || (code >= 0xFF01 && code <= 0xFF60) ||
            (code >= 0xFFE0 && code <= 0xFFE6) || code >= 0x20000) {
            len += 2;
        } else {
            len += 1;
        }
    }
    return len;
}

function padRight(str, width) {
    const diff = width - vlen(str);
    return diff > 0 ? str + ' '.repeat(diff) : str;
}

function truncate(str, max) {
    const clean = str.replace(/\x1b\[[0-9;]*m/g, '');
    if (clean.length <= max) return str;
    return clean.substring(0, max - 1) + '…';
}

// ─── BOX ENGINE ────────────────────────────────────────────
function boxTop(width, bc) {
    return `${bc}╔${repeat('═', width)}╗${C.reset}`;
}
function boxBottom(width, bc) {
    return `${bc}╚${repeat('═', width)}╝${C.reset}`;
}
function sepFull(width, bc) {
    return `${bc}╠${repeat('═', width)}╣${C.reset}`;
}
function sepCols(colWidths, bc, type) {
    const mid = type === 'top' ? '╦' : type === 'mid' ? '╬' : '╩';
    let line = bc + '╠';
    for (let i = 0; i < colWidths.length; i++) {
        line += repeat('═', colWidths[i]);
        if (i < colWidths.length - 1) line += mid;
    }
    line += '╣' + C.reset;
    return line;
}
function fullRow(content, width, bc) {
    return `${bc}║${C.reset} ${padRight(content, width - 2)} ${bc}║${C.reset}`;
}
function colRow(contents, colWidths, bc) {
    let line = `${bc}║${C.reset}`;
    for (let i = 0; i < contents.length; i++) {
        if (i > 0) line += `${bc}║${C.reset}`;
        line += ` ${padRight(contents[i], colWidths[i] - 1)}`;
    }
    line += `${bc}║${C.reset}`;
    return line;
}

// ─── LOGO ──────────────────────────────────────────────────
function getLogoLines() {
    const screenWidth = getTerminalWidth();
    if (screenWidth < 70) {
        return [];
    }
    return [
`${rgb(0, 120, 170)}███╗   ███╗ ██╗ ███╗   ██╗ ██████╗  ███╗   ██╗  ██████╗  ██╗ ███╗   ██╗ ██╗  ██╗${C.reset}`,
`${rgb(0, 140, 190)}████╗ ████║ ██║ ████╗  ██║ ██╔══██╗ ████╗  ██║ ██╔════╝  ██║ ████╗  ██║ ╚██╗██╔╝${C.reset}`,
`${rgb(0, 160, 210)}██╔████╔██║ ██║ ██╔██╗ ██║ ██║  ██║ ██╔██╗ ██║ ██║  ███╗ ██║ ██╔██╗ ██║  ╚███╔╝${C.reset}`, 
`${rgb(30, 180, 220)}██║╚██╔╝██║ ██║ ██║╚██╗██║ ██║  ██║ ██║╚██╗██║ ██║   ██║ ██║ ██║╚██╗██║  ██╔██╗${C.reset}`, 
`${rgb(60, 200, 230)}██║ ╚═╝ ██║ ██║ ██║ ╚████║ ██████╔╝ ██║ ╚████║ ╚██████╔╝ ██║ ██║ ╚████║ ██╔╝ ██╗${C.reset}`,
`${rgb(60, 120, 140)}╚═╝     ╚═╝ ╚═╝ ╚═╝  ╚═══╝ ╚═════╝  ╚═╝  ╚═══╝  ╚═════╝  ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═╝${C.reset}`,
    ];
}

// ─── NGINX SERVICE ────────────────────────────────────────
async function nginxExec(args, options = {}) {
    return new Promise((resolve, reject) => {
        const cmd = `sudo nginx ${args}`;
        exec(cmd, { maxBuffer: 10 * 1024 * 1024, ...options }, (err, stdout, stderr) => {
            if (err && !options.ignoreError) {
                reject(new Error(stderr || err.message));
            } else {
                resolve({ stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
            }
        });
    });
}

async function nginxTest() {
    try {
        const result = await nginxExec('-t', { ignoreError: true });
        const output = (result.stdout + ' ' + result.stderr).trim();
        const valid = output.includes('successful') || output.includes('ok');
        return { valid, output };
    } catch (e) {
        return { valid: false, output: e.message };
    }
}

async function getNginxStatus() {
    return new Promise((resolve) => {
        exec('systemctl is-active nginx 2>/dev/null || pgrep nginx > /dev/null && echo "active" || echo "inactive"', (err, stdout) => {
            const status = (stdout || '').trim();
            if (status === 'active') {
                resolve({ running: true, status: 'active' });
            } else if (status === 'inactive') {
                resolve({ running: false, status: 'inactive' });
            } else {
                exec('pgrep nginx > /dev/null && echo "running" || echo "stopped"', (err2, stdout2) => {
                    const s = (stdout2 || '').trim();
                    resolve({ running: s === 'running', status: s });
                });
            }
        });
    });
}

async function getNginxVersion() {
    try {
        const result = await nginxExec('-v', { ignoreError: true });
        const match = (result.stderr || result.stdout || '').match(/nginx\/([\d.]+)/);
        return match ? match[1] : 'unknown';
    } catch {
        return 'unknown';
    }
}

async function getActiveConnections() {
    try {
        const result = await exec('curl -s http://127.0.0.1/nginx_status 2>/dev/null || echo ""', { maxBuffer: 1024 * 1024 });
        return '';
    } catch {
        return '';
    }
}

async function getNginxProcesses() {
    return new Promise((resolve) => {
        exec('ps aux | grep "[n]ginx" | head -20', (err, stdout) => {
            const lines = (stdout || '').trim().split('\n').filter(Boolean);
            const procs = lines.map(line => {
                const parts = line.split(/\s+/);
                return {
                    user: parts[0] || '',
                    pid: parseInt(parts[1]) || 0,
                    cpu: parseFloat(parts[2]) || 0,
                    mem: parseFloat(parts[3]) || 0,
                    vsz: parts[4] || '0',
                    rss: parts[5] || '0',
                    command: parts.slice(10).join(' ') || '',
                };
            });
            resolve(procs);
        });
    });
}

// ─── SITE MANAGEMENT ──────────────────────────────────────
function getSites() {
    const available = [];
    const enabled = new Set();

    if (fs.existsSync(CONFIG.SITES_AVAILABLE)) {
        try {
            const files = fs.readdirSync(CONFIG.SITES_AVAILABLE);
            for (const f of files) {
                const fullPath = path.join(CONFIG.SITES_AVAILABLE, f);
                if (fs.statSync(fullPath).isFile()) {
                    available.push(f);
                }
            }
        } catch {}
    }

    if (fs.existsSync(CONFIG.SITES_ENABLED)) {
        try {
            const entries = fs.readdirSync(CONFIG.SITES_ENABLED, { withFileTypes: true });
            for (const e of entries) {
                if (e.isSymbolicLink() || fs.statSync(path.join(CONFIG.SITES_ENABLED, e.name)).isFile()) {
                    enabled.add(e.name);
                }
            }
        } catch {}
    }

    const confDFiles = [];
    if (fs.existsSync(CONFIG.CONF_D)) {
        try {
            const files = fs.readdirSync(CONFIG.CONF_D);
            for (const f of files) {
                if (f.endsWith('.conf')) {
                    const fullPath = path.join(CONFIG.CONF_D, f);
                    if (fs.statSync(fullPath).isFile()) {
                        confDFiles.push(f);
                    }
                }
            }
        } catch {}
    }

    return {
        available: available.sort(),
        enabled: [...enabled].sort(),
        confD: confDFiles.sort(),
    };
}

function readSiteConfig(siteName) {
    const filePath = path.join(CONFIG.SITES_AVAILABLE, siteName);
    if (!fs.existsSync(filePath)) return null;
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return null;
    }
}

function parseSiteConfig(content) {
    const serverNames = [];
    const listen = [];
    const root = [];
    const proxyPass = [];

    const snMatch = content.match(/server_name\s+([^;]+);/g);
    if (snMatch) {
        for (const m of snMatch) {
            const names = m.replace(/server_name\s+/, '').replace(/;/, '').trim().split(/\s+/);
            serverNames.push(...names);
        }
    }

    const listenMatch = content.match(/listen\s+([^;]+);/g);
    if (listenMatch) {
        for (const m of listenMatch) {
            listen.push(m.replace(/listen\s+/, '').replace(/;/, '').trim());
        }
    }

    const rootMatch = content.match(/root\s+([^;]+);/g);
    if (rootMatch) {
        for (const m of rootMatch) {
            root.push(m.replace(/root\s+/, '').replace(/;/, '').trim());
        }
    }

    const proxyMatch = content.match(/proxy_pass\s+([^;]+);/g);
    if (proxyMatch) {
        for (const m of proxyMatch) {
            proxyPass.push(m.replace(/proxy_pass\s+/, '').replace(/;/, '').trim());
        }
    }

    return { serverNames, listen, root, proxyPass };
}

function generateServerBlock(opts) {
    const {
        serverName,
        listen = '80',
        root = '',
        proxyPass = '',
        sslCert = '',
        sslKey = '',
        extra = '',
    } = opts;

    let block = `server {\n`;
    block += `    listen ${listen};\n`;
    if (listen.includes('443') && sslCert && sslKey) {
        block += `    ssl_certificate ${sslCert};\n`;
        block += `    ssl_certificate_key ${sslKey};\n`;
        block += `    ssl_protocols TLSv1.2 TLSv1.3;\n`;
    }
    block += `    server_name ${serverName};\n`;

    if (root) {
        block += `    root ${root};\n`;
        block += `    index index.html index.htm;\n`;
        block += `\n`;
        block += `    location / {\n`;
        block += `        try_files $uri $uri/ =404;\n`;
        block += `    }\n`;
    } else if (proxyPass) {
        block += `\n`;
        block += `    location / {\n`;
        block += `        proxy_pass ${proxyPass};\n`;
        block += `        proxy_http_version 1.1;\n`;
        block += `        proxy_set_header Upgrade $http_upgrade;\n`;
        block += `        proxy_set_header Connection 'upgrade';\n`;
        block += `        proxy_set_header Host $host;\n`;
        block += `        proxy_cache_bypass $http_upgrade;\n`;
        block += `    }\n`;
    }

    if (extra) {
        block += `\n${extra}\n`;
    }

    block += `}\n`;
    return block;
}

function enableSite(siteName) {
    const src = path.join(CONFIG.SITES_AVAILABLE, siteName);
    const dest = path.join(CONFIG.SITES_ENABLED, siteName);
    if (!fs.existsSync(src)) return false;
    try {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        fs.symlinkSync(src, dest);
        return true;
    } catch {
        return false;
    }
}

function disableSite(siteName) {
    const dest = path.join(CONFIG.SITES_ENABLED, siteName);
    try {
        if (fs.existsSync(dest) || fs.lstatSync(dest)) {
            fs.unlinkSync(dest);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

function deleteSite(siteName) {
    const src = path.join(CONFIG.SITES_AVAILABLE, siteName);
    const dest = path.join(CONFIG.SITES_ENABLED, siteName);
    try {
        if (fs.existsSync(dest) || fs.lstatSync(dest)) fs.unlinkSync(dest);
    } catch {}
    try {
        if (fs.existsSync(src)) fs.unlinkSync(src);
        return true;
    } catch {
        return false;
    }
}

// ─── BACKUP ───────────────────────────────────────────────
function backupConfigs() {
    const dir = CONFIG.BACKUP_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const backupDir = path.join(dir, `backup_${stamp}`);
    fs.mkdirSync(backupDir, { recursive: true });

    const dirs = [CONFIG.SITES_AVAILABLE, CONFIG.SITES_ENABLED, CONFIG.CONF_D];
    let count = 0;

    for (const d of dirs) {
        if (!fs.existsSync(d)) continue;
        const destDir = path.join(backupDir, path.basename(d));
        fs.mkdirSync(destDir, { recursive: true });
        try {
            const files = fs.readdirSync(d);
            for (const f of files) {
                const src = path.join(d, f);
                const dest = path.join(destDir, f);
                try {
                    const stat = fs.lstatSync(src);
                    if (stat.isSymbolicLink()) {
                        const target = fs.readlinkSync(src);
                        fs.symlinkSync(target, dest);
                    } else if (stat.isFile()) {
                        fs.copyFileSync(src, dest);
                    }
                    count++;
                } catch {}
            }
        } catch {}
    }

    const nginxConf = CONFIG.NGINX_CONF;
    if (fs.existsSync(nginxConf)) {
        try {
            fs.copyFileSync(nginxConf, path.join(backupDir, 'nginx.conf'));
            count++;
        } catch {}
    }

    return { dir: backupDir, count };
}

function listBackups() {
    const dir = CONFIG.BACKUP_DIR;
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.startsWith('backup_'))
        .sort()
        .reverse();
}

function restoreBackup(backupName) {
    const backupDir = path.join(CONFIG.BACKUP_DIR, backupName);
    if (!fs.existsSync(backupDir)) return false;

    const dirs = ['sites-available', 'sites-enabled', 'conf.d'];
    let count = 0;

    for (const d of dirs) {
        const srcDir = path.join(backupDir, d);
        const destDir = path.join('/etc/nginx', d);
        if (!fs.existsSync(srcDir)) continue;
        if (!fs.existsSync(destDir)) {
            try { fs.mkdirSync(destDir, { recursive: true }); } catch { continue; }
        }
        try {
            const files = fs.readdirSync(srcDir);
            for (const f of files) {
                const src = path.join(srcDir, f);
                const dest = path.join(destDir, f);
                try {
                    const stat = fs.lstatSync(src);
                    if (stat.isSymbolicLink()) {
                        const target = fs.readlinkSync(src);
                        try { fs.unlinkSync(dest); } catch {}
                        fs.symlinkSync(target, dest);
                    } else if (stat.isFile()) {
                        fs.copyFileSync(src, dest);
                    }
                    count++;
                } catch {}
            }
        } catch {}
    }

    const nginxConf = path.join(backupDir, 'nginx.conf');
    if (fs.existsSync(nginxConf)) {
        try {
            fs.copyFileSync(nginxConf, CONFIG.NGINX_CONF);
            count++;
        } catch {}
    }

    return count;
}

// ─── LOGS ─────────────────────────────────────────────────
function getAccessLogs(lines = 50) {
    const logFile = CONFIG.ACCESS_LOG;
    if (!fs.existsSync(logFile)) return 'No access log found.';
    try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const allLines = content.split('\n').filter(Boolean);
        return allLines.slice(-lines).join('\n') || 'No log entries.';
    } catch {
        return 'Cannot read access log (permission denied?).';
    }
}

function getErrorLogs(lines = 50) {
    const logFile = CONFIG.ERROR_LOG;
    if (!fs.existsSync(logFile)) return 'No error log found.';
    try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const allLines = content.split('\n').filter(Boolean);
        return allLines.slice(-lines).join('\n') || 'No log entries.';
    } catch {
        return 'Cannot read error log (permission denied?).';
    }
}

function tailLog(logFile, lines = 30) {
    if (!fs.existsSync(logFile)) return 'Log file not found.';
    try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const allLines = content.split('\n').filter(Boolean);
        return allLines.slice(-lines).join('\n') || 'No entries.';
    } catch {
        return `Cannot read ${logFile}`;
    }
}

// ─── DASHBOARD RENDERER ───────────────────────────────────
function buildRow(cells, colWidths) {
    let row = '';
    for (let i = 0; i < cells.length; i++) {
        if (i > 0) row += ' ';
        row += padRight(cells[i], colWidths[i]);
    }
    return row;
}

function renderMainDashboard(sites, nginxStatus, nginxVersion, updateInfo = null) {
    const logoLines = getLogoLines();
    const screenWidth = getTerminalWidth();
    const INNER = Math.max(60, screenWidth - 4);
    const bc = THEME.border;
    const menuColor = rgb(180, 230, 255);
    const numColor = rgb(60, 180, 240);
    const out = [];

    out.push(boxTop(INNER, bc));

    if (logoLines.length > 0) {
        const logoW = logoLines.reduce((m, l) => Math.max(m, vlen(l)), 0);
        const logoPad = Math.max(0, Math.floor((INNER - logoW) / 2));
        for (const l of logoLines) {
            const rPad = Math.max(0, INNER - logoPad - vlen(l));
            out.push(`${bc}║${C.reset}${' '.repeat(logoPad)}${l}${' '.repeat(rPad)}${bc}║${C.reset}`);
        }
        out.push(sepFull(INNER, bc));
    }

    const titleText = 'MindDevelopment Nginx Manager';
    const titleLen = vlen(titleText);
    const leftPad = Math.max(0, Math.floor((INNER - titleLen) / 2));
    const rightPad = Math.max(0, INNER - titleLen - leftPad);
    out.push(`${bc}║${C.reset}${' '.repeat(leftPad)}${THEME.primary}${C.bold}${titleText}${C.reset}${' '.repeat(rightPad)}${bc}║${C.reset}`);

    // Status bar
    const statusIcon = nginxStatus.running ? `${THEME.active}●${C.reset}` : `${THEME.error}●${C.reset}`;
    const statusLabel = nginxStatus.running ? `${THEME.active}running${C.reset}` : `${THEME.error}stopped${C.reset}`;
    const statusBar = `  ${statusIcon} Nginx: ${statusLabel}  ${C.dim}│${C.reset}  ${C.dim}Version:${C.reset} ${THEME.secondary}${nginxVersion}${C.reset}`;
    out.push(sepFull(INNER, bc));
    out.push(fullRow(statusBar, INNER, bc));

    // Sites section
    const allSites = [...new Set([...sites.available, ...sites.confD])];
    if (allSites.length > 0) {
        const siteEntries = [];
        for (const site of allSites) {
            const isEnabled = sites.enabled.includes(site);
            const icon = isEnabled ? `${THEME.active}●${C.reset}` : `${THEME.inactive}○${C.reset}`;
            const content = readSiteConfig(site);
            let detail = '';
            if (content) {
                const parsed = parseSiteConfig(content);
                if (parsed.serverNames.length > 0) detail = parsed.serverNames.join(', ');
                else if (parsed.listen.length > 0) detail = `:${parsed.listen.join(', ')}`;
            }
            siteEntries.push({
                name: `  ${icon} ${C.bold}${truncate(site, Math.max(15, INNER - 45))}${C.reset}`,
                status: isEnabled ? `  ${THEME.active}enabled${C.reset}` : `  ${THEME.inactive}disabled${C.reset}`,
                detail: `  ${THEME.muted}${truncate(detail, Math.max(10, INNER - 40))}${C.reset}`,
            });
        }

        const maxName   = Math.max(...siteEntries.map(e => vlen(e.name)), vlen('  Site:'));
        const maxStatus = Math.max(...siteEntries.map(e => vlen(e.status)), vlen('  Status:'));
        const col1 = maxName + 2;
        const col2 = Math.max(maxStatus + 2, 11);
        const col3 = Math.max(INNER - col1 - col2 - 2, 10);

        out.push(sepCols([col1, col2, col3], bc, 'top'));
        out.push(colRow(['  Site:', '  Status:', '  Details:'], [col1, col2, col3], bc));
        out.push(sepCols([col1, col2, col3], bc, 'mid'));

        for (const entry of siteEntries) {
            out.push(colRow([entry.name, entry.status, entry.detail], [col1, col2, col3], bc));
        }

        out.push(sepCols([col1, col2, col3], bc, 'bot'));
    } else {
        out.push(sepFull(INNER, bc));
        out.push(fullRow(`  ${THEME.muted}(no sites configured)${C.reset}`, INNER, bc));
        out.push(sepFull(INNER, bc));
    }

    // Menu
    out.push(fullRow(`  ${THEME.highlight}${C.bold}Menu:${C.reset}`, INNER, bc));
    out.push(sepFull(INNER, bc));

    const menuItems = [
        { num: '1', text: 'Add site' },
        { num: '2', text: 'Enable / Disable site' },
        { num: '3', text: 'Delete site' },
        { num: '4', text: 'View site config' },
        { num: '5', text: 'View logs' },
        { num: '6', text: 'Nginx control (start/stop/reload)' },
        { num: '7', text: 'Test configuration' },
        { num: '8', text: 'Create backup' },
        { num: '9', text: 'Restore backup' },
        { num: '0', text: 'Exit', color: THEME.danger },
    ];
    for (const item of menuItems) {
        const nColor = item.color || numColor;
        out.push(fullRow(`  ${nColor}${C.bold}[${item.num}]${C.reset} ${menuColor}${item.text}${C.reset}`, INNER, bc));
    }

    // Footer
    out.push(sepFull(INNER, bc));
    const copyrightText = `© 2026 MindDevelopment - MindNginx`;

    if (updateInfo && updateInfo.isOutdated) {
        const versionText = `Version: ${updateInfo.currentVersion}`;
        const outdatedText = `OUTDATED! Update to: ${updateInfo.latestVersion}`;
        const downloadText = `${updateInfo.downloadUrl}`;

        const footerContent1 = `${THEME.muted}${copyrightText}${C.reset}${' '.repeat(Math.max(2, INNER - vlen(copyrightText) - vlen(versionText) - 4))}${THEME.muted}${versionText}${C.reset}`;
        out.push(`${bc}║${C.reset} ${padRight(footerContent1, INNER - 2)} ${bc}║${C.reset}`);

        out.push(sepFull(INNER, bc));
        out.push(`${bc}║${C.reset}${padRight(` ${THEME.danger}${C.bold}⚠  ${outdatedText}${C.reset}`, INNER - 0)}${bc}║${C.reset}`);
        out.push(`${bc}║${C.reset}${padRight(` ${THEME.info}Download: ${downloadText}${C.reset}`, INNER - 0)}${bc}║${C.reset}`);
    } else {
        const versionText = updateInfo ? `Version: ${updateInfo.currentVersion}` : `Version: ${CONFIG.VERSION}`;
        const footerContent = `${THEME.muted}${copyrightText}${C.reset}${' '.repeat(Math.max(2, INNER - vlen(copyrightText) - vlen(versionText) - 4))}${THEME.muted}${versionText}${C.reset}`;
        out.push(`${bc}║${C.reset} ${padRight(footerContent, INNER - 2)} ${bc}║${C.reset}`);
    }

    out.push(boxBottom(INNER, bc));
    return out.join('\n');
}

async function showDashboard(extraLines = [], opts = {}) {
    console.clear();
    const screenWidth = getTerminalWidth();
    const INNER = Math.max(60, screenWidth - 4);
    const bc = THEME.border;
    const out = [];

    out.push(boxTop(INNER, bc));

    if (opts.title) {
        const titleLen = vlen(opts.title);
        const lPad = Math.max(0, Math.floor((INNER - titleLen) / 2));
        const rPad = Math.max(0, INNER - titleLen - lPad);
        out.push(`${bc}║${C.reset}${' '.repeat(lPad)}${opts.titleColor || THEME.secondary}${C.bold}${opts.title}${C.reset}${' '.repeat(rPad)}${bc}║${C.reset}`);
        out.push(sepFull(INNER, bc));
    }

    for (const l of extraLines) {
        out.push(fullRow(l, INNER, bc));
    }
    out.push(boxBottom(INNER, bc));
    console.log(out.join('\n') + '\n');
}

// ─── MENU SYSTEM ───────────────────────────────────────────

async function mainMenu() {
    const updateInfo = await checkForUpdates();

    while (true) {
        const sites = getSites();
        const nginxStatus = await getNginxStatus();
        const nginxVersion = await getNginxVersion();

        console.clear();
        console.log(`\n${renderMainDashboard(sites, nginxStatus, nginxVersion, updateInfo)}\n`);

        const choice = (await ask(`  ${THEME.highlight}Choose an option [0-9]:${C.reset} `)).trim();

        switch (choice) {
            case '1': await addSite(); break;
            case '2': await toggleSite(); break;
            case '3': await deleteSiteCmd(); break;
            case '4': await viewSiteConfig(); break;
            case '5': await viewLogs(); break;
            case '6': await nginxControl(); break;
            case '7': await testConfig(); break;
            case '8': await makeBackup(); break;
            case '9': await restoreBackupCmd(); break;
            case '0':
                console.log(`\n  ${THEME.secondary}Goodbye!${C.reset}\n`);
                rl.close();
                process.exit(0);
            default:
                await showDashboard([error('Invalid choice. Try again.')]);
                await pause();
        }
    }
}

// ─── COMMAND: ADD SITE ────────────────────────────────────
async function addSite() {
    await showDashboard([
        `${C.bold}Step 1:${C.reset} Site details`,
        `${C.dim}Create a new Nginx server block configuration.${C.reset}`,
        '',
    ], { title: 'Add site', titleColor: THEME.info });

    const serverName = (await ask(`  ${THEME.info}Domain name (e.g. example.com):${C.reset} `)).trim();
    if (!serverName) {
        await showDashboard([error('Domain name is required.')], { title: 'Add site' });
        await pause();
        return;
    }

    const fileName = (await ask(`  ${THEME.info}Config filename [${serverName}]:${C.reset} `)).trim() || serverName;

    const sites = getSites();
    if (sites.available.includes(fileName)) {
        await showDashboard([error(`Site "${fileName}" already exists.`)], { title: 'Add site' });
        await pause();
        return;
    }

    await showDashboard([
        `${C.bold}Step 2:${C.reset} Site type`,
        `${C.dim}Domain: ${C.green}${serverName}${C.reset}`,
        `${C.dim}File:   ${C.green}${fileName}${C.reset}`,
        '',
    ], { title: 'Add site', titleColor: THEME.info });

    console.log(`  ${THEME.info}Site type:${C.reset}`);
    console.log(`  ${C.cyan}1.${C.reset} Static files (HTML/CSS/JS)`);
    console.log(`  ${C.cyan}2.${C.reset} Reverse proxy (Node.js, etc.)`);
    console.log(`  ${C.cyan}3.${C.reset} Custom (empty server block)`);

    const siteType = (await ask(`\n  ${THEME.info}Choose [1-3]:${C.reset} `)).trim();

    let root = '';
    let proxyPass = '';
    let listen = '80';
    let sslCert = '';
    let sslKey = '';

    if (siteType === '1') {
        root = (await ask(`  ${THEME.info}Document root (e.g. /var/www/${serverName}):${C.reset} `)).trim();
        if (!root) root = `/var/www/${serverName}`;
    } else if (siteType === '2') {
        proxyPass = (await ask(`  ${THEME.info}Proxy pass (e.g. http://localhost:3000):${C.reset} `)).trim();
        if (!proxyPass) {
            await showDashboard([error('Proxy pass URL is required.')], { title: 'Add site' });
            await pause();
            return;
        }
    }

    const useSSL = (await ask(`  ${THEME.info}Enable SSL? [y/N]:${C.reset} `)).trim().toLowerCase();
    if (useSSL === 'y') {
        listen = '443 ssl';
        sslCert = (await ask(`  ${THEME.info}SSL certificate path:${C.reset} `)).trim();
        sslKey = (await ask(`  ${THEME.info}SSL key path:${C.reset} `)).trim();
        if (!sslCert || !sslKey) {
            await showDashboard([error('SSL paths are required when SSL is enabled.')], { title: 'Add site' });
            await pause();
            return;
        }
    }

    const config = generateServerBlock({ serverName, listen, root, proxyPass, sslCert, sslKey });

    await showDashboard([
        `${C.bold}Preview:${C.reset}`,
        '',
        ...config.split('\n').map(l => `  ${C.dim}${l}${C.reset}`),
        '',
    ], { title: 'Add site', titleColor: THEME.info });

    const confirm = (await ask(`  ${THEME.info}Save this configuration? [Y/n]:${C.reset} `)).trim().toLowerCase();
    if (confirm === 'n') {
        await showDashboard([info('Cancelled.')], { title: 'Add site' });
        await pause();
        return;
    }

    try {
        if (!fs.existsSync(CONFIG.SITES_AVAILABLE)) {
            fs.mkdirSync(CONFIG.SITES_AVAILABLE, { recursive: true });
        }
        const filePath = path.join(CONFIG.SITES_AVAILABLE, fileName);
        fs.writeFileSync(filePath, config, 'utf-8');

        const autoEnable = (await ask(`  ${THEME.info}Enable site now? [Y/n]:${C.reset} `)).trim().toLowerCase();
        if (autoEnable !== 'n') {
            enableSite(fileName);
        }

        const testResult = await nginxTest();
        if (testResult.valid) {
            await showDashboard([
                success(`Site "${fileName}" created!`),
                '',
                `${C.dim}Config:${C.reset} ${filePath}`,
                `${C.dim}Test:${C.reset}   ${success('Configuration is valid')}`,
            ], { title: 'Add site', borderColor: THEME.success });
        } else {
            await showDashboard([
                success(`Site "${fileName}" created!`),
                warn('Configuration test failed:'),
                `  ${C.dim}${testResult.output}${C.reset}`,
            ], { title: 'Add site', borderColor: THEME.warning });
        }
    } catch (e) {
        await showDashboard([error(`Error saving: ${e.message}`)], { title: 'Add site' });
    }
    await pause();
}

// ─── COMMAND: ENABLE / DISABLE SITE ───────────────────────
async function toggleSite() {
    const sites = getSites();
    const allSites = [...new Set([...sites.available, ...sites.confD])];

    if (allSites.length === 0) {
        await showDashboard([info('No sites found.')], { title: 'Enable / Disable' });
        await pause();
        return;
    }

    const lines = allSites.map((site, i) => {
        const isEnabled = sites.enabled.includes(site);
        const icon = isEnabled ? `${THEME.active}●${C.reset}` : `${THEME.inactive}○${C.reset}`;
        const statusLabel = isEnabled ? `${THEME.active}enabled${C.reset}` : `${THEME.inactive}disabled${C.reset}`;
        return `  ${icon} ${C.cyan}${String(i + 1).padStart(2, ' ')}.${C.reset} ${C.bold}${site}${C.reset}  ${C.dim}[${statusLabel}${C.dim}]${C.reset}`;
    });

    lines.push('');
    lines.push(`  ${C.yellow}0.${C.reset}  Back to main menu`);

    await showDashboard(lines, { title: 'Enable / Disable site', titleColor: THEME.secondary });

    const input = (await ask(`  ${THEME.info}Site [0-${allSites.length}]:${C.reset} `)).trim();
    const idx = parseInt(input, 10);
    if (isNaN(idx) || idx < 0 || idx > allSites.length) {
        await showDashboard([error('Invalid choice.')], { title: 'Enable / Disable' });
        await pause();
        return;
    }
    if (idx === 0) return;

    const siteName = allSites[idx - 1];
    const isEnabled = sites.enabled.includes(siteName);

    if (isEnabled) {
        const confirm = (await ask(`  ${THEME.info}Disable "${siteName}"? [y/N]:${C.reset} `)).trim().toLowerCase();
        if (confirm !== 'y') return;
        if (disableSite(siteName)) {
            await showDashboard([success(`Site "${siteName}" disabled.`)], { title: 'Enable / Disable', borderColor: THEME.success });
        } else {
            await showDashboard([error(`Could not disable "${siteName}".`)], { title: 'Enable / Disable' });
        }
    } else {
        if (enableSite(siteName)) {
            await showDashboard([success(`Site "${siteName}" enabled.`)], { title: 'Enable / Disable', borderColor: THEME.success });
        } else {
            await showDashboard([error(`Could not enable "${siteName}".`)], { title: 'Enable / Disable' });
        }
    }
    await pause();
}

// ─── COMMAND: DELETE SITE ─────────────────────────────────
async function deleteSiteCmd() {
    const sites = getSites();
    const allSites = [...new Set([...sites.available, ...sites.confD])];

    if (allSites.length === 0) {
        await showDashboard([info('No sites found.')], { title: 'Delete site' });
        await pause();
        return;
    }

    const lines = allSites.map((site, i) => {
        const isEnabled = sites.enabled.includes(site);
        const icon = isEnabled ? `${THEME.active}●${C.reset}` : `${THEME.inactive}○${C.reset}`;
        return `  ${icon} ${C.cyan}${String(i + 1).padStart(2, ' ')}.${C.reset} ${C.bold}${site}${C.reset}`;
    });

    lines.push('');
    lines.push(`  ${C.yellow}0.${C.reset}  Back to main menu`);

    await showDashboard(lines, { title: 'Delete site', titleColor: THEME.danger });

    const input = (await ask(`  ${THEME.info}Site [0-${allSites.length}]:${C.reset} `)).trim();
    const idx = parseInt(input, 10);
    if (isNaN(idx) || idx < 1 || idx > allSites.length) return;

    const siteName = allSites[idx - 1];
    const confirm = (await ask(`\n  ${THEME.danger}Are you sure you want to delete "${siteName}"? [y/N]:${C.reset} `)).trim().toLowerCase();

    if (confirm !== 'y') {
        await showDashboard([info('Deletion cancelled.')], { title: 'Delete site' });
        await pause();
        return;
    }

    if (deleteSite(siteName)) {
        await showDashboard([success(`Site "${siteName}" deleted.`)], { title: 'Delete site', borderColor: THEME.success });
    } else {
        await showDashboard([error(`Could not delete "${siteName}".`)], { title: 'Delete site' });
    }
    await pause();
}

// ─── COMMAND: VIEW SITE CONFIG ────────────────────────────
async function viewSiteConfig() {
    const sites = getSites();
    const allSites = [...new Set([...sites.available, ...sites.confD])];

    if (allSites.length === 0) {
        await showDashboard([info('No sites found.')], { title: 'View config' });
        await pause();
        return;
    }

    const lines = allSites.map((site, i) => {
        const isEnabled = sites.enabled.includes(site);
        const icon = isEnabled ? `${THEME.active}●${C.reset}` : `${THEME.inactive}○${C.reset}`;
        return `  ${icon} ${C.cyan}${String(i + 1).padStart(2, ' ')}.${C.reset} ${C.bold}${site}${C.reset}`;
    });

    lines.push('');
    lines.push(`  ${C.yellow}0.${C.reset}  Back to main menu`);

    await showDashboard(lines, { title: 'View site config', titleColor: THEME.info });

    const input = (await ask(`  ${THEME.info}Site [0-${allSites.length}]:${C.reset} `)).trim();
    const idx = parseInt(input, 10);
    if (isNaN(idx) || idx < 1 || idx > allSites.length) return;

    const siteName = allSites[idx - 1];
    const content = readSiteConfig(siteName);

    if (!content) {
        await showDashboard([error(`Cannot read config for "${siteName}".`)], { title: 'View config' });
        await pause();
        return;
    }

    const screenWidth = getTerminalWidth();
    const configLines = content.split('\n').map(l => {
        return `  ${C.dim}${truncate(l, screenWidth - 6)}${C.reset}`;
    });

    await showDashboard(configLines, {
        title: `Config: ${siteName}`,
        titleColor: THEME.info,
    });
    await pause();
}

// ─── COMMAND: VIEW LOGS ───────────────────────────────────
async function viewLogs() {
    console.clear();
    console.log(`\n  ${THEME.info}${C.bold}View logs:${C.reset}\n`);
    console.log(`  ${C.cyan}1.${C.reset} Access log`);
    console.log(`  ${C.cyan}2.${C.reset} Error log`);
    console.log(`  ${C.cyan}3.${C.reset} Both`);
    console.log(`  ${C.yellow}0.${C.reset} Back\n`);

    const choice = (await ask(`  ${THEME.info}Choose [0-3]:${C.reset} `)).trim();

    const screenWidth = getTerminalWidth();
    let logContent = '';
    let title = 'Logs';

    if (choice === '1') {
        logContent = getAccessLogs(CONFIG.LOGS_LINES);
        title = 'Access log';
    } else if (choice === '2') {
        logContent = getErrorLogs(CONFIG.LOGS_LINES);
        title = 'Error log';
    } else if (choice === '3') {
        const access = getAccessLogs(25);
        const errorLogs = getErrorLogs(25);
        logContent = `${THEME.info}${C.bold}── Access Log ──${C.reset}\n${access}\n\n${THEME.danger}${C.bold}── Error Log ──${C.reset}\n${errorLogs}`;
        title = 'All logs';
    } else {
        return;
    }

    const logLines = logContent.split('\n').slice(-60).map(l => {
        return `  ${C.dim}${truncate(l, screenWidth - 6)}${C.reset}`;
    });

    await showDashboard(logLines, { title, titleColor: THEME.info });
    await pause();
}

// ─── COMMAND: NGINX CONTROL ───────────────────────────────
async function nginxControl() {
    const nginxStatus = await getNginxStatus();

    console.clear();
    const statusIcon = nginxStatus.running ? `${THEME.active}●${C.reset}` : `${THEME.error}●${C.reset}`;
    const statusLabel = nginxStatus.running ? `${THEME.active}running${C.reset}` : `${THEME.error}stopped${C.reset}`;

    console.log(`\n  ${statusIcon} Nginx is ${statusLabel}\n`);
    console.log(`  ${C.cyan}1.${C.reset} Start`);
    console.log(`  ${C.cyan}2.${C.reset} Stop`);
    console.log(`  ${C.cyan}3.${C.reset} Restart`);
    console.log(`  ${C.cyan}4.${C.reset} Reload (graceful)`);
    console.log(`  ${C.cyan}5.${C.reset} Test configuration`);
    console.log(`  ${C.yellow}0.${C.reset} Back\n`);

    const choice = (await ask(`  ${THEME.info}Choose [0-5]:${C.reset} `)).trim();

    let cmd = '';
    let label = '';

    switch (choice) {
        case '1': cmd = 'start'; label = 'Starting'; break;
        case '2': cmd = 'stop'; label = 'Stopping'; break;
        case '3': cmd = 'restart'; label = 'Restarting'; break;
        case '4': cmd = '-s reload'; label = 'Reloading'; break;
        case '5': await testConfig(); return;
        case '0': return;
        default:
            await showDashboard([error('Invalid choice.')]);
            await pause();
            return;
    }

    await showDashboard([info(`${label} Nginx...`)], { title: 'Nginx control' });

    try {
        await nginxExec(cmd);
        const newStatus = await getNginxStatus();
        const newIcon = newStatus.running ? `${THEME.active}●${C.reset}` : `${THEME.error}●${C.reset}`;
        const newLabel = newStatus.running ? `${THEME.active}running${C.reset}` : `${THEME.error}stopped${C.reset}`;
        await showDashboard([
            success(`Nginx ${cmd === '-s reload' ? 'reloaded' : cmd + 'ed'} successfully!`),
            `  ${newIcon} Status: ${newLabel}`,
        ], { title: 'Nginx control', borderColor: THEME.success });
    } catch (e) {
        await showDashboard([error(`Failed: ${e.message}`)], { title: 'Nginx control' });
    }
    await pause();
}

// ─── COMMAND: TEST CONFIG ─────────────────────────────────
async function testConfig() {
    await showDashboard([info('Testing Nginx configuration...')], { title: 'Test configuration' });

    const result = await nginxTest();

    if (result.valid) {
        await showDashboard([
            success('Configuration test passed!'),
            '',
            `  ${C.dim}${result.output}${C.reset}`,
        ], { title: 'Test configuration', borderColor: THEME.success });
    } else {
        await showDashboard([
            error('Configuration test failed!'),
            '',
            `  ${C.dim}${result.output}${C.reset}`,
        ], { title: 'Test configuration', borderColor: THEME.danger });
    }
    await pause();
}

// ─── COMMAND: BACKUP ──────────────────────────────────────
async function makeBackup() {
    await showDashboard([info('Creating backup...')], { title: 'Backup' });

    const result = backupConfigs();

    if (result.count > 0) {
        await showDashboard([
            success('Backup created!'),
            '',
            `${C.dim}Location:${C.reset} ${result.dir}`,
            `${C.dim}Files:${C.reset}    ${result.count}`,
        ], { title: 'Backup', borderColor: THEME.success });
    } else {
        await showDashboard([warn('No configuration files found to backup.')], { title: 'Backup' });
    }
    await pause();
}

// ─── COMMAND: RESTORE BACKUP ──────────────────────────────
async function restoreBackupCmd() {
    const backups = listBackups();
    if (backups.length === 0) {
        await showDashboard([info('No backups found.')], { title: 'Restore backup' });
        await pause();
        return;
    }

    const lines = backups.map((b, i) => {
        const stamp = b.replace('backup_', '').replace(/_/g, ' ');
        return `  ${C.cyan}${String(i + 1).padStart(2, ' ')}.${C.reset} ${stamp}`;
    });
    lines.push('');
    lines.push(`  ${C.yellow}0.${C.reset}  Cancel`);

    await showDashboard(lines, { title: 'Restore backup', titleColor: THEME.warning });

    const choice = (await ask(`  ${THEME.info}Choose backup [0-${backups.length}]:${C.reset} `)).trim();
    const idx = parseInt(choice, 10);
    if (isNaN(idx) || idx < 0 || idx > backups.length) return;
    if (idx === 0) return;

    const backupName = backups[idx - 1];

    const confirm = (await ask(`\n  ${THEME.warning}This will overwrite current configs. Continue? [y/N]:${C.reset} `)).trim().toLowerCase();
    if (confirm !== 'y') return;

    backupConfigs();

    const count = restoreBackup(backupName);
    if (count > 0) {
        await showDashboard([
            success('Backup restored!'),
            '',
            `${C.dim}Files restored:${C.reset} ${count}`,
        ], { title: 'Restore backup', borderColor: THEME.success });
    } else {
        await showDashboard([error('Error restoring backup.')], { title: 'Restore backup' });
    }
    await pause();
}

// ─── ASCII BAR HELPER ─────────────────────────────────────
function asciiBar(value, max, width, fillChar = '█', emptyChar = '░') {
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    const filled = Math.round(pct * width);
    return fillChar.repeat(filled) + emptyChar.repeat(width - filled);
}

// ─── MAIN ─────────────────────────────────────────────────
(async () => {
    console.clear();

    console.log(`\n  ${THEME.primary}${C.bold}MindNginx v${CONFIG.VERSION}${C.reset} — ${THEME.secondary}Nginx Configuration Manager${C.reset}`);
    console.log(`  ${THEME.muted}Nginx conf:  ${CONFIG.NGINX_CONF}${C.reset}`);
    console.log(`  ${THEME.muted}Sites avail: ${CONFIG.SITES_AVAILABLE}${C.reset}`);
    console.log(`  ${THEME.muted}Sites enabl: ${CONFIG.SITES_ENABLED}${C.reset}`);
    console.log(`  ${THEME.muted}Backups:     ${CONFIG.BACKUP_DIR}${C.reset}\n`);

    if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
        fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
    }

    const nginxStatus = await getNginxStatus();
    const nginxVersion = await getNginxVersion();
    const sites = getSites();

    const statusIcon = nginxStatus.running ? `${THEME.active}●${C.reset}` : `${THEME.error}●${C.reset}`;
    const statusLabel = nginxStatus.running ? `${THEME.active}running${C.reset}` : `${THEME.error}stopped${C.reset}`;

    console.log(`  ${statusIcon} Nginx: ${statusLabel}  ${C.dim}│${C.reset}  ${C.dim}Version:${C.reset} ${THEME.secondary}${nginxVersion}${C.reset}  ${C.dim}│${C.reset}  ${C.dim}Sites:${C.reset} ${THEME.info}${C.bold}${sites.available.length}${C.reset}${C.dim} avail, ${THEME.success}${C.bold}${sites.enabled.length}${C.reset}${C.dim} enabled${C.reset}\n`);

    await new Promise(r => setTimeout(r, 400));
    await mainMenu();
})().catch(err => {
    console.error(`\n  ${error('Unexpected error: ' + err.message)}`);
    console.error(`  ${C.dim}${err.stack}${C.reset}\n`);
    rl.close();
    process.exit(1);
});
