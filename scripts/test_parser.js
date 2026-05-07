import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// Simulação de lógica do backend
async function testParser(filePath) {
  console.log(`Testando arquivo: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  
  try {
    const data = await pdf(buffer);
    const text = data.text;
    console.log('--- TEXTO EXTRAÍDO ---');
    console.log(text.substring(0, 500));
    console.log('----------------------');
    
    // Teste de Regex
    const regexDimensoes = /(?:([a-zA-ZÀ-ÿ0-9\s\-_]{2,})[:\-\s]+)?(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/g;
    let match;
    const pecas = [];
    while ((match = regexDimensoes.exec(text)) !== null) {
      pecas.push({
        nome: match[1]?.trim() || 'S/N',
        l: match[2],
        a: match[3],
        e: match[4]
      });
    }
    console.log(`Peças encontradas: ${pecas.length}`);
    console.table(pecas.slice(0, 5));
    
  } catch (err) {
    console.error('ERRO NO TESTE:', err.message);
  }
}

// Rodar teste se houver um arquivo no diretório atual
const files = fs.readdirSync('.').filter(f => f.endsWith('.pdf'));
if (files.length > 0) {
  testParser(files[0]);
} else {
  console.log('Nenhum PDF encontrado para teste local. Crie um arquivo .pdf na raiz para testar.');
}
