import { cvDazzle } from "./cvDazzle";
import { cnnTexture } from "./cnnTexture";
import { adversarialPatch } from "./adversarialPatch";
import { poseJammer } from "./poseJammer";
import { gaborGrating } from "./gaborGrating";
import { fgsmNoise } from "./fgsmNoise";
import { moireInterference } from "./moireInterference";
import { opticalFlowJammer } from "./opticalFlowJammer";
import { segmentationShatter } from "./segmentationShatter";
import { fiducialMimic } from "./fiducialMimic";
import { depthSpoof } from "./depthSpoof";
import { thermalDecoy } from "./thermalDecoy";
import { ocrGlitch } from "./ocrGlitch";
import { faceMeshScramble } from "./faceMeshScramble";
import { anchorBoxFlood } from "./anchorBoxFlood";
import { licensePlateGhost } from "./licensePlateGhost";
import { reidCamouflage } from "./reidCamouflage";
import { saliencyInversion } from "./saliencyInversion";
import { irisCodeJam } from "./irisCodeJam";
import { livenessSpoofTexture } from "./livenessSpoofTexture";
import { gaitScramble } from "./gaitScramble";
import { jpegDctBloom } from "./jpegDctBloom";
import { EngineId, RenderEngine } from "./types";

export const ENGINES: Record<EngineId, RenderEngine> = {
  cv_dazzle: cvDazzle,
  cnn_texture: cnnTexture,
  adversarial_patch: adversarialPatch,
  pose_jammer: poseJammer,
  gabor_grating: gaborGrating,
  fgsm_noise: fgsmNoise,
  moire_interference: moireInterference,
  optical_flow_jammer: opticalFlowJammer,
  segmentation_shatter: segmentationShatter,
  fiducial_mimic: fiducialMimic,
  depth_spoof: depthSpoof,
  thermal_decoy: thermalDecoy,
  ocr_glitch: ocrGlitch,
  face_mesh_scramble: faceMeshScramble,
  anchor_box_flood: anchorBoxFlood,
  license_plate_ghost: licensePlateGhost,
  reid_camouflage: reidCamouflage,
  saliency_inversion: saliencyInversion,
  iris_code_jam: irisCodeJam,
  liveness_spoof_texture: livenessSpoofTexture,
  gait_scramble: gaitScramble,
  jpeg_dct_bloom: jpegDctBloom,
};

export const ENGINE_ORDER: EngineId[] = [
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
];

export * from "./types";
