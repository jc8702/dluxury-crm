# Registro de Decisão Arquitetural: Gap nas Migrations (0007–0013)

## Contexto

Foi identificado que o repositório apresenta um salto (gap) na numeração das migrations do banco de dados. Os arquivos de migration da sequência `0007` a `0013` estão ausentes.

## Causa

Este gap é resultado do histórico de desenvolvimento do projeto (como reestruturações, rollbacks manuais, consolidação de tabelas ou exclusão de features abortadas antes do merge), onde os arquivos dessas migrations foram descartados do controle de versão.

## Decisão

**As migrations NÃO serão renomeadas.**

A numeração continuará com o gap atual (passando de `0006` para `0014`, por exemplo).
Renomear os arquivos subsequentes para preencher o buraco corromperia a tabela de histórico (`drizzle_migrations`) nos bancos de dados já existentes (desenvolvimento, staging, produção), fazendo com que o Drizzle ORM interpretasse os arquivos renomeados como novas migrations e tentasse aplicá-las novamente, causando erros fatais de DDL.

O gap é intencional, permanente e não afeta a integridade do banco ou a execução do Drizzle, pois a execução é baseada na tabela de controle de migrations.
