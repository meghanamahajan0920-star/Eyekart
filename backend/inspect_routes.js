const fs = require('fs');
const s = fs.readFileSync('server.js', 'utf8');
const regex = /app\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(s)) !== null) {
    console.log(`${match[1].toUpperCase()} ${match[2]}`);
}
