import { Rng } from "@/lib/mulberry32";

export type EngineId =
  | "cv_dazzle"
  | "cnn_texture"
  | "adversarial_patch"
  | "pose_jammer"
  | "gabor_grating"
  | "fgsm_noise"
  | "moire_interference"
  | "optical_flow_jammer"
  | "segmentation_shatter"
  | "fiducial_mimic"
  | "depth_spoof"
  | "thermal_decoy"
  | "ocr_glitch"
  | "face_mesh_scramble"
  | "anchor_box_flood"
  | "license_plate_ghost"
  | "reid_camouflage"
  | "saliency_inversion"
  | "iris_code_jam"
  | "liveness_spoof_texture"
  | "gait_scramble"
  | "jpeg_dct_bloom"
  | "rolling_shutter_tear"
  | "codec_macroblock_decoy"
  | "nerf_view_inconsistency"
  | "point_cloud_static"
  | "slam_feature_desert"
  | "gan_fingerprint_mask"
  | "steganalysis_noise_bed"
  | "watermark_collision"
  | "crowd_count_decoy"
  | "action_recognition_jitter"
  | "nms_overlap_flood"
  | "rolling_bayer_demosaic_jam"
  | "bbox_corner_bleed"
  | "vignette_falloff_decoy"
  | "universal_patch_tile"
  | "gradient_sign_mosaic"
  | "expression_au_jam"
  | "age_gender_attribute_decoy"
  | "vehicle_make_model_decoy"
  | "pose_confidence_flood"
  | "fingerprint_ridge_noise"
  | "vein_pattern_jam"
  | "chroma_subsampling_bleed"
  | "keyframe_flicker_decoy"
  | "epipolar_mismatch_pattern"
  | "structure_from_motion_feature_swap"
  | "jpeg_ghost_decoy"
  | "prnu_noise_mimic"
  | "frame_interpolation_ghost"
  | "temporal_flicker_jam"
  | "doc_corner_fiducial_jam"
  | "barcode_1d_bloom"
  | "qr_finder_pattern_mimic"
  | "page_curl_shadow_decoy"
  | "table_grid_mimic"
  | "checkerboard_calibration_collision"
  | "stereo_disparity_decoy"
  | "vanishing_point_scramble"
  | "lens_distortion_grid_jam"
  | "rig_baseline_mismatch_tile"
  | "white_balance_jam"
  | "hdr_bracket_ghost"
  | "color_checker_decoy"
  | "exposure_metering_trap"
  | "tracklet_id_swap_pattern";

/** Normalized 0-1 sliders shared across all engines; each engine maps them to its own ranges. */
export interface EngineParams {
  density: number; // 0-1: element count / layer count
  scale: number; // 0-1: size of primitives
  frequency: number; // 0-1: grating/noise frequency
  accentHue: number; // 0-360: accent color hue
}

export const DEFAULT_PARAMS: EngineParams = {
  density: 0.5,
  scale: 0.5,
  frequency: 0.5,
  accentHue: 185,
};

export interface RenderEngine {
  id: EngineId;
  label: string;
  description: string;
  render(ctx: CanvasRenderingContext2D, size: number, rng: Rng, params: EngineParams): void;
}
