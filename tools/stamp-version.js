#!/usr/bin/env node
/* Stamps a build/commit id into a COPY of the site so every deployment busts every cache.
       node tools/stamp-version.js <site-dir> <version>
   - service-worker.js: CACHE_VERSION becomes 'site-<version>' (new worker + fresh cache).
   - every *.html: local .css/.js references get ?v=<version> (replacing any old ?v=...),
     so browsers that never ran the service worker also fetch the new files at once.
   Never run it on your working copy; the deploy workflow runs it on the build output. */
const fs = require('fs'), path = require('path');
const [dir, version] = process.argv.slice(2);
if (!dir || !/^[0-9A-Za-z._-]+$/.test(version || '')) {
  console.error('usage: node tools/stamp-version.js <site-dir> <version>'); process.exit(1);
}
const root = path.resolve(dir);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name === 'vendor' || e.name === '.git' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);

const swPath = path.join(root, 'service-worker.js');
let sw = fs.readFileSync(swPath, 'utf8');
const swNew = sw.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = 'site-${version}';`);
if (swNew === sw) { console.error('CACHE_VERSION line not found in service-worker.js'); process.exit(1); }
fs.writeFileSync(swPath, swNew);

let files = 0, refs = 0;
walk(root).filter(f => f.endsWith('.html')).forEach(f => {
  const html = fs.readFileSync(f, 'utf8');
  const out = html.replace(/\b(href|src)=(["'])([^"']+?\.(?:css|js))(?:\?[^"']*)?\2/gi, (m, attr, q, url) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return m; // leave third-party URLs alone
    refs++;
    return `${attr}=${q}${url}?v=${version}${q}`;
  });
  if (out !== html) { fs.writeFileSync(f, out); files++; }
});
console.log(`stamped ${version}: service-worker.js + ${refs} references in ${files} HTML files`);
