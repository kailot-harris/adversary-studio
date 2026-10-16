# ADVERSARY.STUDIO — Engine Brainstorm

Candidate engines for future addition, grouped by which CV subsystem they target.
The existing five cover face detection (`cv_dazzle`), CNN classifiers (`cnn_texture`),
patch-based detectors (`adversarial_patch`), pose estimation (`pose_jammer`), and
edge/orientation filters (`gabor_grating`).

## Detection/tracking confusion
- `optical_flow_jammer` — conflicting motion-vector arrows and false flow fields to break video tracking
- `segmentation_shatter` — Voronoi/cellular fracture lines tuned to fool semantic segmentation boundaries
- `fiducial_mimic` — QR-code/ArUco-like glyph noise that triggers false marker detections
- `nms_overlap_flood` — dense near-duplicate overlapping box-shaped rectangles tuned to defeat non-max-suppression IoU-merge thresholds specifically (distinct from `anchor_box_flood`'s anchor-matching target)
- `bbox_corner_bleed` — soft gradient bleed exactly at typical bounding-box corner/edge locations, blurring the contrast cues box-regression heads rely on

## Sensor-level attacks
- `moire_interference` — fine dot/line grids tuned near typical camera sensor pixel pitch to induce aliasing
- `depth_spoof` — Ames-room-style conflicting shading/perspective cues to confuse stereo/depth estimation
- `thermal_decoy` — false heat-blob gradients for IR/thermal camera confusion (different palette, same dazzle logic)
- `rolling_bayer_demosaic_jam` — fine color-fringing pattern tuned to Bayer-pattern demosaicing frequencies, inducing false-color artifacts
- `vignette_falloff_decoy` — fake radial brightness falloff mimicking lens vignetting, off-center to bias auto-exposure/attention to the wrong region

## Perturbation-style
- `fgsm_noise` — fine per-pixel high-frequency perturbation field, visually "static," mimicking FGSM/PGD adversarial noise
- `ocr_glitch` — homoglyph/false-letterform scatter to confuse OCR and text detectors
- `universal_patch_tile` — small repeating tile acting like a tiled "universal adversarial perturbation" across the whole frame, not one localized patch
- `gradient_sign_mosaic` — blocky sign-flipped gradient mosaic mimicking coarse-scale sign-based gradient attacks

## Face/landmark-specific
- `face_mesh_scramble` — denser landmark-confusion version of `pose_jammer`, targeting 68-point face mesh models specifically rather than full-body pose
- `expression_au_jam` — localized high-contrast patches at Facial Action Unit zones (brow, nasolabial fold, lip corners) to confuse emotion/expression classifiers
- `age_gender_attribute_decoy` — wrinkle/skin-texture-mimicking contrast cues at canonical attribute-classifier regions, biasing age/gender estimation

## Detection/recognition confusion (advanced)
- `anchor_box_flood` — dense grids of high-confidence-looking rectangles at classic anchor-box aspect ratios (1:1, 1:2, 2:1) to overload NMS/anchor-matching in detectors like YOLO/SSD
- `license_plate_ghost` — overlapping fake plate-glyph rectangles with mismatched check-digit patterns to confuse ANPR systems
- `reid_camouflage` — repeating color-blocked torso/clothing patterns engineered to collide with person re-identification embedding space
- `saliency_inversion` — high-frequency textures designed to make background regions score higher than foreground on saliency/attention maps
- `vehicle_make_model_decoy` — grille/badge-shaped high-contrast glyph noise on a vehicle silhouette, confusing make/model classifiers
- `pose_confidence_flood` — dense low-confidence skeletal-joint ghost clusters, dragging a pose estimator's per-joint confidence below tracking thresholds

## Biometric/liveness attacks
- `iris_code_jam` — radial Gabor-like ring patterns mimicking iris-code texture to confuse iris recognition
- `liveness_spoof_texture` — print/screen moiré + specular-highlight patterns tuned to fool anti-spoofing liveness classifiers
- `gait_scramble` — overlaid skeletal stick-figure fragments with contradictory joint-angle phase to disrupt gait-recognition silhouettes
- `fingerprint_ridge_noise` — seeded ridge/valley-mimicking fine-line texture colliding with minutiae-matching algorithms (flat 2D pattern, not a literal print)
- `vein_pattern_jam` — branching vein-like line noise mimicking near-IR palm/finger vein-recognition texture

## Compression/codec-level
- `jpeg_dct_bloom` — block-aligned 8x8 DCT-coefficient-mimicking patterns tuned to trigger exaggerated quantization artifacts
- `rolling_shutter_tear` — diagonal shear-banding simulating rolling-shutter skew to confuse frame-alignment/stabilization algorithms
- `codec_macroblock_decoy` — fake motion-compensation block boundaries that look like compression artifacts to confuse deepfake/tamper detectors
- `chroma_subsampling_bleed` — fine color-edge pattern tuned to 4:2:0 chroma-subsampling boundaries, inducing color-bleed at object edges
- `keyframe_flicker_decoy` — alternating high/low-detail bands mimicking I-frame-vs-P-frame quality flicker, confusing keyframe-boundary-based tamper detectors

## 3D/geometric reconstruction
- `nerf_view_inconsistency` — view-dependent specular/color patches that look plausible from one angle but break multi-view photometric consistency (for NeRF/SfM pipelines)
- `point_cloud_static` — dot-grid density fields mimicking LiDAR return noise/dropout patterns
- `slam_feature_desert` — regions deliberately stripped of repeatable corner/edge features (flat gradients) interleaved with false high-contrast keypoint clusters, to starve or flood SLAM feature matchers
- `epipolar_mismatch_pattern` — texture with a deliberately inconsistent disparity gradient, violating epipolar constraints used in stereo/SfM matching
- `structure_from_motion_feature_swap` — paired near-identical textured patches at a plausible camera-baseline offset, causing SfM matchers to lock the wrong correspondence

## Forensics/generative-detection
- `gan_fingerprint_mask` — periodic high-frequency grid noise mimicking GAN upsampling checkerboard artifacts, to confuse AI-generated-image detectors
- `steganalysis_noise_bed` — LSB-plane-style structured noise mimicking steganographic payload statistics
- `watermark_collision` — semi-transparent repeating glyph/pattern tuned to collide with common invisible-watermark detection frequencies
- `jpeg_ghost_decoy` — overlapping differently-quantized block regions mimicking "JPEG ghost" double-compression artifacts, confusing splice/tamper detection
- `prnu_noise_mimic` — fine fixed-pattern noise mimicking sensor PRNU fingerprints, confusing camera-source-identification forensics

## Temporal/motion
- `crowd_count_decoy` — clustered blob patterns at typical "head detector" scale/density to inflate or deflate crowd-counting estimates
- `action_recognition_jitter` — looped contradictory limb-silhouette sequences (single frame, implied motion via blur trails) to confuse action-recognition temporal pooling
- `frame_interpolation_ghost` — semi-transparent in-between-pose ghost frames mimicking optical-flow frame-interpolation artifacts, confusing frame-rate-upconversion/deepfake temporal checks
- `temporal_flicker_jam` — seeded brightness/contrast banding mimicking rapid temporal flicker, defeating motion-based change detectors

## Document/scan geometry
- `doc_corner_fiducial_jam` — false page-corner/edge gradients that confuse mobile document-scanner corner detection (defeats auto-crop/deskew)
- `barcode_1d_bloom` — repeating bar-width noise mimicking UPC/EAN barcode structure to trigger false barcode-decoder locks
- `qr_finder_pattern_mimic` — scattered QR finder-pattern-like nested-square motifs that trigger false QR localization without a valid payload
- `page_curl_shadow_decoy` — fake page-curl/fold shadow gradients that trigger false "non-flat" dewarping corrections on a flat subject
- `table_grid_mimic` — faint ruled-line/grid overlay mimicking table-detection line patterns, confusing document-layout table extractors

## Multi-camera / calibration
- `checkerboard_calibration_collision` — embedded fake checkerboard-corner patterns (like calibration targets) that confuse camera intrinsic/extrinsic calibration routines
- `stereo_disparity_decoy` — repeating patterns with deliberately mismatched left/right offset to produce false stereo correspondence/disparity
- `vanishing_point_scramble` — converging line-bundles implying contradictory vanishing points, confusing perspective/horizon estimation used in ego-motion & camera pose
- `lens_distortion_grid_jam` — radial dot/grid patterns mimicking distortion-calibration targets to confuse automatic lens undistortion
- `rig_baseline_mismatch_tile` — repeating tile pattern with subtly shifted scale/rotation per region, implying an inconsistent multi-camera rig extrinsic baseline

## Color/exposure sensing
- `white_balance_jam` — alternating warm/cool color-patch tiling tuned to defeat auto white-balance gray-world assumptions
- `hdr_bracket_ghost` — overlapping over/under-exposed "ghost" edges mimicking HDR exposure-bracket misalignment artifacts, confusing HDR merge/ghost-detection algorithms
- `color_checker_decoy` — scattered Macbeth-chart-like color-patch clusters to confuse auto color-calibration/profile detection
- `exposure_metering_trap` — high-contrast bright/dark zone placement tuned to fool center-weighted/spot auto-exposure metering into mis-exposing the frame

## Tracking/identity (beyond optical flow)
- `tracklet_id_swap_pattern` — paired decoy silhouettes with swapped-but-similar appearance cues tuned to confuse multi-object-tracker re-ID/association (ByteTrack/DeepSORT-style)
- `reacquisition_decoy_trail` — fading trail of near-duplicate silhouettes at plausible walking-speed offsets, designed to make a tracker re-acquire the wrong trajectory after an occlusion
- `track_merge_split_bait` — paired adjacent decoy regions, color/shape-matched to a real tracked subject, engineered to make multi-object trackers erroneously merge two tracks into one or split one into two

## Night vision / low-light sensor confusion
- `night_vision_gain_bloom` — amplified-noise gain pattern mimicking IR illuminator bloom, oversaturating night-vision image intensifiers
- `ir_hotspot_decoy` — bright IR-reflective-looking blob clusters placed off-subject to pull auto-gain/exposure away from the real target
- `low_light_noise_floor_mimic` — fine seeded grain mimicking high-ISO sensor noise-floor statistics, blending subject edges into expected low-light noise to defeat noise-reduction-assisted detection

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
- [x] `anchor_box_flood` — built
- [x] `license_plate_ghost` — built
- [x] `reid_camouflage` — built
- [x] `saliency_inversion` — built
- [x] `iris_code_jam` — built
- [x] `liveness_spoof_texture` — built
- [x] `gait_scramble` — built
- [x] `jpeg_dct_bloom` — built
- [x] `rolling_shutter_tear` — built
- [x] `codec_macroblock_decoy` — built
- [x] `nerf_view_inconsistency` — built
- [x] `point_cloud_static` — built
- [x] `slam_feature_desert` — built
- [x] `gan_fingerprint_mask` — built
- [x] `steganalysis_noise_bed` — built
- [x] `watermark_collision` — built
- [x] `crowd_count_decoy` — built
- [x] `action_recognition_jitter` — built
- [x] `nms_overlap_flood` — built
- [x] `bbox_corner_bleed` — built
- [x] `rolling_bayer_demosaic_jam` — built
- [x] `vignette_falloff_decoy` — built
- [x] `universal_patch_tile` — built
- [x] `gradient_sign_mosaic` — built
- [x] `expression_au_jam` — built
- [x] `age_gender_attribute_decoy` — built
- [x] `vehicle_make_model_decoy` — built
- [x] `pose_confidence_flood` — built
- [x] `fingerprint_ridge_noise` — built
- [x] `vein_pattern_jam` — built
- [x] `chroma_subsampling_bleed` — built
- [x] `keyframe_flicker_decoy` — built
- [ ] `epipolar_mismatch_pattern`
- [ ] `structure_from_motion_feature_swap`
- [ ] `jpeg_ghost_decoy`
- [ ] `prnu_noise_mimic`
- [ ] `frame_interpolation_ghost`
- [ ] `temporal_flicker_jam`
- [ ] `doc_corner_fiducial_jam`
- [ ] `barcode_1d_bloom`
- [ ] `qr_finder_pattern_mimic`
- [ ] `page_curl_shadow_decoy`
- [ ] `table_grid_mimic`
- [ ] `checkerboard_calibration_collision`
- [ ] `stereo_disparity_decoy`
- [ ] `vanishing_point_scramble`
- [ ] `lens_distortion_grid_jam`
- [ ] `rig_baseline_mismatch_tile`
- [ ] `white_balance_jam`
- [ ] `hdr_bracket_ghost`
- [ ] `color_checker_decoy`
- [ ] `exposure_metering_trap`
- [ ] `tracklet_id_swap_pattern`
- [ ] `reacquisition_decoy_trail`
- [ ] `track_merge_split_bait`
- [ ] `night_vision_gain_bloom`
- [ ] `ir_hotspot_decoy`
- [ ] `low_light_noise_floor_mimic`
