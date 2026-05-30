import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src', 'api-lib', 'quotations.ts');
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(
  /import \{([^}]+)\} from '\.\.\/db\/schema\/engenharia-orcamentos\.js';/g,
  (match, p1) => {
    if (p1.includes('orcamentos')) {
      return `import { quotations, quotationItems, quotationBom } from '../db/schema/quotations.js';\nimport { skuEngenharia, skuComponente } from '../db/schema/engenharia-orcamentos.js';`;
    }
    return match;
  }
);

// Replace schema references
content = content.replace(/\borcamentos\b/g, 'quotations');
content = content.replace(/\borcamentoItens\b/g, 'quotationItems');
content = content.replace(/\borcamentoListaExplodida\b/g, 'quotationBom');

// Also update the handle OrcamentosPro function name if needed
content = content.replace(/handleOrcamentosPro/g, 'handleQuotations');

fs.writeFileSync(file, content, 'utf8');
console.log('Refactoring applied to src/api-lib/quotations.ts');
