"use client";

import { Dices, Download, Link2, Check } from "lucide-react";
import { ENGINE_ORDER, ENGINES } from "@/lib/engines";
import { EngineId, EngineParams } from "@/lib/engines/types";

interface Props {
  engine: EngineId;
  seed: number;
  params: EngineParams;
  onEngineChange: (e: EngineId) => void;
  onParamsChange: (p: EngineParams) => void;
  onReroll: () => void;
  onExport: () => void;
  onShare: () => void;
  shareCopied: boolean;
}

export default function ControlPanel({
  engine,
  seed,
  params,
  onEngineChange,
  onParamsChange,
  onReroll,
  onExport,
  onShare,
  shareCopied,
}: Props) {
  const setParam = (key: keyof EngineParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onParamsChange({ ...params, [key]: Number(e.target.value) });
  };

  return (
    <div className="glass-panel rounded-lg p-5 flex flex-col gap-6 w-full md:w-80 shrink-0">
      <div>
        <div className="text-[10px] tracking-widest text-cyan-glow/70 mb-2">ENGINE</div>
        <div className="grid grid-cols-1 gap-1">
          {ENGINE_ORDER.map((id) => (
            <button
              key={id}
              onClick={() => onEngineChange(id)}
              className={`text-left px-3 py-2 rounded text-xs border transition-colors ${
                engine === id
                  ? "border-cyan-glow bg-cyan-glow/10 text-cyan-glow"
                  : "border-white/10 text-neutral-400 hover:border-white/30 hover:text-neutral-200"
              }`}
            >
              {ENGINES[id].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-neutral-500 leading-snug">{ENGINES[engine].description}</p>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="text-[10px] tracking-widest text-magenta-glow/70 mb-2">SEED</div>
        <div className="text-sm text-neutral-300 bg-black/30 rounded px-3 py-2 border border-white/10">
          {seed.toString(16).padStart(8, "0").toUpperCase()}
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 flex flex-col gap-4">
        <div className="text-[10px] tracking-widest text-cyan-glow/70">PARAMETERS</div>
        <Slider label="Density" value={params.density} onChange={setParam("density")} />
        <Slider label="Scale" value={params.scale} onChange={setParam("scale")} />
        <Slider label="Frequency" value={params.frequency} onChange={setParam("frequency")} />
        <Slider
          label="Accent Hue"
          value={params.accentHue / 360}
          onChange={(e) => onParamsChange({ ...params, accentHue: Number(e.target.value) * 360 })}
          readout={`${Math.round(params.accentHue)}°`}
          swatch={`hsl(${Math.round(params.accentHue)}, 100%, 55%)`}
        />
      </div>

      <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
        <button
          onClick={onReroll}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-cyan-glow/40 text-cyan-glow text-xs hover:bg-cyan-glow/10 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Dices size={14} /> Reroll Seed
          </span>
          <kbd className="text-[10px] opacity-60 border border-cyan-glow/30 rounded px-1">SPACE</kbd>
        </button>

        <button
          onClick={onExport}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-magenta-glow/40 text-magenta-glow text-xs hover:bg-magenta-glow/10 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Download size={14} /> Export PNG
          </span>
          <kbd className="text-[10px] opacity-60 border border-magenta-glow/30 rounded px-1">S</kbd>
        </button>

        <button
          onClick={onShare}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-white/20 text-neutral-300 text-xs hover:border-white/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            {shareCopied ? <Check size={14} className="text-cyan-glow" /> : <Link2 size={14} />}
            {shareCopied ? "Copied!" : "Fork / Share Link"}
          </span>
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  readout,
  swatch,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readout?: string;
  swatch?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          {label}
          {swatch && <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: swatch }} />}
        </span>
        <span className="text-neutral-500">{readout ?? value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={value}
        onChange={onChange}
        className="range-cyber w-full h-1 appearance-none bg-transparent"
      />
    </label>
  );
}
