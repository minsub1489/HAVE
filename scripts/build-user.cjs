const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'user');
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
for (const file of ['tokens.css', 'styles.css']) {
  html = html.replace(`<link rel="stylesheet" href="${file}">`, () => `<style>${fs.readFileSync(path.join(dir, file), 'utf8')}</style>`);
}
for (const file of ['../prototype/dist/domain.js', '../prototype/dist/repository.js', 'model.js', 'app.js']) {
  const js = fs.readFileSync(path.join(dir, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  html = html.replace(`<script src="${file}" defer></script>`, () => `<script>${js}</script>`);
}
fs.writeFileSync(path.join(root, 'prototype', 'HAVE_사용자_GUI.html'), html);
console.log('HAVE standalone user GUI rebuilt.');
