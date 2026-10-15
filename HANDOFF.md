# HANDOFF — ADVERSARY.STUDIO

Written 2026-10-15, after the 17-engine milestone (12 engines from the prior
HANDOFF + `ocr_glitch`, `face_mesh_scramble`, `anchor_box_flood`,
`license_plate_ghost`, `reid_camouflage` built this session via the
`subagent-brief` skill's batch mode, each in its own `git worktree`). This
session also brainstormed 18 new engine ideas and appended them to
`brainstorm.md` as the next backlog. For whoever picks this up next — human
or fresh agent, no prior session context assumed.

## What this project is

A Next.js (App Router) + TypeScript + Tailwind web app, "ADVERSARY.STUDIO":
a split-screen studio for generating adversarial/CV-confusion 2D computational
art. Left pane is a square canvas; right pane is a glassmorphic control panel
(engine tabs, density/scale/frequency/accent-hue sliders, reroll/export/share
buttons). Every render is deterministic — same `(engine, seed, params)` always
produces the same pixels, via a seeded `mulberry32` PRNG + seeded Perlin noise,
never `Math.random()`.

**Root directory:** `C:\Users\kailo\kayceeslices\Processing\adversarial_art_app`
(a subdirectory of a larger `Processing` folder — see "Sibling directories"
below, they are reference material only, not part of the app).

**No spec document exists.** The only planning artifact is `brainstorm.md` at
the project root, which lists engine ideas with a checklist of built vs. not
built. There is no architecture doc beyond this HANDOFF and the code itself —
read the code directly rather than looking for a design doc that doesn't exist.

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

The other 12 engines (`fgsm_noise`, `moire_interference`, `optical_flow_jammer`,
`segmentation_shatter`, `fiducial_mimic`, `depth_spoof`, `thermal_decoy`,
`ocr_glitch`, `face_mesh_scramble`, `anchor_box_flood`, `license_plate_ghost`,
`reid_camouflage`) have no `.pde` prototype — they were designed directly in
TypeScript from `brainstorm.md`'s one-line descriptions.

## Progress tracking

Status per `brainstorm.md`'s checklist (re-verified against the live file
this session, not copied from the prior HANDOFF table):

| Engine | Status |
|---|---|
| `cv_dazzle` | built (original 5, pre-dates all git history) |
| `cnn_texture` | built |
| `adversarial_patch` | built |
| `pose_jammer` | built |
| `gabor_grating` | built |
| `fgsm_noise` | built |
| `moire_interference` | built |
| `optical_flow_jammer` | built |
| `segmentation_shatter` | built |
| `fiducial_mimic` | built |
| `depth_spoof` | built |
| `thermal_decoy` | built |
| `ocr_glitch` | built this session |
| `face_mesh_scramble` | built this session |
| `anchor_box_flood` | built this session |
| `license_plate_ghost` | built this session |
| `reid_camouflage` | built this session |

**All 14 engine ideas from `brainstorm.md`'s original idea list are now
built** (17 total engines in the app, `ENGINE_ORDER`/`ENGINES` in
`lib/engines/index.ts` is the canonical count). This session also
brainstormed and appended **18 new ideas** to `brainstorm.md` under 6 new
subsystem headers — all unchecked, none started:

- Detection/recognition confusion (advanced): `anchor_box_flood` (built,
  see above), `license_plate_ghost` (built, see above), `reid_camouflage`
  (built, see above), `saliency_inversion`
- Biometric/liveness attacks: `iris_code_jam`, `liveness_spoof_texture`,
  `gait_scramble`
- Compression/codec-level: `jpeg_dct_bloom`, `rolling_shutter_tear`,
  `codec_macroblock_decoy`
- 3D/geometric reconstruction: `nerf_view_inconsistency`,
  `point_cloud_static`, `slam_feature_desert`
- Forensics/generative-detection: `gan_fingerprint_mask`,
  `steganalysis_noise_bed`, `watermark_collision`
- Temporal/motion: `crowd_count_decoy`, `action_recognition_jitter`

(Three of the "advanced" group were picked up and built this same session
as part of the 5-engine batch — only `saliency_inversion` plus the other 4
headers' 14 ideas remain unbuilt: **15 ideas total remain in the backlog**,
not 18 — the 3 built ones are listed above for traceability since they
originated in this session's own brainstorm, not a prior one.)

There is no issue tracker beyond `brainstorm.md` + this file.

**Git repo:** remote is `origin` →
`https://github.com/kailot-harris/adversary_studio.git`, default branch is
`main`. `git log --oneline | wc -l` is 25 commits, all pushed, working tree
clean as of this writing (`git status` → nothing to commit).

**Validation evidence:** `npm run build` passes clean on `main` as of this
writing (verified fresh after every one of this session's 5 merges, with
`.next` cleared first each time per the build-cache gotcha below, plus one
final verification after all 5 were merged). **No browser-based visual
verification has been done for any of the 17 engines, ever** — every "it
builds" claim in this repo's history is a type-check + static-generation
check only. This is still the single biggest unaddressed gap in this
project's validation story; see "Concrete next step."

## What's actually implemented

| File | Lines | State |
|---|---|---|
| `lib/mulberry32.ts` | 99 | Done. `mulberry32()` core PRNG, `hashStringToSeed()`, `randomSeed()`, and the `Rng` class (`.random()`, `.randomInt()`, seeded 2D Perlin `.noise()` via a seeded permutation table). |
| `lib/color.ts` | 52 | Done. `hsb()` → CSS string, `rgba()` → CSS string, `hsbToRgb()` → `[r,g,b]` tuple for direct `ImageData` writes. |
| `lib/urlState.ts` | 63 | Done. `StudioState` type, `encodeStateToSearchParams()`, `decodeStateFromSearchParams()`. `ENGINE_IDS` here is a **second, manually-maintained copy** of the engine-id list (see duplication gotcha below) — now holds all 17 ids. |
| `lib/engines/types.ts` | 42 | Done. `EngineId` union (17 values), `EngineParams` (density/scale/frequency/accentHue, all 0-1 except hue 0-360), `RenderEngine` interface. |
| `lib/engines/index.ts` | 60 | Done. `ENGINES` record and `ENGINE_ORDER` array, all 17 ids — **this is the third place the engine-id list is duplicated** (see gotcha below). |
| `lib/engines/cvDazzle.ts` | 79 | Done, ported from `adv_cv_dazzle.pde`. |
| `lib/engines/cnnTexture.ts` | 75 | Done, ported from `adv_att_cnn.pde`. Per-pixel `ImageData` loop at full canvas resolution (1024×1024 = ~1M iterations with noise calls) — heaviest engine, see perf note below. |
| `lib/engines/adversarialPatch.ts` | 76 | Done, ported from `adv_patch.pde`. Includes a Catmull-Rom closed-curve helper (`drawCurveClosed`) approximating Processing's `curveVertex`. |
| `lib/engines/poseJammer.ts` | 97 | Done, ported from `adv_pose_jam.pde`. |
| `lib/engines/gaborGrating.ts` | 66 | Done, ported from `adv_gabor.pde`. |
| `lib/engines/fgsmNoise.ts` | 72 | Done. Block-quantized (not full per-pixel) `ImageData` loop — see perf note below. |
| `lib/engines/moireInterference.ts` | 83 | Done. Full per-pixel `ImageData` loop using `sin`/`cos` only (no noise calls), so it's cheap despite being per-pixel. |
| `lib/engines/opticalFlowJammer.ts` | 149 | Done. Vector/arrow-grid engine: seeded-noise base flow field, bent by 2-4 fake vortex attractors, a checkerboard contradiction layer that flips ~half the arrows 150–210°, plus dashed decoy flow streaks. |
| `lib/engines/segmentationShatter.ts` | 93 | Done. Full per-pixel nearest-site distance loop (not noise-driven, so the usual block-quantization guidance doesn't apply) approximating a Voronoi partition, with a sin/cos-warped fracture-line boundary. Up to 60 sites × 1024×1024 pixels — not yet profiled for render-time cost, flag if it turns out to stutter in the browser. |
| `lib/engines/fiducialMimic.ts` | 110 | Done. Tiles scattered seeded ArUco/QR-like binary glyphs (quiet-zone border + random bit payload + chromatic corner tell). |
| `lib/engines/depthSpoof.ts` | 158 | Done. Multiple contradictory vanishing-point line fans plus overlapping skewed quads, each shaded with an independently randomized light direction and a mismatched cast-shadow edge. Defines its own local `hsbToTuple()` helper rather than reusing `lib/color.ts`'s `hsbToRgb()` — functionally fine (verified), just a minor duplication if someone wants to clean it up later. |
| `lib/engines/thermalDecoy.ts` | 93 | Done. Reuses `cv_dazzle`'s asymmetric placement logic, re-skinned with soft radial-gradient IR-palette heat blobs (black→red→yellow→white) plus pinpoint false hotspots. |
| `lib/engines/ocrGlitch.ts` | 160 | Done, built this session (batch of 5, each in its own `git worktree`). Baseline text-row grid scattered with 6 false-letterform/homoglyph glyph-stroke variants. |
| `lib/engines/faceMeshScramble.ts` | 185 | Done, built this session. Extends `poseJammer`'s landmark-confusion approach at much higher point density, arranged in 68-point-style face-mesh regions (eyes/nose/jaw/brow) with contradictory triangulated mesh edges. |
| `lib/engines/anchorBoxFlood.ts` | 123 | Done, built this session. Seeded field of overlapping rectangles at the three canonical anchor-box aspect ratios (1:1, 1:2, 2:1), each with a dashed inset and corner tick to resemble confident detector boxes. |
| `lib/engines/licensePlateGhost.ts` | 155 | Done, built this session. Seeded rectangular "plate" regions with skew/rotation, filled with blocky false alphanumeric glyph strokes, overlapping ghost rectangles. |
| `lib/engines/reidCamouflage.ts` | 119 | Done, built this session. Periodic tiled color-block grid (clothing-texture-camouflage style) with accent-hue-driven palette bank, per-tile jitter and rotation. |
| `components/StudioCanvas.tsx` | 36 | Done. Takes a `canvasRef` prop (not `forwardRef` — see gotcha below), runs the selected engine's `render()` in a `useEffect` keyed on `[canvasRef, engine, seed, params, canvasSize]`. |
| `components/ControlPanel.tsx` | 145 | Done. Engine tab list, 4 sliders, reroll/export/share buttons. Not yet updated with any palette-preset picker (see below). |
| `components/Studio.tsx` | 154 | Done. All state (`engine`, `seed`, `params`, `shareCopied`), URL sync via `router.replace`, keyboard shortcuts (Space=reroll, S=export), PNG export at a fixed 1024px regardless of display size, clipboard-with-fallback share link. |
| `app/layout.tsx` | 22 | Done. JetBrains Mono via `next/font/google`, dark theme. |
| `app/page.tsx` | 10 | Done. Wraps `<Studio />` in `<Suspense>` (required because `Studio` calls `useSearchParams()`). |
| `app/globals.css` | — | Done. Tailwind directives + `.glass-panel` + custom range-slider thumb styling. |
| `app/presets/palettes.ts` | 10 | Done, but **inert** — defines `PALETTES.NEO_BIOLOGY` (a 4-color hex palette object) and is not imported or referenced by any engine, component, or the control panel. Wiring it into the UI (a picker, and some engine or global accent mechanism actually consuming it) remains explicitly deferred, not forgotten. |
| `brainstorm.md` | — | Done. Engine ideas list + status checklist (kept in sync manually with the table above — if you add an engine, update both). |
| `next.config.mjs` | — | Done, but **machine-specific** — see gotcha below. |

No stub files, no half-implemented engines. `grep -rn "TODO\|FIXME\|XXX"`
across `lib/engines/*.ts`, `components/*.tsx`, `app/*.tsx` returns nothing —
all 17 engines in `ENGINES` have complete, non-placeholder `render()`
implementations (verified this session).

**Proposed but explicitly not started (carried over from a prior session,
still untouched):** the user once pasted a 3-part proposal — (1) the
`NEO_BIOLOGY` palette preset above (done, still inert/unwired), (2) a 5th
shared slider ("Harmonic Resonance" / Moiré Intensity) that would need to be
added to `EngineParams` in `lib/engines/types.ts`, threaded through
`ControlPanel.tsx`/`Studio.tsx` state, and `urlState.ts` encode/decode, and
(3) a full WebGL/GLSL fragment-shader rendering backend as an alternative to
the current `CanvasRenderingContext2D`-only `RenderEngine.render()`
interface. The user said "let's just do 1" at the time — #2 and #3 were
**not implemented** and no decision was made on them (e.g. whether #2 is
additive-only with existing engines ignoring it, or whether #3 is meant for
one new engine vs. a wholesale migration of all 17). Don't assume either is
in progress; they're still open proposals, not in-flight work.

## Environment/tooling notes

- **This project has a real `git` repo, with a remote.** `origin` is
  `https://github.com/kailot-harris/adversary_studio.git`; default branch is
  `main`.
- **Next.js version was deliberately bumped off the plan's suggested pin.**
  The original brief called for pinning `next@14.2.5`; that version carries a
  critical Windows-RCE advisory (GHSA-p293-qw3h-jr36) plus ~20 other CVEs
  fixed in later releases. Installed version is `next@15.5.28`. This also
  required one React-19-era TypeScript fix: `StudioCanvas` was changed from
  `forwardRef` + duplicate internal ref (which hit a "Cannot assign to
  read-only 'current'" type error under the Next 15 toolchain) to a plain
  component taking a `canvasRef` prop directly. If you ever see that same
  read-only-`current` error again after touching this file, that's the
  cause — don't reach for `forwardRef` here.
- **`next.config.mjs` hardcodes a LAN IP.** `allowedDevOrigins: ["192.168.0.117"]`
  was added because Next.js 15 blocks cross-origin dev requests by default
  (causing `Failed to fetch` for anyone on the LAN hitting the dev server's
  network URL), and that's the dev machine's IP *at the time this was added*.
  If the router reassigns the machine's IP, LAN access will silently break
  with the same `Failed to fetch` symptom until this value is updated to match
  `ipconfig`'s current address. Check this first if LAN access stops working.
- **Clipboard API needs a fallback on LAN/HTTP.** `navigator.clipboard` is
  `undefined` on any non-secure origin (plain `http://` to a LAN IP, as
  opposed to `localhost` or `https://`). `Studio.tsx`'s `share()` function
  feature-detects `navigator.clipboard?.writeText` and falls back to a
  hidden-`<textarea>` + `document.execCommand('copy')` when it's absent. If
  you ever add another clipboard-writing feature, copy this pattern — don't
  call `navigator.clipboard.writeText` unguarded.
- **SSR/hydration: the initial seed must not use `Math.random()`.** Early in
  this project a hydration mismatch ("server rendered text didn't match the
  client") was caused by computing a random fallback seed inline during
  render (runs once on the server, once on the client, with different
  results). Fix: `Studio.tsx` now uses a fixed `FALLBACK_STATE.seed = 1` for
  the first render (so server and client markup match), and only calls
  `randomSeed()` inside a `useEffect` that runs once after mount, and only
  when the URL had no explicit `seed` param (`searchParams.has("seed")` is
  checked before mount, captured in `hadSeedInUrl`). Do not move seed
  randomization back into the render body.
- **Build-cache gotcha, hit repeatedly across sessions:** after any merge
  that touches `lib/engines/*`, `next build` can fail with "Build error...
  no direct app page entry found for `/_not-found`" or "Cannot read
  properties of undefined (reading 'call')" — a stale `.next` webpack-chunk
  cache. Fix is `rm -rf .next` then re-run `npm run build`. This has now
  bitten every single engine-adding merge across two sessions (12 for 12) —
  **always clear `.next` before trusting a build failure immediately after a
  merge**, don't start debugging the diff first.
- **`npm audit` will always show some findings.** Currently 9 vulnerabilities
  (3 moderate, 6 high) in `tailwindcss`/`postcss` transitive deps (`braces`,
  `chokidar`, `fast-glob`, `micromatch`, `postcss-nested`,
  `postcss-selector-parser`) with no non-breaking fix available (`npm audit
  fix --force` would downgrade/upgrade `tailwindcss` itself — a breaking
  change, not attempted). These are dev-time build tooling only, not shipped
  to the browser. None of this blocked anything; it's expected noise.
- **No browser automation tool is available in this environment.** All
  "verification" done across this project's history is `npm run build`
  (type-check + static generation) plus `curl`/process checks — nobody has
  ever looked at rendered pixels for any of the 17 engines. This is still the
  single biggest gap in this project's validation story; see "Concrete next
  step."
- **Each engine-adding session builds via isolated subagents in their own
  `git worktree`s**, under
  `C:\Users\kailo\kayceeslices\Processing\.worktrees\<engine_id>\` (a
  sibling of this project directory, not inside it). This session's 5
  worktrees were all merged into `main` and then **removed** (`git worktree
  remove` + `git branch -d` for each) — `git worktree list` currently shows
  only the main checkout, nothing stale. If you see that `.worktrees`
  directory reappear with stale content in a future session, it means that
  batch didn't get cleaned up; check `git worktree list` from this repo to
  see what's still registered.
  - **This environment's Agent-tool `isolation: "worktree"` option has never
    worked** — it previously failed with "Cannot create agent worktree: not
    in a git repository and no WorktreeCreate hooks are configured," even
    immediately after a verified-clean `git init` + commit. The workaround
    (used again successfully this session, 5 for 5): manual `git worktree
    add -b <branch> ../.worktrees/<name>` run directly from the main repo,
    then dispatching a plain (non-isolated) subagent with an explicit
    instruction to treat that path as its sole working directory. Don't
    waste time re-attempting the built-in flag — go straight to the manual
    pattern.
  - Every merge of a worktree branch into `main` hit the same 4-file
    conflict (`lib/engines/types.ts`, `lib/engines/index.ts`,
    `lib/urlState.ts`, `brainstorm.md`) because every engine's brief
    independently tells it to append to the same three id-lists and the
    same checklist. This happened again this session (4 of the 5 merges
    conflicted — the first one fast-forwarded since nothing else had
    landed yet). This is expected, not a sign of something wrong — the
    resolution is always "keep both sides' added lines," see the workflow
    section below.
  - The `subagent-brief` skill's `record-result` step requires the
    subagent's final JSON to match `schema/result.v1.json` **exactly**:
    top-level `summary`/`evidence`/`changes` are required fields (not just
    `criteria`), and each criterion needs `id`/`text`/`met`/`evidence_refs`
    (not `description`/`evidence` as loosely implied by the brief
    template's example literal text). A result object with only
    `description`/`evidence` per-criterion fields fails `record-result`
    with `schema_violation` even though the JSON parses fine — read
    `schema/result.v1.json` directly rather than trusting the brief
    template's inline example when building the result file by hand.

## Known architectural duplication (not yet cleaned up)

The list of engine IDs is maintained **in three separate places** that must
be kept in sync by hand whenever an engine is added or removed:
1. `lib/engines/types.ts` — the `EngineId` union type.
2. `lib/engines/index.ts` — `ENGINES` record keys + `ENGINE_ORDER` array.
3. `lib/urlState.ts` — the local `ENGINE_IDS` array (used only to validate
   the `engine` URL param).

All three are currently in sync as of this writing (17 engines each). If you
add engine #18 and the URL's `?engine=` param silently falls back to
`cv_dazzle` instead of selecting the new engine, check `lib/urlState.ts`'s
`ENGINE_IDS` first — it's the one most likely to be forgotten.

## The reusable workflow (for adding a new engine)

This is the pattern two sessions' worth of engines (12 total so far) have
followed via the `subagent-brief` skill's batch mode, and it has worked
cleanly every time:

1. Pick an idea from `brainstorm.md`'s unchecked list (or add a new one there
   first if it's not already listed).
2. Add the new ID to the `EngineId` union in `lib/engines/types.ts`.
3. Write `lib/engines/<camelCaseName>.ts` exporting a `RenderEngine` object
   (`id`, `label`, `description`, `render(ctx, size, rng, params)`). Use
   `params.density/scale/frequency/accentHue` (all normalized 0-1, hue 0-360)
   to drive whatever the engine's internal ranges are — don't introduce new
   per-engine param types, map the shared 4 sliders into your own ranges
   inside the engine file.
   - For noise-driven engines, prefer **block-quantized sampling** (call
     `rng.noise()` once per NxN block, fill the block) over full per-pixel
     noise sampling — `cnn_texture` does the latter and is noticeably the
     heaviest engine at 1024px; `fgsm_noise` deliberately uses the block
     approach instead and is much cheaper for a similar visual density.
   - For `sin`/`cos`-only engines (no noise calls), full per-pixel loops are
     fine — `moire_interference` does this.
   - For vector/shape engines (rectangles, glyph strokes, tiled color
     blocks) a per-primitive loop over seeded positions is the right
     approach, not per-pixel sampling — `anchorBoxFlood.ts`,
     `licensePlateGhost.ts`, and `reidCamouflage.ts` all do this.
   - For non-noise per-pixel math that's still O(pixels × something) —
     e.g. `segmentation_shatter`'s nearest-site search over up to 60 sites —
     the block-quantization guidance doesn't directly apply; just be aware
     it hasn't been profiled in-browser yet (see table above).
4. Register it in `lib/engines/index.ts` (`ENGINES` + `ENGINE_ORDER`) **and**
   `lib/urlState.ts` (`ENGINE_IDS`) — both, or the URL-sharing feature will
   silently misbehave for the new engine (see duplication gotcha above).
5. Update `brainstorm.md`'s checklist.
6. If built in an isolated worktree (recommended once more than one engine
   is in flight at once — see Environment notes above for the workaround
   this environment needs): commit the change in the worktree, then merge
   its branch into `main`. Expect a conflict in exactly the 4 files listed
   above if another engine's branch merged first; resolve by keeping both
   sides' added lines (never pick one side over the other — they're
   independent additive changes, not real disagreements).
7. `rm -rf .next && npm run build` — must pass clean (type-check + static
   page generation) *after clearing the cache*, every single time right
   after a merge (see build-cache gotcha above). Don't trust a build failure
   immediately post-merge without clearing `.next` first.
8. After all branches for a batch are merged and verified, **remove the
   worktrees and their branches** (`git worktree remove <path>` then
   `git branch -d engine/<id>`) so `.worktrees` doesn't accumulate stale
   content across sessions.
9. Update this HANDOFF's "What's actually implemented" and "Progress
   tracking" tables.
10. **Still not done for any of the 17 engines**: actually open the app in a
    browser and look at it. Flag this explicitly when reporting "done"
    rather than implying visual verification happened.

## Concrete next step

`brainstorm.md`'s original 14-idea list is now fully built. The remaining
backlog is the 15 unbuilt ideas from this session's own 18-idea brainstorm
(3 of the 18 — `anchor_box_flood`, `license_plate_ghost`,
`reid_camouflage` — were already built this session). Options, in order of
what's likely most valuable:

**A. Visual verification debt (recommended first, and increasingly
overdue).** Nobody has ever looked at any of the 17 engines rendered in a
browser. Start `npm run dev`, open the app, and click through all 17 engine
tabs, reroll a few times per engine, and sanity-check:
- `ocr_glitch`, `face_mesh_scramble`, `anchor_box_flood`,
  `license_plate_ghost`, and `reid_camouflage` are the highest-priority new
  engines to eyeball — none has any `.pde` prototype or prior visual
  reference, and all 5 were built in this session without ever being
  rendered.
- `segmentation_shatter` and `depth_spoof` carry the same flag from the
  prior HANDOFF — still never visually checked.
- `moire_interference` is still flagged from two HANDOFFs ago as high-risk
  for its beat-pattern math; that flag has never been cleared.
- `cnn_texture` for render-time stall risk (heaviest engine).
- Confirm "Export PNG" (`S` key) and "Fork/Share Link" still round-trip
  correctly now that there are 17 engines instead of 12 — this is the core
  "determinism" requirement and still has never been end-to-end verified.

**B. Continue the new backlog.** 15 ideas remain unbuilt across 5 subsystem
headers in `brainstorm.md` (`saliency_inversion`, `iris_code_jam`,
`liveness_spoof_texture`, `gait_scramble`, `jpeg_dct_bloom`,
`rolling_shutter_tear`, `codec_macroblock_decoy`,
`nerf_view_inconsistency`, `point_cloud_static`, `slam_feature_desert`,
`gan_fingerprint_mask`, `steganalysis_noise_bed`, `watermark_collision`,
`crowd_count_decoy`, `action_recognition_jitter`). The `batch.md` template
at `.subagent-runs/engine-batch.md` is already approved (same template hash
skips the pilot step) — pick the next batch of up to 4-5 (the skill's fixed
concurrency cap is 4) and follow "The reusable workflow" above verbatim.

**C. The deferred proposal.** A prior session's user once proposed (and
explicitly deferred) a 5th "Harmonic Resonance" slider and a WebGL/GLSL
rendering backend. Neither has a design decision yet — if picking this up,
start with a scope conversation (e.g. via the `spec-interview` skill), not
code, since both cut across every existing engine's shared interface.
