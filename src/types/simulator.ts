// Tipos genéricos de simulação persistidos via /api/simulations.
// Os payloads são JSON opacos por tipo de simulador (corte, produção, etc.).
export type SimulationInput = Record<string, unknown>;
export type SimulationResult = Record<string, unknown>;
