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
import { rollingShutterTear } from "./rollingShutterTear";
import { codecMacroblockDecoy } from "./codecMacroblockDecoy";
import { nerfViewInconsistency } from "./nerfViewInconsistency";
import { pointCloudStatic } from "./pointCloudStatic";
import { slamFeatureDesert } from "./slamFeatureDesert";
import { ganFingerprintMask } from "./ganFingerprintMask";
import { steganalysisNoiseBed } from "./steganalysisNoiseBed";
import { watermarkCollision } from "./watermarkCollision";
import { crowdCountDecoy } from "./crowdCountDecoy";
import { actionRecognitionJitter } from "./actionRecognitionJitter";
import { nmsOverlapFlood } from "./nmsOverlapFlood";
import { rollingBayerDemosaicJam } from "./rollingBayerDemosaicJam";
import { bboxCornerBleed } from "./bboxCornerBleed";
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
  rolling_shutter_tear: rollingShutterTear,
  codec_macroblock_decoy: codecMacroblockDecoy,
  nerf_view_inconsistency: nerfViewInconsistency,
  point_cloud_static: pointCloudStatic,
  slam_feature_desert: slamFeatureDesert,
  gan_fingerprint_mask: ganFingerprintMask,
  steganalysis_noise_bed: steganalysisNoiseBed,
  watermark_collision: watermarkCollision,
  crowd_count_decoy: crowdCountDecoy,
  action_recognition_jitter: actionRecognitionJitter,
  nms_overlap_flood: nmsOverlapFlood,
  rolling_bayer_demosaic_jam: rollingBayerDemosaicJam,
  bbox_corner_bleed: bboxCornerBleed,
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
  "rolling_shutter_tear",
  "codec_macroblock_decoy",
  "nerf_view_inconsistency",
  "point_cloud_static",
  "slam_feature_desert",
  "gan_fingerprint_mask",
  "steganalysis_noise_bed",
  "watermark_collision",
  "crowd_count_decoy",
  "action_recognition_jitter",
  "nms_overlap_flood",
  "rolling_bayer_demosaic_jam",
  "bbox_corner_bleed",
];

export * from "./types";
