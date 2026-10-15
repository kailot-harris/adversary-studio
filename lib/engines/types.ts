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
  | "slam_feature_desert";

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
