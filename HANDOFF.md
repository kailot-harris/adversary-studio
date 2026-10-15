# HANDOFF — ADVERSARY.STUDIO

Written 2026-10-15, after the 7-engine milestone (5 originally scoped engines +
`fgsm_noise` + `moire_interference` added from `brainstorm.md`). For whoever
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

`fgsm_noise` and `moire_interference` have no `.pde` prototype — they were
designed directly in TypeScript from the brainstorm list.

## Progress tracking

Status per `brainstorm.md`'s checklist:

| Engine | Status |
|---|---|
| `cv_dazzle` | built (original 5, this session's predecessor) |
| `cnn_texture` | built |
| `adversarial_patch` | built |
| `pose_jammer` | built |
| `gabor_grating` | built |
| `fgsm_noise` | built this session |
| `moire_interference` | built this session |
| `optical_flow_jammer` | not started |
| `segmentation_shatter` | not started |
| `fiducial_mimic` | not started |
| `depth_spoof` | not started |
| `thermal_decoy` | not started |
| `ocr_glitch` | not started |
| `face_mesh_scramble` | not started |

No issue tracker is in use — this project has no `git` repo (confirmed via
`git status` → "not a git repository") and no GitHub remote. Progress is
tracked only by `brainstorm.md`'s checklist and this file.

**Validation evidence:** `npm run build` passes clean as of this writing (see
"Environment/tooling notes" for exact output). **No browser-based visual
verification has been done for any engine, ever** — this environment has no
browser automation tool. Every "it builds / compiles / dev-server-returns-200"
claim in this repo's history is a type-check and HTTP-reachability check only,
not a visual confirmation that any engine looks right.

## What's actually implemented

| File | Lines | State |
|---|---|---|
| `lib/mulberry32.ts` | 99 | Done. `mulberry32()` core PRNG, `hashStringToSeed()`, `randomSeed()`, and the `Rng` class (`.random()`, `.randomInt()`, seeded 2D Perlin `.noise()` via a seeded permutation table). |
| `lib/color.ts` | 52 | Done. `hsb()` → CSS string, `rgba()` → CSS string, `hsbToRgb()` → `[r,g,b]` tuple for direct `ImageData` writes. |
| `lib/urlState.ts` | 53 | Done. `StudioState` type, `encodeStateToSearchParams()`, `decodeStateFromSearchParams()`. `ENGINE_IDS` here is a **second, manually-maintained copy** of the engine-id list (see gotcha below). |
| `lib/engines/types.ts` | 32 | Done. `EngineId` union (7 values), `EngineParams` (density/scale/frequency/accentHue, all 0-1 except hue 0-360), `RenderEngine` interface. |
| `lib/engines/index.ts` | 30 | Done. `ENGINES` record and `ENGINE_ORDER` array — **this is the third place the engine-id list is duplicated** (see gotcha below). |
| `lib/engines/cvDazzle.ts` | 79 | Done, ported from `adv_cv_dazzle.pde`. |
| `lib/engines/cnnTexture.ts` | 75 | Done, ported from `adv_att_cnn.pde`. Per-pixel `ImageData` loop at full canvas resolution (1024×1024 = ~1M iterations with noise calls) — see perf note below. |
| `lib/engines/adversarialPatch.ts` | 76 | Done, ported from `adv_patch.pde`. Includes a Catmull-Rom closed-curve helper (`drawCurveClosed`) approximating Processing's `curveVertex`. |
| `lib/engines/poseJammer.ts` | 97 | Done, ported from `adv_pose_jam.pde`. |
| `lib/engines/gaborGrating.ts` | 66 | Done, ported from `adv_gabor.pde`. |
| `lib/engines/fgsmNoise.ts` | 72 | Done, new this session. Block-quantized (not full per-pixel) `ImageData` loop — see perf note below. |
| `lib/engines/moireInterference.ts` | 83 | Done, new this session. Full per-pixel `ImageData` loop using `sin`/`cos` only (no noise calls), so it's cheap despite being per-pixel. |
| `components/StudioCanvas.tsx` | 36 | Done. Takes a `canvasRef` prop (not `forwardRef` — see gotcha below), runs the selected engine's `render()` in a `useEffect` keyed on `[canvasRef, engine, seed, params, canvasSize]`. |
| `components/ControlPanel.tsx` | 145 | Done. Engine tab list, 4 sliders, reroll/export/share buttons. |
| `components/Studio.tsx` | 154 | Done. All state (`engine`, `seed`, `params`, `shareCopied`), URL sync via `router.replace`, keyboard shortcuts (Space=reroll, S=export), PNG export at a fixed 1024px regardless of display size, clipboard-with-fallback share link. |
| `app/layout.tsx` | 22 | Done. JetBrains Mono via `next/font/google`, dark theme. |
| `app/page.tsx` | 10 | Done. Wraps `<Studio />` in `<Suspense>` (required because `Studio` calls `useSearchParams()`). |
| `app/globals.css` | — | Done. Tailwind directives + `.glass-panel` + custom range-slider thumb styling. |
| `brainstorm.md` | — | Done. Engine ideas list + status checklist (kept in sync manually with the table above — if you add an engine, update both). |
| `next.config.mjs` | — | Done, but **machine-specific** — see gotcha below. |

No stub files, no half-implemented engines. All 7 engines in `ENGINES` have
complete, non-placeholder `render()` implementations.

## Environment/tooling notes

- **Not a git repo.** `git status` → "fatal: not a git repository". No
  `.gitignore` exists either, even though `node_modules/` and `.next/` are
  present on disk. If you `git init` here, write a `.gitignore` (`node_modules`,
  `.next`, `out`) *before* the first `git add`, or you will stage ~100MB+ of
  build output and dependencies.
- **Next.js version was deliberately bumped off the plan's suggested pin.**
  The original brief called for pinning `next@14.2.5`; that version carries a
  critical Windows-RCE advisory (GHSA-p293-qw3h-jr36) plus ~20 other CVEs
  fixed in later releases. Installed version is `next@15.5.28` (patches all
  of them as of this writing). This also required one React-19-era TypeScript
  fix: `StudioCanvas` was changed from `forwardRef` + duplicate internal ref
  (which hit a "Cannot assign to read-only 'current'" type error under the
  Next 15 toolchain) to a plain component taking a `canvasRef` prop directly.
  If you ever see that same read-only-`current` error again after touching
  this file, that's the cause — don't reach for `forwardRef` here.
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
- **Build-cache gotcha:** after bumping the `next` version (or any major
  dependency change), the runtime error "Cannot read properties of undefined
  (reading 'call')" showed up — classic stale `.next` webpack-chunk cache. Fix
  was `rm -rf .next` + restart `npm run dev`. If a fresh agent hits this same
  error after installing/upgrading a package, try that before investigating
  code.
- **`npm audit` will always show some findings.** `tailwindcss`/`postcss`
  transitive deps (`braces`, `chokidar`, `fast-glob`, `micromatch`,
  `postcss-nested`, `postcss-selector-parser`) have known advisories with no
  non-breaking fix available at time of writing; these are dev-time build
  tooling only, not shipped to the browser. One moderate `next` advisory also
  remains after the 15.5.28 bump (not yet confirmed which one — rerun
  `npm audit` to check if a newer patch has landed). None of this blocked
  anything; it's just expected `npm audit` noise, not a regression to chase.
- **Dev server was NOT left running** at the end of this session (confirmed:
  `curl localhost:3000` → connection refused). Start it fresh with
  `npm run dev` before doing anything that needs the running app.
- **No browser automation tool is available in this environment.** All
  "verification" done so far is `npm run build` (type-check + static
  generation) and `curl` reachability checks — nobody has ever looked at
  rendered pixels for any of the 7 engines. This is the single biggest gap
  in this project's validation story; see "Concrete next step."

## Known architectural duplication (not yet cleaned up)

The list of 7 engine IDs is maintained **in three separate places** that must
be kept in sync by hand whenever an engine is added or removed:
1. `lib/engines/types.ts` — the `EngineId` union type.
2. `lib/engines/index.ts` — `ENGINES` record keys + `ENGINE_ORDER` array.
3. `lib/urlState.ts` — the local `ENGINE_IDS` array (used only to validate
   the `engine` URL param).

All three are currently in sync as of this writing (7 engines each). If you
add engine #8 and the URL's `?engine=` param silently falls back to
`cv_dazzle` instead of selecting the new engine, check `lib/urlState.ts`'s
`ENGINE_IDS` first — it's the one most likely to be forgotten.

## The reusable workflow (for adding a new engine)

This is the pattern the last two engines (`fgsm_noise`, `moire_interference`)
followed, and it worked cleanly both times:

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
3. Register it in `lib/engines/index.ts` (`ENGINES` + `ENGINE_ORDER`) **and**
   `lib/urlState.ts` (`ENGINE_IDS`) — both, or the URL-sharing feature will
   silently misbehave for the new engine (see duplication gotcha above).
4. Update `brainstorm.md`'s checklist.
5. `npm run build` — must pass clean (type-check + static page generation)
   before considering it done.
6. Update this HANDOFF's "What's actually implemented" and "Progress
   tracking" tables.
7. **Not yet done for any engine, including the original 5**: actually open
   it in a browser and look at it. Flag this explicitly when reporting
   "done" rather than implying visual verification happened.

## Concrete next step

Two options, pick based on what the person picking this up cares about more:

**A. Visual verification debt (recommended first).** Nobody has ever looked
at any of the 7 engines rendered in a browser. Start `npm run dev`, open
`http://localhost:3000`, and click through all 7 engine tabs, reroll a few
times per engine, and sanity-check:
- `moire_interference` is the highest-risk one to check first — its
  visual output is very sensitive to the exact pitch/frequency math (see the
  tuning note in its own file), and it's plausible the beat-pattern spacing
  looks nothing like the intended "fine moiré aliasing" at typical screen
  sizes vs. the 1024px export size.
- `cnn_texture` next, both for correctness and to eyeball whether its
  per-pixel noise loop causes a noticeable render stall (it's the heaviest
  engine — see perf note above).
- Confirm "Export PNG" (`S` key) actually downloads a 1024×1024 PNG that
  matches what's on screen, and "Fork/Share Link" produces a URL that, when
  opened fresh, reproduces the identical image (this is the core
  "determinism" requirement from the original brief — it's implemented but
  never end-to-end verified).

**B. Next engine from the brainstorm backlog.** If visual verification isn't
the priority right now, `optical_flow_jammer` (conflicting motion-vector
arrows/false flow fields) is a reasonable next pick — it's vector/line-based
like `pose_jammer` and `cv_dazzle` rather than per-pixel `ImageData` work, so
it reuses patterns already proven out in this codebase rather than
introducing a third rendering style. Follow the 7-step workflow above.

After either: this project still has no git history at all. If multi-session
work is going to continue, consider asking the user whether to `git init` +
first commit now (remember to write `.gitignore` first — see gotcha above).
