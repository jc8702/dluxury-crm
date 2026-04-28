import { execSync } from 'child_process';

try {
  console.log("Executando git add...");
  execSync('git add .', { stdio: 'inherit' });
  console.log("Executando git commit...");
  execSync('git commit -m "Refatoração Engenharia Industrial"', { stdio: 'inherit' });
  console.log("Executando git push...");
  execSync('git push', { stdio: 'inherit' });
  console.log("✅ Deploy disparado via GitHub Actions!");
} catch (e) {
  console.error("❌ Erro ao disparar deploy:", e.message);
}
