$ErrorActionPreference = "Continue"

Write-Output "--- BUILD ---" > audit_results.txt
npm run build 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8

Write-Output "--- LINT ---" | Out-File -Append -FilePath audit_results.txt -Encoding utf8
npm run lint 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8

Write-Output "--- TSC ---" | Out-File -Append -FilePath audit_results.txt -Encoding utf8
npx tsc --noEmit 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8

Write-Output "--- TEST ---" | Out-File -Append -FilePath audit_results.txt -Encoding utf8
npm test -- --run 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8

Write-Output "--- COVERAGE ---" | Out-File -Append -FilePath audit_results.txt -Encoding utf8
npm test -- --run --coverage 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8

Write-Output "--- PLAYWRIGHT ---" | Out-File -Append -FilePath audit_results.txt -Encoding utf8
npx playwright test 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8

Write-Output "--- DRIZZLE ---" | Out-File -Append -FilePath audit_results.txt -Encoding utf8
npx drizzle-kit introspect 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8

Write-Output "--- AUDIT ---" | Out-File -Append -FilePath audit_results.txt -Encoding utf8
npm audit 2>&1 | Out-File -Append -FilePath audit_results.txt -Encoding utf8
