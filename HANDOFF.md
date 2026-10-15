# HANDOFF — ADVERSARY.STUDIO

Written 2026-10-15, after the 12-engine milestone (7 engines from the prior
HANDOFF + `optical_flow_jammer`, `segmentation_shatter`, `fiducial_mimic`,
`depth_spoof`, `thermal_decoy` built this session via the `subagent-brief`
skill) and after this project's first `git` history was created. For whoever
picks this up next — human or fresh agent, no prior session context assumed.

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

The other 7 engines (`fgsm_noise`, `moire_interference`, `optical_flow_jammer`,
`segmentation_shatter`, `fiducial_mimic`, `depth_spoof`, `thermal_decoy`) have
no `.pde` prototype — they were designed directly in TypeScript from the
`brainstorm.md` list.

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
| `optical_flow_jammer` | built this session |
| `segmentation_shatter` | built this session |
| `fiducial_mimic` | built this session |
| `depth_spoof` | built this session |
| `thermal_decoy` | built |
| `ocr_glitch` | built this session |
| `face_mesh_scramble` | built this session |
| `anchor_box_flood` | built this session |
| `license_plate_ghost` | built this session |
| `reid_camouflage` | built this session |

All 14 engines from `brainstorm.md`'s original idea list are now built (17
total engines in the app). This session also brainstormed and appended 18
new ideas to `brainstorm.md` across 6 new subsystem headers (detection/NMS,
biometric/liveness, codec-level, 3D reconstruction, forensics/generative-
detection, temporal/motion) — all 18 are unchecked/not started. There is no
issue tracker beyond `brainstorm.md` + this file.

**This project now has a `git` repo** (it did not, as of the prior HANDOFF).
`git init` was done this session, with `.gitignore` written before the first
`add` (contains `node_modules`, `.next`, `out`, `.subagent-runs`). Remote is
`origin` → `https://github.com/kailot-harris/adversary_studio.git`, default
branch is `main` (renamed from the initial `master` this session — if you see
any stray reference to `master`, e.g. in an old local branch or bookmark,
it's stale). `git log --oneline` currently shows 13 commits, all pushed.

**Validation evidence:** `npm run build` passes clean on `main` as of this
writing (verified fresh this session after every merge, not just the first
one). **No browser-based visual verification has been done for any of the
12 engines, ever** — every "it builds" claim in this repo's history is a
type-check + static-generation check only. A dev server (`npm run dev`) was
observed running and reachable (`curl localhost:3000` → `200`) at the time
this HANDOFF was written, but that server was not started by this session's
automated work and nobody used it to look at rendered pixels — don't treat
its presence as visual verification having happened.

## What's actually implemented

| File | Lines | State |
|---|---|---|
| `lib/mulberry32.ts` | 99 | Done. `mulberry32()` core PRNG, `hashStringToSeed()`, `randomSeed()`, and the `Rng` class (`.random()`, `.randomInt()`, seeded 2D Perlin `.noise()` via a seeded permutation table). |
| `lib/color.ts` | 52 | Done. `hsb()` → CSS string, `rgba()` → CSS string, `hsbToRgb()` → `[r,g,b]` tuple for direct `ImageData` writes. |
| `lib/urlState.ts` | 58 | Done. `StudioState` type, `encodeStateToSearchParams()`, `decodeStateFromSearchParams()`. `ENGINE_IDS` here is a **second, manually-maintained copy** of the engine-id list (see duplication gotcha below) — now holds all 12 ids. |
| `lib/engines/types.ts` | 37 | Done. `EngineId` union (12 values), `EngineParams` (density/scale/frequency/accentHue, all 0-1 except hue 0-360), `RenderEngine` interface. |
| `lib/engines/index.ts` | 45 | Done. `ENGINES` record and `ENGINE_ORDER` array, all 12 ids — **this is the third place the engine-id list is duplicated** (see gotcha below). |
| `lib/engines/cvDazzle.ts` | 79 | Done, ported from `adv_cv_dazzle.pde`. |
| `lib/engines/cnnTexture.ts` | 75 | Done, ported from `adv_att_cnn.pde`. Per-pixel `ImageData` loop at full canvas resolution (1024×1024 = ~1M iterations with noise calls) — heaviest engine, see perf note below. |
| `lib/engines/adversarialPatch.ts` | 76 | Done, ported from `adv_patch.pde`. Includes a Catmull-Rom closed-curve helper (`drawCurveClosed`) approximating Processing's `curveVertex`. |
| `lib/engines/poseJammer.ts` | 97 | Done, ported from `adv_pose_jam.pde`. |
| `lib/engines/gaborGrating.ts` | 66 | Done, ported from `adv_gabor.pde`. |
| `lib/engines/fgsmNoise.ts` | 72 | Done. Block-quantized (not full per-pixel) `ImageData` loop — see perf note below. |
| `lib/engines/moireInterference.ts` | 83 | Done. Full per-pixel `ImageData` loop using `sin`/`cos` only (no noise calls), so it's cheap despite being per-pixel. |
| `lib/engines/opticalFlowJammer.ts` | 149 | Done, built this session. Vector/arrow-grid engine: seeded-noise base flow field, bent by 2-4 fake vortex attractors, a checkerboard contradiction layer that flips ~half the arrows 150–210°, plus dashed decoy flow streaks. |
| `lib/engines/segmentationShatter.ts` | 93 | Done, built this session. Full per-pixel nearest-site distance loop (not noise-driven, so the usual block-quantization guidance doesn't apply) approximating a Voronoi partition, with a sin/cos-warped fracture-line boundary. Up to 60 sites × 1024×1024 pixels — not yet profiled for render-time cost, flag if it turns out to stutter in the browser. |
| `lib/engines/fiducialMimic.ts` | 110 | Done, built this session. Tiles scattered seeded ArUco/QR-like binary glyphs (quiet-zone border + random bit payload + chromatic corner tell). |
| `lib/engines/depthSpoof.ts` | 158 | Done, built this session. Multiple contradictory vanishing-point line fans plus overlapping skewed quads, each shaded with an independently randomized light direction and a mismatched cast-shadow edge. Defines its own local `hsbToTuple()` helper rather than reusing `lib/color.ts`'s `hsbToRgb()` — functionally fine (verified), just a minor duplication if someone wants to clean it up later. |
| `lib/engines/thermalDecoy.ts` | 93 | Done, built this session. Reuses `cv_dazzle`'s asymmetric placement logic, re-skinned with soft radial-gradient IR-palette heat blobs (black→red→yellow→white) plus pinpoint false hotspots. |
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
| `app/presets/palettes.ts` | 10 | Done, but **inert** — defines `PALETTES.NEO_BIOLOGY` (a 4-color hex palette object) and is not imported or referenced by any engine, component, or the control panel. Added this session at the user's request as a data-only preset; wiring it into the UI (a picker, and some engine or global accent mechanism actually consuming it) was explicitly deferred, not forgotten. |
| `brainstorm.md` | — | Done. Engine ideas list + status checklist (kept in sync manually with the table above — if you add an engine, update both). |
| `next.config.mjs` | — | Done, but **machine-specific** — see gotcha below. |

No stub files, no half-implemented engines. All 12 engines in `ENGINES` have
complete, non-placeholder `render()` implementations.

**Proposed but explicitly not started:** in this same session, the user
pasted a 3-part proposal — (1) the `NEO_BIOLOGY` palette preset above
(done), (2) a 5th shared slider ("Harmonic Resonance" / Moiré Intensity)
that would need to be added to `EngineParams` in `lib/engines/types.ts`,
threaded through `ControlPanel.tsx`/`Studio.tsx` state, and `urlState.ts`
encode/decode, and (3) a full WebGL/GLSL fragment-shader rendering backend
as an alternative to the current `CanvasRenderingContext2D`-only
`RenderEngine.render()` interface. The user said "let's just do 1" — #2 and
#3 were **not implemented** and no decision was made on them (e.g. whether
#2 is additive-only with existing engines ignoring it, or whether #3 is
meant for one new engine vs. a wholesale migration of all 12). Don't assume
either is in progress; they're open proposals, not in-flight work.

## Environment/tooling notes

- **This project now has a real `git` repo, with a remote.** It did not as
  of the prior HANDOFF. `origin` is
  `https://github.com/kailot-harris/adversary_studio.git`; default branch is
  `main`. If you're a fresh agent and your instincts say "check `git log`
  first," that now works — it didn't used to.
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
- **Build-cache gotcha, hit repeatedly this session:** after any merge that
  touches `lib/engines/*`, `next build` can fail with "Build error... no
  direct app page entry found for `/_not-found`" or "Cannot read properties
  of undefined (reading 'call')" — a stale `.next` webpack-chunk cache. Fix
  is `rm -rf .next` then re-run `npm run build`. This bit every single merge
  this session (5 for 5) — **always clear `.next` before trusting a build
  failure immediately after a merge**, don't start debugging the diff first.
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
  ever looked at rendered pixels for any of the 12 engines. This is still the
  single biggest gap in this project's validation story; see "Concrete next
  step."
- **Each new engine this session was built by an isolated subagent in its
  own `git worktree`**, under `C:\Users\kailo\kayceeslices\Processing\.worktrees\<engine_id>\`
  (a sibling of this project directory, not inside it). All 5 worktrees for
  this session's engines were merged into `main` and removed afterward — if
  you see that `.worktrees` directory reappear with stale content, it means
  a future batch didn't get cleaned up; check `git worktree list` from this
  repo to see what's still registered.
  - **This environment's Agent-tool `isolation: "worktree"` option did not
    work** — it failed with "Cannot create agent worktree: not in a git
    repository and no WorktreeCreate hooks are configured," even
    immediately after a verified-clean `git init` + commit in this exact
    directory. The workaround used was manual: `git worktree add -b
    <branch> ../.worktrees/<name>` run directly, then dispatching a plain
    (non-isolated) subagent with an explicit instruction to treat that path
    as its sole working directory. If this is still broken next session,
    don't waste time re-attempting the built-in flag — go straight to the
    manual `git worktree add` + explicit-directory-instruction pattern.
  - Every merge of a worktree branch into `main` hit the same 4-file
    conflict (`lib/engines/types.ts`, `lib/engines/index.ts`,
    `lib/urlState.ts`, `brainstorm.md`) because every engine's brief
    independently tells it to append to the same three id-lists and the
    same checklist. This is expected, not a sign of something wrong — the
    resolution is always "keep both sides' added lines," see the workflow
    section below.

## Known architectural duplication (not yet cleaned up)

The list of engine IDs is maintained **in three separate places** that must
be kept in sync by hand whenever an engine is added or removed:
1. `lib/engines/types.ts` — the `EngineId` union type.
2. `lib/engines/index.ts` — `ENGINES` record keys + `ENGINE_ORDER` array.
3. `lib/urlState.ts` — the local `ENGINE_IDS` array (used only to validate
   the `engine` URL param).

All three are currently in sync as of this writing (12 engines each). If you
add engine #13 and the URL's `?engine=` param silently falls back to
`cv_dazzle` instead of selecting the new engine, check `lib/urlState.ts`'s
`ENGINE_IDS` first — it's the one most likely to be forgotten.

## The reusable workflow (for adding a new engine)

This is the pattern this session's 5 engines followed (via the
`subagent-brief` skill's batch mode), and it worked cleanly for all 5:

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
8. Update this HANDOFF's "What's actually implemented" and "Progress
   tracking" tables.
9. **Still not done for any of the 12 engines**: actually open the app in a
   browser and look at it. Flag this explicitly when reporting "done"
   rather than implying visual verification happened.

## Concrete next step

Only 2 unbuilt engines remain in `brainstorm.md`: `ocr_glitch` and
`face_mesh_scramble`. Options, in order of what's likely most valuable:

**A. Visual verification debt (recommended first, and overdue).** Nobody
has ever looked at any of the 12 engines rendered in a browser. Start
`npm run dev` (or use the one already observed running at
`localhost:3000`, PID varies — check with `netstat -ano | findstr :3000`
before assuming it's stale), open the app, and click through all 12 engine
tabs, reroll a few times per engine, and sanity-check:
- `segmentation_shatter` and `depth_spoof` are the highest-priority new
  engines to eyeball — neither has any `.pde` prototype or prior visual
  reference to compare against, unlike the original 5.
- `moire_interference` is still flagged from the prior HANDOFF as
  high-risk for its beat-pattern math; that flag has never been cleared.
- `cnn_texture` for render-time stall risk (heaviest engine).
- Confirm "Export PNG" (`S` key) and "Fork/Share Link" still round-trip
  correctly now that there are 12 engines instead of 7 — this is the core
  "determinism" requirement and still has never been end-to-end verified.

**B. Finish the brainstorm backlog.** Only `ocr_glitch` (homoglyph/false-
letterform scatter) and `face_mesh_scramble` (denser `pose_jammer`-style
landmark confusion, 68-point face mesh instead of full-body pose) remain.
At 2 items, this is small enough to run as a single non-pilot batch (the
`batch.md` template used this session is already approved — same template
hash skips the pilot step). After these 2, `brainstorm.md`'s original idea
list is fully exhausted and new ideas will need to be brainstormed before
more engines can be added this way.

**C. The deferred proposal.** The user proposed (and explicitly deferred,
see "What's actually implemented" above) a 5th "Harmonic Resonance" slider
and a WebGL/GLSL rendering backend. Neither has a design decision yet —
if picking this up, start with a scope conversation (e.g. via the
`spec-interview` skill), not code, since both cut across every existing
engine's shared interface.
