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

## Detection/recognition confusion (advanced)
- `anchor_box_flood` — dense grids of high-confidence-looking rectangles at classic anchor-box aspect ratios (1:1, 1:2, 2:1) to overload NMS/anchor-matching in detectors like YOLO/SSD
- `license_plate_ghost` — overlapping fake plate-glyph rectangles with mismatched check-digit patterns to confuse ANPR systems
- `reid_camouflage` — repeating color-blocked torso/clothing patterns engineered to collide with person re-identification embedding space
- `saliency_inversion` — high-frequency textures designed to make background regions score higher than foreground on saliency/attention maps

## Biometric/liveness attacks
- `iris_code_jam` — radial Gabor-like ring patterns mimicking iris-code texture to confuse iris recognition
- `liveness_spoof_texture` — print/screen moiré + specular-highlight patterns tuned to fool anti-spoofing liveness classifiers
- `gait_scramble` — overlaid skeletal stick-figure fragments with contradictory joint-angle phase to disrupt gait-recognition silhouettes

## Compression/codec-level
- `jpeg_dct_bloom` — block-aligned 8x8 DCT-coefficient-mimicking patterns tuned to trigger exaggerated quantization artifacts
- `rolling_shutter_tear` — diagonal shear-banding simulating rolling-shutter skew to confuse frame-alignment/stabilization algorithms
- `codec_macroblock_decoy` — fake motion-compensation block boundaries that look like compression artifacts to confuse deepfake/tamper detectors

## 3D/geometric reconstruction
- `nerf_view_inconsistency` — view-dependent specular/color patches that look plausible from one angle but break multi-view photometric consistency (for NeRF/SfM pipelines)
- `point_cloud_static` — dot-grid density fields mimicking LiDAR return noise/dropout patterns
- `slam_feature_desert` — regions deliberately stripped of repeatable corner/edge features (flat gradients) interleaved with false high-contrast keypoint clusters, to starve or flood SLAM feature matchers

## Forensics/generative-detection
- `gan_fingerprint_mask` — periodic high-frequency grid noise mimicking GAN upsampling checkerboard artifacts, to confuse AI-generated-image detectors
- `steganalysis_noise_bed` — LSB-plane-style structured noise mimicking steganographic payload statistics
- `watermark_collision` — semi-transparent repeating glyph/pattern tuned to collide with common invisible-watermark detection frequencies

## Temporal/motion
- `crowd_count_decoy` — clustered blob patterns at typical "head detector" scale/density to inflate or deflate crowd-counting estimates
- `action_recognition_jitter` — looped contradictory limb-silhouette sequences (single frame, implied motion via blur trails) to confuse action-recognition temporal pooling

## Status
- [x] `fgsm_noise` — built
- [x] `moire_interference` — built
- [x] `optical_flow_jammer` — built
- [x] `segmentation_shatter` — built
- [x] `fiducial_mimic` — built
- [x] `depth_spoof` — built
- [x] `thermal_decoy` — built
- [x] `ocr_glitch` — built
- [x] `face_mesh_scramble` — built
- [ ] `anchor_box_flood`
- [ ] `license_plate_ghost`
- [ ] `reid_camouflage`
- [ ] `saliency_inversion`
- [ ] `iris_code_jam`
- [ ] `liveness_spoof_texture`
- [ ] `gait_scramble`
- [ ] `jpeg_dct_bloom`
- [ ] `rolling_shutter_tear`
- [ ] `codec_macroblock_decoy`
- [ ] `nerf_view_inconsistency`
- [ ] `point_cloud_static`
- [ ] `slam_feature_desert`
- [ ] `gan_fingerprint_mask`
- [ ] `steganalysis_noise_bed`
- [ ] `watermark_collision`
- [ ] `crowd_count_decoy`
- [ ] `action_recognition_jitter`
