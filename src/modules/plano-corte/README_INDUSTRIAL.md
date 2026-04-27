# Módulo de Plano de Corte Industrial (D'LUXURY ERP)

Este módulo é responsável pela otimização de materiais (chapas MDF) e geração de planos de corte industriais, competindo diretamente com soluções líderes de mercado como Promob Cut Pro e CutList Optimizer.

## Blocos de Desenvolvimento Implementados

### Bloco 1: Motor de Otimização Core
- Algoritmo híbrido (MaxRects BSSF + Guillotine Fallback).
- Múltiplas iterações assíncronas via Web Worker (`otimizacao_worker.ts`).
- Suporte a Kerf (espessura da serra) e restrições de rotação de veios.
- Lógica de Chapa Virtual para permitir aproveitamento de 100% da chapa encostando nas bordas absolutas.

### Bloco 2: Gestão de Retalhos (Economia Circular)
- Repositório próprio `RetalhosRepository` integrado ao PostgreSQL.
- Priorização algorítmica: o sistema tenta usar retalhos compatíveis do estoque antes de cortar chapas inteiras.
- Gravação automática de novas sobras (> 300x300mm) no estoque ao salvar um plano de corte aprovado.

### Bloco 3: Visualização Canvas
- `CanvasAvancado.tsx` entregando uma experiência profissional de visualização.
- Pan (arrastar) e Zoom infinito.
- Réguas milimetradas dinâmicas no eixo X e Y.
- Tooltips on-hover revelando metadados de cada peça (Dimensões, Etiqueta, Ambiente).
- Representação visual de Fitas de Borda.

### Bloco 4: Central de Exportação
- Exportação integrada e unificada (`ExportacaoModal.tsx`).
- **Mapa de Corte (PDF)**: Desenhos em escala 1:10 para chão de fábrica e montadores.
- **Etiquetas Térmicas (PDF)**: Geração de etiquetas otimizadas (100x50mm) compatíveis com impressoras Argox/Zebra, contendo QR Code rastreável via `qrcode` e `jsPDF`.
- **CNC (G-Code)**: Exportador de trajetórias para router CNC (`ExportadorGCode.ts`).
- **Lista de Produção (CSV)**: Exportação tabular de todas as peças processadas.

## Stack Tecnológica
- **React + TypeScript** (Frontend e Tipagens rigorosas)
- **jsPDF + html2canvas + qrcode** (Geração de PDFs industriais e Etiquetas)
- **Web Workers API** (Offloading de cálculos pesados da Main Thread)
- **PostgreSQL / Neon via Drizzle** (Persistência segura e robusta)
