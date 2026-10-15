"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { ENGINES } from "@/lib/engines";
import { EngineId } from "@/lib/engines/types";
import { CATEGORIES, categoryOf } from "@/lib/engines/categories";

interface Props {
  engine: EngineId;
  onEngineChange: (e: EngineId) => void;
}

export default function EngineSelector({ engine, onEngineChange }: Props) {
  const outerRef = useRef<HTMLDetailsElement>(null);
  const categoryRefs = useRef<Partial<Record<string, HTMLDetailsElement | null>>>({});

  // On expand of the outer selector, auto-open the inner category that
  // contains the current engine. Setting `.open = true` on one <details>
  // that shares a `name` with its siblings also closes the others per the
  // native single-open-group behavior (Chrome/Firefox/Safari all support
  // shared-`name` <details> exclusivity as of 2024), so this alone keeps
  // the "single category open at a time" invariant intact on expand too.
  const handleOuterToggle = () => {
    const outer = outerRef.current;
    if (!outer || !outer.open) return;
    const current = categoryOf(engine);
    const target = categoryRefs.current[current.id];
    if (target) target.open = true;
  };

  // On selecting an engine, re-collapse the outer selector so the panel
  // returns to its compact, single-row state.
  const handleSelect = (id: EngineId) => {
    onEngineChange(id);
    if (outerRef.current) outerRef.current.open = false;
  };

  return (
    <div>
      <details ref={outerRef} className="group" onToggle={handleOuterToggle}>
        <summary
          className="flex items-center justify-between gap-2 min-h-[44px] px-3 py-2.5 rounded text-xs border border-white/10 text-neutral-300 cursor-pointer select-none list-none transition-colors active:border-cyan-glow/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-glow"
        >
          <span className="text-[10px] tracking-widest text-cyan-glow/70">
            ENGINE <span className="text-neutral-300 tracking-normal">· {ENGINES[engine].label}</span>
          </span>
          <ChevronDown size={14} className="shrink-0 transition-transform duration-150 motion-reduce:transition-none group-open:rotate-180" />
        </summary>

        <div className="mt-2 flex flex-col gap-1.5">
          {CATEGORIES.map((category) => (
            <details
              key={category.id}
              name="engine-category"
              className="group/cat"
              ref={(el) => {
                categoryRefs.current[category.id] = el;
              }}
            >
              <summary className="flex items-center justify-between gap-2 min-h-[44px] px-3 py-2.5 rounded text-[10px] tracking-widest text-neutral-500 border border-white/10 cursor-pointer select-none list-none transition-colors active:border-cyan-glow/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-glow">
                <span className="break-words pr-1">{category.label}</span>
                <ChevronDown
                  size={12}
                  className="shrink-0 transition-transform duration-150 motion-reduce:transition-none group-open/cat:rotate-180"
                />
              </summary>
              <div className="grid grid-cols-1 gap-1 mt-1">
                {category.engineIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => handleSelect(id)}
                    className={`text-left min-h-[44px] px-3 py-2.5 rounded text-xs border transition-colors ${
                      engine === id
                        ? "border-cyan-glow bg-cyan-glow/10 text-cyan-glow"
                        : "border-white/10 text-neutral-400 active:border-white/40 active:text-neutral-200"
                    } focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-glow`}
                  >
                    {ENGINES[id].label}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>
      </details>
      <p className="mt-2 text-[11px] text-neutral-500 leading-snug">{ENGINES[engine].description}</p>
    </div>
  );
}
