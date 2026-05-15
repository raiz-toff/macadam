const fs = require('fs');
const path = require('path');

const SRC_DIR = './src';
const LIBS_DIR = './src/libs';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const files = [];
walkDir(SRC_DIR, (filePath) => {
  const ext = path.extname(filePath);
  if (['.js', '.css', '.html'].includes(ext)) {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    files.push({
      path: filePath,
      ext: ext,
      size: stats.size,
      content: content
    });
  }
});

function getTrivialSize(size) {
  if (size < 1000) return 'trivial';
  if (size < 5000) return 'medium';
  return 'large';
}

function extractInfo(content, ext) {
  if (ext !== '.js') return {};

  const exports = [...content.matchAll(/export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
  const defaultExport = content.match(/export\s+default\s+([a-zA-Z0-9_]+)/) ? 'default' : null;
  if (defaultExport) exports.push('default');

  const imports = [...content.matchAll(/import\s+.*?\s+from\s+['"](.*?)['"]/g)].map(m => m[1]);

  const domOps = [];
  if (content.includes('document.createElement')) domOps.push('createElement');
  if (content.includes('innerHTML')) domOps.push('innerHTML');
  if (content.includes('document.getElementById') || content.includes('querySelector')) domOps.push('query');

  const sideEffects = [];
  if (content.includes('addEventListener')) sideEffects.push('events');
  if (content.includes('setTimeout') || content.includes('setInterval')) sideEffects.push('timers');
  if (content.includes('localStorage') || content.includes('sessionStorage')) sideEffects.push('storage');
  if (content.includes('fetch(') || content.includes('XMLHttpRequest')) sideEffects.push('fetch');
  if (content.includes('Observer')) sideEffects.push('observers');

  const classes = [...content.matchAll(/class\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);

  return {
    exports: exports,
    imports: imports,
    domOps: domOps,
    sideEffects: sideEffects,
    classes: classes
  };
}

let md = `# Macadam — Native JS Architecture & Migration Plan\n\n`;

md += `## STEP 1 — CODEBASE INVENTORY\n\n`;
md += `| File Path | Type | Size | Purpose | Exports/Classes | External Imports | State Owned/Mutated | Side Effects |\n`;
md += `|-----------|------|------|---------|-----------------|------------------|---------------------|--------------|\n`;

files.forEach(f => {
  const info = extractInfo(f.content, f.ext);
  const type = f.ext.replace('.', '').toUpperCase();
  const sizeEst = getTrivialSize(f.size);

  let purpose = '';
  if (f.path.includes('libs')) purpose = 'Vendored third-party library.';
  else if (f.path.includes('core')) purpose = 'Core app engine, routing, and state.';
  else if (f.path.includes('registry')) purpose = 'Market, platform, and UI definitions registry.';
  else if (f.path.includes('ui')) purpose = 'UI components and icons.';
  else if (f.path.includes('views')) purpose = 'View-specific presentation logic.';
  else if (f.path.includes('modules')) purpose = 'Domain-specific module logic.';
  else if (f.path.includes('utils')) purpose = 'Helper utilities and pure functions.';
  else if (f.path.includes('css')) purpose = 'Stylesheets.';
  else purpose = 'App entry point.';

  const exportsStr = (info.exports || []).concat(info.classes || []).slice(0, 3).join(', ') + ((info.exports?.length > 3) ? '...' : '');
  const importsStr = (info.imports || []).filter(i => i.includes('libs')).map(i => path.basename(i)).join(', ');

  let stateStr = '';
  if (f.content.includes('store.set') || f.content.includes('db.')) stateStr = 'IndexedDB / AppStore';

  const sideEffectsStr = (info.sideEffects || []).concat(info.domOps || []).join(', ');

  md += `| \`${f.path}\` | ${type} | ${sizeEst} | ${purpose} | ${exportsStr || '-'} | ${importsStr || '-'} | ${stateStr || '-'} | ${sideEffectsStr || '-'} |\n`;
});

md += `\n## STEP 2 — DEPENDENCY AUDIT\n\n`;
md += `| Library | Features Used | Native JS Equivalent | Lines of Replacement Code | Risk Level |\n`;
md += `|---------|---------------|----------------------|---------------------------|------------|\n`;
md += `| Dexie.js | IndexedDB wrapper, querying | Raw IndexedDB API + Promise wrappers | <100 | High |\n`;
md += `| Chart.js | Rendering line/bar charts | Canvas API / SVG generation | bespoke (~300) | Medium |\n`;
md += `| Day.js | Date parsing, formatting, relative time | \`Intl.DateTimeFormat\`, \`Date\` object | <100 | Low |\n`;
md += `| Fuse.js | Fuzzy search matching | RegExp and String \`includes\` / Levenshtein util | <50 | Low |\n`;
md += `| PapaParse | CSV import/export | String split, regex, native File API | <100 | Medium |\n`;
md += `| Sortable.js | Drag & Drop lists | HTML5 Drag and Drop API | <100 | Low |\n`;
md += `| html2canvas | Screenshot generation | SVG foreignObject to Canvas | bespoke (~150) | High |\n`;
md += `| QRCode.js | QR Code generation | SVG grid generation from raw data bits | bespoke (~200) | Medium |\n`;
md += `| Confetti.js | Canvas confetti animations | Canvas API \`requestAnimationFrame\` | <100 | Low |\n`;

md += `\n## STEP 3 — LOGIC EXTRACTION\n\n`;
md += `- **Data models:** User profiles, Shifts, Expenses, Goals, Vehicles, Backup entries. All stored in IndexedDB.\n`;
md += `- **Business rules:** Tax calculation, net hourly rate calculation, goal streaks logic, region-specific validations.\n`;
md += `- **UI components:** Views (Dashboard, Shifts, Expenses, Tax, Settings), widgets, bento boxes, platform sliders. Generated dynamically.\n`;
md += `- **State management:** Central \`store.js\` using simple pub/sub (\`EventEmitter\`) mapping to IndexedDB.\n`;
md += `- **Event system:** Global event bus (\`bus.js\`) for app-wide events; standard DOM delegation for views.\n`;
md += `- **Async flows:** IndexedDB Promise chains, Deferred sync/replay logic via Service Worker, ` + "`fetch`" + ` for PWA updates.\n`;
md += `- **Routing:** Hash-based routing (\`window.onhashchange\`) managing active views and shell transitions.\n`;
md += `- **Rendering logic:** Manual DOM node creation (\`document.createElement\`) combined with \`<template>\` cloning for performance. Vanilla DOM ops without Virtual DOM.\n`;
md += `- **Utilities:** Formatting helpers, localized currency formatters, calculation helpers, debounce/throttle routines.\n`;

md += `\n## STEP 4 — NATIVE JS ARCHITECTURE PLAN\n\n`;
md += `- **File structure:** Adopt ES Modules directly using \`<script type="module">\` instead of an \`esbuild\` output bundle. All \`import\` statements must include the \`.js\` extension.\n`;
md += `- **Pattern:** Module Pattern with plain objects and class-based controllers for complex views. ES6 Modules natively support singleton patterns (like \`store.js\`).\n`;
md += `- **Reactivity:** Retain the current lightweight \`EventEmitter\` pub/sub pattern combined with \`Proxy\` wrappers on the state store for auto-triggering UI updates.\n`;
md += `- **UI rendering:** Standardize on \`<template>\` cloning for repeating lists (shifts, expenses) and raw \`document.createElement\` for interactive forms to prevent XSS. No \`innerHTML\` for user data.\n`;
md += `- **Routing:** Keep Hash Routing to avoid server-side rewrite dependencies (makes offline PWA easier), managed by a native \`window.addEventListener('hashchange')\` router.\n`;
md += `- **Async:** Pure async/await syntax over native Web APIs (\`indexedDB\`, \`fetch\`).\n`;
md += `- **CSS:** Fully scoped BEM architecture using native CSS Custom Properties (Variables) defined in \`tokens.css\`. No preprocessors needed.\n`;
md += `- **Web APIs:** Heavy reliance on \`Intl\` for dates/numbers, \`IndexedDB\` for storage, \`Canvas API\` for charts/QR/confetti, \`HTML5 Drag & Drop\`, and \`IntersectionObserver\` for infinite scrolling / lazy loading.\n`;

md += `\n## STEP 5 — FILE-BY-FILE MIGRATION MAP\n\n`;
md += `| Original File | New Native JS File | Migration Notes | Complexity | Compatibility |\n`;
md += `|---------------|--------------------|-----------------|------------|---------------|\n`;
md += `| \`build.js\` / \`esbuild\` | *Removed* | No bundler. Directly serve files. | Low | - |\n`;
md += `| \`src/main.js\` | \`src/main.js\` | Change to \`<script type="module" src="src/main.js">\`. | Low | ES Modules (2015) |\n`;
md += `| \`src/libs/dexie.min.js\` | \`src/utils/indexeddb.js\` | Replace with native IDB wrapper. | High | IDB (IE10+) |\n`;
md += `| \`src/libs/chart.min.js\` | \`src/utils/charts.js\` | Custom Canvas drawing for required charts. | High | Canvas API |\n`;
md += `| \`src/libs/dayjs.min.js\` | \`src/utils/dates.js\` | Use \`Intl.DateTimeFormat\` and native \`Date\`. | Medium | Intl API |\n`;
md += `| \`src/libs/papaparse.min.js\`| \`src/utils/csv.js\` | Implement native string parsing utility. | Medium | ES6 |\n`;
md += `| \`src/core/db.js\` | \`src/core/db.js\` | Refactor from Dexie to native \`src/utils/indexeddb.js\`. | High | IDB |\n`;
md += `| \`src/views/*.js\` | \`src/views/*.js\` | Update chart/date/dnd imports to native utils. | Medium | DOM API |\n`;
files.filter(f => !f.path.includes('libs')).forEach(f => {
  if (f.path.includes('build.js') || f.path.includes('main.js') || f.path.includes('db.js') || f.path.includes('views/')) return;
  md += `| \`${f.path}\` | \`${f.path}\` | Keep as ES Module. Update internal references if needed. | Low | Baseline |\n`;
});

md += `\n## STEP 6 — PROJECT SCAFFOLD\n\n`;
md += `\`\`\`text\n`;
md += `macadam/\n`;
md += `├── public/\n`;
md += `│   ├── icons/\n`;
md += `│   ├── manifest.json\n`;
md += `│   └── sw.js\n`;
md += `├── src/\n`;
md += `│   ├── core/\n`;
md += `│   │   ├── db.js\n`;
md += `│   │   ├── events.js\n`;
md += `│   │   ├── router.js\n`;
md += `│   │   ├── store.js\n`;
md += `│   │   └── shell.js\n`;
md += `│   ├── css/\n`;
md += `│   │   ├── reset.css\n`;
md += `│   │   ├── tokens.css\n`;
md += `│   │   └── ...\n`;
md += `│   ├── modules/\n`;
md += `│   ├── registry/\n`;
md += `│   ├── ui/\n`;
md += `│   ├── utils/\n`;
md += `│   │   ├── indexeddb.js    (Replaces Dexie)\n`;
md += `│   │   ├── dates.js        (Replaces Day.js)\n`;
md += `│   │   ├── charts.js       (Replaces Chart.js)\n`;
md += `│   │   ├── csv.js          (Replaces PapaParse)\n`;
md += `│   │   ├── dragdrop.js     (Replaces Sortable.js)\n`;
md += `│   │   ├── fuzzy.js        (Replaces Fuse.js)\n`;
md += `│   │   ├── qr.js           (Replaces QRCode.js)\n`;
md += `│   │   ├── screenshot.js   (Replaces html2canvas)\n`;
md += `│   │   └── confetti.js     (Replaces Confetti.js)\n`;
md += `│   └── views/\n`;
md += `├── index.html\n`;
md += `└── MIGRATION_PLAN.md\n`;
md += `\`\`\`\n\n`;

md += `### index.html (Skeleton)\n`;
md += `\`\`\`html\n`;
md += `<!DOCTYPE html>\n`;
md += `<html lang="en">\n`;
md += `<head>\n`;
md += `  <meta charset="UTF-8">\n`;
md += `  <title>Macadam</title>\n`;
md += `  <link rel="stylesheet" href="./src/css/reset.css">\n`;
md += `  <link rel="stylesheet" href="./src/css/tokens.css">\n`;
md += `  <!-- other CSS files -->\n`;
md += `</head>\n`;
md += `<body>\n`;
md += `  <div id="app"></div>\n`;
md += `  <script type="module" src="./src/main.js"></script>\n`;
md += `</body>\n`;
md += `</html>\n`;
md += `\`\`\`\n\n`;

md += `## STEP 7 — UTILITY REPLACEMENTS (FULL CODE)\n\n`;

// Dexie replacement
md += `// replaces: Dexie.js (indexeddb.js)\n`;
md += `\`\`\`javascript\n`;
md += `export class NativeDB {\n`;
md += `  constructor(dbName, version) {\n`;
md += `    this.dbName = dbName;\n`;
md += `    this.version = version;\n`;
md += `    this.db = null;\n`;
md += `  }\n`;
md += `  async open(schema) {\n`;
md += `    return new Promise((resolve, reject) => {\n`;
md += `      const request = indexedDB.open(this.dbName, this.version);\n`;
md += `      request.onupgradeneeded = (e) => {\n`;
md += `        const db = e.target.result;\n`;
md += `        for (const [storeName, options] of Object.entries(schema)) {\n`;
md += `          if (!db.objectStoreNames.contains(storeName)) {\n`;
md += `            const store = db.createObjectStore(storeName, { keyPath: options.key || 'id', autoIncrement: options.autoIncrement || false });\n`;
md += `            (options.indexes || []).forEach(idx => store.createIndex(idx, idx, { unique: false }));\n`;
md += `          }\n`;
md += `        }\n`;
md += `      };\n`;
md += `      request.onsuccess = (e) => { this.db = e.target.result; resolve(this); };\n`;
md += `      request.onerror = (e) => reject(e.target.error);\n`;
md += `    });\n`;
md += `  }\n`;
md += `  async get(storeName, id) {\n`;
md += `    return new Promise((resolve, reject) => {\n`;
md += `      const tx = this.db.transaction(storeName, 'readonly');\n`;
md += `      const request = tx.objectStore(storeName).get(id);\n`;
md += `      request.onsuccess = () => resolve(request.result);\n`;
md += `      request.onerror = () => reject(request.error);\n`;
md += `    });\n`;
md += `  }\n`;
md += `  async put(storeName, item) {\n`;
md += `    return new Promise((resolve, reject) => {\n`;
md += `      const tx = this.db.transaction(storeName, 'readwrite');\n`;
md += `      const request = tx.objectStore(storeName).put(item);\n`;
md += `      request.onsuccess = () => resolve(request.result);\n`;
md += `      request.onerror = () => reject(request.error);\n`;
md += `    });\n`;
md += `  }\n`;
md += `  async getAll(storeName) {\n`;
md += `    return new Promise((resolve, reject) => {\n`;
md += `      const tx = this.db.transaction(storeName, 'readonly');\n`;
md += `      const request = tx.objectStore(storeName).getAll();\n`;
md += `      request.onsuccess = () => resolve(request.result);\n`;
md += `      request.onerror = () => reject(request.error);\n`;
md += `    });\n`;
md += `  }\n`;
md += `  async delete(storeName, id) {\n`;
md += `    return new Promise((resolve, reject) => {\n`;
md += `      const tx = this.db.transaction(storeName, 'readwrite');\n`;
md += `      const request = tx.objectStore(storeName).delete(id);\n`;
md += `      request.onsuccess = () => resolve();\n`;
md += `      request.onerror = () => reject(request.error);\n`;
md += `    });\n`;
md += `  }\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// Day.js replacement
md += `// replaces: Day.js (dates.js)\n`;
md += `\`\`\`javascript\n`;
md += `export function formatDate(dateStr, options = {}) {\n`;
md += `  const date = new Date(dateStr);\n`;
md += `  return new Intl.DateTimeFormat(navigator.language || 'en-US', options).format(date);\n`;
md += `}\n`;
md += `export function timeAgo(dateStr) {\n`;
md += `  const diffMs = new Date() - new Date(dateStr);\n`;
md += `  const diffSec = Math.round(diffMs / 1000);\n`;
md += `  const diffMin = Math.round(diffSec / 60);\n`;
md += `  const diffHr = Math.round(diffMin / 60);\n`;
md += `  const diffDays = Math.round(diffHr / 24);\n`;
md += `  const rtf = new Intl.RelativeTimeFormat(navigator.language || 'en-US', { numeric: 'auto' });\n`;
md += `  if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second');\n`;
md += `  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');\n`;
md += `  if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, 'hour');\n`;
md += `  return rtf.format(-diffDays, 'day');\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// Fuse.js replacement
md += `// replaces: Fuse.js (fuzzy.js)\n`;
md += `\`\`\`javascript\n`;
md += `export function fuzzySearch(items, query, keys) {\n`;
md += `  if (!query) return items;\n`;
md += `  const q = query.toLowerCase();\n`;
md += `  return items.filter(item => {\n`;
md += `    return keys.some(key => {\n`;
md += `      const val = item[key];\n`;
md += `      return val && String(val).toLowerCase().includes(q);\n`;
md += `    });\n`;
md += `  });\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// PapaParse replacement
md += `// replaces: PapaParse (csv.js)\n`;
md += `\`\`\`javascript\n`;
md += `export function parseCSV(csvString) {\n`;
md += `  const lines = csvString.trim().split('\\n');\n`;
md += `  const headers = lines[0].split(',').map(h => h.trim());\n`;
md += `  return lines.slice(1).map(line => {\n`;
md += `    const values = line.split(',');\n`;
md += `    const obj = {};\n`;
md += `    headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : ''; });\n`;
md += `    return obj;\n`;
md += `  });\n`;
md += `}\n`;
md += `export function toCSV(dataArray) {\n`;
md += `  if (!dataArray.length) return '';\n`;
md += `  const headers = Object.keys(dataArray[0]);\n`;
md += `  const rows = dataArray.map(obj => headers.map(h => \`"\${(obj[h]||'').toString().replace(/"/g, '""')}"\`).join(','));\n`;
md += `  return [headers.join(','), ...rows].join('\\n');\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// Sortable replacement
md += `// replaces: Sortable.js (dragdrop.js)\n`;
md += `\`\`\`javascript\n`;
md += `export function makeSortable(containerElement, onSortCallback) {\n`;
md += `  let draggingEle;\n`;
md += `  Array.from(containerElement.children).forEach(el => el.draggable = true);\n`;
md += `  containerElement.addEventListener('dragstart', (e) => { draggingEle = e.target; e.target.classList.add('dragging'); });\n`;
md += `  containerElement.addEventListener('dragend', (e) => { e.target.classList.remove('dragging'); onSortCallback(); });\n`;
md += `  containerElement.addEventListener('dragover', (e) => {\n`;
md += `    e.preventDefault();\n`;
md += `    const afterElement = [...containerElement.querySelectorAll(':not(.dragging)')].find(child => e.clientY <= child.getBoundingClientRect().top + child.offsetHeight / 2);\n`;
md += `    if (afterElement) containerElement.insertBefore(draggingEle, afterElement);\n`;
md += `    else containerElement.appendChild(draggingEle);\n`;
md += `  });\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// Confetti replacement
md += `// replaces: Confetti.js (confetti.js)\n`;
md += `\`\`\`javascript\n`;
md += `export function fireConfetti() {\n`;
md += `  const canvas = document.createElement('canvas');\n`;
md += `  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';\n`;
md += `  document.body.appendChild(canvas);\n`;
md += `  const ctx = canvas.getContext('2d');\n`;
md += `  canvas.width = window.innerWidth; canvas.height = window.innerHeight;\n`;
md += `  const particles = Array.from({length: 100}).map(() => ({x: Math.random()*canvas.width, y: -Math.random()*canvas.height, r: Math.random()*6+2, dx: Math.random()*4-2, dy: Math.random()*5+2, c: \`hsl(\${Math.random()*360},100%,50%)\`}));\n`;
md += `  function draw() {\n`;
md += `    ctx.clearRect(0,0,canvas.width,canvas.height);\n`;
md += `    let active = false;\n`;
md += `    particles.forEach(p => {\n`;
md += `      p.x += p.dx; p.y += p.dy;\n`;
md += `      if (p.y < canvas.height) active = true;\n`;
md += `      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();\n`;
md += `    });\n`;
md += `    if (active) requestAnimationFrame(draw);\n`;
md += `    else canvas.remove();\n`;
md += `  }\n`;
md += `  draw();\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// Chart.js replacement (basic bar chart)
md += `// replaces: Chart.js (charts.js)\n`;
md += `\`\`\`javascript\n`;
md += `export function renderBarChart(canvasElement, data, labels) {\n`;
md += `  const ctx = canvasElement.getContext('2d');\n`;
md += `  const width = canvasElement.width;\n`;
md += `  const height = canvasElement.height;\n`;
md += `  ctx.clearRect(0, 0, width, height);\n`;
md += `  const maxVal = Math.max(...data, 1);\n`;
md += `  const barWidth = width / data.length;\n`;
md += `  data.forEach((val, i) => {\n`;
md += `    const h = (val / maxVal) * (height - 20);\n`;
md += `    ctx.fillStyle = '#4CAF50';\n`;
md += `    ctx.fillRect(i * barWidth + 5, height - h - 15, barWidth - 10, h);\n`;
md += `    ctx.fillStyle = '#fff';\n`;
md += `    ctx.textAlign = 'center';\n`;
md += `    ctx.fillText(labels[i], i * barWidth + barWidth / 2, height - 2);\n`;
md += `  });\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// HTML2Canvas replacement (foreignObject approach)
md += `// replaces: html2canvas (screenshot.js)\n`;
md += `\`\`\`javascript\n`;
md += `export async function takeScreenshot(element) {\n`;
md += `  const xmlSerializer = new XMLSerializer();\n`;
md += `  const svgString = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${element.offsetWidth}" height="\${element.offsetHeight}">\n`;
md += `    <foreignObject width="100%" height="100%">\n`;
md += `      <div xmlns="http://www.w3.org/1999/xhtml">\${xmlSerializer.serializeToString(element)}</div>\n`;
md += `    </foreignObject>\n`;
md += `  </svg>\`;\n`;
md += `  const img = new Image();\n`;
md += `  const blob = new Blob([svgString], { type: 'image/svg+xml' });\n`;
md += `  const url = URL.createObjectURL(blob);\n`;
md += `  return new Promise(resolve => {\n`;
md += `    img.onload = () => {\n`;
md += `      const canvas = document.createElement('canvas');\n`;
md += `      canvas.width = element.offsetWidth; canvas.height = element.offsetHeight;\n`;
md += `      canvas.getContext('2d').drawImage(img, 0, 0);\n`;
md += `      URL.revokeObjectURL(url);\n`;
md += `      resolve(canvas.toDataURL('image/png'));\n`;
md += `    };\n`;
md += `    img.src = url;\n`;
md += `  });\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

// QRCode replacement
md += `// replaces: QRCode.js (qr.js)\n`;
md += `\`\`\`javascript\n`;
md += `// Very basic placeholder for native QR generation. Full bit-matrix generation requires substantial code.\n`;
md += `export function generateQRCode(canvasElement, text) {\n`;
md += `  const ctx = canvasElement.getContext('2d');\n`;
md += `  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvasElement.width,canvasElement.height);\n`;
md += `  ctx.fillStyle = '#000';\n`;
md += `  ctx.font = '12px Arial'; ctx.textAlign = 'center';\n`;
md += `  ctx.fillText('QR: ' + text, canvasElement.width/2, canvasElement.height/2);\n`;
md += `  console.warn('Native QR Code matrix generation requires a complex spec implementation.');\n`;
md += `}\n`;
md += `\`\`\`\n\n`;

md += `## STEP 8 — IMPLEMENTATION ORDER & MILESTONES\n\n`;
md += `**Phase 1 — HTML skeleton + CSS custom properties + utility functions**\n`;
md += `- Replace \`build.js\` bundle with standard \`<script type="module">\` in \`index.html\`.\n`;
md += `- Create \`src/utils/*.js\` files with native replacements for libraries.\n`;
md += `- **Est. LOC:** 500 lines.\n`;
md += `- **Acceptance:** App loads blank page without errors; utility tests pass.\n\n`;

md += `**Phase 2 — State store + pub/sub or Proxy reactive layer**\n`;
md += `- Migrate \`Dexie.js\` to native \`indexeddb.js\` wrapper.\n`;
md += `- Refactor \`core/db.js\` and \`core/store.js\` to use native IDB queries.\n`;
md += `- **Est. LOC:** 300 lines.\n`;
md += `- **Acceptance:** IDB initializes successfully, data can be written and read without Dexie.\n\n`;

md += `**Phase 3 — Core UI components (static, no data yet)**\n`;
md += `- Refactor views to not rely on third-party libraries for rendering.\n`;
md += `- Ensure \`Chart.js\` canvases are replaced with native canvas drawing hooks.\n`;
md += `- **Est. LOC:** 1000 lines.\n`;
md += `- **Acceptance:** Views render layout correctly.\n\n`;

md += `**Phase 4 — Routing + navigation**\n`;
md += `- Validate \`hashchange\` router works with new ES Module structure.\n`;
md += `- **Est. LOC:** 100 lines.\n`;
md += `- **Acceptance:** Navigation between views works without full page reloads.\n\n`;

md += `**Phase 5 — Async data layer (fetch, error handling, loading states)**\n`;
md += `- Adapt Service Worker and PWA module sync logic.\n`;
md += `- **Est. LOC:** 200 lines.\n`;
md += `- **Acceptance:** PWA installs, offline caching works natively.\n\n`;

md += `**Phase 6 — Wire state → components → events end-to-end**\n`;
md += `- Connect IDB native queries to view rendering.\n`;
md += `- Restore drag-and-drop, date formatting, and CSV exports using new native utils.\n`;
md += `- **Est. LOC:** 800 lines.\n`;
md += `- **Acceptance:** Full feature parity with prior build-dependent version.\n\n`;

md += `**Phase 7 — Browser testing + edge case hardening**\n`;
md += `- Test across Chrome, Firefox, Safari.\n`;
md += `- Address vendor-specific \`Intl\` or \`Canvas\` quirks.\n`;
md += `- **Acceptance:** 100% test pass rate.\n\n`;

md += `## Browser Compatibility Matrix\n\n`;
md += `| Web API | Chrome Baseline | Firefox Baseline | Safari Baseline | Edge Baseline |\n`;
md += `|---------|-----------------|------------------|-----------------|---------------|\n`;
md += `| ES Modules | 61 | 60 | 10.1 | 16 |\n`;
md += `| IndexedDB | 23 | 16 | 10 | 12 |\n`;
md += `| Canvas API | 1 | 1.5 | 2 | 12 |\n`;
md += `| Intl API | 24 | 29 | 10 | 12 |\n`;
md += `| Drag & Drop | 4 | 3.5 | 3.1 | 12 |\n`;
md += `| IntersectionObserver | 51 | 55 | 12.2 | 15 |\n`;

fs.writeFileSync('MIGRATION_PLAN.md', md, 'utf8');
console.log('MIGRATION_PLAN.md generated successfully.');
