const fs = require('fs');
let content = fs.readFileSync('src/components/projects/ProjectKanban.tsx', 'utf8');
content = content.replace(/âœ“/g, '✓');
content = content.replace(/Ãš/g, 'Ú');
fs.writeFileSync('src/components/projects/ProjectKanban.tsx', content, 'utf8');
