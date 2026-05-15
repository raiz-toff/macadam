const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ?
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const files = [];
walkDir('./src', (filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
        const stats = fs.statSync(filePath);
        let sizeCategory = stats.size < 1000 ? 'trivial' : (stats.size < 5000 ? 'medium' : 'large');
        files.push({
            path: filePath,
            sizeCategory: sizeCategory,
            size: stats.size
        });
    }
});

console.log(JSON.stringify(files, null, 2));
