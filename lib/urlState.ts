import { EngineId } from "./engines/types";

export interface StudioState {
  engine: EngineId;
  seed: number;
  density: number;
  scale: number;
  frequency: number;
  accentHue: number;
}

const ENGINE_IDS: EngineId[] = [
  "cv_dazzle",
  "cnn_texture",
  "adversarial_patch",
  "pose_jammer",
  "gabor_grating",
  "fgsm_noise",
  "moire_interference",
  "optical_flow_jammer",
  "segmentation_shatter",
  "fiducial_mimic",
  "depth_spoof",
  "thermal_decoy",
  "ocr_glitch",
  "face_mesh_scramble",
  "anchor_box_flood",
  "license_plate_ghost",
  "reid_camouflage",
  "saliency_inversion",
  "iris_code_jam",
  "liveness_spoof_texture",
  "gait_scramble",
  "jpeg_dct_bloom",
  "rolling_shutter_tear",
  "codec_macroblock_decoy",
  "nerf_view_inconsistency",
  "point_cloud_static",
  "slam_feature_desert",
  "gan_fingerprint_mask",
  "steganalysis_noise_bed",
  "action_recognition_jitter",
];

export function encodeStateToSearchParams(state: StudioState): URLSearchParams {
  const p = new URLSearchParams();
  p.set("engine", state.engine);
  p.set("seed", String(state.seed));
  p.set("d", state.density.toFixed(3));
  p.set("sc", state.scale.toFixed(3));
  p.set("fr", state.frequency.toFixed(3));
  p.set("hue", String(Math.round(state.accentHue)));
  return p;
}

export function decodeStateFromSearchParams(
  params: URLSearchParams,
  fallback: StudioState
): StudioState {
  const engineRaw = params.get("engine");
  const engine = ENGINE_IDS.includes(engineRaw as EngineId) ? (engineRaw as EngineId) : fallback.engine;

  const seedRaw = Number(params.get("seed"));
  const seed = Number.isFinite(seedRaw) && params.has("seed") ? seedRaw >>> 0 : fallback.seed;

  const clamp01 = (v: number, fb: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fb);

  const density = clamp01(Number(params.get("d")), fallback.density);
  const scale = clamp01(Number(params.get("sc")), fallback.scale);
  const frequency = clamp01(Number(params.get("fr")), fallback.frequency);

  const hueRaw = Number(params.get("hue"));
  const accentHue = Number.isFinite(hueRaw) && params.has("hue") ? ((hueRaw % 360) + 360) % 360 : fallback.accentHue;

  return { engine, seed, density, scale, frequency, accentHue };
}
