import type {
  LayoutSimulacao,
  CncConfig,
  CollisionPolicy,
  SimulationProgram,
  SimulationIssue,
  IssueWithRecommendation,
  AdjustmentRecommendation,
  AdjustmentResult,
  SetupDiff,
  FixtureSettings,
} from './types';

export const DEFAULT_CNC_CONFIG: CncConfig = {
  machine: {
    safeZ: 25,
    feedCorte: 4500,
    feedMergulho: 1200,
    feedRapido: 18000,
    rpmSpindle: 18000,
    diametroFerramenta: 6.0,
    comprimentoUtil: 32.0,
    stickout: 45.0,
    alturaMaximaZ: 200,
    limiteX: [0, 3000],
    limiteY: [0, 2000],
    stepdown: 9.5,
    leadInDist: 12,
    leadOutDist: 8,
    clampingMargin: 5,
    collisionPolicy: 'stop',
  },
  fixture: {
    clamps: [],
  },
};

export function gerarClampsPadrao(
  larguraChapa: number,
  alturaChapa: number,
  margin?: number
): { id: string; x: number; y: number; largura: number; altura: number }[] {
  const m = margin ?? 20;
  const clampW = 45;
  const clampD = 80;
  return [
    { id: 'clamp_1', x: m, y: m, largura: clampW, altura: clampD },
    { id: 'clamp_2', x: larguraChapa - m - clampW, y: m, largura: clampW, altura: clampD },
    { id: 'clamp_3', x: m, y: alturaChapa - m - clampD, largura: clampW, altura: clampD },
    { id: 'clamp_4', x: larguraChapa - m - clampW, y: alturaChapa - m - clampD, largura: clampW, altura: clampD },
  ];
}

export function gerarFixtureSettings(larguraChapa: number, alturaChapa: number, margin?: number): FixtureSettings {
  return { clamps: gerarClampsPadrao(larguraChapa, alturaChapa, margin) };
}

/**
 * Analisa issues geradas pelo motor de simulação e produz recomendações
 * de ajuste com base no tipo de problema, na configuração atual e nos limites da máquina.
 */
export function analyzeIssues(
  program: SimulationProgram,
  config: CncConfig,
  layout: LayoutSimulacao
): IssueWithRecommendation[] {
  return program.issues.map((issue) => {
    const recommendations = gerarRecomendacoes(issue, config, layout);
    const best = recommendations.length > 0 ? recommendations[0] : null;
    return { issue, recommendations, bestRecommendation: best };
  });
}

/**
 * Gera recomendações de ajuste ordenadas por prioridade (melhor primeiro)
 */
function gerarRecomendacoes(
  issue: SimulationIssue,
  config: CncConfig,
  layout: LayoutSimulacao
): AdjustmentRecommendation[] {
  const recs: AdjustmentRecommendation[] = [];

  switch (issue.codigo) {
    case 'INSECURE_RAPID': {
      recs.push(...recomendarSafeZ(issue, config, layout));
      break;
    }
    case 'OVERTRAVEL': {
      recs.push(...recomendarOvertravel(issue, config, layout));
      break;
    }
    case 'COLLISION_FIXTURE': {
      recs.push(...recomendarColisaoFixture(issue, config, layout));
      break;
    }
    case 'OUT_OF_STOCK': {
      recs.push({
        type: 'RECALCULATE_NESTING',
        action: 'impossible',
        paramName: 'dimensoes_chapa',
        oldValue: `${layout.chapa.largura}x${layout.chapa.altura}`,
        newValue: 'N/A',
        reason: 'Peça excede dimensões físicas da chapa',
        explanation: 'A peça não cabe na chapa atual. É necessário recalcular o nesting com uma chapa maior ou reposicionar manualmente.',
        tradeoff: 'Usar chapa maior pode reduzir o aproveitamento geral.',
      });
      break;
    }
  }
  return recs;
}

function recomendarSafeZ(
  issue: SimulationIssue,
  config: CncConfig,
  _layout: LayoutSimulacao
): AdjustmentRecommendation[] {
  const recs: AdjustmentRecommendation[] = [];
  const currentSafeZ = config.machine.safeZ;
  const maxZ = config.machine.alturaMaximaZ;
  const minSafe = 15; // mínimo seguro para evitar colisão com clamps

  // Tentar elevar safeZ
  if (currentSafeZ < maxZ) {
    const novoZ = Math.min(Math.max(currentSafeZ + 10, minSafe), maxZ);
    if (novoZ > currentSafeZ) {
      recs.push({
        type: 'ADJUST_SAFE_Z',
        action: currentSafeZ < 10 ? 'auto' : 'suggested',
        paramName: 'safeZ',
        oldValue: currentSafeZ,
        newValue: novoZ,
        reason: `SafeZ atual (${currentSafeZ}mm) está abaixo do recomendado para evitar colisão em deslocamentos rápidos`,
        explanation: `Elevar safeZ de ${currentSafeZ}mm para ${novoZ}mm garante que deslocamentos G00 fiquem acima de clamps e irregularidades.`,
        tradeoff: `Aumento de ~${((novoZ - currentSafeZ) / 1000 * 2).toFixed(1)}s no tempo total de ciclo.`,
      });
    }
  }

  // Se não for possível elevar, sugerir intervenção manual
  if (recs.length === 0) {
    recs.push({
      type: 'MANUAL_INTERVENTION_REQUIRED',
      action: 'impossible',
      paramName: 'safeZ',
      oldValue: currentSafeZ,
      newValue: 'N/A',
      reason: 'SafeZ já está no limite máximo da máquina',
      explanation: `A altura de segurança já está em ${currentSafeZ}mm (máx: ${maxZ}mm). Não é possível elevar mais via software.`,
    });
  }

  return recs;
}

function recomendarOvertravel(
  issue: SimulationIssue,
  config: CncConfig,
  _layout: LayoutSimulacao
): AdjustmentRecommendation[] {
  void _layout; // used for context
  const recs: AdjustmentRecommendation[] = [];
  const pos = issue.posicao;
  const limX = config.machine.limiteX;
  const limY = config.machine.limiteY;
  const limZ = config.machine.alturaMaximaZ;

  const violacaoX = pos.x < limX[0] || pos.x > limX[1];
  const violacaoY = pos.y < limY[0] || pos.y > limY[1];
  const violacaoZ = pos.z < -20 || pos.z > limZ;

  if (violacaoZ && pos.z > limZ) {
    recs.push({
      type: 'ADJUST_SAFE_Z',
      action: 'suggested',
      paramName: 'safeZ',
      oldValue: config.machine.safeZ,
      newValue: Math.min(config.machine.safeZ, limZ - 5),
      reason: 'Movimento tenta ultrapassar Z máximo da máquina',
      explanation: `A coordenada Z=${pos.z.toFixed(1)}mm excede o limite da máquina (${limZ}mm). Reduza a altura de segurança ou ajuste a origem da peça.`,
      tradeoff: 'Reduzir safeZ pode aumentar risco em deslocamentos rápidos.',
    });
  }

  if (violacaoX || violacaoY) {
    recs.push({
      type: 'REPOSITION_PART',
      action: 'impossible',
      paramName: 'origem_peca',
      oldValue: `X:${pos.x.toFixed(0)} Y:${pos.y.toFixed(0)}`,
      newValue: `X:${Math.max(limX[0] + 50, Math.min(pos.x, limX[1] - 50)).toFixed(0)} Y:${Math.max(limY[0] + 50, Math.min(pos.y, limY[1] - 50)).toFixed(0)}`,
      reason: 'Peça fora da área útil da máquina',
      explanation: `A coordenada (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}) excede os limites X:[${limX[0]},${limX[1]}] ou Y:[${limY[0]},${limY[1]}]. Recalcule o nesting com área reduzida ou reposicione a peça.`,
      tradeoff: 'Reposicionar pode exigir reprocessamento do nesting.',
    });
  }

  return recs;
}

function recomendarColisaoFixture(
  issue: SimulationIssue,
  config: CncConfig,
  layout: LayoutSimulacao
): AdjustmentRecommendation[] {
  const recs: AdjustmentRecommendation[] = [];
  const marginAtual = config.machine.clampingMargin;

  // 1. Aumentar margem de segurança dos clamps
  if (marginAtual < 20) {
    const novaMargem = Math.min(marginAtual + 5, 25);
    recs.push({
      type: 'ADJUST_CLAMP_MARGIN',
      action: 'auto',
      paramName: 'clampingMargin',
      oldValue: marginAtual,
      newValue: novaMargem,
      reason: `Margem de segurança dos clamps (${marginAtual}mm) insuficiente`,
      explanation: `Aumentar margem de ${marginAtual}mm para ${novaMargem}mm reduz o risco de colisão com os clamps durante o corte.`,
      tradeoff: `Pode reduzir área útil em ~${(novaMargem - marginAtual) * 2}mm nas bordas.`,
    });
  }

  // 2. Ajustar lead-in para região segura
  const leadInAtual = config.machine.leadInDist;
  if (leadInAtual > 5) {
    recs.push({
      type: 'ADJUST_LEAD_IN',
      action: 'suggested',
      paramName: 'leadInDist',
      oldValue: leadInAtual,
      newValue: Math.max(leadInAtual - 3, 3),
      reason: 'Lead-in atual muito longo, aumentando risco de colisão com fixação',
      explanation: `Reduzir lead-in de ${leadInAtual}mm para ${Math.max(leadInAtual - 3, 3)}mm afasta a entrada da ferramenta da zona de fixação.`,
      tradeoff: 'Lead-in mais curto pode deixar rebarba no ponto de entrada.',
    });
  }

  // 3. Sugerir reposicionamento do clamp com coordenada alternativa calculada
  if (issue.fixtureId) {
    const clampAtual = config.fixture.clamps.find(c => c.id === issue.fixtureId);
    if (clampAtual) {
      // Encontra uma posição alternativa no canto oposto da chapa
      const cx = clampAtual.x < layout.chapa.largura / 2
        ? layout.chapa.largura - clampAtual.x - clampAtual.largura
        : clampAtual.x;
      const cy = clampAtual.y < layout.chapa.altura / 2
        ? layout.chapa.altura - clampAtual.y - clampAtual.altura
        : clampAtual.y;
      recs.push({
        type: 'REPOSITION_CLAMP',
        action: 'suggested',
        paramName: `clamp_${issue.fixtureId}`,
        oldValue: `X:${clampAtual.x} Y:${clampAtual.y}`,
        newValue: `X:${cx.toFixed(0)} Y:${cy.toFixed(0)}`,
        reason: `Clamp [${issue.fixtureId}] está no caminho da ferramenta`,
        explanation: `Mover o clamp ${issue.fixtureId} de (${clampAtual.x},${clampAtual.y}) para (${cx.toFixed(0)},${cy.toFixed(0)}) pode liberar a área de corte.`,
        tradeoff: 'Mover clamps pode reduzir a fixação em bordas críticas.',
      });
    } else {
      recs.push({
        type: 'REPOSITION_CLAMP',
        action: 'impossible',
        paramName: 'clamp_reposicao',
        oldValue: 'Posição atual do clamp',
        newValue: 'Posição alternativa',
        reason: `Clamp [${issue.fixtureId}] está no caminho da ferramenta`,
        explanation: `O clamp ${issue.fixtureId} está posicionado onde a ferramenta precisa passar. Mova-o manualmente para um local fora do perímetro de corte das peças.`,
        tradeoff: 'Mover clamps pode reduzir a fixação em bordas críticas.',
      });
    }
  }

  // 4. Sugerir rotação de peça (se houver peças próximas ao clamp)
  const pecasProximas = layout.pecas.filter(p => {
    if (!issue.fixtureId) return false;
    const clamp = config.fixture.clamps.find(c => c.id === issue.fixtureId);
    if (!clamp) return false;
    const distX = Math.abs(p.x - clamp.x);
    const distY = Math.abs(p.y - clamp.y);
    return distX < 200 && distY < 200;
  });

  if (pecasProximas.length > 0 && !pecasProximas.every(p => p.rotacionada)) {
    recs.push({
      type: 'ROTATE_PART',
      action: 'suggested',
      paramName: 'rotacao_pecas',
      oldValue: `${pecasProximas.filter(p => !p.rotacionada).length} peça(s) não rotacionada(s)`,
      newValue: 'Rotacionar 90°',
      reason: 'Rotacionar peças pode evitar a zona de colisão com clamp',
      explanation: `${pecasProximas.filter(p => !p.rotacionada).length} peça(s) próxima(s) ao clamp podem ser rotacionadas para afastar o perímetro de corte.`,
      tradeoff: 'Rotacionar pode alterar o aproveitamento da chapa.',
    });
  }

  // 5. Sugerir mover lead-out para região oposta
  if (config.machine.leadOutDist > 5) {
    recs.push({
      type: 'ADJUST_LEAD_OUT',
      action: 'suggested',
      paramName: 'leadOutDist',
      oldValue: config.machine.leadOutDist,
      newValue: Math.max(config.machine.leadOutDist - 3, 2),
      reason: 'Lead-out longo aumenta exposição a clamps',
      explanation: `Reduzir lead-out de ${config.machine.leadOutDist}mm para ${Math.max(config.machine.leadOutDist - 3, 2)}mm diminui a zona de risco durante a saída da ferramenta.`,
      tradeoff: 'Lead-out mais curto pode deixar marcas de saída na peça.',
    });
  }

  // Fallback: sem recomendação automática
  if (recs.length === 0) {
    recs.push({
      type: 'MANUAL_INTERVENTION_REQUIRED',
      action: 'impossible',
      paramName: 'setup_mesa',
      oldValue: 'Configuração atual',
      newValue: 'Reavaliar setup',
      reason: 'Colisão com fixação não resolvível automaticamente',
      explanation: 'Nenhuma correção automática disponível. Reavalie a posição dos clamps, a orientação das peças ou a sequência de corte manualmente.',
    });
  }

  return recs;
}

/**
 * Determina a ação a ser tomada com base na política de colisão e na recomendação.
 */
export function determinarAcao(
  recomendacao: AdjustmentRecommendation,
  policy: CollisionPolicy
): 'apply' | 'suggest' | 'block' {
  if (recomendacao.action === 'impossible') return 'block';

  switch (policy) {
    case 'auto':
      if (recomendacao.action === 'auto') return 'apply';
      return 'suggest';
    case 'suggest':
      return 'suggest';
    case 'stop':
    default:
      return 'block';
  }
}

/**
 * Aplica um ajuste seguro na configuração, respeitando limites físicos da máquina.
 * Retorna a configuração modificada e um diff das alterações.
 */
export function applySafeAdjustment(
  config: CncConfig,
  rec: AdjustmentRecommendation,
  layout: LayoutSimulacao
): { config: CncConfig; diffs: SetupDiff[] } {
  const newConfig = JSON.parse(JSON.stringify(config)) as CncConfig;
  const diffs: SetupDiff[] = [];
  const machine = newConfig.machine;

  switch (rec.type) {
    case 'ADJUST_SAFE_Z': {
      const novo = clampNumber(Number(rec.newValue), 5, machine.alturaMaximaZ);
      if (novo !== machine.safeZ) {
        diffs.push({ paramName: 'Altura de Segurança (safeZ)', before: machine.safeZ, after: novo, unit: 'mm' });
        machine.safeZ = novo;
      }
      break;
    }
    case 'ADJUST_LEAD_IN': {
      const novoLead = clampNumber(Number(rec.newValue), 1, 30);
      if (novoLead !== machine.leadInDist) {
        diffs.push({ paramName: 'Lead-In', before: machine.leadInDist, after: novoLead, unit: 'mm' });
        machine.leadInDist = novoLead;
      }
      break;
    }
    case 'ADJUST_CLAMP_MARGIN': {
      const novaMargem = clampNumber(Number(rec.newValue), 0, 50);
      if (novaMargem !== machine.clampingMargin) {
        diffs.push({ paramName: 'Margem de Clamps', before: machine.clampingMargin, after: novaMargem, unit: 'mm' });
        machine.clampingMargin = novaMargem;
        newConfig.fixture = gerarFixtureSettings(
          layout.chapa.largura,
          layout.chapa.altura,
          novaMargem + 15
        );
      }
      break;
    }
    case 'REPOSITION_CLAMP': {
      const clampIdMatch = rec.paramName.match(/^clamp_(.+)$/);
      if (clampIdMatch) {
        const fixtureId = clampIdMatch[1];
        const newPosMatch = String(rec.newValue).match(/X:([\d.]+)\s+Y:([\d.]+)/);
        if (newPosMatch) {
          const nx = parseFloat(newPosMatch[1]);
          const ny = parseFloat(newPosMatch[2]);
          const clampIdx = newConfig.fixture.clamps.findIndex(c => c.id === fixtureId);
          if (clampIdx !== -1) {
            diffs.push({
              paramName: `Clamp ${fixtureId}`,
              before: String(rec.oldValue),
              after: String(rec.newValue),
              unit: 'mm',
            });
            newConfig.fixture.clamps[clampIdx] = {
              ...newConfig.fixture.clamps[clampIdx],
              x: clampNumber(nx, 0, machine.limiteX[1]),
              y: clampNumber(ny, 0, machine.limiteY[1]),
            };
          }
        }
      }
      break;
    }
    case 'ADJUST_LEAD_OUT': {
      const novoOut = clampNumber(Number(rec.newValue), 1, 20);
      if (novoOut !== machine.leadOutDist) {
        diffs.push({ paramName: 'Lead-Out', before: machine.leadOutDist, after: novoOut, unit: 'mm' });
        machine.leadOutDist = novoOut;
      }
      break;
    }
    case 'ADJUST_STICKOUT': {
      const novoStick = clampNumber(Number(rec.newValue), 10, 80);
      if (novoStick !== machine.stickout) {
        diffs.push({ paramName: 'Stickout', before: machine.stickout, after: novoStick, unit: 'mm' });
        machine.stickout = novoStick;
      }
      break;
    }
    case 'ADJUST_FEED_RATE': {
      const novoFeed = clampNumber(Number(rec.newValue), 500, 24000);
      if (novoFeed !== machine.feedCorte) {
        diffs.push({ paramName: 'Feed de Corte', before: machine.feedCorte, after: novoFeed, unit: 'mm/min' });
        machine.feedCorte = novoFeed;
      }
      break;
    }
    case 'ADJUST_PLUNGE_RATE': {
      const novoPlunge = clampNumber(Number(rec.newValue), 200, 5000);
      if (novoPlunge !== machine.feedMergulho) {
        diffs.push({ paramName: 'Feed de Mergulho', before: machine.feedMergulho, after: novoPlunge, unit: 'mm/min' });
        machine.feedMergulho = novoPlunge;
      }
      break;
    }
  }

  return { config: newConfig, diffs };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Reaplica as recomendações de acordo com a política e retorna resultado consolidado.
 */
export function recomputeWithAdjustments(
  program: SimulationProgram,
  config: CncConfig,
  layout: LayoutSimulacao
): AdjustmentResult {
  const issuesWithRecs = analyzeIssues(program, config, layout);
  const appliedConfig = JSON.parse(JSON.stringify(config)) as CncConfig;
  const allDiffs: SetupDiff[] = [];
  let hasUnresolvable = false;

  for (const iwr of issuesWithRecs) {
    if (!iwr.bestRecommendation) continue;

    const action = determinarAcao(iwr.bestRecommendation, config.machine.collisionPolicy);

    if (action === 'block') {
      hasUnresolvable = true;
      continue;
    }

    if (action === 'apply') {
      const result = applySafeAdjustment(appliedConfig, iwr.bestRecommendation, layout);
      allDiffs.push(...result.diffs);
      Object.assign(appliedConfig, result.config);
    }
  }

  return {
    applied: allDiffs.length > 0,
    config: appliedConfig,
    diffs: allDiffs,
    recommendations: issuesWithRecs,
    hasUnresolvableIssues: hasUnresolvable,
  };
}
