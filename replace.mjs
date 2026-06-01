import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  if (content.includes('context/CRMContext')) {
    content = content.replace(/import\s+\{\s*([^}]*?)useCRM([^}]*?)\s*\}\s+from\s+['"](.*)context\/CRMContext['"]/g, 'import { $1useCrmStore as useCRM$2 } from \'$3stores/useCrmStore\'');
    changed = true;
  }

  if (content.includes('context/FinanceContext')) {
    content = content.replace(/import\s+\{\s*([^}]*?)useFinance([^}]*?)\s*\}\s+from\s+['"](.*)context\/FinanceContext['"]/g, 'import { $1useFinanceStore as useFinance$2 } from \'$3stores/useFinanceStore\'');
    changed = true;
  }

  if (content.includes('context/InventoryContext')) {
    content = content.replace(/import\s+\{\s*([^}]*?)useInventory([^}]*?)\s*\}\s+from\s+['"](.*)context\/InventoryContext['"]/g, 'import { $1useInventoryStore as useInventory$2 } from \'$3stores/useInventoryStore\'');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content);
    console.log(`Updated ${f}`);
  }
});
console.log('Replaced contexts');
