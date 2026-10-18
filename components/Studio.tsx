"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudioCanvas from "./StudioCanvas";
import ControlPanel from "./ControlPanel";
import { DEFAULT_PARAMS, EngineId, EngineParams } from "@/lib/engines/types";
import { randomSeed } from "@/lib/mulberry32";
import { decodeStateFromSearchParams, encodeStateToSearchParams, StudioState } from "@/lib/urlState";

const EXPORT_SIZE = 1024;

const FALLBACK_STATE: StudioState = {
  engine: "cv_dazzle",
  seed: 1,
  ...DEFAULT_PARAMS,
};

export default function Studio() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deterministic fallback so server and client render the same initial markup;
  // an unseeded visit rerolls client-side post-mount (see effect below).
  const initial = decodeStateFromSearchParams(searchParams, FALLBACK_STATE);
  const hadSeedInUrl = searchParams.has("seed");

  const [engine, setEngine] = useState<EngineId>(initial.engine);
  const [seed, setSeed] = useState<number>(initial.seed);
  const [params, setParams] = useState<EngineParams>({
    density: initial.density,
    scale: initial.scale,
    frequency: initial.frequency,
    accentHue: initial.accentHue,
  });
  const [shareCopied, setShareCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // First client-side mount with no explicit seed in the URL: pick a fresh random one.
  useEffect(() => {
    if (!hadSeedInUrl) setSeed(randomSeed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync current state into the URL (shallow, no scroll/nav) so the address bar always
  // reflects a reproducible snapshot.
  useEffect(() => {
    const state: StudioState = { engine, seed, ...params };
    const qs = encodeStateToSearchParams(state).toString();
    router.replace(`?${qs}`, { scroll: false });
  }, [engine, seed, params, router]);

  const reroll = useCallback(() => setSeed(randomSeed()), []);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

    // toBlob + a blob: URL instead of toDataURL(): Safari/iOS unreliably
    // honors the `download` attribute on large data: URIs (silently no-ops).
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `adversary-${engine}-${seed.toString(16)}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [engine, seed]);

  const share = useCallback(() => {
    const state: StudioState = { engine, seed, ...params };
    const qs = encodeStateToSearchParams(state).toString();
    const url = `${window.location.origin}${window.location.pathname}?${qs}`;

    const onCopied = () => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    };

    // navigator.clipboard only exists in secure contexts (HTTPS or localhost);
    // LAN access over plain HTTP needs the legacy execCommand fallback.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(onCopied);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      onCopied();
    } finally {
      document.body.removeChild(textarea);
    }
  }, [engine, seed, params]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        reroll();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        exportPng();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reroll, exportPng]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h1 className="text-sm tracking-[0.3em] text-neutral-100">ADVERSARY.STUDIO</h1>
          <p className="text-[10px] text-neutral-500 mt-0.5">adversarial 2D computational art // cv-confusion toolkit</p>
        </div>
        <div className="text-[10px] text-neutral-600 hidden sm:block">
          ENGINE <span className="text-cyan-glow">{engine.toUpperCase()}</span> · SEED{" "}
          <span className="text-magenta-glow">{seed.toString(16).toUpperCase()}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-5 p-5">
        <div className="flex-1 flex items-center justify-center bg-black/30 rounded-lg border border-white/5 p-4 min-h-[320px]">
          <div className="w-full h-full max-w-[min(80vh,900px)] max-h-[min(80vh,900px)] aspect-square">
            <StudioCanvas canvasRef={canvasRef} engine={engine} seed={seed} params={params} canvasSize={EXPORT_SIZE} />
          </div>
        </div>

        <ControlPanel
          engine={engine}
          seed={seed}
          params={params}
          onEngineChange={setEngine}
          onParamsChange={setParams}
          onReroll={reroll}
          onExport={exportPng}
          onShare={share}
          shareCopied={shareCopied}
        />
      </main>
    </div>
  );
}
