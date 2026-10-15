import { ENGINE_ORDER } from "./index";
import { EngineId } from "./types";

export interface EngineCategory {
  id: string;
  label: string;
  engineIds: EngineId[];
}

export const CATEGORIES: EngineCategory[] = [
  {
    id: "biometric_identity",
    label: "Biometric & Identity",
    engineIds: [
      "cv_dazzle",
      "face_mesh_scramble",
      "pose_jammer",
      "gait_scramble",
      "iris_code_jam",
      "liveness_spoof_texture",
      "reid_camouflage",
    ],
  },
  {
    id: "detector_scene_analysis",
    label: "Detector & Scene Analysis",
    engineIds: [
      "optical_flow_jammer",
      "segmentation_shatter",
      "fiducial_mimic",
      "anchor_box_flood",
      "license_plate_ghost",
      "crowd_count_decoy",
      "action_recognition_jitter",
    ],
  },
  {
    id: "sensor_3d_capture",
    label: "Sensor & 3D Capture",
    engineIds: [
      "moire_interference",
      "depth_spoof",
      "thermal_decoy",
      "rolling_shutter_tear",
      "point_cloud_static",
      "nerf_view_inconsistency",
      "slam_feature_desert",
    ],
  },
  {
    id: "classifier_perturbation",
    label: "Classifier & Perturbation",
    engineIds: [
      "cnn_texture",
      "adversarial_patch",
      "gabor_grating",
      "fgsm_noise",
      "saliency_inversion",
      "ocr_glitch",
    ],
  },
  {
    id: "codec_forensics",
    label: "Codec & Forensics",
    engineIds: [
      "jpeg_dct_bloom",
      "codec_macroblock_decoy",
      "gan_fingerprint_mask",
      "steganalysis_noise_bed",
      "watermark_collision",
    ],
  },
];

/** Sentinel category returned by `categoryOf` for an engine id that isn't
 * registered in any bucket above. Having a clearly-marked sentinel (rather
 * than throwing) means a future engine #33 added to `ENGINE_ORDER` without
 * updating `CATEGORIES` fails loudly and visibly in the UI instead of
 * crashing the whole panel. */
export const UNCATEGORIZED: EngineCategory = {
  id: "uncategorized",
  label: "Uncategorized",
  engineIds: [],
};

export function categoryOf(id: EngineId): EngineCategory {
  const found = CATEGORIES.find((c) => c.engineIds.includes(id));
  return found ?? UNCATEGORIZED;
}

// Consistency guard: every id in ENGINE_ORDER must appear in exactly one
// category, and no category may contain an id that isn't in ENGINE_ORDER.
// See lib/engines/categories.check.ts for the standalone script that
// asserts this at dev-time; this runtime check is a lightweight backstop.
if (process.env.NODE_ENV !== "production") {
  const flat = CATEGORIES.flatMap((c) => c.engineIds);
  const flatSet = new Set(flat);
  if (flat.length !== flatSet.size) {
    throw new Error("lib/engines/categories.ts: duplicate engine id across categories");
  }
  for (const id of ENGINE_ORDER) {
    if (!flatSet.has(id)) {
      throw new Error(`lib/engines/categories.ts: engine "${id}" missing from CATEGORIES`);
    }
  }
  for (const id of flat) {
    if (!ENGINE_ORDER.includes(id)) {
      throw new Error(`lib/engines/categories.ts: unknown engine id "${id}" in CATEGORIES`);
    }
  }
}
