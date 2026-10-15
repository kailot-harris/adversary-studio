# HANDOFF — ADVERSARY.STUDIO

Written 2026-10-15, after the 32-engine milestone (prior HANDOFF state) was
followed by three more things in this same session: (1) **Stages 0-4 of
`ENGINE_SELECTOR_PLAN.md` are implemented, bug-fixed, user-verified live on a
phone, and pushed to `main`** — the flat 32-button engine list is now a
collapsed-by-default, 5-category accordion; (2) **the project's first test
runner (Vitest) was added**, previously nonexistent; and (3) **the first
real pass of live browser verification ever done on this project happened
this session, on mobile, and it immediately caught two real bugs** — see
"Progress tracking" for both; after both fixes, the user re-tested live
and confirmed the fix held — selected `reid_camouflage` via the "Biometric
& Identity" category, saw its color-blocked tile canvas render correctly,
full dark theme/glass panel styling intact, collapsed accordion reading
"ENGINE · ReID Camouflage" as expected. **Stage 5 of
`ENGINE_SELECTOR_PLAN.md` (the rest of the manual verification checklist)
is still the next unit of work** — the accordion and one non-default
engine are now confirmed *working* on mobile, but the full checklist
(375px devtools emulation, keyboard nav, desktop sidebar check, the other
30 engines' click-through) has not been run. For whoever picks this up
next — human or fresh agent, no prior session context assumed.

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

**No spec document exists for adding engines.** The only planning artifact
for that is `brainstorm.md` at the project root, which lists engine ideas
with a checklist of built vs. not built. **As of this writing, every single
checklist line in that file is checked** — there is no unbuilt backlog
remaining. If you're picking this project up to add more engines, you'll
need to brainstorm new ideas first (see "Concrete next step," option C).

**A real staged plan does exist for the UI restructure**: `ENGINE_SELECTOR_PLAN.md`
at the repo root. Its checkboxes track 6 stages (0-5); **stages 0-4 are now
checked off and implemented** (this session), **stage 5 (manual browser
verification) is partially exercised but its checklist is still unchecked**
— read that file's "Stage 5" section, and "Progress tracking" below, before
doing anything else. There is no other architecture doc beyond this
HANDOFF and the code itself — read the code directly rather than looking
for a design doc that doesn't exist.

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

**`ENGINE_SELECTOR_PLAN.md` — stages 0-4 implemented and bug-fixed this
session; stage 5 partially covered, not finished.** Three commits on
`main` (all pushed, in order):

1. `703100d` "Replace flat 32-engine button list with categorized accordion
   selector" — stages 0-4: `lib/engines/categories.ts` (data layer),
   `lib/engines/categories.check.mjs` (consistency check), new
   `components/EngineSelector.tsx` (the accordion itself, replacing the
   inline block that used to live in `components/ControlPanel.tsx`), plus
   the touch-target/accessibility pass (stage 4). Built by a dispatched
   subagent in an isolated worktree, independently re-verified afterward
   (re-read both new files in full, re-ran the consistency check and
   `rm -rf .next && npm run build` myself) before merging.
2. `4a12afd` "Add Vitest as the project's test runner" — unrelated to the
   accordion itself; bundled into the same session because the user asked
   "Can we fix this: No test runner is configured" mid-task. See
   "Environment/tooling notes" below for exactly what it added.
3. `3f2340b` "Fix engine accordion: inner category toggles stomped back to
   current category" — **a real bug the user caught on their first live
   mobile test**, within minutes of the accordion existing. See the bug
   writeup directly below; don't assume commit 1's "build passes clean" was
   sufficient evidence of correctness — it wasn't, this bug was invisible
   to `npm run build` and was only caught by actually clicking the thing.

The plan's own checkboxes in `ENGINE_SELECTOR_PLAN.md` have been updated to
match: stages 0-4's 20 items are `- [x]`, stage 5's 6 items are still
`- [ ]` — **but stage 5 is now partially exercised in practice**, not fully
unstarted: the user loaded the real page on a real phone over LAN and
confirmed (after both bugs below were fixed) that categories open/close
correctly, engine selection re-collapses the panel, and — in a second,
later live check — selecting `reid_camouflage` from the "Biometric &
Identity" category correctly rendered its color-blocked-tile canvas output
with full styling intact (the first non-default engine ever
browser-confirmed on this project; `cv_dazzle`, the default, was the one
exercised while fixing the two bugs). What's *not* yet done from stage 5's
checklist: 375px devtools viewport emulation specifically, keyboard-only
operation, the desktop `w-80` sidebar check, and clicking through the
other 30 engine tabs. See "Concrete next step."

**Bug 1 (caught by the user, non-accordion): the whole page rendered
completely unstyled on mobile** — no dark theme, no glassmorphic panel,
default browser buttons/sliders, blank canvas. This looked like a
CSS/responsive problem but wasn't. **Root cause: a race between a live
`next dev` server and repeated `rm -rf .next && npm run build` runs during
this same session.** Three dev-server instances had been running since
~12:12 AM (likely left over from an earlier session), all sharing the
project's single `.next` directory. Every `rm -rf .next && npm run build`
I ran to verify the accordion (both mine and the subagent's) wiped that
directory out from under the live dev server's asset serving — the JS
bundle kept running (hence plain-text labels/controls still rendering) but
the CSS chunk the dev server was serving broke, and the canvas's `render()`
effect apparently didn't recover either. **Fix:** killed the stale
`next dev` process trees (`taskkill //F //T //PID <pid>` — found via
`Get-NetTCPConnection -State Listen` on ports 3000/3001, then walked up to
the top-level `npm run dev` ancestor via `Get-CimInstance Win32_Process
... ParentProcessId`, since killing only the leaf `start-server.js` PID got
it auto-respawned by its `next dev` parent) and started one clean instance.
Confirmed fixed by `curl`-ing `/_next/static/css/app/layout.css` directly
and seeing real Tailwind output (24KB), not a 404/empty response. **If you
run `rm -rf .next && npm run build` for verification purposes while `npm
run dev` is also running, expect this exact failure mode again** — either
stop the dev server first, or accept you'll need to restart it after.

**Bug 2 (caught by the user, in the accordion itself): tapping any
category other than the one containing the currently-selected engine
immediately closed again** ("it just microrefreshes and reopens the
biometric & identity leaf"). **Root cause: a genuine React gotcha, not a
authoring mistake in the obvious sense** — React's synthetic `onToggle`
event handler re-fires for *nested* `<details>` toggles, even though the
native DOM `toggle` event does not bubble per spec. The outer selector's
`handleOuterToggle` (meant to fire only when the outer panel itself
expands) was therefore re-running on every inner category's open/close,
each time force-reopening `categoryOf(engine)` — i.e. whichever category
contains the currently-selected engine — and stomping over whatever
category the user had just tried to open. **Fix (`components/EngineSelector.tsx`,
`handleOuterToggle`):** added `e.target !== outer` as an early-return guard,
so the handler only acts when the toggle event's target is the outer
`<details>` element itself. If you add more nested `<details>`/`onToggle`
anywhere else in this codebase, assume React's bubbling-even-though-DOM-
doesn't behavior applies there too — check `event.target` rather than
trusting that an ancestor's `onToggle` only fires for its own state change.

---

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
`main`. The 15-engine batch's commits (prior part of this session), this
session's engine-selector/Vitest/bugfix commits (`703100d`, `4a12afd`,
`3f2340b`), and the prior version of this HANDOFF update (`9efa1b6`) are
all pushed. `git status --porcelain` is clean as of this writing except
for this doc's own in-progress edit — commit and push once reviewed.

**Validation evidence:** `npm run build` passes clean on `main` as of this
writing (verified fresh after every one of the 15-engine session's 4
merge-batches, with `.next` cleared first each time per the build-cache
gotcha below, plus again after the engine-selector work and both bugfixes
landed — `rm -rf .next && npm run build`, zero errors, static generation
4/4; `npm run test` also passes, 4/4). **30 of the 32 individual engines'
rendered output has never been browser-verified** — every "it builds"
claim for them is still a type-check + static-generation check only.
**Two engines now have real browser verification, both live on mobile by
the user:** `cv_dazzle` (the default, exercised while fixing the two bugs
below) and `reid_camouflage` (a deliberate second check after both fixes,
confirming the fix held and that engine selection + rendering works for a
non-default engine too). This is the first time any part of this project
has had real browser verification — see "Concrete next step" for the
other 30.

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
| `components/ControlPanel.tsx` | 127 | Done. No longer contains the engine list inline (see `EngineSelector.tsx` below) — now just renders `<EngineSelector />`, the SEED readout, 4 sliders, and reroll/export/share buttons. Not yet updated with any palette-preset picker (see below). |
| `components/EngineSelector.tsx` | 96 | Done, bug-fixed, user-verified live on mobile this session. The collapsed-by-default 5-category accordion (see "Progress tracking" for the bug both in getting it right and in its one real bug). |
| `lib/engines/categories.ts` | 111 | Done this session. `CATEGORIES` (5 buckets, ≤7 engines each), `categoryOf()`, `UNCATEGORIZED` sentinel, plus a dev-time runtime consistency guard. |
| `lib/engines/categories.check.mjs` | 107 | Done this session. Standalone Node script (no test runner dependency) asserting `CATEGORIES` and `ENGINE_ORDER` stay set-equal; run via `node lib/engines/categories.check.mjs`. |
| `vitest.config.ts` | 13 | Done this session. Resolves the `@/*` path alias for Vitest. |
| `lib/mulberry32.test.ts` | 30 | Done this session. Smoke-test spec proving the test runner, alias, and TS all work — not exhaustive engine coverage, just a runner-works proof. |
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
  since nothing changed about the dependency tree; expected noise. **As of
  this session this list grew by one, and it's worth reading rather than
  dismissing as more noise:** adding `vitest` pulled in `tinypool`, which
  `npm audit` flags as a **critical** prototype-pollution-to-RCE advisory
  (`GHSA-5gmw-xhrv-c9v3` / `GHSA-85c8-ppgw-ccpr`). The fix is `vitest@5`,
  which requires `@types/node@^22||>=24` — this project pins `@types/node@^20`
  deliberately, so `vitest@2.1.9` was installed instead to avoid that bump.
  `tinypool` is Vitest's own worker-pool implementation, dev-only, never
  shipped to the browser or to production — but if you ever add a CI
  pipeline that runs `npm audit` as a gate, this one will need an explicit
  allowlist entry or the `@types/node`/`vitest` major-version bump, not a
  silent ignore.
- **No browser automation tool is available in this environment.** Until
  this session, all "verification" across this project's history was
  `npm run build` (type-check + static generation only) — nobody had ever
  looked at rendered pixels for any of the 32 engines. **This session broke
  that pattern for the first time**, via the user testing live on a phone
  over LAN, and it immediately paid off: it caught two real bugs (see
  "Progress tracking") that `npm run build` passing clean had completely
  missed. Take this as confirmation, not reassurance — "build passes" is
  not evidence of correctness for anything interactive or visual in this
  codebase. Two engines (`cv_dazzle`, `reid_camouflage`) now have live
  mobile verification; the other 30 still have zero browser-based
  verification.
- **Dev-server-vs-build race, hit fresh this session (new gotcha, distinct
  from the build-cache gotcha above):** running `rm -rf .next && npm run
  build` while a `next dev` server is also running against the same
  project directory corrupts the dev server's live asset serving — JS
  keeps running (React still renders) but CSS chunks and possibly other
  assets break, with no error surfaced to the terminal running `next dev`.
  Symptom looked exactly like "Tailwind isn't loading on mobile" rather
  than "the dev server is in a broken state," which cost real debugging
  time before the actual cause was found. **If you need to verify a build
  while a dev server might be running, check for it first** (e.g.
  `Get-NetTCPConnection -State Listen` on 3000/3001 in PowerShell, or
  `netstat -ano | grep :3000` in Bash) and either stop it first or restart
  it fresh afterward — don't assume a dev server you didn't start yourself
  isn't there. Killing `next dev`'s process requires killing the whole
  tree, not just the leaf `start-server.js` process — its `next dev` CLI
  parent auto-respawns a killed server child. On Windows:
  `taskkill //F //T //PID <top-level pid>` (double slashes needed if run
  through Git Bash, which otherwise mangles `/F`/`/T` as path segments).
- **React `onToggle` bubbles across nested `<details>` even though the
  native DOM `toggle` event doesn't — a real gotcha, not a one-off
  mistake.** Bit `EngineSelector.tsx`'s outer/inner `<details>` nesting this
  session (see "Progress tracking," Bug 2) and is exactly the kind of thing
  that will bite again if more nested `<details>`/`onToggle` pairs get
  added anywhere in this codebase. Guard any outer-element `onToggle`
  handler with `event.target !== <the element the handler is actually
  attached to>` before trusting that it only fires for that element's own
  state change.
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

**A. Finish `ENGINE_SELECTOR_PLAN.md` stage 5 (recommended — accordion
already works, this is just the remaining checklist items).** Stages 0-4
are done, bug-fixed, and confirmed working live on a phone this session
(see "Progress tracking"). What's left from stage 5's own checklist, not
yet done:
- 375px-wide devtools viewport emulation pass (distinct from real-phone
  testing already done — confirm no overflow/cramping at that exact width).
- Keyboard-only operation: Tab to the selector, Enter/Space to expand, Tab
  through category headers, Enter/Space to open one, Tab to an engine
  button, Enter/Space to select it.
- The existing desktop `w-80` fixed-sidebar layout — confirm it still
  looks right now that the panel's default (collapsed) height is shorter.
- Folded in from the pre-existing validation debt in option B below:
  clicking through all 32 engine tabs at least once, confirming none
  render a blank/broken canvas (this still hasn't been done for *any* of
  the 32 engines — see option B).
- Loading `?engine=<id>` for one engine from each of the 5 categories and
  confirming the accordion opens directly to the right category each
  time — so far only **Biometric & Identity** has been exercised (via
  `cv_dazzle` while fixing Bug 2, then `reid_camouflage` as a second
  confirmation check) — the other 4 categories (Detector & Scene Analysis,
  Sensor & 3D Capture, Classifier & Perturbation, Codec & Forensics) are
  still unchecked.

**B. Visual verification debt (still outstanding, now very overdue, but
partially started).** This session's live mobile tests were the
first-ever browser verification of this project, and together they've only
covered the accordion plus 2 of the 32 engines' actual rendered output
(`cv_dazzle`, `reid_camouflage`). Start `npm run dev` (check first whether
one is already running per the dev-server-race gotcha above), open the
app, and click through the other 30 engine tabs, reroll a few times per
engine, and sanity-check:
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
