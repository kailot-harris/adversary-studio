"use client";

import { MutableRefObject, useEffect } from "react";
import { Rng } from "@/lib/mulberry32";
import { ENGINES } from "@/lib/engines";
import { EngineId, EngineParams } from "@/lib/engines/types";

interface Props {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  engine: EngineId;
  seed: number;
  params: EngineParams;
  canvasSize: number;
}

export default function StudioCanvas({ canvasRef, engine, seed, params, canvasSize }: Props) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const rng = new Rng(seed);
    ENGINES[engine].render(ctx, canvasSize, rng, params);
  }, [canvasRef, engine, seed, params, canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full aspect-square max-w-full max-h-full object-contain shadow-glow border border-cyan-glow/20"
    />
  );
}
