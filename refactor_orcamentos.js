import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      if (
        dirPath.endsWith('.ts') ||
        dirPath.endsWith('.tsx') ||
        dirPath.endsWith('.js') ||
        dirPath.endsWith('.jsx')
      ) {
        callback(dirPath);
      }
    }
  });
}

let modifiedFiles = 0;

walk('./src', (filePath) => {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;

  // Replace plural first
  content = content.replace(/\borcamentos\b/g, 'quotations');
  content = content.replace(/\bOrcamentos\b/g, 'Quotations');
  content = content.replace(/\bORCAMENTOS\b/g, 'QUOTATIONS');

  // Then singular
  content = content.replace(/\borcamento\b/g, 'quotation');
  content = content.replace(/\bOrcamento\b/g, 'Quotation');
  content = content.replace(/\bORCAMENTO\b/g, 'QUOTATION');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Modified: ${filePath}`);
  }
});

console.log(`Total files modified: ${modifiedFiles}`);
