import type {
  LayoutSimulacao,
  MachineDefinition,
  ToolDefinition,
  FixtureDefinition,
  SimulationProgram,
  SimulationCommand,
  ToolpathSegment,
  SimulationIssue,
  SimulationMetrics,
} from './types';

// CONSTANTES E CONFIGURAÇÕES PADRÃO (Router CNC Industrial de 3 eixos)
export const MACHINE_DEFAULT: MachineDefinition = {
  larguraMaximaXY: [3000, 2000], // 3m x 2m de área física de mesa
  alturaMaximaZ: 200,            // 200mm de curso no eixo Z
  velocidadeMaximaXY: 18000,     // 18.000 mm/min (300 mm/s) avanço em rápido
  velocidadeMaximaZ: 5000,       // 5.000 mm/min avanço rápido vertical
  aceleracaoXY: 1500,            // mm/s²
  aceleracaoZ: 800,              // mm/s²
  zonaSeguraZ: 25,               // 25mm acima do MDF
  tipoMesa: 'vacuo',
};

export const TOOL_DEFAULT: ToolDefinition = {
  id: 'tool_fresa_6mm',
  nome: 'Fresa Metal Duro 6mm (2 cortes Helicoidal)',
  diametro: 6.0,
  comprimentoUtil: 32.0,
  stickout: 45.0,
  rpmMax: 24000,
  rpmRecomendado: 18000,
  feedCorteRecomendado: 4500,     // 4.500 mm/min
  feedMergulhoRecomendado: 1200,   // 1.200 mm/min
};

/**
 * Retorna os clamps (garras) de fixação física padrão colocados nas bordas da chapa.
 */
export function obterFixturesPadrao(larguraChapa: number, alturaChapa: number): FixtureDefinition[] {
  // Clamps posicionados próximos aos 4 cantos para segurar a chapa MDF
  const clampW = 45;
  const clampD = 80;
  const clampH = 22; // Espessura física acima do MDF

  return [
    { id: 'clamp_1', tipo: 'clamp', x: 20, y: 20, largura: clampW, altura: clampD, espessura: clampH },
    { id: 'clamp_2', tipo: 'clamp', x: larguraChapa - 20 - clampW, y: 20, largura: clampW, altura: clampD, espessura: clampH },
    { id: 'clamp_3', tipo: 'clamp', x: 20, y: alturaChapa - 20 - clampD, largura: clampW, altura: clampD, espessura: clampH },
    { id: 'clamp_4', tipo: 'clamp', x: larguraChapa - 20 - clampW, y: alturaChapa - 20 - clampD, largura: clampW, altura: clampD, espessura: clampH },
  ];
}

/**
 * Traduz o layout de corte em um programa de simulação neutro e realiza a análise física de colisões e métricas.
 */
export function gerarSimulationProgram(
  layout: LayoutSimulacao,
  machine: MachineDefinition = MACHINE_DEFAULT,
  tool: ToolDefinition = TOOL_DEFAULT,
  fixtures: FixtureDefinition[] = obterFixturesPadrao(layout.chapa.largura, layout.chapa.altura)
): SimulationProgram {
  const commands: SimulationCommand[] = [];
  const issues: SimulationIssue[] = [];

  const safeZ = machine.zonaSeguraZ;
  const feedCorte = tool.feedCorteRecomendado;
  const feedMergulho = tool.feedMergulhoRecomendado;
  const feedRapido = machine.velocidadeMaximaXY;
  const feedRapidoZ = machine.velocidadeMaximaZ;

  let cmdIdCounter = 0;
  function novoCmdId() { return `cmd_${++cmdIdCounter}`; }

  // 1. LIGAR SPINDLE E IR PARA ALTURA DE SEGURANÇA
  commands.push({
    id: novoCmdId(),
    tipo: 'SPINDLE_ON',
    params: { rpm: tool.rpmRecomendado },
    segments: [],
    tempoEstimado: 1.5, // tempo para spindle atingir a rotação
  });

  commands.push({
    id: novoCmdId(),
    tipo: 'SAFE_MOVE',
    params: {},
    segments: [{
      id: `seg_${novoCmdId()}_0`,
      from: { x: 0, y: 0, z: 50 },
      to: { x: 0, y: 0, z: safeZ },
      tipo: 'safe_move',
      velocidade: feedRapidoZ,
      toolId: tool.id,
    }],
    tempoEstimado: Math.abs(50 - safeZ) / (feedRapidoZ / 60),
  });

  // Ordenação de corte otimizada (greedy por distância mais curta)
  let pecasParaCortar = [...layout.pecas];
  let currentPos = { x: 0, y: 0, z: safeZ };

  while (pecasParaCortar.length > 0) {
    // Acha a peça mais próxima
    let idxProxima = 0;
    let minDist = Infinity;
    for (let i = 0; i < pecasParaCortar.length; i++) {
      const p = pecasParaCortar[i];
      const dist = Math.hypot(p.x - currentPos.x, p.y - currentPos.y);
      if (dist < minDist) {
        minDist = dist;
        idxProxima = i;
      }
    }

    const peca = pecasParaCortar[idxProxima];
    pecasParaCortar.splice(idxProxima, 1);

    const px = peca.x;
    const py = peca.y;
    const pc = peca.comprimento;
    const pl = peca.largura;

    // Ponto de entrada (Lead-In) no canto inferior esquerdo, ligeiramente recuado para evitar marcas directas no canto
    const leadInDist = 12; // mm fora da peça
    const startX = px - leadInDist;
    const startY = py;

    // A. DESLOCAMENTO RÁPIDO XY ATÉ PONTO DE ENTRADA (Z = safeZ)
    const travelCmd: SimulationCommand = {
      id: novoCmdId(),
      tipo: 'MOVE_RAPID',
      params: { x: startX, y: startY, z: safeZ },
      segments: [{
        id: `seg_${novoCmdId()}_t`,
        from: { ...currentPos },
        to: { x: startX, y: startY, z: safeZ },
        tipo: 'rapid',
        velocidade: feedRapido,
        toolId: tool.id,
      }],
      tempoEstimado: Math.hypot(startX - currentPos.x, startY - currentPos.y) / (feedRapido / 60),
    };
    commands.push(travelCmd);
    currentPos = { x: startX, y: startY, z: safeZ };

    // B. CORTAR PEÇA EM MULTIPLAS PASSADAS (Stepdown)
    const profundidadeTotal = -layout.chapa.espessura - 0.5; // passante: 0.5mm além da chapa
    const profundidadePasso = 9.5; // stepdown
    const numPassadas = Math.ceil(Math.abs(profundidadeTotal) / profundidadePasso);

    for (let p = 1; p <= numPassadas; p++) {
      let zCorte = -(p * profundidadePasso);
      if (Math.abs(zCorte) > Math.abs(profundidadeTotal)) {
        zCorte = profundidadeTotal;
      }

      // Mergulho vertical controlado até a profundidade da passada
      const plungeCmd: SimulationCommand = {
        id: novoCmdId(),
        tipo: 'PLUNGE',
        params: { x: startX, y: startY, z: zCorte },
        segments: [{
          id: `seg_${novoCmdId()}_p`,
          from: { ...currentPos },
          to: { x: startX, y: startY, z: zCorte },
          tipo: 'plunge',
          velocidade: feedMergulho,
          toolId: tool.id,
        }],
        tempoEstimado: Math.abs(zCorte - currentPos.z) / (feedMergulho / 60),
      };
      commands.push(plungeCmd);
      currentPos = { x: startX, y: startY, z: zCorte };

      // Movimento de Lead-In (penetração lateral)
      const leadInCmd: SimulationCommand = {
        id: novoCmdId(),
        tipo: 'LEAD_IN',
        params: { x: px, y: py },
        segments: [{
          id: `seg_${novoCmdId()}_li`,
          from: { ...currentPos },
          to: { x: px, y: py, z: zCorte },
          tipo: 'lead_in',
          velocidade: feedCorte,
          toolId: tool.id,
        }],
        tempoEstimado: Math.hypot(px - currentPos.x, py - currentPos.y) / (feedCorte / 60),
      };
      commands.push(leadInCmd);
      currentPos = { x: px, y: py, z: zCorte };

      // DEFINIÇÃO DAS ARESTAS DE CORTE
      // Para simular TABS (abas de fixação/pontes), deixaremos 15mm sem cortar (ou com profundidade reduzida Z=-5)
      // nas arestas horizontais superiores e inferiores.
      // Ordem: Inferior -> Direita -> Superior -> Esquerda
      const caminhosArestas = [
        { from: { x: px, y: py }, to: { x: px + pc, y: py }, nome: 'Inferior', tabX: px + pc / 2 },
        { from: { x: px + pc, y: py }, to: { x: px + pc, y: py + pl }, nome: 'Direita', tabX: -1 },
        { from: { x: px + pc, y: py + pl }, to: { x: px, y: py + pl }, nome: 'Superior', tabX: px + pc / 2 },
        { from: { x: px, y: py + pl }, to: { x: px, y: py }, nome: 'Esquerda', tabX: -1 },
      ];

      for (const aresta of caminhosArestas) {
        const segs: ToolpathSegment[] = [];
        const isHorizontal = aresta.from.y === aresta.to.y;
        
        // Verifica se devemos adicionar um TAB (apenas na última passada para fixação e se a peça for média/grande > 250mm)
        const temTab = p === numPassadas && aresta.tabX > 0 && pc > 250;

        if (temTab && isHorizontal) {
          const tabXStart = aresta.tabX - 10; // aba de 20mm de largura
          const tabXEnd = aresta.tabX + 10;
          const tabZ = -4.0; // deixa 4mm de material na aba

          // Segmento até a aba
          segs.push({
            id: `seg_${novoCmdId()}_c1`,
            from: { ...aresta.from, z: zCorte },
            to: { x: aresta.from.x < aresta.to.x ? tabXStart : tabXEnd, y: aresta.from.y, z: zCorte },
            tipo: 'cutting',
            velocidade: feedCorte,
            toolId: tool.id,
          });

          // Subida em rampa/mergulho na aba
          segs.push({
            id: `seg_${novoCmdId()}_tab_up`,
            from: { x: aresta.from.x < aresta.to.x ? tabXStart : tabXEnd, y: aresta.from.y, z: zCorte },
            to: { x: aresta.from.x < aresta.to.x ? tabXStart + 2 : tabXEnd - 2, y: aresta.from.y, z: tabZ },
            tipo: 'cutting',
            velocidade: feedCorte * 0.7, // avanço um pouco menor no tab
            toolId: tool.id,
          });

          // Travessia da aba
          segs.push({
            id: `seg_${novoCmdId()}_tab_flat`,
            from: { x: aresta.from.x < aresta.to.x ? tabXStart + 2 : tabXEnd - 2, y: aresta.from.y, z: tabZ },
            to: { x: aresta.from.x < aresta.to.x ? tabXEnd - 2 : tabXStart + 2, y: aresta.from.y, z: tabZ },
            tipo: 'cutting',
            velocidade: feedCorte,
            toolId: tool.id,
          });

          // Descida de volta ao corte profundo
          segs.push({
            id: `seg_${novoCmdId()}_tab_down`,
            from: { x: aresta.from.x < aresta.to.x ? tabXEnd - 2 : tabXStart + 2, y: aresta.from.y, z: tabZ },
            to: { x: aresta.from.x < aresta.to.x ? tabXEnd : tabXStart, y: aresta.from.y, z: zCorte },
            tipo: 'cutting',
            velocidade: feedMergulho,
            toolId: tool.id,
          });

          // Resto da aresta
          segs.push({
            id: `seg_${novoCmdId()}_c2`,
            from: { x: aresta.from.x < aresta.to.x ? tabXEnd : tabXStart, y: aresta.from.y, z: zCorte },
            to: { ...aresta.to, z: zCorte },
            tipo: 'cutting',
            velocidade: feedCorte,
            toolId: tool.id,
          });
        } else {
          // Aresta sem aba
          segs.push({
            id: `seg_${novoCmdId()}_c`,
            from: { ...aresta.from, z: zCorte },
            to: { ...aresta.to, z: zCorte },
            tipo: 'cutting',
            velocidade: feedCorte,
            toolId: tool.id,
          });
        }

        // Calcula tempo da aresta acumulado
        let tempoAresta = 0;
        for (const s of segs) {
          const dx = s.to.x - s.from.x;
          const dy = s.to.y - s.from.y;
          const dz = s.to.z - s.from.z;
          tempoAresta += Math.sqrt(dx * dx + dy * dy + dz * dz) / (s.velocidade / 60);
        }

        commands.push({
          id: novoCmdId(),
          tipo: 'CONTOUR',
          params: { aresta: aresta.nome, passada: p },
          segments: segs,
          tempoEstimado: tempoAresta,
        });

        currentPos = { ...aresta.to, z: zCorte };
      }

      // Se for a última passada, executa um Lead-Out de saída suave
      if (p === numPassadas) {
        const leadOutX = px - 8;
        const leadOutY = py + 8;
        const leadOutCmd: SimulationCommand = {
          id: novoCmdId(),
          tipo: 'LEAD_OUT',
          params: { x: leadOutX, y: leadOutY },
          segments: [{
            id: `seg_${novoCmdId()}_lo`,
            from: { ...currentPos },
            to: { x: leadOutX, y: leadOutY, z: zCorte },
            tipo: 'lead_out',
            velocidade: feedCorte,
            toolId: tool.id,
          }],
          tempoEstimado: Math.hypot(leadOutX - currentPos.x, leadOutY - currentPos.y) / (feedCorte / 60),
        };
        commands.push(leadOutCmd);
        currentPos = { x: leadOutX, y: leadOutY, z: zCorte };
      }
    }

    // C. RETRACT DE SEGURANÇA APÓS PEÇA FINALIZADA
    const retractCmd: SimulationCommand = {
      id: novoCmdId(),
      tipo: 'RETRACT',
      params: { z: safeZ },
      segments: [{
        id: `seg_${novoCmdId()}_r`,
        from: { ...currentPos },
        to: { x: currentPos.x, y: currentPos.y, z: safeZ },
        tipo: 'retract',
        velocidade: feedRapidoZ,
        toolId: tool.id,
      }],
      tempoEstimado: Math.abs(safeZ - currentPos.z) / (feedRapidoZ / 60),
    };
    commands.push(retractCmd);
    currentPos = { x: currentPos.x, y: currentPos.y, z: safeZ };
  }

  // 3. FINALIZAÇÃO: DESLIGAR SPINDLE E VOLTAR PARA HOME
  commands.push({
    id: novoCmdId(),
    tipo: 'SPINDLE_OFF',
    params: {},
    segments: [],
    tempoEstimado: 2.0, // tempo de parada
  });

  const homeCmd: SimulationCommand = {
    id: novoCmdId(),
    tipo: 'SAFE_MOVE',
    params: { x: 0, y: 0, z: 50 },
    segments: [{
      id: `seg_${novoCmdId()}_h`,
      from: { ...currentPos },
      to: { x: 0, y: 0, z: 50 },
      tipo: 'safe_move',
      velocidade: feedRapido,
      toolId: tool.id,
    }],
    tempoEstimado: Math.hypot(currentPos.x, currentPos.y) / (feedRapido / 60) + Math.abs(50 - currentPos.z) / (feedRapidoZ / 60),
  };
  commands.push(homeCmd);

  // ==================================================
  // CÁLCULO DE MÉTRICAS GERAIS E ANÁLISE DE VERIFICAÇÃO (COLISÕES E LIMITES)
  // ==================================================
  let totalTempo = 0;
  let distTotal = 0;
  let distCorte = 0;
  let distRapido = 0;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    totalTempo += cmd.tempoEstimado || 0;

    for (const s of cmd.segments) {
      const dx = s.to.x - s.from.x;
      const dy = s.to.y - s.from.y;
      const dz = s.to.z - s.from.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      distTotal += len;

      if (s.tipo === 'cutting' || s.tipo === 'lead_in' || s.tipo === 'lead_out') {
        distCorte += len;
      } else {
        distRapido += len;
      }

      // --- DETECÇÃO DE OVERTRAVEL ---
      const maxLimX = machine.larguraMaximaXY[0];
      const maxLimY = machine.larguraMaximaXY[1];
      const maxLimZ = machine.alturaMaximaZ;

      if (
        s.to.x < 0 || s.to.x > maxLimX ||
        s.to.y < 0 || s.to.y > maxLimY ||
        s.to.z < -20 || s.to.z > maxLimZ
      ) {
        issues.push({
          id: `issue_overtravel_${i}_${s.id}`,
          severidade: 'error',
          codigo: 'OVERTRAVEL',
          mensagem: 'Limite físico de eixo excedido (Overtravel)',
          descricao: `A ferramenta tentou mover para fora da área útil da máquina na coordenada X:${s.to.x.toFixed(1)} Y:${s.to.y.toFixed(1)} Z:${s.to.z.toFixed(1)}. Limite máquina: X:${maxLimX} Y:${maxLimY} Z:${maxLimZ}`,
          cmdIdx: i,
          tempo: totalTempo,
          posicao: { ...s.to },
          sugestao: 'Repositione a peça ou reduza a margem do plano de corte.',
        });
      }

      // --- DETECÇÃO DE COLISÃO COM FIXAÇÕES (CLAMPS) ---
      // A fresa tem raio de tool.diametro/2. O spindle/cabeçote tem raio considerável (ex: 60mm).
      // Clamps são zonas proibidas.
      const raioFresa = tool.diametro / 2;
      const margemColisao = raioFresa + 5; // fresa + 5mm de margem

      for (const fx of fixtures) {
        // Verifica se a trajetória (de from para to) cruza o bounding box da garra (clamp)
        // Simplificado: verifica se o ponto destino ou origem ou midpoint invade o clamp
        // Subdivide o segmento de linha para amostragem a cada 5mm para detectar clamps
        const dx = s.to.x - s.from.x;
        const dy = s.to.y - s.from.y;
        const dz = s.to.z - s.from.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const numPassos = Math.max(2, Math.ceil(len / 5));
        const pontosParaVerificar = [];
        for (let step = 0; step <= numPassos; step++) {
          const t = step / numPassos;
          pontosParaVerificar.push({
            x: s.from.x + dx * t,
            y: s.from.y + dy * t,
            z: s.from.z + dz * t
          });
        }

        for (const pt of pontosParaVerificar) {
          // Clamp está no plano XY entre fx.x e fx.x+fx.largura, fx.y e fx.y+fx.altura.
          // Tem altura vertical física (fx.espessura) acima da spoilboard (z de 0 a fx.espessura).
          if (
            pt.x >= fx.x - margemColisao && pt.x <= fx.x + fx.largura + margemColisao &&
            pt.y >= fx.y - margemColisao && pt.y <= fx.y + fx.altura + margemColisao &&
            pt.z <= fx.espessura + 5 // se a ferramenta estiver na altura física do clamp ou abaixo
          ) {
            issues.push({
              id: `issue_colisao_fixture_${i}_${fx.id}`,
              severidade: 'error',
              codigo: 'COLLISION_FIXTURE',
              mensagem: 'Colisão com Garra de Fixação (Clamp)',
              descricao: `A ferramenta colidiu com o clamp [${fx.id}] posicionado em X:${fx.x} Y:${fx.y} na altura Z:${pt.z.toFixed(1)}mm.`,
              cmdIdx: i,
              tempo: totalTempo,
              posicao: { ...pt },
              sugestao: 'Afaste a peça da borda física da chapa ou altere a posição dos grampos/garras.',
            });
            break; // evita duplicados para o mesmo comando/fixture
          }
        }
      }

      // --- DETECÇÃO DE RAPIDS INSEGUROS (RAPID CROSS STOCK) ---
      // Movimento rápido abaixo de 8mm cruzando o MDF
      if (s.tipo === 'rapid' && s.to.z < 8 && (s.from.x !== s.to.x || s.from.y !== s.to.y)) {
        issues.push({
          id: `issue_rapid_cross_${i}`,
          severidade: 'warning',
          codigo: 'INSECURE_RAPID',
          mensagem: 'Deslocamento rápido inseguro detectado',
          descricao: `A máquina executou um movimento em velocidade máxima (G00) em Z:${s.to.z.toFixed(1)}mm, que está abaixo da altura segura acima da chapa.`,
          cmdIdx: i,
          tempo: totalTempo,
          posicao: { ...s.to },
          sugestao: 'Aumente a altura de segurança (Retract/Safe Height) nas configurações do plano.',
        });
      }
    }
  }

  // Se houver alguma peça cortada fora do MDF, gera aviso de stock
  layout.pecas.forEach((peca, idx) => {
    if (
      peca.x < 0 || peca.x + peca.comprimento > layout.chapa.largura ||
      peca.y < 0 || peca.y + peca.largura > layout.chapa.altura
    ) {
      issues.push({
        id: `issue_stock_out_${idx}`,
        severidade: 'error',
        codigo: 'OUT_OF_STOCK',
        mensagem: `Peça fora dos limites da chapa: ${peca.nome}`,
        descricao: `A peça [${peca.nome}] excede a largura (${layout.chapa.largura}mm) ou altura (${layout.chapa.altura}mm) físicas da chapa MDF.`,
        cmdIdx: 0,
        tempo: 0,
        posicao: { x: peca.x, y: peca.y, z: 0 },
        sugestao: 'Recalcule o nesting de corte ou use uma chapa de MDF de dimensões maiores.',
      });
    }
  });

  return {
    id: `program_${layout.chapa.sku}`,
    commands,
    totalTempoEstimado: totalTempo,
    totalDistancia: distTotal,
    totalDistanciaCorte: distCorte,
    totalDistanciaRapido: distRapido,
    totalTrocasFerramenta: 0,
    issues,
  };
}

/**
 * Retorna o estado instantâneo (posição, spindle, comando) para qualquer tempo `tempo` da timeline.
 */
export function obterEstadoNoInstante(
  program: SimulationProgram,
  tempo: number
): {
  x: number;
  y: number;
  z: number;
  spindleOn: boolean;
  rpm: number;
  comandoAtivoIdx: number;
  tipoMovimento: ToolpathSegment['tipo'];
} {
  let accTempo = 0;
  let lastPos = { x: 0, y: 0, z: 50 };
  let spindleOn = false;
  let rpm = 0;
  let tipoMovimento: ToolpathSegment['tipo'] = 'safe_move';

  if (tempo <= 0) {
    return { ...lastPos, spindleOn: false, rpm: 0, comandoAtivoIdx: 0, tipoMovimento: 'safe_move' };
  }

  for (let c = 0; c < program.commands.length; c++) {
    const cmd = program.commands[c];
    const cmdDur = cmd.tempoEstimado || 0;

    if (cmd.tipo === 'SPINDLE_ON') {
      spindleOn = true;
      rpm = cmd.params.rpm || 18000;
    } else if (cmd.tipo === 'SPINDLE_OFF') {
      spindleOn = false;
      rpm = 0;
    }

    if (accTempo + cmdDur >= tempo) {
      // O instante está dentro deste comando!
      const tempoNoCmd = tempo - accTempo;
      if (cmd.segments.length === 0) {
        // Comando sem segmentos (tipo Spindle On)
        return { ...lastPos, spindleOn, rpm, comandoAtivoIdx: c, tipoMovimento: 'safe_move' };
      }

      // Encontra em qual segmento do comando estamos
      let accSegTempo = 0;
      for (const s of cmd.segments) {
        const dx = s.to.x - s.from.x;
        const dy = s.to.y - s.from.y;
        const dz = s.to.z - s.from.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const segDur = dist / (s.velocidade / 60);

        if (accSegTempo + segDur >= tempoNoCmd) {
          const frac = (tempoNoCmd - accSegTempo) / (segDur || 1);
          return {
            x: s.from.x + (s.to.x - s.from.x) * frac,
            y: s.from.y + (s.to.y - s.from.y) * frac,
            z: s.from.z + (s.to.z - s.from.z) * frac,
            spindleOn,
            rpm,
            comandoAtivoIdx: c,
            tipoMovimento: s.tipo,
          };
        }
        accSegTempo += segDur;
        lastPos = s.to;
        tipoMovimento = s.tipo;
      }

      // Fallback fim do comando
      const ultimoSeg = cmd.segments[cmd.segments.length - 1];
      return {
        ...ultimoSeg.to,
        spindleOn,
        rpm,
        comandoAtivoIdx: c,
        tipoMovimento: ultimoSeg.tipo,
      };
    }

    // Atualiza o final do comando concluído
    accTempo += cmdDur;
    if (cmd.segments.length > 0) {
      const ultimoSeg = cmd.segments[cmd.segments.length - 1];
      lastPos = ultimoSeg.to;
      tipoMovimento = ultimoSeg.tipo;
    }
  }

  // Fim do programa
  return {
    ...lastPos,
    spindleOn,
    rpm,
    comandoAtivoIdx: program.commands.length - 1,
    tipoMovimento: 'safe_move',
  };
}

/**
 * Calcula as métricas analíticas detalhadas do ciclo a partir do SimulationProgram.
 */
export function calcularMetrics(
  program: SimulationProgram,
  layout: LayoutSimulacao
): SimulationMetrics {
  let tempoCorte = 0;
  let tempoRapido = 0;
  let tempoMergulho = 0;
  let tempoRetracao = 0;

  let distCorte = 0;
  let distRapido = 0;
  let distMergulho = 0;

  program.commands.forEach((cmd) => {
    cmd.segments.forEach((s) => {
      const dx = s.to.x - s.from.x;
      const dy = s.to.y - s.from.y;
      const dz = s.to.z - s.from.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const dur = len / (s.velocidade / 60);

      switch (s.tipo) {
        case 'cutting':
        case 'lead_in':
        case 'lead_out':
          tempoCorte += dur;
          distCorte += len;
          break;
        case 'plunge':
          tempoMergulho += dur;
          distMergulho += len;
          break;
        case 'retract':
          tempoRetracao += dur;
          break;
        case 'rapid':
        case 'safe_move':
          tempoRapido += dur;
          distRapido += len;
          break;
      }
    });
  });

  const areaTotal = (layout.chapa.largura * layout.chapa.altura) / 1e6; // m²
  const areaAproveitada = layout.area_aproveitada_mm2 / 1e6; // m²
  const areaDesperdicio = Math.max(0, areaTotal - areaAproveitada);

  // Volume de MDF removido (área de corte linear * espessura * diâmetro fresa)
  const volRemovido = distCorte * layout.chapa.espessura * 6.0; // mm³

  const numWarnings = program.issues.filter((i) => i.severidade === 'warning').length;
  const numErros = program.issues.filter((i) => i.severidade === 'error').length;

  return {
    tempoTotal: program.totalTempoEstimado,
    tempoCorte,
    tempoRapido,
    tempoMergulho,
    tempoRetracao,
    distanciaTotal: program.totalDistancia,
    distanciaCorte: distCorte,
    distanciaRapido: distRapido,
    distanciaMergulho: distMergulho,
    trocasFerramenta: program.totalTrocasFerramenta,
    areaDesperdicioM2: areaDesperdicio,
    volumeRemovidoMm3: volRemovido,
    numWarnings,
    numErros,
  };
}
