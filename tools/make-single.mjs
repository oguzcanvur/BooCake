// Turns the Vite build into ONE self-contained html file (dist/BooCake.html) that opens by double-click.
// Run automatically by `npm run build`. It inlines the built JavaScript and CSS into the page.
// (Images, sounds and fonts are already embedded in the JS/CSS as data URIs.)

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
let html = readFileSync(join(dist, 'index.html'), 'utf8');

// stylesheet -> <style>
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"[^>]*>/g, (_m, file) => {
  return `<style>${readFileSync(join(dist, file), 'utf8')}</style>`;
});

// preload hints are useless once everything is inline
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

// script -> inline module (escape sequences that would end the script or start an html comment early)
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+\.js)"[^>]*><\/script>/g, (_m, file) => {
  const code = readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  return `<script type="module">${code}</script>`;
});

if (/src="\.\//.test(html) || /href="\.\//.test(html)) {
  throw new Error('make-single: the page still points to an external file; the build layout changed.');
}

const out = join(dist, 'BooCake.html');
writeFileSync(out, html);
console.log(`BooCake.html written (${(html.length / 1048576).toFixed(2)} MB). Double-click it to play.`);
