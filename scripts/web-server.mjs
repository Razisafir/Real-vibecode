#!/usr/bin/env node
// VibeCode Web Server — serves VS Code web with VibeCode branding
// This server replaces template variables in the workbench HTML
// and provides product.json for the workbench initialization.
//
// Usage: node web-server.mjs
// Then open http://localhost:7777 in your browser
//
// Prerequisites: npm install vscode-web

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'node_modules', 'vscode-web', 'dist');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm',
};

function substituteTemplate(html, baseUrl) {
  const cleanBase = baseUrl.replace(/[\/\\]+$/, '');
  const config = {
    additionalBuiltinExtensions: [],
    configurationDefaults: {},
    extensionsGallery: {
      serviceUrl: 'https://open-vsx.org/vscode/gallery',
      itemUrl: 'https://open-vsx.org/vscode/item',
      resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
      controlUrl: '',
      recommendationsUrl: ''
    },
    folderUri: 'vscode-local://home/',
    remoteAuthority: '',
    serverBaseURL: cleanBase,
    productConfiguration: {
      nameShort: 'VibeCode',
      nameLong: 'VibeCode',
      applicationName: 'vibecode',
      extensionsGallery: {
        serviceUrl: 'https://open-vsx.org/vscode/gallery',
        itemUrl: 'https://open-vsx.org/vscode/item',
        resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
      }
    },
    webviewEndpoint: `${cleanBase}/out/vs/workbench/contrib/webview/browser/pre/`,
    nlsUrl: `${cleanBase}/out/nls.metadata.json`,
  };

  return html
    .replace(/\{\{WORKBENCH_WEB_BASE_URL\}\}/g, cleanBase)
    .replace(/\{\{WORKBENCH_WEB_CONFIGURATION\}\}/g, JSON.stringify(config))
    .replace(/\{\{WORKBENCH_AUTH_SESSION\}\}/g, '')
    .replace(/\{\{WORKBENCH_NLS_BASE_URL\}\}/g, `${cleanBase}/out`);
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/out/vs/code/browser/workbench/workbench.html';
  urlPath = urlPath.replace(/\/\/+/g, '/');
  const filePath = path.join(DIST_DIR, urlPath);

  if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found: ' + urlPath); return; }
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    if (ext === '.html') {
      const baseUrl = `http://${req.headers.host || 'localhost:7777'}`;
      data = Buffer.from(substituteTemplate(data.toString(), baseUrl));
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

const PORT = process.env.PORT || 7777;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`\n  ╔═══════════════════════════════════════════╗`);
  console.log(`  ║   VibeCode Web Server                    ║`);
  console.log(`  ║   Running on http://${HOST}:${PORT}        ║`);
  console.log(`  ╚═══════════════════════════════════════════╝\n`);
});
