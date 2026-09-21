#!/usr/bin/env node
/**
 * Script de Mascaramento de PII — Lote 1 Auditoria
 * NÃO EXECUTAR sem confirmação. Só em branch audit-2026-09 com host confirmado.
 *
 * Objetivo: mascarar e-mails, telefones, nomes, CPF/CNPJ em dumps/logs de auditoria
 * para LGPD, sem alterar dados de produção. Opera em modo dry-run por padrão.
 *
 * Uso:
 *   node scripts/audit/mascaramento-pii.mjs --input audit-dump.json --dry-run
 *   node scripts/audit/mascaramento-pii.mjs --input dump.csv --output dump.masked.csv --confirm
 *
 * Flags:
 *   --branch audit-2026-09  (obrigatório para execução real)
 *   --host <hostname-confirmado>  (obrigatório para execução real)
 *   --confirm  (sem esta flag, apenas preview dos primeiros 10 registros)
 *   --dry-run  (alias para preview)
 *
 * O que mascara:
 *   - emails:   joao.silva@empresa.com -> j***a@e*****a.com / hash
 *   - telefones: (11) 99999-1234 -> (**) *****-1234 / +55 ** ****-1234
 *   - CPF: 123.456.789-00 -> ***.456.***-** / hash parcial
 *   - CNPJ: 12.345.678/0001-99 -> XX.XXX.XXX-**** (parcial)
 *   - nomes: Joao Silva -> J*** S*** / hash se houver risco de re-identificacao
 *
 * Nunca loga valores originais quando --confirm ativo.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const branchFlag = getArg('--branch');
const hostFlag = getArg('--host');
const inputPath = getArg('--input');
const outputPath = getArg('--output');
const confirm = hasFlag('--confirm');
const dryRun = hasFlag('--dry-run') || !confirm;

// --- Guardas de segurança solicitados ---
const ALLOWED_BRANCH = 'audit-2026-09';

function assertPreconditions() {
  if (!confirm) {
    console.log('[MODO PREVIEW] Nenhum arquivo será alterado. Use --confirm --branch audit-2026-09 --host <confirmado> para executar.');
    return;
  }
  if (branchFlag !== ALLOWED_BRANCH) {
    console.error(`[ERRO] Execução bloqueada: branch deve ser exatamente '${ALLOWED_BRANCH}'. Recebido: '${branchFlag ?? 'null'}'`);
    process.exit(1);
  }
  if (!hostFlag || hostFlag.trim().length < 3) {
    console.error('[ERRO] Execução bloqueada: --host <hostname-confirmado> é obrigatório (IP/host do DB ou domínio verificado).');
    process.exit(1);
  }
  const host = hostFlag.trim();
  // Validação simples de host/IP para evitar execução acidental em prod sem confirmação
  const isValidHost = /^[a-zA-Z0-9.-]+$/.test(host) || /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
  if (!isValidHost) {
    console.error(`[ERRO] Host inválido: '${host}'`);
    process.exit(1);
  }
  // Verificação de branch git atual (best-effort, não bloqueia se git ausente mas avisa)
  try {
    const { execSync } = awaitImportExecSync();
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (currentBranch !== ALLOWED_BRANCH) {
      console.error(`[ERRO] Branch atual '${currentBranch}' != '${ALLOWED_BRANCH}'. Troque de branch antes de executar.`);
      process.exit(1);
    }
  } catch (e) {
    console.warn('[AVISO] Não foi possível verificar branch git (git ausente ou repo não encontrado). Prosseguindo com validação por flag.');
  }
  console.log(`[OK] Precondições atendidas: branch=${branchFlag} host=${host} input=${inputPath ?? 'stdin'} output=${outputPath ?? 'stdout/masked'}`);
}

function awaitImportExecSync() {
  // placeholder - usa _execSync importado estaticamente
  return { execSync: _execSync };
}

// Implementação síncrona alternativa para assertPreconditions sem async
import { execSync as _execSync } from 'node:child_process';
function assertPreconditionsSync() {
  if (!confirm) {
    console.log('[MODO PREVIEW] Nenhum arquivo será alterado. Use --confirm --branch audit-2026-09 --host <confirmado> para executar.');
    return;
  }
  if (branchFlag !== ALLOWED_BRANCH) {
    console.error(`[ERRO] Execução bloqueada: branch deve ser exatamente '${ALLOWED_BRANCH}'. Recebido: '${branchFlag ?? 'null'}'`);
    process.exit(1);
  }
  if (!hostFlag || hostFlag.trim().length < 3) {
    console.error('[ERRO] Execução bloqueada: --host <hostname-confirmado> é obrigatório.');
    process.exit(1);
  }
  const host = hostFlag.trim();
  const isValidHost = /^[a-zA-Z0-9.\-]+$/.test(host) || /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
  if (!isValidHost) {
    console.error(`[ERRO] Host inválido: '${host}'`);
    process.exit(1);
  }
  try {
    const currentBranch = _execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (currentBranch !== ALLOWED_BRANCH) {
      console.error(`[ERRO] Branch atual '${currentBranch}' != '${ALLOWED_BRANCH}'.`);
      process.exit(1);
    }
  } catch (e) {
    console.warn('[AVISO] Não foi possível verificar branch git. Prosseguindo com validação por flag.');
  }
  console.log(`[OK] Precondições atendidas: branch=${branchFlag} host=${host}`);
}

// --- Funções de mascaramento ---

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  const domainParts = domain.split('.');
  const maskedLocal = local.length <= 2 ? local[0] + '***' : local[0] + '***' + local[local.length - 1];
  const maskedDomain = domainParts.map((p, i) => i === domainParts.length - 1 ? p : p[0] + '***').join('.');
  // Também gera hash para join sem re-identificação
  const hash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 8);
  return `${maskedLocal}@${maskedDomain} [${hash}]`;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '(**) ****-****';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '****';
  // Mantém DDD mascarado e últimos 4 dígitos
  if (digits.length === 11) return `(**) *****-${digits.slice(-4)}`;
  if (digits.length === 10) return `(**) ****-${digits.slice(-4)}`;
  return `+** *** ***-${digits.slice(-4)}`;
}

function maskCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') return '***.***.***-**';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  const hash = crypto.createHash('sha256').update(digits).digest('hex').slice(0, 6);
  return `***.${digits.slice(3, 6)}.***-** [${hash}]`;
}

function maskCNPJ(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') return '**.***.***/****-**';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return '**.***.***/****-**';
  const hash = crypto.createHash('sha256').update(digits).digest('hex').slice(0, 6);
  return `**.***.***/****-${digits.slice(-2)} [${hash}]`;
}

function maskDocumento(doc) {
  if (!doc) return '***';
  const digits = String(doc).replace(/\D/g, '');
  if (digits.length === 11) return maskCPF(doc);
  if (digits.length === 14) return maskCNPJ(doc);
  return '***' + digits.slice(-4).padStart(digits.length, '*');
}

function maskNome(nome) {
  if (!nome || typeof nome !== 'string') return '***';
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) {
    const p = parts[0];
    return p[0] + '***' + (p.length > 1 ? p[p.length - 1] : '');
  }
  return parts.map(p => p.length <= 2 ? p[0] + '***' : p[0] + '***' + p[p.length - 1]).join(' ');
}

function maskValueByKey(key, value) {
  if (value == null || value === '') return value;
  const k = String(key).toLowerCase();
  if (k.includes('email') || k === 'e-mail' || k.includes('mail')) return maskEmail(String(value));
  if (k.includes('telefone') || k.includes('phone') || k.includes('celular') || k.includes('fone')) return maskPhone(String(value));
  if (k === 'cpf' || k.includes('cpf')) return maskCPF(String(value));
  if (k === 'cnpj' || k.includes('cnpj')) return maskCNPJ(String(value));
  if (k.includes('documento') || k.includes('doc') || k.includes('cpf_cnpj')) return maskDocumento(String(value));
  if (k.includes('nome') || k.includes('razao_social') || k.includes('fantasia') || k.includes('name')) return maskNome(String(value));
  return value;
}

// Mascara qualquer estrutura JSON/CSV linha a linha
function maskObject(obj) {
  if (Array.isArray(obj)) return obj.map(maskObject);
  if (obj !== null && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && typeof v === 'object') {
        out[k] = maskObject(v);
      } else {
        out[k] = maskValueByKey(k, v);
      }
    }
    return out;
  }
  return obj;
}

function maskTextLine(line) {
  // Heurística para CSV / log line
  // 1. Emails
  let out = line.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (m) => maskEmail(m));
  // 2. Telefones BR (11 dígitos com ou sem máscara)
  out = out.replace(/\(?\d{2}\)?[\s\-]?\d{4,5}[\s\-]?\d{4}/g, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) return maskPhone(m);
    return m;
  });
  // 3. CPF formatado
  out = out.replace(/\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b/g, (m) => maskCPF(m));
  // 4. CNPJ formatado
  out = out.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}\b/g, (m) => maskCNPJ(m));
  return out;
}

// --- Execução ---

assertPreconditionsSync();

if (!inputPath) {
  // Modo stdin/stdout ou preview sem input: demonstra mascaramento com exemplos sintéticos
  console.log('\n--- DEMONSTRAÇÃO (dados sintéticos, sem PII real) ---');
  const exemplos = [
    { email: 'joao.silva@empresa.com', telefone: '(11) 91234-5678', cpf: '123.456.789-00', nome: 'João Silva' },
    { email: 'MARIA@DLUXURY.COM', telefone: '+55 47 99999-1234', cnpj: '12.345.678/0001-99', razao_social: 'MARCENARIA TESTE LTDA' },
    { nome: 'José Trabalho', email: 'jose.trabalho.bnu@gmail.com', cpf: '98765432100' },
  ];
  for (const ex of exemplos) {
    console.log('ORIGINAL (sintético):', JSON.stringify(ex));
    console.log('MASCARADO:            ', JSON.stringify(maskObject(ex)));
  }
  console.log('\n--- LINHA DE TEXTO ---');
  const linha = 'Cliente João Silva <joao@empresa.com> tel (11) 91234-5678 CPF 123.456.789-00';
  console.log('ORIGINAL:', linha);
  console.log('MASCARADO:', maskTextLine(linha));

  if (dryRun) {
    console.log('\n[DRY-RUN] Nenhum arquivo foi lido/escrito. Para mascarar um arquivo real:');
    console.log('  node scripts/audit/mascaramento-pii.mjs --input audit-dump.json --output audit-dump.masked.json --branch audit-2026-09 --host <confirmado> --confirm');
    process.exit(0);
  }
}

// Leitura de arquivo real (só chega aqui se --confirm + precondições OK)
if (confirm && inputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`[ERRO] Input não encontrado: ${inputPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  let maskedContent;
  let isJson = false;
  try {
    const parsed = JSON.parse(raw);
    isJson = true;
    const masked = maskObject(parsed);
    // Preview: mostra apenas 2 primeiros registros sem expor demais
    const preview = Array.isArray(masked) ? masked.slice(0, 2) : masked;
    console.log('[PREVIEW MASCARADO - 2 primeiros registros]:', JSON.stringify(preview, null, 2).slice(0, 4000));
    maskedContent = JSON.stringify(masked, null, 2);
  } catch {
    // Trata como texto / CSV / log
    const lines = raw.split('\n');
    console.log(`[TEXTO] ${lines.length} linhas. Preview 3 primeiras mascaradas:`);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      console.log(maskTextLine(lines[i]).slice(0, 500));
    }
    maskedContent = lines.map(maskTextLine).join('\n');
  }

  const outPath = outputPath || inputPath.replace(/(\.[^.]+)?$/, '.masked$1');
  // Garante que não sobrescreve input sem sufixo
  if (outPath === inputPath) {
    console.error('[ERRO] output não pode ser igual ao input. Use --output <arquivo.masked>');
    process.exit(1);
  }
  fs.writeFileSync(outPath, maskedContent, 'utf8');
  console.log(`[OK] Arquivo mascarado escrito em: ${outPath} (${isJson ? 'JSON' : 'texto'})`);
  // Auditoria: log de execução sem PII
  const logEntry = {
    timestamp: new Date().toISOString(),
    branch: branchFlag,
    host: hostFlag,
    input: inputPath,
    output: outPath,
    sha256_input: crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16),
    sha256_output: crypto.createHash('sha256').update(maskedContent).digest('hex').slice(0, 16),
  };
  fs.appendFileSync('scripts/audit/mascaramento-pii.log', JSON.stringify(logEntry) + '\n', 'utf8');
  console.log('[LOG] Entrada de auditoria anexada em scripts/audit/mascaramento-pii.log (sem PII)');
}
