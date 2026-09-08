#!/usr/bin/env node
/**
 * Converte audit-report.json (gerado por tests/e2e/full-audit.spec.ts)
 * em um relatório markdown legível: docs/AUDIT_REPORT.md
 *
 * Uso: node scripts/generate-audit-report.mjs
 */
import fs from 'fs';
import path from 'path';

const inputPath = path.resolve(process.cwd(), 'audit-report.json');
const outputPath = path.resolve(process.cwd(), 'docs/AUDIT_REPORT.md');

if (!fs.existsSync(inputPath)) {
  console.error('❌ audit-report.json não encontrado. Rode antes: npx playwright test tests/e2e/full-audit.spec.ts');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

const ok = results.filter((r) => r.status === 'ok');
const erro = results.filter((r) => r.status === 'erro');

const now = new Date().toISOString();

let md = `# Relatório de Auditoria — D'Luxury CRM\n\n`;
md += `**Gerado em:** ${now}\n\n`;
md += `**Resumo:** ${results.length} rotas testadas — ✅ ${ok.length} sem erro / 🔴 ${erro.length} com erro\n\n`;
md += `---\n\n`;

if (erro.length > 0) {
  md += `## 🔴 Rotas com erro (${erro.length})\n\n`;
  for (const r of erro) {
    md += `### ${r.label} (\`${r.route}\`)\n\n`;
    if (r.pageErrors.length) {
      md += `**Exceções de página:**\n`;
      r.pageErrors.forEach((e) => (md += `- \`${e}\`\n`));
      md += `\n`;
    }
    if (r.consoleErrors.length) {
      md += `**Erros de console:**\n`;
      r.consoleErrors.forEach((e) => (md += `- \`${e}\`\n`));
      md += `\n`;
    }
    if (r.failedRequests.length) {
      md += `**Requisições falhas:**\n`;
      r.failedRequests.forEach(
        (f) => (md += `- \`${f.method} ${f.url}\` → **${f.status}**\n`),
      );
      md += `\n`;
    }
    md += `**Status da correção:** ⬜ Não iniciada | ⬜ Em andamento | ⬜ Corrigido e retestado\n\n`;
    md += `**Causa raiz / solução aplicada:** _(preencher após investigação)_\n\n`;
    md += `---\n\n`;
  }
}

md += `## ✅ Rotas sem erro detectado (${ok.length})\n\n`;
md += `| Rota | Tempo de carregamento |\n|---|---|\n`;
for (const r of ok) {
  md += `| ${r.label} (\`${r.route}\`) | ${r.loadTimeMs ?? '-'}ms |\n`;
}

md += `\n---\n\n`;
md += `## Observações importantes\n\n`;
md += `- Este relatório detecta **crashes, erros de render e falhas de rede (4xx/5xx)** — não valida regras de negócio (ex: cálculo correto de orçamento, fluxo de aprovação end-to-end).\n`;
md += `- Para validação funcional profunda, siga também o \`docs/AUDIT_CHECKLIST.md\` manualmente ou com um agente guiado.\n`;
md += `- "Sem erro detectado" não significa "funcionalidade correta" — significa apenas que a página carregou sem exceções.\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, md, 'utf-8');
console.log(`✅ Relatório gerado em: ${outputPath}`);
