import { cvDazzle } from "./cvDazzle";
import { cnnTexture } from "./cnnTexture";
import { adversarialPatch } from "./adversarialPatch";
import { poseJammer } from "./poseJammer";
import { gaborGrating } from "./gaborGrating";
import { fgsmNoise } from "./fgsmNoise";
import { moireInterference } from "./moireInterference";
import { EngineId, RenderEngine } from "./types";

export const ENGINES: Record<EngineId, RenderEngine> = {
  cv_dazzle: cvDazzle,
  cnn_texture: cnnTexture,
  adversarial_patch: adversarialPatch,
  pose_jammer: poseJammer,
  gabor_grating: gaborGrating,
  fgsm_noise: fgsmNoise,
  moire_interference: moireInterference,
};

export const ENGINE_ORDER: EngineId[] = [
  "cv_dazzle",
  "cnn_texture",
  "adversarial_patch",
  "pose_jammer",
  "gabor_grating",
  "fgsm_noise",
  "moire_interference",
];

export * from "./types";
