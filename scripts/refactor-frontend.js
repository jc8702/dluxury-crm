import fs from 'fs';
import path from 'path';

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'db') return;
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const srcPath = path.join(process.cwd(), 'src');

walk(srcPath, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. API endpoint replacements
    content = content.replace(/\/api\/orcamentos_pro/g, '/api/quotations');
    
    // 2. Variable and Table Name replacements (excluding db/schema which we handled manually)
    if (!filePath.includes(path.join('db', 'schema'))) {
      content = content.replace(/\borcamentos_pro\b/g, 'quotations');
      content = content.replace(/\borcamentoItens\b/g, 'quotationItems');
      content = content.replace(/\borcamentoListaExplodida\b/g, 'quotationBom');
      content = content.replace(/\borcamento_id\b/g, 'quotation_id');
      content = content.replace(/\borcamento_item_id\b/g, 'quotation_item_id');
    }

    // 3. React Components / Hooks naming
    content = content.replace(/OrcamentoForm/g, 'QuotationForm');
    content = content.replace(/useOrcamento/g, 'useQuotation');
    content = content.replace(/OrcamentoPro/g, 'Quotation');
    content = content.replace(/OrcamentoItem/g, 'QuotationItem');
    
    // 4. File paths in imports
    content = content.replace(/modules\/orcamentos/g, 'modules/quotations');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
