-- Migration: Atualizar default de cor_categoria para paleta D'Luxury
-- Data: 2026-09-04
-- Descrição: Padronização da paleta D'Luxury em todo o projeto.
--            O default da coluna cor_categoria em eventos_calendario
--            passa de #3B82F6 (azul antigo) para #0D66CC (azul D'Luxury).
--
-- Não destrutivo: registros existentes mantêm seus valores.
-- Apenas novos registros passarão a usar #0D66CC como default.

ALTER TABLE eventos_calendario
  ALTER COLUMN cor_categoria SET DEFAULT '#0D66CC';
