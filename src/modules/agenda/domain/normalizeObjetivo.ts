// Normalizador centralizado para objetivo de eventos
export const VALORES_OBJETIVO_VALIDOS = ['medicao', 'apresentacao', 'instalacao', 'pos_venda', 'outro'] as const;

export type ObjetivoValue = typeof VALORES_OBJETIVO_VALIDOS[number];

export function normalizeObjetivo(value: string | null | undefined): ObjetivoValue {
  if (!value) return 'outro';
  
  const normalized = String(value).trim().toLowerCase();
  
  if (VALORES_OBJETIVO_VALIDOS.includes(normalized as any)) {
    return normalized as ObjetivoValue;
  }
  
  // Se não for válido, retorna default
  console.warn(`[NORMALIZE] objetivo inválido "${value}" -> usando "outro"`);
  return 'outro';
}

export function isObjetivoValido(value: string | null | undefined): boolean {
  if (!value) return false;
  return VALORES_OBJETIVO_VALIDOS.includes(String(value).trim().toLowerCase() as any);
}