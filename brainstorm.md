# ADVERSARY.STUDIO — Engine Brainstorm

Candidate engines for future addition, grouped by which CV subsystem they target.
The existing five cover face detection (`cv_dazzle`), CNN classifiers (`cnn_texture`),
patch-based detectors (`adversarial_patch`), pose estimation (`pose_jammer`), and
edge/orientation filters (`gabor_grating`).

## Detection/tracking confusion
- `optical_flow_jammer` — conflicting motion-vector arrows and false flow fields to break video tracking
- `segmentation_shatter` — Voronoi/cellular fracture lines tuned to fool semantic segmentation boundaries
- `fiducial_mimic` — QR-code/ArUco-like glyph noise that triggers false marker detections

## Sensor-level attacks
- `moire_interference` — fine dot/line grids tuned near typical camera sensor pixel pitch to induce aliasing
- `depth_spoof` — Ames-room-style conflicting shading/perspective cues to confuse stereo/depth estimation
- `thermal_decoy` — false heat-blob gradients for IR/thermal camera confusion (different palette, same dazzle logic)

## Perturbation-style
- `fgsm_noise` — fine per-pixel high-frequency perturbation field, visually "static," mimicking FGSM/PGD adversarial noise
- `ocr_glitch` — homoglyph/false-letterform scatter to confuse OCR and text detectors

## Face/landmark-specific
- `face_mesh_scramble` — denser landmark-confusion version of `pose_jammer`, targeting 68-point face mesh models specifically rather than full-body pose

## Status
- [x] `fgsm_noise` — built
- [x] `moire_interference` — built
- [ ] `optical_flow_jammer`
- [ ] `segmentation_shatter`
- [ ] `fiducial_mimic`
- [ ] `depth_spoof`
- [ ] `thermal_decoy`
- [ ] `ocr_glitch`
- [ ] `face_mesh_scramble`
