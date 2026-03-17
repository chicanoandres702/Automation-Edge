#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'out', 'extension');

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit', env: process.env, cwd: repoRoot });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function safeRm(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
}

async function main() {
  try {
    console.log('Building Next.js project...');
    run('npx next build');

    safeRm(outDir);

    console.log('Attempting `next export` to generate a static site for the extension...');
    try {
      run(`npx next export -o "${outDir}"`);
      console.log('next export completed.');
    } catch (e) {
      console.warn('next export failed or is not fully supported for this project (App Router may prevent static export). Falling back to copying public assets and selected .next/static files.');

      fs.mkdirSync(outDir, { recursive: true });

      // Copy public/ to outDir
      const publicDir = path.join(repoRoot, 'public');
      if (fs.existsSync(publicDir)) {
        console.log('Copying public/ to extension output...');
        copyRecursive(publicDir, outDir);
      }

      // Copy selected runtime static assets from .next/static if available
      const nextStatic = path.join(repoRoot, '.next', 'static');
      if (fs.existsSync(nextStatic)) {
        console.log('Copying .next/static to assets/static in extension output...');
        copyRecursive(nextStatic, path.join(outDir, 'assets', 'static'));
      }
    }

    // If an exported `_next` folder exists, rename it to `assets` (Chrome disallows root folders that start with "_")
    const exportedUnderscore = path.join(outDir, '_next');
    const exportedAssets = path.join(outDir, 'assets');
    if (fs.existsSync(exportedUnderscore)) {
      console.log('Renaming exported _next -> assets to satisfy Chrome extension loader rules...');
      // If assets already exists, remove it first to avoid conflicts
      safeRm(exportedAssets);
      fs.renameSync(exportedUnderscore, exportedAssets);
    }

    // Rewrite HTML/JS/CSS files to reference /assets/ instead of /_next/ so paths resolve in the extension
    const textExts = ['.html', '.js', '.css', '.json'];
    function rewritePaths(dir) {
      for (const entry of fs.readdirSync(dir)) {
        const p = path.join(dir, entry);
        const s = fs.statSync(p);
        if (s.isDirectory()) {
          rewritePaths(p);
          continue;
        }
        if (!textExts.includes(path.extname(p).toLowerCase())) continue;
        let content = fs.readFileSync(p, 'utf8');
        if (content.indexOf('/_next/') !== -1) {
          content = content.replace(/\/_next\//g, '/assets/');
          fs.writeFileSync(p, content, 'utf8');
          console.log('Rewrote /_next/ -> /assets/ in', path.relative(outDir, p));
        }
      }
    }
    try {
      // If Next produced a prerendered HTML page for the app (common with App Router),
      // copy it into the extension output BEFORE rewriting paths so the HTML will be fixed up.
      const serverIndex = path.join(repoRoot, '.next', 'server', 'app', 'index.html');
      if (fs.existsSync(serverIndex)) {
        console.log('Copying prerendered app index.html into extension output...');
        copyRecursive(serverIndex, path.join(outDir, 'index.html'));
      }

      rewritePaths(outDir);

      // Extract inline <script> blocks into external files because Chrome extension
      // CSP disallows inline scripts. We place extracted scripts into assets/static/chunks
      // and replace the inline tags with <script src="/assets/static/chunks/..."></script>.
      function extractInlineScripts(dir) {
        const chunksDir = path.join(outDir, 'assets', 'static', 'chunks');
        fs.mkdirSync(chunksDir, { recursive: true });
        const htmlFiles = [];
        (function walk(d) {
          for (const e of fs.readdirSync(d)) {
            const p = path.join(d, e);
            if (fs.statSync(p).isDirectory()) walk(p);
            else if (p.endsWith('.html')) htmlFiles.push(p);
          }
        })(dir);

        const crypto = require('crypto');
        for (const htmlPath of htmlFiles) {
          let html = fs.readFileSync(htmlPath, 'utf8');
          let changed = false;
          html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
            // If the script tag already has a src attribute, leave it alone
            if (/\bsrc\s*=\s*["']/.test(attrs)) return match;
            // Ignore template or empty scripts
            if (!content || !content.trim()) return match;
            const hash = crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
            const filename = `inline-${hash}.js`;
            const outPath = path.join(chunksDir, filename);
            if (!fs.existsSync(outPath)) {
              fs.writeFileSync(outPath, content, 'utf8');
              console.log('Extracted inline script ->', path.relative(outDir, outPath));
            }
            changed = true;
            // Preserve attributes like async, type, id, nomodule etc.
            const cleanAttrs = attrs.replace(/\s+/g, ' ').trim();
            const space = cleanAttrs ? ' ' : '';
            return `<script${space}${cleanAttrs} src="/assets/static/chunks/${filename}"></script>`;
          });
          if (changed) fs.writeFileSync(htmlPath, html, 'utf8');
        }
      }

      try {
        extractInlineScripts(outDir);
      } catch (e) {
        console.warn('Failed to extract inline scripts:', e);
      }
    } catch (e) {
      console.warn('Failed to rewrite asset paths:', e);
    }

    // Ensure manifest.json is at extension root
    const manifestSrc = path.join(repoRoot, 'public', 'manifest.json');
    const manifestDest = path.join(outDir, 'manifest.json');
    if (fs.existsSync(manifestSrc)) {
      fs.copyFileSync(manifestSrc, manifestDest);
      console.log('manifest.json copied to extension output root.');
    } else {
      console.warn('public/manifest.json not found — the extension manifest is required.');
    }

    // Ensure there is an `index.html` at the extension root. Many Next projects
    // won't produce a static index.html (App Router, SSR). We create a small
    // wrapper that embeds the running app via an iframe. Set EXTENSION_HOST_URL
    // environment variable to change the iframe target (defaults to localhost dev server).
    const indexPath = path.join(outDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      const hostUrl = process.env.EXTENSION_HOST_URL || 'http://localhost:9002';
      const indexHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Automaton Sidebar</title>
    <style>html,body,#app{height:100%;margin:0}iframe{border:0;width:100%;height:100%}</style>
  </head>
  <body>
    <iframe id="app" src="${hostUrl}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" ></iframe>
    <noscript>
      Please enable JavaScript or run the app server at <a href="${hostUrl}">${hostUrl}</a>
    </noscript>
  </body>
</html>`;
      try {
        fs.writeFileSync(indexPath, indexHtml, 'utf8');
        console.log('Wrote wrapper index.html that embeds', hostUrl);
      } catch (e) {
        console.warn('Failed to write index.html:', e);
      }
    }

    console.log('\nExtension output is ready at:');
    console.log(outDir);
    console.log('\nTo load the unpacked extension in Chrome/Edge:');
    console.log('  1) Open chrome://extensions (or edge://extensions)');
    console.log('  2) Enable Developer mode');
    console.log('  3) Click "Load unpacked" and select this folder');
  } catch (err) {
    console.error('Extension build failed:', err);
    process.exit(1);
  }
}

main();
