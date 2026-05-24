import type { CncConfig } from '../domain/types';
import { DEFAULT_CNC_CONFIG } from '../domain/adjustmentEngine';

const STORAGE_KEY = 'dluxury_cnc_config';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function salvarConfigCNC(config: CncConfig): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage pode estar indisponível (privacidade, etc)
  }
}

export function carregarConfigCNC(): CncConfig {
  if (!isBrowser()) return JSON.parse(JSON.stringify(DEFAULT_CNC_CONFIG));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CNC_CONFIG));
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CNC_CONFIG));
  }
}

export function limparConfigCNC(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorado
  }
}

function mergeWithDefaults(parsed: Partial<CncConfig>): CncConfig {
  const defaults = JSON.parse(JSON.stringify(DEFAULT_CNC_CONFIG)) as CncConfig;
  if (!parsed.machine) return defaults;
  return {
    machine: { ...defaults.machine, ...parsed.machine },
    fixture: {
      clamps: parsed.fixture?.clamps ?? defaults.fixture.clamps,
    },
  };
}
