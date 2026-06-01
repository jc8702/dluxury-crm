import fs from 'fs';
import path from 'path';

const renames = [
  { old: 'calendarioService.ts', new: 'calendarService.ts', dir: 'src/services' },
  { old: 'estoqueGranularService.ts', new: 'inventoryService.ts', dir: 'src/services' },
  { old: 'calculoFinanceiro.ts', new: 'financeCalculations.ts', dir: 'src/utils' }
];

renames.forEach(r => {
  const oldPath = path.join(r.dir, r.old);
  const newPath = path.join(r.dir, r.new);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
});

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

  if (content.includes('calendarioService')) {
    content = content.replace(/calendarioService/g, 'calendarService');
    changed = true;
  }
  if (content.includes('estoqueGranularService')) {
    content = content.replace(/estoqueGranularService/g, 'inventoryService');
    changed = true;
  }
  if (content.includes('calculoFinanceiro')) {
    content = content.replace(/calculoFinanceiro/g, 'financeCalculations');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content);
  }
});
console.log('Renamed and updated imports');
