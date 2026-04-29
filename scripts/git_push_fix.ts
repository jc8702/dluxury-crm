import { execSync } from 'child_process';

try {
  console.log("Executando git add...");
  execSync('git add .', { stdio: 'inherit' });
  console.log("Executando git commit...");
  execSync('git commit -m "Fix: Ativando dispatcher do Copilot Industrial"', { stdio: 'inherit' });
  console.log("Executando git push...");
  execSync('git push', { stdio: 'inherit' });
  console.log("✅ Deploy das correções disparado!");
} catch (e) {
  console.error("❌ Erro ao disparar deploy:", e.message);
}
