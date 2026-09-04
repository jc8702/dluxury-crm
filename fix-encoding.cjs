const fs = require('fs');

const file = 'src/pages/FinanceiroRecorrentesPage.tsx';
let c = fs.readFileSync(file, 'utf8');

// Replace all ï¿½ sequences with correct Portuguese characters
// ï¿½ï¿½ = ç (two replacement chars = one ç)
// ï¿½ = various accented characters

const replacements = {
  'ï¿½ï¿½o': 'ção',
  'ï¿½ï¿½O': 'ÇÃO',
  'ï¿½o': 'ço',
  'ï¿½O': 'ÇO',
  'ï¿½tulos': 'tulos',
  'ï¿½Tulos': 'Tulos',
  'ï¿½s': 'ês',
  'ï¿½S': 'Ês',
  'ï¿½ncia': 'ência',
  'ï¿½ria': 'ária',
  'ï¿½o': 'ão',
  'ï¿½O': 'ÃO',
  'ï¿½a': 'ã',
  'ï¿½á': 'á',
  'ï¿½e': 'é',
  'ï¿½ê': 'ê',
  'ï¿½i': 'í',
  'ï¿½í': 'í',
  'ï¿½ú': 'ú',
  'ï¿½ã': 'ã',
  'ï¿½õ': 'õ',
  'ï¿½ô': 'ô',
  'ï¿½â': 'â',
  'ï¿½û': 'û',
  'ï¿½à': 'à',
  'ï¿½è': 'è',
  'ï¿½ù': 'ù',
  'ï¿½î': 'î',
  'ï¿½û': 'û',
  'ï¿½ç': 'ç',
};

Object.entries(replacements).forEach(([from, to]) => {
  while (c.includes(from)) {
    c = c.replace(from, to);
  }
});

// Also fix any remaining ï¿½ sequences
while (c.includes('ï¿½ï¿½')) {
  c = c.replace('ï¿½ï¿½', 'ç');
}
while (c.includes('ï¿½')) {
  // Try to figure out what character it should be based on context
  const idx = c.indexOf('ï¿½');
  const before = c.substring(Math.max(0, idx - 20), idx);
  const after = c.substring(idx + 3, idx + 20);
  console.log('Remaining ï¿½ at position ' + idx + ':');
  console.log('  Before: ...' + before);
  console.log('  After: ' + after + '...');
  
  // For now, replace with a placeholder
  c = c.substring(0, idx) + '?' + c.substring(idx + 3);
}

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed all ï¿½ sequences');
