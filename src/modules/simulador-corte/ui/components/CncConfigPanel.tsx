import React from 'react';
import { Cpu, Wrench, Shield, Gauge, ArrowUpDown, Plus, Trash2 } from 'lucide-react';
import type { CncConfig, CollisionPolicy, ClampPosition } from '../../domain/types';

interface CncConfigPanelProps {
  config: CncConfig;
  onChange: (config: CncConfig) => void;
}

export default function CncConfigPanel({ config, onChange }: CncConfigPanelProps) {
  const { machine } = config;

  const updateMachine = (key: keyof typeof machine, value: number | CollisionPolicy) => {
    onChange({
      ...config,
      machine: { ...machine, [key]: value },
    });
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-3 w-full flex flex-col gap-3">
      {/* HEADER */}
      <div className="flex items-center gap-2 border-b border-[#1F2937] pb-2">
        <Cpu size={14} className="text-[#E2AC00]" />
        <h3 className="text-[#E2AC00] font-bold text-xs tracking-wider">CONFIGURAÇÃO CNC</h3>
      </div>

      {/* SEÇÃO 1: FERRAMENTA */}
      <div className="border-b border-[#1F2937]/60 pb-2">
        <h4 className="text-white font-semibold text-[10px] tracking-wider mb-2 flex items-center gap-1">
          <Wrench size={12} className="text-[#6B7280]" /> FERRAMENTA
        </h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
          <ParamField label="Diâmetro" value={machine.diametroFerramenta} unit="mm" min={1} max={20} step={0.5}
            onChange={(v) => updateMachine('diametroFerramenta', v)} />
          <ParamField label="Comp. Útil" value={machine.comprimentoUtil} unit="mm" min={10} max={80} step={0.5}
            onChange={(v) => updateMachine('comprimentoUtil', v)} />
          <ParamField label="Stickout" value={machine.stickout} unit="mm" min={10} max={80} step={0.5}
            onChange={(v) => updateMachine('stickout', v)} />
          <ParamField label="RPM Spindle" value={machine.rpmSpindle} unit="rpm" min={3000} max={30000} step={1000}
            onChange={(v) => updateMachine('rpmSpindle', v)} />
          <ParamField label="Feed Corte" value={machine.feedCorte} unit="mm/min" min={500} max={24000} step={100}
            onChange={(v) => updateMachine('feedCorte', v)} />
          <ParamField label="Feed Mergulho" value={machine.feedMergulho} unit="mm/min" min={200} max={8000} step={100}
            onChange={(v) => updateMachine('feedMergulho', v)} />
          <ParamField label="Feed Rápido" value={machine.feedRapido} unit="mm/min" min={3000} max={30000} step={500}
            onChange={(v) => updateMachine('feedRapido', v)} />
        </div>
      </div>

      {/* SEÇÃO 2: EIXOS E ALTURAS */}
      <div className="border-b border-[#1F2937]/60 pb-2">
        <h4 className="text-white font-semibold text-[10px] tracking-wider mb-2 flex items-center gap-1">
          <ArrowUpDown size={12} className="text-[#6B7280]" /> EIXOS & MOVIMENTO
        </h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
          <ParamField label="SafeZ" value={machine.safeZ} unit="mm" min={5} max={machine.alturaMaximaZ} step={0.5}
            onChange={(v) => updateMachine('safeZ', v)} />
          <ParamField label="Z Máx" value={machine.alturaMaximaZ} unit="mm" min={50} max={400} step={5}
            onChange={(v) => updateMachine('alturaMaximaZ', v)} />
          <ParamField label="Stepdown" value={machine.stepdown} unit="mm" min={0.5} max={30} step={0.5}
            onChange={(v) => updateMachine('stepdown', v)} />
          <ParamField label="Lead-In" value={machine.leadInDist} unit="mm" min={1} max={30} step={0.5}
            onChange={(v) => updateMachine('leadInDist', v)} />
          <ParamField label="Lead-Out" value={machine.leadOutDist} unit="mm" min={1} max={20} step={0.5}
            onChange={(v) => updateMachine('leadOutDist', v)} />
          <ParamField label="Margem Clamp" value={machine.clampingMargin} unit="mm" min={0} max={50} step={1}
            onChange={(v) => updateMachine('clampingMargin', v)} />
        </div>
      </div>

      {/* SEÇÃO 3: LIMITES FÍSICOS */}
      <div className="border-b border-[#1F2937]/60 pb-2">
        <h4 className="text-white font-semibold text-[10px] tracking-wider mb-2 flex items-center gap-1">
          <Gauge size={12} className="text-[#6B7280]" /> LIMITES FÍSICOS
        </h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
          <ParamField label="Limite X" value={machine.limiteX[1]} unit="mm" min={500} max={6000} step={50}
            onChange={(v) => updateMachine('limiteX', [machine.limiteX[0], v])} />
          <ParamField label="Limite Y" value={machine.limiteY[1]} unit="mm" min={500} max={4000} step={50}
            onChange={(v) => updateMachine('limiteY', [machine.limiteY[0], v])} />
        </div>
      </div>

      {/* SEÇÃO 4: POLÍTICA DE COLISÃO */}
      <div>
        <h4 className="text-white font-semibold text-[10px] tracking-wider mb-2 flex items-center gap-1">
          <Shield size={12} className="text-[#6B7280]" /> POLÍTICA DE COLISÃO
        </h4>
        <div className="flex flex-col gap-1">
          {([
            { value: 'stop' as const, label: 'Parar em colisão', desc: 'Interrompe e alerta o operador' },
            { value: 'suggest' as const, label: 'Sugerir ajuste', desc: 'Mostra recomendação e aguarda confirmação' },
            { value: 'auto' as const, label: 'Auto-ajustar seguro', desc: 'Aplica correções automáticas seguras' },
          ]).map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${
                machine.collisionPolicy === opt.value
                  ? 'bg-[#E2AC00]/10 border border-[#E2AC00]/30'
                  : 'bg-[#0D1117]/50 border border-transparent hover:bg-[#1F2937]/30'
              }`}
            >
              <input
                type="radio"
                name="collisionPolicy"
                value={opt.value}
                checked={machine.collisionPolicy === opt.value}
                onChange={() => updateMachine('collisionPolicy', opt.value)}
                className="mt-0.5 accent-[#E2AC00] w-3 h-3"
              />
              <div>
                <span className={`text-[10px] font-bold ${
                  machine.collisionPolicy === opt.value ? 'text-[#E2AC00]' : 'text-white'
                }`}>
                  {opt.label}
                </span>
                <p className="text-[#6B7280] text-[8px] leading-tight">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* SEÇÃO 5: GARRAS (CLAMPS) */}
      <div className="border-t border-[#1F2937]/60 pt-2">
        <h4 className="text-white font-semibold text-[10px] tracking-wider mb-2 flex items-center gap-1">
          <Gauge size={12} className="text-[#6B7280]" /> GARRAS (CLAMPS)
        </h4>
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
          {config.fixture.clamps.map((clamp, idx) => (
            <div key={clamp.id} className="bg-[#0D1117]/60 border border-[#1F2937] rounded p-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#6B7280] text-[8px] font-bold">{clamp.id.toUpperCase()}</span>
                <button
                  onClick={() => {
                    const novosClamps = config.fixture.clamps.filter((_, i) => i !== idx);
                    onChange({ ...config, fixture: { clamps: novosClamps } });
                  }}
                  className="text-[#6B7280] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <ClampField label="X" value={clamp.x} unit="mm" min={0} max={machine.limiteX[1]}
                  onChange={(v) => {
                    const novos = [...config.fixture.clamps];
                    novos[idx] = { ...novos[idx], x: v };
                    onChange({ ...config, fixture: { clamps: novos } });
                  }}
                />
                <ClampField label="Y" value={clamp.y} unit="mm" min={0} max={machine.limiteY[1]}
                  onChange={(v) => {
                    const novos = [...config.fixture.clamps];
                    novos[idx] = { ...novos[idx], y: v };
                    onChange({ ...config, fixture: { clamps: novos } });
                  }}
                />
                <ClampField label="Larg" value={clamp.largura} unit="mm" min={10} max={120}
                  onChange={(v) => {
                    const novos = [...config.fixture.clamps];
                    novos[idx] = { ...novos[idx], largura: v };
                    onChange({ ...config, fixture: { clamps: novos } });
                  }}
                />
                <ClampField label="Alt" value={clamp.altura} unit="mm" min={10} max={120}
                  onChange={(v) => {
                    const novos = [...config.fixture.clamps];
                    novos[idx] = { ...novos[idx], altura: v };
                    onChange({ ...config, fixture: { clamps: novos } });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const nextId = config.fixture.clamps.length + 1;
            const novoClamp: ClampPosition = {
              id: `clamp_${nextId}`,
              x: 50,
              y: 50,
              largura: 45,
              altura: 80,
            };
            onChange({ ...config, fixture: { clamps: [...config.fixture.clamps, novoClamp] } });
          }}
          className="w-full mt-1.5 flex items-center justify-center gap-1 bg-[#1F2937] hover:bg-[#374151] text-[#E2AC00] text-[8px] font-bold py-1.5 rounded transition-all"
        >
          <Plus size={10} /> ADICIONAR GARRA
        </button>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}</style>
    </div>
  );
}

function ClampField({
  label,
  value,
  unit,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-[#4b5563] text-[7px] block">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-full bg-transparent text-white font-mono font-semibold outline-none text-[9px]"
      />
    </div>
  );
}

function ParamField({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-[#0D1117] border border-[#1F2937] rounded px-2 py-1">
      <label className="text-[#6B7280] font-medium">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          className="w-14 bg-transparent text-white text-right font-mono font-semibold outline-none text-[10px]"
        />
        <span className="text-[#4b5563] text-[8px]">{unit}</span>
      </div>
    </div>
  );
}
