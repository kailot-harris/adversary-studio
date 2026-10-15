# Implementation Plan — Themed, Mobile-Aware Engine Selector

Written 2026-10-15. Scope: replace `ControlPanel.tsx`'s flat 32-button engine
list with a collapsed-by-default, categorized accordion, without touching
`lib/urlState.ts`'s persisted state shape. See the proposal/plan discussion
earlier in this session for the category assignments and rationale; this
document is the stage-by-stage build order.

## Category assignments (reference)

| Category | Engines |
|---|---|
| Biometric & Identity (7) | `cv_dazzle`, `face_mesh_scramble`, `pose_jammer`, `gait_scramble`, `iris_code_jam`, `liveness_spoof_texture`, `reid_camouflage` |
| Detector & Scene Analysis (7) | `optical_flow_jammer`, `segmentation_shatter`, `fiducial_mimic`, `anchor_box_flood`, `license_plate_ghost`, `crowd_count_decoy`, `action_recognition_jitter` |
| Sensor & 3D Capture (7) | `moire_interference`, `depth_spoof`, `thermal_decoy`, `rolling_shutter_tear`, `point_cloud_static`, `nerf_view_inconsistency`, `slam_feature_desert` |
| Classifier & Perturbation (6) | `cnn_texture`, `adversarial_patch`, `gabor_grating`, `fgsm_noise`, `saliency_inversion`, `ocr_glitch` |
| Codec & Forensics (5) | `jpeg_dct_bloom`, `codec_macroblock_decoy`, `gan_fingerprint_mask`, `steganalysis_noise_bed`, `watermark_collision` |

## Guiding constraints

- No bucket exceeds 7 engines (the point of the reorganization).
- `lib/urlState.ts`'s `ENGINE_IDS`/`StudioState` shape is unchanged — category
  state is local UI state only, never persisted or put in the URL.
- One component, one implementation — no separate mobile vs. desktop
  markup branches. Mobile-friendliness comes from touch-target sizing and
  collapsed-by-default behavior, not responsive forking.
- Each stage should leave the app in a working, buildable state
  (`rm -rf .next && npm run build` clean) before moving to the next.

---

## Stage 0 — Data layer

**Goal:** a single source of truth for category membership, independent of
the UI.

- [x] Create `lib/engines/categories.ts`:
  - `export interface EngineCategory { id: string; label: string; engineIds: EngineId[]; }`
  - `export const CATEGORIES: EngineCategory[]` — the 5 buckets above.
  - `export function categoryOf(id: EngineId): EngineCategory` — throws (or
    returns a clearly-marked "uncategorized" sentinel) if an engine id isn't
    found in any bucket, so a future engine #33 added without updating this
    file fails loudly instead of silently.
- [x] Add a cheap consistency check — either a one-off script or a test —
  asserting `CATEGORIES.flatMap(c => c.engineIds)` is a set-equal match to
  `ENGINE_ORDER` from `lib/engines/index.ts` (same ids, no duplicates, none
  missing). This is the same "list maintained in multiple places" failure
  mode already flagged in `HANDOFF.md` for `EngineId`/`ENGINES`/`ENGINE_IDS`
  — don't let a 4th copy drift silently.
- [x] `npm run build` — must still pass (this stage adds a file nothing
  imports yet, so it's a no-risk checkpoint).

**Exit criteria:** `categories.ts` exists, exports are typed correctly, and
the consistency check passes against the current 32-engine `ENGINE_ORDER`.

---

## Stage 1 — Extract `EngineSelector` with no behavior change

**Goal:** move the existing flat list into its own component, unchanged
visually, to isolate the refactor from the redesign.

- [x] Create `components/EngineSelector.tsx` taking the same props the
  inline block in `ControlPanel.tsx` currently uses (`engine`,
  `onEngineChange`), rendering the identical flat `ENGINE_ORDER.map(...)`
  button grid — a pure extraction, no new behavior.
- [x] Update `ControlPanel.tsx` to render `<EngineSelector engine={engine} onEngineChange={onEngineChange} />`
  in place of the inline block.
- [x] `npm run build` clean. Visually/structurally nothing should have
  changed yet — this stage is purely mechanical, so it's the point to catch
  any prop-wiring mistakes before adding the harder accordion logic on top.

**Exit criteria:** build passes, `ControlPanel.tsx` no longer contains
engine-list JSX directly, app behavior is identical to pre-refactor.

---

## Stage 2 — Category grouping, always-expanded

**Goal:** introduce the 5 category buckets visually, but don't yet add the
collapse/expand mechanic — this isolates "does the grouping render
correctly" from "does the show/hide interaction work correctly."

- [x] In `EngineSelector.tsx`, replace the single flat map with
  `CATEGORIES.map(category => ...)`, rendering a category label heading
  (reuse the existing `text-[10px] tracking-widest` label style used for
  SEED/PARAMETERS) followed by that category's engine buttons.
- [x] Reuse the existing button markup/active-state styling as-is per
  engine — only the grouping wrapper is new.
- [x] `npm run build` clean.

**Exit criteria:** the panel shows 5 labeled groups of ≤7 buttons each,
selecting an engine still calls `onEngineChange` correctly, nothing is
collapsed yet (so this stage is still visually "longer than before," that's
expected and fixed in Stage 3).

---

## Stage 3 — Collapse-by-default accordion behavior

**Goal:** the actual fix for the "32 rows above the sliders" problem, on
both mobile and desktop via the same markup.

- [x] Build each category section on native `<details>/<summary>` (free
  keyboard support — Enter/Space toggles, no custom ARIA needed) rather
  than a hand-rolled `useState` + conditional-render toggle.
- [x] Wrap the whole selector in an outer `<details>` too: collapsed by
  default, `<summary>` shows `ENGINE · {ENGINES[engine].label}` plus a
  chevron icon (`lucide-react`'s `ChevronDown`, rotated via a CSS class
  toggled off the native `[open]` attribute selector — no extra JS state
  needed for the rotation).
- [x] Single-open accordion behavior for the *inner* category sections:
  on `toggle`, if a category is being opened, find and close any other
  open `<details>` siblings (vanilla DOM, a handful of lines in a `ref`-
  based effect, or the browser-native `name` attribute if testing shows
  sufficiently wide `<details name="...">` support in the target
  browsers — check this before hand-rolling the close-others logic).
- [x] On expand of the outer selector, auto-open the inner category that
  contains the *current* engine (compute via `categoryOf(engine)` from
  Stage 0) — otherwise a URL-loaded engine from, say, "Codec & Forensics"
  leaves the user looking at a wall of 5 closed, unlabeled-as-current
  sections with no indication which one to open.
- [x] On selecting an engine, close the outer `<details>` (re-collapse)
  so the panel returns to its compact state — minimizes scroll/taps,
  especially on mobile.
- [x] `npm run build` clean.

**Exit criteria:** default panel view shows a single collapsed row for
engine selection; expanding it opens directly to the current engine's
category; picking any engine from any category re-collapses the selector.

---

## Stage 4 — Mobile touch-target and accessibility pass

**Goal:** the mobile-specific requirements called out in the plan
discussion, applied uniformly (same component, no device branching).

- [x] Audit all tap targets in `EngineSelector.tsx` (category `<summary>`
  rows, individual engine buttons, the outer selector's `<summary>`) —
  bump padding so each is ≥44px tall. Current flat-list buttons are
  `px-3 py-2 text-xs`, roughly 32px; increase `py-2` → `py-2.5`/`py-3` as
  needed and re-measure.
- [x] Verify no hover-only affordance is load-bearing — the chevron
  rotation and active/selected styling must be visible via `:active` and
  `:focus-visible`, not only `:hover` (mobile has no hover state).
- [x] Check text wrapping/truncation for the longer category labels
  (e.g. "Classifier & Perturbation") at a 320–375px viewport width — no
  horizontal overflow, no awkward mid-word breaks.
- [x] Wrap the expand/collapse transition (if any CSS transition is added
  for the chevron or height) in a `prefers-reduced-motion` guard in
  `app/globals.css`.
- [x] `npm run build` clean.

**Exit criteria:** every interactive element in the selector meets the
44px touch-target guideline, nothing depends on `:hover`, no horizontal
overflow at mobile widths.

---

## Stage 5 — Manual verification

**Goal:** the actual pixels/interaction, since no browser automation tool
is available in this environment — this stage is manual, by you, not
something I can complete unattended.

- [ ] `npm run dev`, open devtools, emulate a 375px-wide viewport:
  confirm the collapsed selector + SEED + PARAMETERS + action buttons all
  fit near the top of the panel without scrolling past a long engine list.
- [ ] Load `?engine=<id>` for one engine from each of the 5 categories in
  turn; confirm expanding the selector opens directly to the correct
  category each time.
- [ ] Tap/click through all 5 categories and confirm only one is open at
  a time, and that the previously-open one visibly closes.
- [ ] Confirm keyboard-only operation works: Tab to the selector, Enter/
  Space to expand, Tab through category headers, Enter/Space to open one,
  Tab to an engine button, Enter/Space to select it.
- [ ] Confirm the existing desktop layout (`w-80` fixed sidebar) still
  looks correct now that the panel's default height is shorter.
- [ ] Re-run the project's existing unresolved verification debt check
  while you're in there anyway (per `HANDOFF.md`): click through all 32
  engine tabs at least once and sanity-check none render a blank/broken
  canvas — this has never been done for any of the 32 engines.

**Exit criteria:** all of the above pass manually; report back anything
that didn't so it can be fixed before considering this done.

---

## Out of scope for this plan

- Any change to `lib/urlState.ts`, `lib/engines/types.ts`, or
  `lib/engines/index.ts` — this is a presentation-layer change only.
- The deferred 5th "Harmonic Resonance" slider and WebGL backend proposals
  (`HANDOFF.md`, "Concrete next step," option C) — unrelated, not touched.
- Re-theming/restructuring `brainstorm.md`'s subsystem headers to match
  these 5 UI categories — that's a separate, optional follow-up if you want
  the doc and the UI to use matching taxonomy; not assumed here.
