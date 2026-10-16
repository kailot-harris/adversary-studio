# HANDOFF — ADVERSARY.STUDIO

Written 2026-10-16, after commit `a3d1fee` ("Add all 40 newly-built engines
to the accordion category selector"), the latest commit on `main`. This
supersedes the prior HANDOFF state (written 2026-10-15, after the
32-engine/engine-selector-accordion milestone). For whoever picks this up
next — human or fresh agent, no prior session context assumed.

**Headline of this session: the engine count went from 32 to 72.** A full
40-item brainstorm → build → merge batch ran end-to-end via the
`subagent-brief` skill (10 rounds of 4 parallel subagents each, one engine
per subagent, each in its own isolated git worktree), then all 40 new
engines were added to the categorized accordion selector's `CATEGORIES`
list, which had been left out of sync by the batch (see "Progress tracking"
for why that happened and how it was caught).

## What this project is

A Next.js (App Router) + TypeScript + Tailwind web app, "ADVERSARY.STUDIO":
a split-screen studio for generating adversarial/CV-confusion 2D computational
art. Left pane is a square canvas; right pane is a glassmorphic control panel
(engine tabs via a collapsed-by-default categorized accordion, density/
scale/frequency/accent-hue sliders, reroll/export/share buttons). Every
render is deterministic — same `(engine, seed, params)` always produces the
same pixels, via a seeded `mulberry32` PRNG + seeded Perlin noise
(`lib/mulberry32.ts`), never `Math.random()`.

**Root directory:** `C:\Users\kailo\kayceeslices\Processing\adversarial_art_app`
(a subdirectory of a larger `Processing` folder — see "Sibling directories"
below, they are reference material only, not part of the app).

**The planning artifact for adding engines is `brainstorm.md` at the project
root.** It lists engine ideas grouped by which CV subsystem they target,
with a checklist of built vs. not built. **As of this writing, every single
checklist line in that file is checked (67/67, 0 unchecked)** — there is no
unbuilt backlog remaining. It currently has 15 category headers: the
original 10 (one per CV subsystem, e.g. "Detection/tracking confusion",
"Biometric/liveness attacks") each extended by 2 new ideas this session, plus
5 brand-new headers added this session (Document/scan geometry,
Multi-camera/calibration, Color/exposure sensing, Tracking/identity beyond
optical flow, Night vision/low-light sensor confusion). If you're picking
this project up to add more engines, you'll need to brainstorm new ideas
first — see "Concrete next step."

**A real staged plan exists for the UI restructure**: `ENGINE_SELECTOR_PLAN.md`
at the repo root. All 6 of its stages (0-5) were implemented and merged in
the *prior* session (per the previous HANDOFF); this session did not touch
that plan's own checklist, but it **did** fix a gap the plan's Stage 5
"visual verification" checklist was explicitly supposed to catch and didn't:
`lib/engines/categories.ts` (part of the Stage 0-4 accordion implementation)
had silently drifted out of sync with `ENGINE_ORDER` as 40 engines were
added without anyone re-running `categories.check.mjs` mid-batch. See
"Progress tracking" below for the full story — this is now fixed, but the
*live* accordion has not been re-verified in a browser since (see "Concrete
next step").

**Hard boundary:** the five `.pde` Processing sketches in the sibling
`adv_*` directories (see below) are the *original prototypes* each engine was
ported from. They are reference-only — never edit them, and don't assume the
TypeScript port is pixel-identical to their `random()`-driven output (it
can't be, since Processing's RNG isn't reproducible; the port matches their
visual logic/structure, not their exact bit-for-bit output).

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

The other 67 engines (all built across prior sessions plus this one) have no
`.pde` prototype — they were designed directly in TypeScript from
`brainstorm.md`'s one-line descriptions.

There is also a separate sibling repo, `adversarial_3d_art_app`
("ADVERSARY3D.STUDIO"), a Three.js/`react-three-fiber` 3D sibling of this
app with its own 11 engines and its own `brainstorm_3d.md` backlog (8 more
ideas, unbuilt). **This session did not touch it at all** — see that
project's own HANDOFF/brainstorm docs if picking that up instead.

## Progress tracking

**This session's work in two parts:**

### Part 1 — Brainstorm + build 40 new engines (commits: see below)

1. Brainstormed 40 new engine ideas interactively with the user across
   several rounds: 2 more ideas added to each of the 10 original
   `brainstorm.md` category headers (20 ideas), plus 5 brand-new category
   headers with 3-5 ideas each (20 ideas). Committed to `main` as
   `93f571c` "Brainstorm 40 new engine ideas across 5 new and 10 existing
   subsystem categories" *before* any worktrees were branched, so every
   worktree's branch point included the full 40-item unchecked backlog.
2. Built all 40 via the `subagent-brief` skill's batch workflow: one
   pre-existing, already-`pilot_approved` template
   (`.subagent-runs/engine-batch.md`, same template hash as prior sessions,
   so the pilot step was skipped) expanded per-item into
   `.subagent-runs/batches/b-20261016-131652-ff82ec/expanded/<item>.md`,
   dispatched as 10 rounds of 4 parallel `general-purpose` subagents (the
   batch's concurrency cap), each subagent working alone in its own
   `git worktree` under `../.worktrees/<engine_id>/` (the Agent tool's
   built-in `isolation: "worktree"` flag is still broken in this
   environment per every prior session's HANDOFF — the manual
   `git worktree add` + explicit working-directory-in-prompt workaround was
   used again, 10/10 rounds).
3. **All 40 subagent dispatches returned `status: success` on the first
   try — zero failures, zero blocked, zero early-stops** (the batch's
   early-stop threshold is >20% failure in the first 10 items; actual
   failure rate was 0%). Full machine-readable report:
   `.subagent-runs/batches/b-20261016-131652-ff82ec/report.md`.
4. Every result was spot-checked before merging: each subagent's claimed
   `git diff` evidence for `lib/engines/types.ts`/`index.ts`/`urlState.ts`
   was independently re-read against the actual worktree contents (not just
   trusted from the subagent's self-report) before merging. All 40 checked
   out clean.
5. Merged all 40 branches into `main` one at a time, in dispatch order.
   **39 of the 40 merges conflicted** in the same 4 files every time
   (`lib/engines/types.ts`, `lib/engines/index.ts`, `lib/urlState.ts`,
   `brainstorm.md`) — the first merge in each round-of-4 was usually
   conflict-free (fast-forward-able), every subsequent one in that round
   conflicted. This is the same expected, additive-only conflict pattern
   documented in every prior session's HANDOFF — resolution was always
   "keep both sides' added lines," never a real disagreement.
6. After every single merge, `rm -rf .next && npm run build` was run and
   confirmed clean before moving to the next merge — not just at the end of
   each round. **One of these build-verification runs hit the documented
   dev-server-vs-build race** (see "Environment/tooling notes") when
   re-verified during the handoff-writing pass at the very end of the
   session — a live `next dev` server was still running on ports 3000/3001
   from earlier testing, and the first `rm -rf .next && npm run build`
   after that failed with the exact "no direct app page entry found for
   `/_not-found`" error the prior session's HANDOFF warned about. A second
   `rm -rf .next && npm run build` run immediately after (without touching
   the dev server) passed clean — this is the documented workaround's
   "or accept you'll need to restart it after" branch playing out exactly
   as predicted. **The dev server on 3000/3001 was never killed or touched
   this session** — if you hit this same build error, don't assume
   something is broken; just re-run the build.
7. All 10 batches' worktrees and branches were removed after each round's
   merges landed (`git worktree remove` + `git branch -d`) — `git worktree
   list` shows only the main checkout as of this writing, no stale
   worktrees accumulated.

### Part 2 — Fix the categories.ts drift the batch introduced

8. After the 40-engine batch finished, the user asked for a status report,
   and the independent discovery (first surfaced by several subagents
   *during* Part 1, each flagging it unprompted in their result JSON's
   final note) that `lib/engines/categories.ts` — the data file backing the
   Stage 0-4 accordion selector from the prior session — was never updated
   by any of the 40 briefs (deliberately out of scope for every one of
   them) was reported to the user as an explicit known gap, not silently
   left for someone else to find.
9. The user asked to fix it. `lib/engines/categories.ts`'s `CATEGORIES`
   array was extended: 2 new engines folded into the existing
   `classifier_perturbation` bucket (now 8 engines, not 5) and 6 brand-new
   category buckets added to home the other 38 (renaming the former
   `codec_forensics` bucket to `codec_forensics_temporal` and folding 6 more
   engines into it along the way). Full new bucket list in "What's actually
   implemented" below. Committed as `a3d1fee`.
10. `node lib/engines/categories.check.mjs` passes clean: `72 engines, 72
    categorized, set-equal`. `rm -rf .next && npm run build` passes clean
    (after working around the dev-server race from step 6, see above).

**What's explicitly NOT done from this fix:** the accordion itself has not
been reopened in a live browser since the category rebalancing. The *prior*
session's HANDOFF documented a real bug (React's `onToggle` bubbling through
nested `<details>`) that was invisible to `npm run build` and only caught by
live mobile testing — this session's category changes are the same kind of
UI-structural change (more `<details>` elements, more categories to toggle
between) that could in principle hit a similar class of bug, and `npm run
build` passing is **not** evidence that the 11-category accordion renders or
toggles correctly. See "Concrete next step."

**Commits, in order (all on `main`, all local-only until pushed — see
"Git repo" below):**

| Commit | What |
|---|---|
| `93f571c` | Brainstorm: 40 new engine ideas added to `brainstorm.md` |
| `c3ede60` … 40 "Add `<engine>` engine" commits, each followed by a "Merge engine/`<engine>`" commit | One pair per engine; see `git log --oneline` for the full list, or the batch report for the canonical item list |
| `a3d1fee` | Fix: all 40 engines added to `lib/engines/categories.ts`'s `CATEGORIES` |

`brainstorm.md`'s status checklist: **67 checked, 0 unchecked** (27 from
before this session + 40 new).

## What's actually implemented

Core infrastructure (unchanged this session — see prior HANDOFF history in
`git log` for the original build-out):

| File | State |
|---|---|
| `lib/mulberry32.ts` | Done. Seeded PRNG + Perlin noise, unchanged. |
| `lib/color.ts` | Done. Unchanged. |
| `lib/urlState.ts` | Done. `ENGINE_IDS` now holds **72** ids (was 32) — every one of the 40 new engines' id was added here by its own subagent; independently re-verified this session, in sync. |
| `lib/engines/types.ts` | Done. `EngineId` union now has **72** values (was 32). |
| `lib/engines/index.ts` | Done. `ENGINES` record + `ENGINE_ORDER` array, **72** ids (was 32) — third copy of the id list, also in sync. |
| `lib/engines/categories.ts` | **Updated this session** (commit `a3d1fee`). 11 categories total: the original 5 (one, `classifier_perturbation`, extended from 6→8 engines; the former `codec_forensics` renamed `codec_forensics_temporal` and extended from 5→11 engines) plus 6 brand-new buckets — see table below. `categories.check.mjs` passes: 72/72 categorized, set-equal with `ENGINE_ORDER`. |
| `components/EngineSelector.tsx` | Unchanged this session. Fully generic over `CATEGORIES.map(...)` — no hardcoded category count, so adding new buckets required zero component changes, only data changes in `categories.ts`. |
| Everything else (`Studio.tsx`, `StudioCanvas.tsx`, `ControlPanel.tsx`, `app/*`, `vitest.config.ts`, etc.) | Unchanged this session. |

**`lib/engines/categories.ts`'s 11 categories, post-fix:**

| Category id | Label | Engine count | Notes |
|---|---|---|---|
| `biometric_identity` | Biometric & Identity | 7 | Unchanged |
| `detector_scene_analysis` | Detector & Scene Analysis | 7 | Unchanged |
| `sensor_3d_capture` | Sensor & 3D Capture | 7 | Unchanged |
| `classifier_perturbation` | Classifier & Perturbation | 8 | +2 this session (`universal_patch_tile`, `gradient_sign_mosaic`) |
| `codec_forensics_temporal` | Codec, Forensics & Temporal | 11 | Renamed from `codec_forensics` (was 5); +6 this session |
| `document_scan_geometry` | Document & Scan Geometry | 5 | New this session |
| `multi_camera_3d_geometry` | Multi-Camera & 3D Geometry | 7 | New this session |
| `color_exposure_sensing` | Color & Exposure Sensing | 6 | New this session |
| `tracking_recognition_bait` | Tracking & Recognition Bait | 7 | New this session |
| `biometric_attribute_signals` | Biometric Attribute Signals | 4 | New this session |
| `night_vision_low_light` | Night Vision & Low-Light | 3 | New this session |

(That's 11 rows summing to 72 — `classifier_perturbation` and
`codec_forensics_temporal` are the two extended originals, the other 9 rows
are the 3 unchanged originals + the new ones... recount if this table ever
looks off; the authoritative source is always `lib/engines/categories.ts`
itself, not this table.)

**All 40 new engines built this session** (grouped by which new/extended
`brainstorm.md` category they came from; file is `lib/engines/<file>.ts`,
all exist, all export a complete non-placeholder `RenderEngine`):

| Engine id | File | Lines |
|---|---|---|
| `nms_overlap_flood` | `nmsOverlapFlood.ts` | 103 |
| `bbox_corner_bleed` | `bboxCornerBleed.ts` | 139 |
| `rolling_bayer_demosaic_jam` | `rollingBayerDemosaicJam.ts` | 82 |
| `vignette_falloff_decoy` | `vignetteFalloffDecoy.ts` | 91 |
| `universal_patch_tile` | `universalPatchTile.ts` | 114 |
| `gradient_sign_mosaic` | `gradientSignMosaic.ts` | 87 |
| `expression_au_jam` | `expressionAuJam.ts` | 214 |
| `age_gender_attribute_decoy` | `ageGenderAttributeDecoy.ts` | 187 |
| `vehicle_make_model_decoy` | `vehicleMakeModelDecoy.ts` | 205 |
| `pose_confidence_flood` | `poseConfidenceFlood.ts` | 119 |
| `fingerprint_ridge_noise` | `fingerprintRidgeNoise.ts` | 193 |
| `vein_pattern_jam` | `veinPatternJam.ts` | 145 |
| `chroma_subsampling_bleed` | `chromaSubsamplingBleed.ts` | 147 |
| `keyframe_flicker_decoy` | `keyframeFlickerDecoy.ts` | 123 |
| `epipolar_mismatch_pattern` | `epipolarMismatchPattern.ts` | 127 |
| `structure_from_motion_feature_swap` | `structureFromMotionFeatureSwap.ts` | 247 |
| `jpeg_ghost_decoy` | `jpegGhostDecoy.ts` | 131 |
| `prnu_noise_mimic` | `prnuNoiseMimic.ts` | 127 |
| `frame_interpolation_ghost` | `frameInterpolationGhost.ts` | 237 |
| `temporal_flicker_jam` | `temporalFlickerJam.ts` | 107 |
| `doc_corner_fiducial_jam` | `docCornerFiducialJam.ts` | 231 |
| `barcode_1d_bloom` | `barcode1dBloom.ts` | 117 |
| `qr_finder_pattern_mimic` | `qrFinderPatternMimic.ts` | 92 |
| `page_curl_shadow_decoy` | `pageCurlShadowDecoy.ts` | 174 |
| `table_grid_mimic` | `tableGridMimic.ts` | 145 |
| `checkerboard_calibration_collision` | `checkerboardCalibrationCollision.ts` | 130 |
| `stereo_disparity_decoy` | `stereoDisparityDecoy.ts` | 157 |
| `vanishing_point_scramble` | `vanishingPointScramble.ts` | 121 |
| `lens_distortion_grid_jam` | `lensDistortionGridJam.ts` | 137 |
| `rig_baseline_mismatch_tile` | `rigBaselineMismatchTile.ts` | 134 |
| `white_balance_jam` | `whiteBalanceJam.ts` | 123 |
| `hdr_bracket_ghost` | `hdrBracketGhost.ts` | 151 |
| `color_checker_decoy` | `colorCheckerDecoy.ts` | 135 |
| `exposure_metering_trap` | `exposureMeteringTrap.ts` | 140 |
| `tracklet_id_swap_pattern` | `trackletIdSwapPattern.ts` | 158 |
| `reacquisition_decoy_trail` | `reacquisitionDecoyTrail.ts` | 177 |
| `track_merge_split_bait` | `trackMergeSplitBait.ts` | 247 |
| `night_vision_gain_bloom` | `nightVisionGainBloom.ts` | 117 |
| `ir_hotspot_decoy` | `irHotspotDecoy.ts` | 165 |
| `low_light_noise_floor_mimic` | `lowLightNoiseFloorMimic.ts` | 126 |

`grep -rn "TODO\|FIXME\|XXX"` across `lib/engines/*.ts`, `components/*.tsx`,
`app/*.tsx` returns nothing — all 72 engines in `ENGINES` have complete,
non-placeholder `render()` implementations (re-verified this session).

**The 32 engines from before this session** (5 `.pde`-ported + 27 built
across prior sessions) are unchanged — see the prior HANDOFF (in git log,
commits before `93f571c`) for their individual descriptions; this file
doesn't repeat them to keep this table a manageable size at 72 engines.

**Proposed but explicitly not started (carried over from earlier sessions,
still untouched):** a 5th shared slider ("Harmonic Resonance" / Moiré
Intensity) and a full WebGL/GLSL fragment-shader rendering backend. Neither
has a design decision yet.

## Environment/tooling notes

- **This project has a real `git` repo, with a remote.** `origin` is
  `https://github.com/kailot-harris/adversary_studio.git`; default branch is
  `main`. **As of this writing, `main` is 82 commits ahead of
  `origin/main` and has not been pushed** — every commit from this session
  (the 40-engine batch plus the categories.ts fix) is local-only. If you
  pick this up next, check with the user before pushing (not done
  automatically per this session's git-safety defaults), and be aware
  `git push` of 82 commits is a large, hard-to-silently-undo action worth
  flagging explicitly before running.
- **Dev-server-vs-build race, confirmed to still be live in this
  environment** (documented in the prior session's HANDOFF, re-hit this
  session — see "Progress tracking" step 6 above). A `next dev` server was
  found listening on ports 3000 and 3001 during this session's final
  build-verification pass; a `rm -rf .next && npm run build` run while it
  was still running failed with `Invariant: no direct app page entry found
  for /_not-found`; an identical immediate retry (dev server untouched,
  cache cleared again) passed clean. **This session did not kill that dev
  server** — it may still be running, and may be the user's own active
  testing session, not a stale leftover; don't assume you should kill it
  without checking first. If you hit this exact build error, re-run the
  build once before concluding something is broken.
- **`subagent-brief` skill location gotcha, still applies.** The skill's
  scripts do not live inside this project
  (`adversarial_art_app/.claude/skills/...` does not exist) — they live at
  the user-global path `C:\Users\kailo\.claude\skills\subagent-brief`.
  Running any script via a project-relative path produces a silent
  **segmentation fault**, not a clean error — this bit a prior session and
  was hit again this session's final verification pass (`validate_brief.R`
  segfaulted on a project-relative path on the very first attempt this
  session, before switching to the absolute path). Always use the absolute
  `C:\Users\kailo\.claude\skills\subagent-brief` path (or
  `/c/Users/kailo/.claude/skills/subagent-brief` from Git Bash).
- **Each engine-adding session builds via isolated subagents in their own
  `git worktree`s**, under
  `C:\Users\kailo\kayceeslices\Processing\.worktrees\<engine_id>\` (a
  sibling of this project directory, not inside it). All 40 of this
  session's worktrees were merged into `main` and then **removed**
  (`git worktree remove` + `git branch -d` for each, after every round's
  merges) — `git worktree list` currently shows only the main checkout,
  nothing stale.
  - **This environment's Agent-tool `isolation: "worktree"` option has
    never worked**, across four sessions now. The workaround (used again
    this session, 40/40): manual `git worktree add -b <branch>
    ../.worktrees/<name>` run directly from the main repo, then dispatching
    a plain (non-isolated) `general-purpose` subagent with an explicit
    instruction naming that path as its sole working directory.
  - Every batch round's branch merges hit the same 4-file conflict
    (`lib/engines/types.ts`, `lib/engines/index.ts`, `lib/urlState.ts`,
    `brainstorm.md`) except the very first merge in each round-of-4 (which
    fast-forwarded cleanly since nothing else in that round had landed
    yet) — **39 of 40 merges conflicted this session**, matching the
    pattern from every prior engine-batch session. Resolution is always
    "keep both sides' added lines" — never a real disagreement, since the
    briefs explicitly scope each subagent to touch only its own id.
  - **`lib/engines/categories.ts` is now a *fourth* place engine ids get
    registered, and it is NOT part of any individual engine-adding brief's
    scope.** This session's 40-engine batch is proof that the categories
    file will silently drift if nobody explicitly schedules a follow-up
    pass to re-run `categories.check.mjs` and patch `CATEGORIES` after a
    batch lands. If you run another engine-adding batch, **add a step 11
    to "The reusable workflow" below to check `categories.ts` before
    declaring the batch done** — don't rely on individual subagents
    noticing and reporting it unprompted again (they did this time, but
    that was good luck, not a guaranteed behavior, since it was explicitly
    out-of-scope for every brief).
- **No browser automation tool is available in this environment.** This
  session's 40 new engines and the `categories.ts` rebalancing have **never
  been visually verified in a browser** — all verification has been
  `npm run build` (type-check + static generation) and
  `categories.check.mjs` (a data-consistency script), neither of which
  looks at rendered pixels or at whether the accordion actually opens/
  closes correctly with 11 categories instead of 5. The prior session's
  HANDOFF found a real accordion bug that only live mobile testing caught —
  treat that as a standing warning, not a one-time anecdote. See "Concrete
  next step."
- **`npm audit` will always show some findings** — dev-time
  `tailwindcss`/`postcss`/`tinypool` transitive-dep CVEs with no
  non-breaking fix available, documented in detail in the prior session's
  HANDOFF (not re-investigated this session, nothing changed about the
  dependency tree).
- **Build-cache gotcha** (distinct from the dev-server race above): after
  any merge touching `lib/engines/*`, `next build` can fail with a stale
  `.next` webpack-chunk error. Fix is `rm -rf .next` then re-run
  `npm run build`. Always clear `.next` before trusting a build failure
  immediately after a merge.

## Known architectural duplication (not yet cleaned up — now a 4th copy)

The list of engine IDs is maintained in **four** separate places that must
be kept in sync by hand whenever an engine is added or removed (was three,
until this session's `categories.ts` fix effectively made it a fourth,
though it was always structurally separate — it's just that nobody had to
think about it until a 40-engine batch exposed the drift):

1. `lib/engines/types.ts` — the `EngineId` union type.
2. `lib/engines/index.ts` — `ENGINES` record keys + `ENGINE_ORDER` array.
3. `lib/urlState.ts` — the local `ENGINE_IDS` array (used only to validate
   the `engine` URL param).
4. `lib/engines/categories.ts` — the `CATEGORIES` buckets (used only by the
   accordion UI selector). **This one has a built-in dev-time consistency
   guard** (`categories.ts`'s own runtime check, plus the standalone
   `categories.check.mjs` script) that throws/fails loudly if it drifts —
   but only if someone remembers to run it. Nothing currently runs it
   automatically as part of `npm run build` or CI.

All four are currently in sync as of this writing (72 engines each,
verified via `categories.check.mjs` and manual re-reads of the other
three). If you add engine #73 and either the URL's `?engine=` param falls
back to `cv_dazzle` or the new engine never appears in any accordion
category, check `lib/urlState.ts` and `lib/engines/categories.ts`
respectively first.

## The reusable workflow (for adding a new engine)

Unchanged in substance from prior sessions, proven again at 40/40 this
session. One addition (step 8) based on what this session's batch exposed:

1. Pick an idea from `brainstorm.md`'s unchecked list. **As of this
   writing, there are none left (67/67 checked)** — brainstorm new ideas
   and append them to `brainstorm.md` first (new subsystem header or
   extend an existing one + an unchecked `- [ ]` line) before this workflow
   has anything to pick up. See "Concrete next step" for a starting point.
2. Add the new ID to the `EngineId` union in `lib/engines/types.ts`.
3. Write `lib/engines/<camelCaseName>.ts` exporting a `RenderEngine` object
   (`id`, `label`, `description`, `render(ctx, size, rng, params)`). Use
   `params.density/scale/frequency/accentHue` (all normalized 0-1, hue
   0-360) to drive whatever the engine's internal ranges are — don't
   introduce new per-engine param types.
   - For noise-driven engines, prefer **block-quantized sampling** (call
     `rng.noise()` once per NxN block, fill the block) over full per-pixel
     noise sampling — `cnn_texture` is the heaviest-engine cautionary
     example; most of this session's 40 engines that needed noise used the
     block-quantized approach.
   - For `sin`/`cos`-only engines, full per-pixel loops are fine.
   - For vector/shape engines (rectangles, glyph strokes, silhouettes,
     stick figures, line bundles) a per-primitive loop over seeded
     positions is the right approach — most of this session's 40 new
     engines use this style.
4. Register it in `lib/engines/index.ts` (`ENGINES` + `ENGINE_ORDER`),
   `lib/urlState.ts` (`ENGINE_IDS`), **and** — new as of this session's
   lesson — plan to touch `lib/engines/categories.ts` (`CATEGORIES`) too,
   even if it's in a separate follow-up pass rather than the same brief.
   Missing any of the first three silently breaks URL-sharing; missing the
   fourth silently makes the engine invisible in the categorized accordion
   (it's still fully functional via direct `?engine=` URL, just not
   discoverable by clicking through categories).
5. Update `brainstorm.md`'s checklist.
6. If built in an isolated worktree (recommended for more than one engine
   in flight at once): commit in the worktree, then merge into `main`.
   Expect a conflict in exactly the 4 files listed in "Known architectural
   duplication" if another engine's branch merged first in the same batch;
   resolve by keeping both sides' added lines.
7. `rm -rf .next && npm run build` — must pass clean *after clearing the
   cache*, every single time right after a merge.
8. **New this session: after a whole batch of engines lands, run `node
   lib/engines/categories.check.mjs` before declaring the batch done.** If
   it fails (it will, if step 4's categories.ts follow-up wasn't done),
   decide how to bucket the new engines into existing or new `CATEGORIES`
   entries and re-run the check until it passes clean.
9. After all branches for a batch are merged and verified, remove the
   worktrees and their branches (`git worktree remove <path>` then
   `git branch -d engine/<id>`).
10. Update this HANDOFF's "What's actually implemented" and "Progress
    tracking" tables.
11. **Still not done for any of the 72 engines, or for the 11-category
    accordion itself since this session's rebalancing**: actually open the
    app in a browser and look at it. Flag this explicitly when reporting
    "done" rather than implying visual verification happened.

## Concrete next step

**A. Visually verify the 11-category accordion still works correctly
(recommended first — cheapest way to catch a repeat of the prior session's
real `onToggle` bug, now with more categories to stress the same nested-
`<details>` mechanism).** Start `npm run dev` (check first whether one is
already running on 3000/3001 per the dev-server-race gotcha above — if so,
either reuse it or stop it, don't just launch a second one blindly), open
the app, and:
- Confirm all 11 categories listed in "What's actually implemented" render,
  expand, and collapse correctly, and that only one category stays open at
  a time (the invariant the prior session's bug violated).
- Click through at least one engine from each of the 6 brand-new
  categories (`document_scan_geometry`, `multi_camera_3d_geometry`,
  `color_exposure_sensing`, `tracking_recognition_bait`,
  `biometric_attribute_signals`, `night_vision_low_light`, plus the renamed
  `codec_forensics_temporal`) to confirm selection, rendering, and the
  collapsed-accordion label (`ENGINE · <label>`) all work — **none of these
  40 engines or 6 new categories have ever been rendered in a browser.**
- Load `?engine=<id>` directly for a couple of the new engines and confirm
  the accordion auto-opens to the correct (new) category — this exercises
  `categoryOf()` against the new `CATEGORIES` entries specifically.

**B. Visual verification debt for the 40 engines' actual rendered output
(still fully outstanding).** Every one of this session's 40 engines has
only been verified via `npm run build` (type-check + static generation) —
zero have ever had their rendered pixels looked at. Reroll a few times per
engine and sanity-check nothing renders blank, throws, or stalls — pay
particular attention to `structure_from_motion_feature_swap.ts` and
`track_merge_split_bait.ts` (both 247 lines, the two largest/most complex
new engines) and anything doing `ImageData`/`putImageData` manipulation
directly (e.g. `low_light_noise_floor_mimic.ts`, `chroma_subsampling_bleed.ts`)
since that's a heavier per-pixel code path than most of the vector/shape
engines.

**C. Decide whether to push `main` to `origin`.** 82 local commits are
unpushed. Confirm with the user before pushing — this is exactly the kind
of "affects shared state" action that needs explicit confirmation per this
session's git-safety defaults, not an assumption that finishing the work
implies pushing it.

**D. Brainstorm another backlog, if continuing to add engines.**
`brainstorm.md` is fully exhausted again (67/67 checked). Pick CV
subsystems not yet covered by any of the now-15 category headers — this
session's suggestions (OCR-adjacent beyond what's built, audio-visual sync,
multi-camera calibration) are now *mostly* covered (multi-camera calibration
got a full category this session); look further afield — e.g.
satellite/aerial imagery classifiers, medical imaging anonymization, or
AR/VR SLAM-specific attacks distinct from the existing `slam_feature_desert`.

**E. The deferred proposal** (5th "Harmonic Resonance" slider,
WebGL/GLSL backend) — still untouched, still needs a scope conversation
before code, per every prior session's HANDOFF.
