const fs = require('fs');

const inventory = JSON.parse(fs.readFileSync('inventory.json', 'utf8'));
const filesByModule = inventory.reduce((acc, file) => {
    const dir = file.path.split('/')[1] || 'root';
    if (!acc[dir]) {
        acc[dir] = [];
    }
    acc[dir].push(file);
    return acc;
}, {});

console.log(`Total files: ${inventory.length}`);
console.log(Object.keys(filesByModule).map(dir => `${dir}: ${filesByModule[dir].length}`).join(', '));
