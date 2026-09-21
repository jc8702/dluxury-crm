# GUIA PASSO A PASSO — O Que Fazer Agora

## Para quem não programa: siga na ordem, sem pular etapas

---

## COMO ESTE GUIA FUNCIONA

Tem duas partes:

- 🙋 **Partes com este ícone**: você mesmo faz, fora do agente (baixar arquivo, decidir algo)
- 🤖 **Partes com este ícone**: você copia um texto e cola no agente (Muse Spark ou MiMo) dentro do Antigravity, e ele executa sozinho

Siga a ordem numerada. Não pule etapas.

---

## 🙋 PASSO 1 — Baixar e colocar as correções na pasta do projeto

1. Baixe o arquivo `dluxury-crm-correcoes.zip` que te enviei
2. Extraia (clique com botão direito → "Extrair tudo" no Windows)
3. Você vai ver uma pasta chamada `dluxury-crm-correcoes` com vários arquivos e pastas dentro
4. **Copie tudo que está dentro dessa pasta** e cole **por cima** da sua pasta do projeto real, que é:
   ```
   C:\Users\jc-pr\Downloads\dluxury-crm
   ```
5. Quando o Windows perguntar se quer substituir os arquivos, clique em **"Substituir os arquivos no destino"** (ou "Sim para todos")

✅ Pronto. As correções já estão na pasta do seu projeto. Agora vá para o Passo 2.

---

## 🤖 PASSO 2 — Pedir para o agente confirmar que está tudo certo

Abra o Antigravity, abra o terminal dentro da pasta do projeto, e cole este texto para o agente (Muse Spark ou MiMo):

```
Estou na pasta do projeto dluxury-crm. Várias correções de código e teste já
foram aplicadas manualmente. Preciso que você confirme que está tudo certo.

Execute, nesta ordem, e me diga o resultado de cada um:

1. npm install
2. npm run lint
3. npx vitest run

Resultado esperado:
- npm run lint: 0 erros (pode ter avisos/warnings, isso é normal e não é problema)
- npx vitest run: TODOS os testes passando, zero falhas (pode ter alguns "skipped",
  isso também é normal)

Se algo der erro diferente do esperado, PARE e me explique exatamente qual foi o
erro, sem tentar corrigir sozinho ainda — vou decidir o que fazer com essa
informação.

Se tudo estiver OK conforme o esperado, me diga apenas: "CONFIRMADO: tudo passando".
```

**O que esperar:** o agente deve responder dizendo que tudo passou. Se ele disser que tem erro, me traga a mensagem de erro exata que ele reportou, antes de continuar.

---

## 🙋 PASSO 3 — Uma decisão que só você pode tomar (não é técnica, é sobre o negócio)

Durante a auditoria, achei uma contradição na regra dos planos do seu sistema:

**A pergunta:** o plano **PRO** (o do meio, mais barato que o Enterprise) deveria ter acesso ao **Simulador CNC 3D**?

- Se a resposta é **SIM** (o Pro sempre teve/deveria ter esse recurso) → não precisa fazer nada, o sistema já está configurado assim
- Se a resposta é **NÃO** (o Simulador CNC deveria ser exclusivo do plano Enterprise, mais caro) → o sistema atual está **liberando de graça** um recurso premium para quem paga menos, e isso precisa ser corrigido

Pense nisso agora e guarde a resposta — você vai usar ela lá no Passo 5.

---

## 🙋 PASSO 4 — Deixar o sistema rodando para o agente conseguir testar de verdade

O agente precisa do sistema "ligado" para clicar em cada tela e testar. Abra um terminal no Antigravity e rode:

```
vercel dev
```

Deixe essa janela de terminal **aberta e rodando** — não feche. Abra um **segundo terminal** (ou uma segunda aba) para continuar com o próximo passo, sem fechar o primeiro.

---

## 🤖 PASSO 5 — O agente testa TODAS as telas do sistema e corrige o que encontrar

Com o `vercel dev` rodando (Passo 4), cole este texto no agente, **no segundo terminal**:

```
MISSÃO: Testar todas as telas do sistema e corrigir o que estiver quebrado,
sem me interromper no meio, seguindo as regras abaixo.

CONTEXTO:
- O sistema já está rodando via "vercel dev" em outro terminal, não precisa
  iniciar de novo.
- Existem 3 arquivos de auditoria já prontos no projeto:
  - tests/e2e/full-audit.spec.ts (testa automaticamente todas as rotas)
  - scripts/generate-audit-report.mjs (gera um relatório legível)
  - docs/AUDIT_CHECKLIST.md (checklist de coisas para testar manualmente,
    tipo "o cálculo do orçamento está certo?")

DECISÃO DE NEGÓCIO JÁ TOMADA (não pergunte sobre isso, apenas aplique):
O plano PRO [ESCOLHA UMA DAS DUAS LINHAS ABAIXO E APAGUE A OUTRA]
→ DEVE ter acesso ao Simulador CNC 3D. Reative o teste que está marcado como
  "skip" em src/api-lib/__tests__/feature-gates.test.ts (procure o comentário
  "PENDENTE DE DECISÃO DE PRODUTO") e ajuste-o para confirmar que o PRO tem
  acesso, sem alterar src/lib/features.ts.
→ NÃO deve ter acesso ao Simulador CNC 3D. Corrija src/lib/features.ts
  removendo 'simulador_cnc' e 'simulator' da lista do plano 'pro' (deixe
  apenas em 'enterprise'), e reative o teste marcado como "skip" em
  src/api-lib/__tests__/feature-gates.test.ts (procure o comentário
  "PENDENTE DE DECISÃO DE PRODUTO"), ajustando-o para confirmar o bloqueio.

EXECUTE NESTA ORDEM, SEM PARAR PARA PERGUNTAR:

PASSO A: Rode a auditoria automática de todas as rotas:
  npx playwright test tests/e2e/full-audit.spec.ts --reporter=list

PASSO B: Gere o relatório legível:
  node scripts/generate-audit-report.mjs

PASSO C: Abra docs/AUDIT_REPORT.md. Para CADA rota marcada com erro:
  1. Descubra a causa real do problema (não aplique remendo que só esconde
     o erro sem resolver a causa)
  2. Corrija o código
  3. Rode de novo só aquela rota para confirmar que sarou
  4. Anote o que você fez em um novo arquivo: docs/AUDIT_EXECUTION_LOG.md
     (use este formato para cada correção):

     ### [Nome da tela] — [o que estava errado]
     O que eu vi de errado:
     Por que estava acontecendo:
     O que eu mudei:
     Testei de novo? Funcionou?

PASSO D: Depois de corrigir tudo que achou na auditoria automática, abra
docs/AUDIT_CHECKLIST.md e teste, um por um, os itens de lá (são coisas como
"criar um cliente funciona?", "o cálculo do orçamento bate certo?"). Marque
cada item como funcionando ou com problema. Se achar problema, corrija do
mesmo jeito do Passo C.

PASSO E: Rode a auditoria automática MAIS UMA VEZ do início, para garantir
que nenhuma correção sua quebrou outra coisa:
  npx playwright test tests/e2e/full-audit.spec.ts --reporter=list

PASSO F: No topo do docs/AUDIT_EXECUTION_LOG.md, escreva um resumo simples,
em português claro, sem termos técnicos difíceis, respondendo:
- Quantas telas foram testadas
- Quantos problemas foram achados
- Quantos foram corrigidos
- Se sobrou algum problema sem corrigir, por quê
- O sistema está pronto para uso ou ainda tem pendência importante?

REGRAS IMPORTANTES (siga sem exceção):

- NUNCA mexa no arquivo .env, .env.local, ou em qualquer arquivo que tenha
  senhas ou chaves de acesso.
- NUNCA rode comandos de "git push --force" ou qualquer coisa que reescreva
  o histórico do projeto no GitHub.
- NUNCA mude o arquivo docs/SECURITY_INCIDENT.md.
- Se encontrar um problema tão grande que precisaria reescrever um módulo
  inteiro do sistema, NÃO faça a reescrita sozinho. Aplique só uma correção
  pequena e seguraque resolve o sintoma, e anote no log: "este problema é
  maior, recomendo conversar sobre uma correção mais completa depois".
- Depois de cada correção, salve (git commit) com uma mensagem curta
  explicando o que mudou. NÃO envie (git push) para o GitHub — deixe isso
  salvo só no seu computador, eu decido quando enviar.
- Se uma tela quebrar simplesmente porque não existe nenhum dado de teste
  cadastrado ainda (por exemplo, nenhum cliente no sistema), isso não é bug
  do código — crie um dado de teste mínimo para conseguir testar a tela, e
  anote que fez isso.

Comece agora pelo PASSO A, sem esperar minha confirmação entre os passos.
```

---

## 🙋 PASSO 6 — Ler o resultado final

Quando o agente terminar (pode demorar — são 37 telas para testar, então tenha paciência, pode levar de 1 a 3 horas dependendo da complexidade), peça para ele te mostrar o arquivo `docs/AUDIT_EXECUTION_LOG.md`.

Leia o resumo no topo do arquivo. Ele vai te dizer, em português simples:

- Quantas coisas estavam quebradas
- Quantas foram consertadas
- Se sobrou algo importante sem resolver

**Depois disso, traga esse arquivo (ou cole o conteúdo) de volta para mim**, e eu analiso o que ele fez, confirmo se as correções fazem sentido, e te digo quais são os próximos passos — incluindo se já está seguro enviar (`git push`) as correções para o GitHub.

---

## RESUMO VISUAL DA ORDEM

```
🙋 1. Copiar arquivos do zip para a pasta do projeto
       ↓
🤖 2. Pedir ao agente para confirmar que tudo compila e os testes passam
       ↓
🙋 3. Decidir: o plano PRO tem ou não acesso ao Simulador CNC?
       ↓
🙋 4. Deixar o "vercel dev" rodando em um terminal
       ↓
🤖 5. Colar o prompt grande pedindo para testar e corrigir todas as telas
       ↓
🙋 6. Ler o relatório final e trazer para mim
```

---

## SE ALGO DER ERRADO NO MEIO DO CAMINHO

- Se o agente travar ou parar no meio: cole a última mensagem que ele mostrou aqui para mim, que eu te ajudo a destravar.
- Se você não entender algo que o agente disse: cole aqui para mim, eu traduzo em português simples.
- Não se preocupe em "estragar" alguma coisa — nada disso mexe em dados reais de clientes, e o agente foi instruído a não enviar nada para o GitHub sem sua permissão.
