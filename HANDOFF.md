# HANDOFF — ADVERSARY.STUDIO

Written 2026-10-15, after the 32-engine milestone (17 engines from the prior
HANDOFF + 15 new engines built this session via the `subagent-brief` skill's
batch mode across 4 sequential sub-batches of up to 4 parallel subagents
each, every engine in its own `git worktree`) and a follow-up UI-planning
pass later the same session. **`brainstorm.md`'s engine-idea backlog is
fully exhausted — zero unbuilt ideas remain.** Instead, this session closed
by designing and writing a **staged, unstarted implementation plan** for
restructuring the engine picker — see `ENGINE_SELECTOR_PLAN.md` at the repo
root, committed but **not yet implemented** (Stage 0 of 6 hasn't started).
For whoever picks this up next — human or fresh agent, no prior session
context assumed.

## What this project is

A Next.js (App Router) + TypeScript + Tailwind web app, "ADVERSARY.STUDIO":
a split-screen studio for generating adversarial/CV-confusion 2D computational
art. Left pane is a square canvas; right pane is a glassmorphic control panel
(engine tabs, density/scale/frequency/accent-hue sliders, reroll/export/share
buttons). Every render is deterministic — same `(engine, seed, params)` always
produces the same pixels, via a seeded `mulberry32` PRNG + seeded Perlin noise
(`lib/mulberry32.ts`), never `Math.random()`.

**Root directory:** `C:\Users\kailo\kayceeslices\Processing\adversarial_art_app`
(a subdirectory of a larger `Processing` folder — see "Sibling directories"
below, they are reference material only, not part of the app).

**No spec document exists.** The only planning artifact is `brainstorm.md` at
the project root, which lists engine ideas with a checklist of built vs. not
built. **As of this writing, every single checklist line in that file is
checked** — there is no unbuilt backlog remaining. If you're picking this
project up to add more engines, you'll need to brainstorm new ideas first
(see "Concrete next step," option C). There is no architecture doc beyond
this HANDOFF and the code itself — read the code directly rather than
looking for a design doc that doesn't exist.

**Hard boundary:** the five `.pde` Processing sketches in the sibling
`adv_*` directories (see below) are the *original prototypes* each engine was
ported from. They are reference-only — never edit them, and don't assume the
TypeScript port is pixel-identical to their `random()`-driven output (it can't
be, since Processing's RNG isn't reproducible; the port matches their visual
logic/structure, not their exact bit-for-bit output).

## Sibling directories (reference only, not part of the app)

Each is a standalone Processing sketch (`.pde` + exported `.png` samples) that
the corresponding TypeScript engine was ported from:

| Directory | Engine it maps to |
|---|---|
| `adv_cv_dazzle/adv_cv_dazzle.pde` | `cv_dazzle` |
| `adv_att_cnn/adv_att_cnn.pde` | `cnn_texture` |
| `adv_patch/adv_patch.pde` | `adversarial_patch` |
| `adv_pose_jam/adv_pose_jam.pde` | `pose_jammer` |
| `adv_gabor/adv_gabor.pde` | `gabor_grating` |

The other 27 engines have no `.pde` prototype — they were designed directly
in TypeScript from `brainstorm.md`'s one-line descriptions.

## Progress tracking

`brainstorm.md`'s "Status" checklist holds **27 checked lines, 0 unchecked**
(verified fresh this session via `grep -c "\[ \]"` → 0, `grep -c "\[x\]"` →
27). Those 27 plus the 5 original `.pde`-ported engines (which predate the
checklist and aren't listed in it) account for all **32 engines**, confirmed
three ways: `wc -l lib/engines/*.ts` lists 32 engine files (excluding
`types.ts`/`index.ts`), `grep -A40 "ENGINE_ORDER" lib/engines/index.ts` shows
32 string entries, and `ENGINES`/`ENGINE_ORDER` in `lib/engines/index.ts` is
the canonical source of truth per usual.

Built this session (all 15 of `brainstorm.md`'s remaining backlog, in 4
dispatch batches):
- Batch 1: `saliency_inversion`, `iris_code_jam`, `liveness_spoof_texture`,
  `gait_scramble`
- Batch 2: `jpeg_dct_bloom`, `rolling_shutter_tear`, `codec_macroblock_decoy`,
  `nerf_view_inconsistency`
- Batch 3: `point_cloud_static`, `slam_feature_desert`, `gan_fingerprint_mask`,
  `steganalysis_noise_bed`
- Batch 4: `watermark_collision`, `crowd_count_decoy`,
  `action_recognition_jitter`

All 15 subagent runs returned `status: success`; all were spot-checked
against `git diff --stat` before merging (file lists matched claims exactly,
no surprise files); all 4 batches passed `rm -rf .next && npm run build`
clean after merging. **15 for 15, zero failures, zero early-stops** — see
`.subagent-runs/batches/b-20261015-111223-0968a9/report.md` for the full
machine-readable report.

There is no issue tracker beyond `brainstorm.md` + this file.

**Git repo:** remote is `origin` →
`https://github.com/kailot-harris/adversary_studio.git`, default branch is
`main`. All 26 of this session's commits are pushed; `git status` → working
tree clean, `main` up to date with `origin/main` as of this writing.

**Validation evidence:** `npm run build` passes clean on `main` as of this
writing (verified fresh after every one of this session's 4 merge-batches,
with `.next` cleared first each time per the build-cache gotcha below, plus
one final verification after all 15 engines were merged — 29.0s full
rebuild, zero errors, static generation 4/4). **No browser-based visual
verification has been done for any of the 32 engines, ever** — every
"it builds" claim in this repo's history is a type-check + static-generation
check only. This is still the single biggest unaddressed gap in this
project's validation story; see "Concrete next step."

## What's actually implemented

Core infrastructure (unchanged this session):

| File | Lines | State |
|---|---|---|
| `lib/mulberry32.ts` | 99 | Done. `mulberry32()` core PRNG, `hashStringToSeed()`, `randomSeed()`, and the `Rng` class (`.random()`, `.randomInt()`, seeded 2D Perlin `.noise()` via a seeded permutation table). |
| `lib/color.ts` | 52 | Done. `hsb()` → CSS string, `rgba()` → CSS string, `hsbToRgb()` → `[r,g,b]` tuple for direct `ImageData` writes. |
| `lib/urlState.ts` | 78 | Done. `StudioState` type, `encodeStateToSearchParams()`, `decodeStateFromSearchParams()`. `ENGINE_IDS` here is a **second, manually-maintained copy** of the engine-id list (see duplication gotcha below) — now holds all 32 ids. |
| `lib/engines/types.ts` | 57 | Done. `EngineId` union (32 values), `EngineParams` (density/scale/frequency/accentHue, all 0-1 except hue 0-360), `RenderEngine` interface. |
| `lib/engines/index.ts` | 105 | Done. `ENGINES` record and `ENGINE_ORDER` array, all 32 ids — **this is the third place the engine-id list is duplicated** (see gotcha below). |
| `components/StudioCanvas.tsx` | 36 | Done. Takes a `canvasRef` prop (not `forwardRef`), runs the selected engine's `render()` in a `useEffect` keyed on `[canvasRef, engine, seed, params, canvasSize]`. |
| `components/ControlPanel.tsx` | 145 | Done. Engine tab list, 4 sliders, reroll/export/share buttons. Not yet updated with any palette-preset picker (see below). |
| `components/Studio.tsx` | 154 | Done. All state (`engine`, `seed`, `params`, `shareCopied`), URL sync via `router.replace`, keyboard shortcuts (Space=reroll, S=export), PNG export at a fixed 1024px regardless of display size, clipboard-with-fallback share link. |
| `app/layout.tsx` | 22 | Done. JetBrains Mono via `next/font/google`, dark theme. |
| `app/page.tsx` | 10 | Done. Wraps `<Studio />` in `<Suspense>`. |
| `app/presets/palettes.ts` | 10 | Done, but still **inert** — `PALETTES.NEO_BIOLOGY` is defined but not imported anywhere outside this file (re-verified this session via project-wide grep). Still explicitly deferred, not forgotten. |

The 5 original `.pde`-ported engines and the 12 engines from the prior two
sessions (`fgsm_noise` through `reid_camouflage`) are unchanged this session
— see the prior HANDOFF history (in git log, commits before `67a3606`) for
their individual descriptions if needed; this file no longer repeats them
per-engine to keep the table a manageable size at 32 engines.

**All 15 engines built this session:**

| Engine | File | Lines | Approach |
|---|---|---|---|
| `saliency_inversion` | `saliencyInversion.ts` | 115 | Block-quantized noise-wobbled foreground silhouette vs. high-frequency hot-hued background speckle field. |
| `iris_code_jam` | `irisCodeJam.ts` | 107 | Radial Gabor-like annular wedge texture mimicking Daugman iris-code bit encoding. |
| `liveness_spoof_texture` | `livenessSpoofTexture.ts` | 124 | Two near-frequency rotated moiré line grids plus hard-edged specular highlight blobs. |
| `gait_scramble` | `gaitScramble.ts` | 160 | Skeletal stick figures with independently phase-offset limb sines plus a decoy motion-blur ghost. |
| `jpeg_dct_bloom` | `jpegDctBloom.ts` | 103 | Per-8x8-block DCT-basis-like waves (horizontal/vertical/diagonal), quantized DC levels, ringing halos at block edges. |
| `rolling_shutter_tear` | `rollingShutterTear.ts` | 135 | Horizontal band shear-skew with oscillating offset, ghost duplicates, tear-seam highlight lines. |
| `codec_macroblock_decoy` | `codecMacroblockDecoy.ts` | 146 | Macroblock grid with flat seeded luma fills, sparse motion-vector arrows, blocking-artifact seams. |
| `nerf_view_inconsistency` | `nerfViewInconsistency.ts` | 195 | Seeded elliptical patches with per-patch fake "view angle" driving glint offset + hue bias, implying contradictory lighting. |
| `point_cloud_static` | `pointCloudStatic.ts` | 87 | Jittered LiDAR-style dot grid with per-dot intensity, Perlin-noise dropout voids, accent-hued retroreflector hotspots. |
| `slam_feature_desert` | `slamFeatureDesert.ts` | 171 | Checkerboard alternating flat-gradient "feature desert" cells with dense false-keypoint (corner/cross/star) "flood" cells. |
| `gan_fingerprint_mask` | `ganFingerprintMask.ts` | 89 | Block-quantized fine-pitch checkerboard (mimicking transposed-conv upsampling artifacts) over a faint low-freq base gradient. |
| `steganalysis_noise_bed` | `steganalysisNoiseBed.ts` | 100 | Block-quantized low-freq base field plus a sparse clustered fixed-delta ("LSB-like") speckle pass. |
| `watermark_collision` | `watermarkCollision.ts` | 159 | Dual-frequency semi-transparent tiled glyph lattice (primary grid + half-pitch phase-shifted secondary grid). |
| `crowd_count_decoy` | `crowdCountDecoy.ts` | 125 | Seeded head-sized blob clusters, roughly half over-dense (inflate count) and half sparse/camouflaged (deflate count). |
| `action_recognition_jitter` | `actionRecognitionJitter.ts` | 184 | Seeded stick-figure poses, each drawn as 3-5 opacity-decaying, angle/position-offset "motion blur trail" copies implying contradictory motion in one static frame. Deliberately *not* implemented by importing `gaitScramble.ts` — built independently per its brief, so if you spot near-duplicate limb-drawing logic between the two files, that's why; no shared helper was extracted. |

`grep -rn "TODO\|FIXME\|XXX"` across `lib/engines/*.ts`, `components/*.tsx`,
`app/*.tsx` returns nothing — all 32 engines in `ENGINES` have complete,
non-placeholder `render()` implementations (re-verified this session).

**Proposed but explicitly not started (carried over from a prior session,
still untouched):** a 5th shared slider ("Harmonic Resonance" / Moiré
Intensity) and a full WebGL/GLSL fragment-shader rendering backend. Neither
has a design decision yet — not touched this session, still open proposals.

## Environment/tooling notes

- **This project has a real `git` repo, with a remote.** `origin` is
  `https://github.com/kailot-harris/adversary_studio.git`; default branch is
  `main`.
- **Next.js is `next@15.5.28`** (deliberately bumped off an older pinned
  version in a prior session due to a Windows-RCE advisory in 14.2.5).
  `StudioCanvas` uses a plain `canvasRef` prop, not `forwardRef` — if you
  see a "Cannot assign to read-only 'current'" type error after touching
  that file, that's the known cause, don't reach for `forwardRef`.
- **`next.config.mjs` hardcodes a LAN IP** (`allowedDevOrigins`) that may be
  stale if the dev machine's IP has changed since it was set. Check
  `ipconfig` first if LAN access to the dev server breaks with
  `Failed to fetch`.
- **Clipboard API needs a fallback on LAN/HTTP** — `Studio.tsx`'s `share()`
  feature-detects `navigator.clipboard?.writeText` and falls back to a
  hidden `<textarea>` + `execCommand('copy')`. Copy this pattern for any new
  clipboard-writing feature.
- **SSR/hydration: the initial seed must not use `Math.random()`.**
  `Studio.tsx` uses a fixed `FALLBACK_STATE.seed = 1` for the first render
  and only randomizes in a post-mount `useEffect`, guarded by whether the URL
  already had a `seed` param. Don't move seed randomization into the render
  body.
- **Build-cache gotcha, hit on every single merge across three sessions now
  (17 for 17 cumulative):** after any merge touching `lib/engines/*`,
  `next build` can fail with a stale `.next` webpack-chunk error ("no direct
  app page entry found for `/_not-found`" or "Cannot read properties of
  undefined (reading 'call')"). Fix is `rm -rf .next` then re-run
  `npm run build`. **Always clear `.next` before trusting a build failure
  immediately after a merge** — don't start debugging the diff first.
- **`npm audit` will always show some findings** — dev-time
  `tailwindcss`/`postcss` transitive-dep CVEs with no non-breaking fix
  available. Not shipped to the browser, not re-investigated this session
  since nothing changed about the dependency tree; expected noise.
- **No browser automation tool is available in this environment.** All
  "verification" done across this project's history is `npm run build`
  (type-check + static generation) — nobody has ever looked at rendered
  pixels for any of the 32 engines. Still the single biggest gap in this
  project's validation story.
- **`subagent-brief` skill location gotcha, hit fresh this session.** The
  skill's scripts do **not** live inside this project
  (`adversarial_art_app/.claude/skills/...` does not exist) — they live at
  the user-global path `C:\Users\kailo\.claude\skills\subagent-brief`. The
  skill's own "Base directory for this skill" line in the invocation banner
  states this explicitly; trust that over any path implied by the skill's
  own doc prose. Running `Rscript` against the wrong (project-local, nonexistent)
  path produced a raw **segmentation fault** with zero output, not a clean
  "file not found" error — if you hit a silent Rscript segfault with this
  skill, check the path first before debugging R itself.
- **`subagent-brief` result-JSON schema gotcha, hit fresh this session.**
  `schema/result.v1.json` requires a stricter shape than the brief template's
  prose implies:
  - `criteria[].met` is the **string** enum `"yes"/"no"/"unverified"`, not a
    JSON boolean.
  - `evidence` is an **array of objects** (`{id, type, ref, excerpt}`), not
    an array of plain strings — and `criteria[].evidence_refs` must reference
    those `evidence[].id` values (e.g. `"e1"`), not free-text descriptions.
  - `changes` is a **single object** `{worktree, files_changed}`, not an
    array of file paths.
  - Top-level `schema_version: "1.0"` plus `blocked_reason`/`needed_action`
    (both `null` on success) are required even when not applicable.
  Subagents dispatched with the schema spelled out explicitly in their brief
  (as this session's briefs did, after the first round's `record-result`
  calls failed with `schema_violation`) got it right on the first try —
  bake the exact field shapes into the brief text rather than trusting the
  subagent to infer them from the template name.
- **Each engine-adding session builds via isolated subagents in their own
  `git worktree`s**, under
  `C:\Users\kailo\kayceeslices\Processing\.worktrees\<engine_id>\` (a
  sibling of this project directory, not inside it). All 15 of this
  session's worktrees were merged into `main` and then **removed**
  (`git worktree remove` + `git branch -d` for each) — `git worktree list`
  currently shows only the main checkout, nothing stale.
  - **This environment's Agent-tool `isolation: "worktree"` option has never
    worked**, across three sessions now. The workaround (used again this
    session, 15 for 15): manual `git worktree add -b <branch>
    ../.worktrees/<name>` run directly from the main repo, then dispatching
    a plain (non-isolated) `general-purpose` subagent with an explicit
    instruction naming that path as its sole working directory. Don't waste
    time re-attempting the built-in flag.
  - Every single merge of a worktree branch into `main` hit the same 4-file
    conflict (`lib/engines/types.ts`, `lib/engines/index.ts`,
    `lib/urlState.ts`, `brainstorm.md`) — 14 of this session's 15 merges
    conflicted (the very first one, `saliency_inversion`, fast-forwarded
    since nothing else had landed yet; after that, every subsequent merge in
    every batch conflicted). Expected, not a sign of something wrong —
    resolution is always "keep both sides' added lines."
  - The `subagent-brief` skill's `batch.md` template at
    `.subagent-runs/engine-batch.md` was **already approved from a prior
    session** (same template hash → `pilot_approved: true`, no pilot step
    needed) and was reused as-is for all 4 of this session's dispatch
    batches — confirming the template is now a stable, reusable artifact
    across sessions, not something to re-derive each time.

## Known architectural duplication (not yet cleaned up)

The list of engine IDs is maintained **in three separate places** that must
be kept in sync by hand whenever an engine is added or removed:
1. `lib/engines/types.ts` — the `EngineId` union type.
2. `lib/engines/index.ts` — `ENGINES` record keys + `ENGINE_ORDER` array.
3. `lib/urlState.ts` — the local `ENGINE_IDS` array (used only to validate
   the `engine` URL param).

All three are currently in sync as of this writing (32 engines each). If you
add engine #33 and the URL's `?engine=` param silently falls back to
`cv_dazzle` instead of selecting the new engine, check `lib/urlState.ts`'s
`ENGINE_IDS` first — it's the one most likely to be forgotten.

## The reusable workflow (for adding a new engine)

This is the pattern three sessions' worth of engines (32 total so far) have
followed via the `subagent-brief` skill's batch mode, and it has worked
cleanly every time:

1. Pick an idea from `brainstorm.md`'s unchecked list. **As of this
   writing, there are none left** — you'll need to brainstorm and append new
   ideas to `brainstorm.md` first (new subsystem header + one-line
   description + an unchecked `- [ ]` line) before this workflow has
   anything to pick up.
2. Add the new ID to the `EngineId` union in `lib/engines/types.ts`.
3. Write `lib/engines/<camelCaseName>.ts` exporting a `RenderEngine` object
   (`id`, `label`, `description`, `render(ctx, size, rng, params)`). Use
   `params.density/scale/frequency/accentHue` (all normalized 0-1, hue 0-360)
   to drive whatever the engine's internal ranges are — don't introduce new
   per-engine param types.
   - For noise-driven engines, prefer **block-quantized sampling** (call
     `rng.noise()` once per NxN block, fill the block) over full per-pixel
     noise sampling — `cnn_texture` does the latter and is noticeably the
     heaviest engine at 1024px; `fgsm_noise`, `gan_fingerprint_mask`, and
     `steganalysis_noise_bed` deliberately use the block approach instead.
   - For `sin`/`cos`-only engines (no noise calls), full per-pixel loops are
     fine — `moire_interference` does this.
   - For vector/shape engines (rectangles, glyph strokes, tiled color
     blocks, blobs, stick figures) a per-primitive loop over seeded
     positions is the right approach, not per-pixel sampling — most of this
     session's 15 new engines use this style.
4. Register it in `lib/engines/index.ts` (`ENGINES` + `ENGINE_ORDER`) **and**
   `lib/urlState.ts` (`ENGINE_IDS`) — both, or the URL-sharing feature will
   silently misbehave for the new engine (see duplication gotcha above).
5. Update `brainstorm.md`'s checklist.
6. If built in an isolated worktree (recommended once more than one engine
   is in flight at once): commit the change in the worktree, then merge its
   branch into `main`. Expect a conflict in exactly the 4 files listed above
   if another engine's branch merged first; resolve by keeping both sides'
   added lines (never pick one side over the other — they're independent
   additive changes, not real disagreements).
7. `rm -rf .next && npm run build` — must pass clean *after clearing the
   cache*, every single time right after a merge. Don't trust a build
   failure immediately post-merge without clearing `.next` first.
8. After all branches for a batch are merged and verified, **remove the
   worktrees and their branches** (`git worktree remove <path>` then
   `git branch -d engine/<id>`) so `.worktrees` doesn't accumulate stale
   content across sessions.
9. Update this HANDOFF's "What's actually implemented" and "Progress
   tracking" tables.
10. **Still not done for any of the 32 engines**: actually open the app in a
    browser and look at it. Flag this explicitly when reporting "done"
    rather than implying visual verification happened.

## Concrete next step

**A. Execute `ENGINE_SELECTOR_PLAN.md` (recommended — fully staged, zero
open decisions, not started).** This session designed a 5-category
reorganization of the 32 engines (Biometric & Identity, Detector & Scene
Analysis, Sensor & 3D Capture, Classifier & Perturbation, Codec &
Forensics — each ≤7 engines) and wrote a 6-stage build plan for a
collapsed-by-default, mobile-aware accordion engine picker to replace
`ControlPanel.tsx`'s current flat 32-button list. The plan is committed at
the repo root (`ENGINE_SELECTOR_PLAN.md`) but **no stage has been started**
— Stage 0 (new `lib/engines/categories.ts` data-layer file) is the literal
next unit of work. Read that file in full before starting; it already
specifies exact file-level changes, exit criteria per stage, and an explicit
"out of scope" list (don't touch `lib/urlState.ts`/`types.ts`/`index.ts`'s
persisted shape, don't re-theme `brainstorm.md`'s headers to match unless
separately asked).

**B. Visual verification debt (still outstanding, now very overdue).**
Nobody has ever looked at any of the 32 engines rendered in a browser,
across three full sessions of additions. Start `npm run dev`, open the app,
and click through all 32 engine tabs, reroll a few times per engine, and
sanity-check:
- All 15 engines built in the prior part of this session — none has ever
  been rendered.
- `segmentation_shatter`, `depth_spoof`, and `moire_interference` carry
  flags from even earlier sessions for render-time/visual-correctness risk
  that have never been cleared.
- `cnn_texture` for render-time stall risk (heaviest engine, full per-pixel
  noise sampling at 1024px).
- Confirm "Export PNG" (`S` key) and "Fork/Share Link" still round-trip
  correctly now that there are 32 engines instead of 17 — the core
  "determinism" requirement and still never end-to-end verified in a
  browser.
- Note: Stage 5 of `ENGINE_SELECTOR_PLAN.md` folds a pass of this same
  checklist into the UI-restructure verification step, so doing option A
  first means this gets partially covered as a side effect.

**C. Brainstorm a new engine-idea backlog.** `brainstorm.md`'s idea list is
fully exhausted (0 unchecked lines) — continuing the engine-building pattern
("The reusable workflow" section above) requires generating new CV-
subsystem-confusion ideas first. Pick subsystems not yet covered (existing
headers span detection/tracking, sensor-level, perturbation-style,
face/landmark, biometric/liveness, compression/codec, 3D/geometric,
forensics/generative-detection, and temporal/motion — try OCR-adjacent,
audio-visual sync, or multi-camera calibration attacks for new territory).

**D. The deferred proposal.** A prior session's user once proposed (and
explicitly deferred) a 5th "Harmonic Resonance" slider and a WebGL/GLSL
rendering backend. Neither has a design decision yet — if picking this up,
start with a scope conversation (e.g. via the `spec-interview` skill), not
code, since both cut across every existing engine's shared interface, now
32 engines deep.
