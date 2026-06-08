import type { CheckinRecord, DailyPlan, Video } from "../types/video";
import { normalizeBodyPartText, parseDurationValue } from "./tagOptions";

export type RouteType = "low_energy" | "default" | "active" | "sweaty";
export type TodayEnergy = "low" | "normal" | "good" | "sweaty";
export type TodayBodyPart = "auto" | "fullBody" | "shoulderNeck" | "abs" | "glutesLegs" | "stretchRelax";
export type TodayLimitation = "noJump" | "kneeFriendly" | "periodFriendly" | "noEquipment" | "bedtimeRelax";
export type AvailableMinutes = 10 | 20 | 30 | 40 | 50 | 60;

export interface TodayStatus {
  energy: TodayEnergy;
  availableMinutes: AvailableMinutes;
  bodyPart: TodayBodyPart;
  limitations: TodayLimitation[];
}

export interface RecommendationRoute {
  routeType: RouteType;
  recommendedVideos: Video[];
  reason: string;
  encouragement: string;
  notice: string;
}

interface BuildRecommendationRouteInput {
  videos: Video[];
  checkinRecords: CheckinRecord[];
  todayStatus: TodayStatus;
  todayPlan: DailyPlan;
  variant?: number;
}

type RecommendationSlot = "main" | "support" | "recovery" | "any";

interface ScoredCandidate {
  video: Video;
  score: number;
  order: number;
}

const BODY_PART_KEYWORDS: Record<Exclude<TodayBodyPart, "auto">, string[]> = {
  fullBody: ["全身"],
  shoulderNeck: ["肩颈", "肩背"],
  abs: ["腹", "核心", "腰腹"],
  glutesLegs: ["臀腿", "臀", "腿"],
  stretchRelax: ["拉伸", "放松", "瑜伽"],
};

const LIMITATION_KEYWORDS: Record<TodayLimitation, string[]> = {
  noJump: ["无跳跃"],
  kneeFriendly: ["膝盖友好"],
  periodFriendly: ["经期友好"],
  noEquipment: ["无器械"],
  bedtimeRelax: ["睡前放松"],
};

const RECOVERY_KEYWORDS = ["拉伸", "放松", "瑜伽", "肩颈", "睡前放松", "温柔拉伸"];
const SWEATY_KEYWORDS = ["高强度", "中高强度", "有氧", "暴汗", "快速出汗", "心率强者"];
const LOW_ENERGY_KEYWORDS = ["低强度", "低能量", "拉伸", "放松", "肩颈", "睡前放松", "无跳跃", "无器械", "膝盖友好", "经期友好"];
const MAIN_TRAINING_KEYWORDS = ["力量", "有氧", "主训练", "针对训练", "线条训练", "全身", "核心", "腹", "臀腿"];

function textOf(video: Video) {
  return [
    video.title,
    video.author,
    normalizeBodyPartText(video.bodyPart),
    video.duration,
    video.intensity,
    video.equipment,
    video.trainingType,
    video.note,
    video.userPreference,
    ...video.specialTags,
  ].join(" ");
}

function durationOf(video: Video) {
  return parseDurationValue(video.duration);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isRecoveryVideo(video: Video) {
  return includesAny(textOf(video), RECOVERY_KEYWORDS);
}

function isMainTraining(video: Video) {
  const text = textOf(video);
  return includesAny(text, MAIN_TRAINING_KEYWORDS) && !isRecoveryVideo(video);
}

function routeTypeForEnergy(energy: TodayEnergy): RouteType {
  if (energy === "low") return "low_energy";
  if (energy === "good") return "active";
  if (energy === "sweaty") return "sweaty";
  return "default";
}

function routeTargetMinutes(routeType: RouteType, availableMinutes: number) {
  if (routeType === "low_energy") return Math.min(availableMinutes, 15);
  return availableMinutes;
}

function getLastMainBodyPart(records: CheckinRecord[]) {
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
  const record = sortedRecords.find((item) => !includesAny(textOfRecord(item), RECOVERY_KEYWORDS));
  return record ? normalizeBodyPartText(record.bodyPart) : "";
}

function textOfRecord(record: CheckinRecord) {
  return [
    record.videoTitle,
    normalizeBodyPartText(record.bodyPart),
    record.duration,
    record.intensity,
    record.equipment,
    record.trainingType,
    record.note,
    ...record.specialTags,
  ].join(" ");
}

function bodyPartScore(video: Video, todayStatus: TodayStatus, lastMainBodyPart: string) {
  const text = textOf(video);
  let score = 0;

  if (todayStatus.bodyPart !== "auto") {
    score += includesAny(text, BODY_PART_KEYWORDS[todayStatus.bodyPart]) ? 28 : -8;
  }

  if (lastMainBodyPart && text.includes(lastMainBodyPart) && !isRecoveryVideo(video)) {
    score -= 18;
  }

  return score;
}

function limitationScore(video: Video, todayStatus: TodayStatus) {
  const text = textOf(video);
  return todayStatus.limitations.reduce((score, limitation) => {
    return score + (includesAny(text, LIMITATION_KEYWORDS[limitation]) ? 12 : -2);
  }, 0);
}

function timeScore(video: Video, availableMinutes: number, slot: RecommendationSlot, routeType: RouteType) {
  const duration = durationOf(video);
  if (duration <= 0) return 0;

  if (routeType === "low_energy") {
    return duration === 10 ? 28 : Math.max(0, 20 - Math.abs(duration - 10));
  }

  if (slot === "recovery") {
    return duration <= 15 ? 12 : Math.max(0, 16 - Math.abs(duration - 15));
  }

  const ideal = slot === "main" ? Math.max(10, Math.round(availableMinutes * 0.55)) : Math.max(10, Math.round(availableMinutes * 0.25));
  return Math.max(0, 24 - Math.abs(duration - ideal));
}

function energyScore(video: Video, routeType: RouteType, slot: RecommendationSlot) {
  const text = textOf(video);

  if (routeType === "low_energy") {
    return includesAny(text, LOW_ENERGY_KEYWORDS) ? 34 : 0;
  }

  if (routeType === "sweaty") {
    if (slot === "recovery") return isRecoveryVideo(video) ? 32 : -10;
    return includesAny(text, SWEATY_KEYWORDS) ? 34 : 0;
  }

  if (routeType === "active") {
    if (slot === "recovery") return isRecoveryVideo(video) ? 28 : -8;
    if (includesAny(text, ["低强度"]) && !isRecoveryVideo(video)) return -12;
    return includesAny(text, ["中强度", "中高强度", "高强度", "力量", "有氧", "针对训练", "暴汗预警"]) ? 26 : 0;
  }

  if (slot === "recovery") return isRecoveryVideo(video) ? 30 : -8;
  if (slot === "main") {
    if (!isMainTraining(video)) return 0;
    return includesAny(text, ["低强度", "高强度", "暴汗预警", "心率强者"]) ? 14 : 26;
  }
  return isRecoveryVideo(video) ? 10 : 14;
}

function scoreVideo(video: Video, input: BuildRecommendationRouteInput, slot: RecommendationSlot, lastMainBodyPart: string) {
  const routeType = routeTypeForEnergy(input.todayStatus.energy);
  const text = textOf(video);
  let score = 0;

  score += energyScore(video, routeType, slot);
  score += bodyPartScore(video, input.todayStatus, lastMainBodyPart);
  score += limitationScore(video, input.todayStatus);
  score += timeScore(video, input.todayStatus.availableMinutes, slot, routeType);
  score += Math.max(0, 8 - video.completedCount);

  if (slot === "main" && isRecoveryVideo(video)) score -= 14;
  if (slot === "support" && isMainTraining(video)) score += 8;
  if (includesAny(text, ["低能量可续", "温柔拉伸"])) score += routeType === "low_energy" ? 14 : 2;

  return score;
}

function hashText(value: string) {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 997, 7);
}

function variantScore(video: Video, variant: number) {
  return (hashText(`${video.id}-${variant}`) % 19) - 9;
}

function sortCandidates(
  videos: Video[],
  input: BuildRecommendationRouteInput,
  slot: RecommendationSlot,
  selectedIds: Set<string>,
  lastMainBodyPart: string,
) {
  const variant = input.variant ?? 0;
  return videos
    .filter((video) => !selectedIds.has(video.id))
    .map((video, index) => ({
      video,
      score: scoreVideo(video, input, slot, lastMainBodyPart) + variantScore(video, variant),
      tieBreaker: (index + variant * 3) % Math.max(1, videos.length),
    }))
    .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker)
    .map((entry) => entry.video);
}

function chooseVideo(
  candidates: Video[],
  input: BuildRecommendationRouteInput,
  slot: RecommendationSlot,
  selectedIds: Set<string>,
  lastMainBodyPart: string,
) {
  const sorted = sortCandidates(candidates, input, slot, selectedIds, lastMainBodyPart);
  return sorted[0] ?? null;
}

function scoreRouteCombination(
  videos: Video[],
  candidates: ScoredCandidate[],
  input: BuildRecommendationRouteInput,
  routeType: RouteType,
) {
  const targetMinutes = routeTargetMinutes(routeType, input.todayStatus.availableMinutes);
  const totalDuration = videos.reduce((sum, video) => sum + durationOf(video), 0);
  const candidateScoreById = new Map(candidates.map((candidate) => [candidate.video.id, candidate.score]));
  const qualityScore = videos.reduce((sum, video) => sum + (candidateScoreById.get(video.id) ?? 0), 0);
  const overage = Math.max(0, totalDuration - targetMinutes);
  const underage = Math.max(0, targetMinutes - totalDuration);
  const timeFitScore = 300 - overage * 18 - underage * 10;
  const recoveryCount = videos.filter(isRecoveryVideo).length;
  const activeMainCount = videos.filter((video) => isMainTraining(video) && !isRecoveryVideo(video)).length;
  const routeShapeScore =
    routeType === "low_energy"
      ? recoveryCount * 14 - Math.max(0, videos.length - 2) * 18
      : routeType === "active"
        ? activeMainCount * 12 + recoveryCount * 4
        : routeType === "sweaty"
          ? activeMainCount * 10 + recoveryCount * 6
          : recoveryCount * 8 + activeMainCount * 6;
  const countPenalty = Math.max(0, videos.length - 1) * 12;

  return timeFitScore + qualityScore * 0.2 + routeShapeScore - countPenalty;
}

function buildTimeFittingRoute(
  candidates: ScoredCandidate[],
  input: BuildRecommendationRouteInput,
  routeType: RouteType,
) {
  const targetMinutes = routeTargetMinutes(routeType, input.todayStatus.availableMinutes);
  const maxDuration = routeType === "low_energy" ? targetMinutes + 5 : targetMinutes + 8;
  const maxItems = routeType === "low_energy" ? 2 : 5;
  const beamLimit = 28;
  const start = { videos: [] as Video[], duration: 0 };
  let routes = [start];

  candidates.slice(0, 24).forEach((candidate) => {
    const duration = durationOf(candidate.video);
    if (duration <= 0) return;

    const additions = routes
      .filter((route) => route.videos.length < maxItems && route.duration + duration <= maxDuration)
      .map((route) => ({
        videos: [...route.videos, candidate.video],
        duration: route.duration + duration,
      }));

    routes = [...routes, ...additions]
      .sort(
        (a, b) =>
          scoreRouteCombination(b.videos, candidates, input, routeType) -
          scoreRouteCombination(a.videos, candidates, input, routeType),
      )
      .slice(0, beamLimit);
  });

  const nonEmptyRoutes = routes.filter((route) => route.videos.length > 0);
  if (nonEmptyRoutes.length === 0) return [];

  const rankedRoutes = [...nonEmptyRoutes].sort(
    (a, b) =>
      scoreRouteCombination(b.videos, candidates, input, routeType) -
      scoreRouteCombination(a.videos, candidates, input, routeType),
  );
  const seenRouteKeys = new Set<string>();
  const uniqueRoutes = rankedRoutes.filter((route) => {
    const key = route.videos.map((video) => video.id).join("|");
    if (seenRouteKeys.has(key)) return false;
    seenRouteKeys.add(key);
    return true;
  });
  const bestScore = scoreRouteCombination(uniqueRoutes[0].videos, candidates, input, routeType);
  const swappableRoutes = uniqueRoutes.filter(
    (route) => bestScore - scoreRouteCombination(route.videos, candidates, input, routeType) <= 45,
  );
  const variant = input.variant ?? 0;

  return swappableRoutes[variant % Math.max(1, swappableRoutes.length)].videos;
}

function selectRouteVideos(input: BuildRecommendationRouteInput) {
  const routeType = routeTypeForEnergy(input.todayStatus.energy);
  const plannedVideoIds = new Set(input.todayPlan.items.map((item) => item.videoId));
  const availableVideos = input.videos.filter((video) => !plannedVideoIds.has(video.id));
  const lastMainBodyPart = getLastMainBodyPart(input.checkinRecords);

  if (availableVideos.length === 0) return [];

  const slots: RecommendationSlot[] =
    routeType === "low_energy"
      ? ["recovery"]
      : routeType === "sweaty"
        ? ["main", "support", "recovery"]
        : routeType === "active"
          ? ["main", "support"]
          : ["main", "recovery"];
  const variant = input.variant ?? 0;
  const slotCandidates = slots.flatMap((slot, slotIndex) =>
    sortCandidates(availableVideos, input, slot, new Set(), lastMainBodyPart).map((video, order) => ({
      video,
      score: scoreVideo(video, input, slot, lastMainBodyPart) + variantScore(video, variant + slotIndex),
      order,
    })),
  );
  const bestCandidateById = new Map<string, ScoredCandidate>();

  slotCandidates.forEach((candidate) => {
    const existing = bestCandidateById.get(candidate.video.id);
    if (!existing || candidate.score > existing.score) {
      bestCandidateById.set(candidate.video.id, candidate);
    }
  });

  const candidates = Array.from(bestCandidateById.values()).sort((a, b) => b.score - a.score || a.order - b.order);
  const selectedVideos = buildTimeFittingRoute(candidates, input, routeType);

  if (selectedVideos.length > 0) return selectedVideos;

  const fallbackVideo = chooseVideo(availableVideos, input, "any", new Set(), lastMainBodyPart);
  return fallbackVideo ? [fallbackVideo] : [];
}

function buildReason(routeType: RouteType, selectedVideos: Video[], lastMainBodyPart: string) {
  const repeatCopy =
    lastMainBodyPart && selectedVideos.some((video) => !isRecoveryVideo(video) && !textOf(video).includes(lastMainBodyPart))
      ? `上次已经建设过${lastMainBodyPart}区啦，今天小岛帮你换个区域，让身体更均衡。`
      : "";

  const recoveryCopy = selectedVideos.some(isRecoveryVideo)
    ? "拉伸和放松属于小岛维护项目，可以经常出现，不算重复轰炸。"
    : "";

  const baseReason: Record<RouteType, string> = {
    low_energy: "今天进入低能量模式，小岛只安排轻量维护任务。完成它，也算今日营业成功。",
    default: "今天小岛优先按你的可用时间安排路线，任务数量不固定，能稳稳完成最重要。",
    active: "今天状态不错，小岛会更偏向主训练和高质量建设，同时尽量贴近你留出的时间。",
    sweaty: "今天适合开一场小岛燃脂派对，但最后还是给你留了拉伸收尾，避免训练区过热。",
  };

  return [baseReason[routeType], repeatCopy, recoveryCopy].filter(Boolean).join(" ");
}

function buildEncouragement(routeType: RouteType) {
  const encouragements: Record<RouteType, string[]> = {
    low_energy: [
      "今天不需要燃烧自己，只要让身体重新上线。",
      "低能量不是失败，是小岛维护日。",
      "今天的目标不是变完美，而是轻轻回来。",
    ],
    default: ["按这条路线慢慢来，完成一个小任务，小岛就亮一盏灯。"],
    active: ["状态不错也记得留一点余裕，稳稳建设比一口气冲完更可爱。"],
    sweaty: ["可以热闹一点，但不用硬扛。觉得过热时，随时把路线切回维护模式。"],
  };

  const list = encouragements[routeType];
  return list[Math.floor(Math.random() * list.length)];
}

function buildNotice(input: BuildRecommendationRouteInput, selectedVideos: Video[]) {
  if (input.videos.length === 0) return "视频库还空着，先导入几个想练的视频，小岛管理员就能安排路线啦。";

  const plannedVideoIds = new Set(input.todayPlan.items.map((item) => item.videoId));
  if (input.videos.every((video) => plannedVideoIds.has(video.id))) {
    return "视频库里的训练都已经在今日计划里啦，可以先完成现有路线。";
  }

  const routeType = routeTypeForEnergy(input.todayStatus.energy);
  const targetMinutes = routeTargetMinutes(routeType, input.todayStatus.availableMinutes);
  const totalDuration = selectedVideos.reduce((sum, video) => sum + durationOf(video), 0);
  if (selectedVideos.length > 0 && Math.abs(totalDuration - targetMinutes) > 10) {
    return `这次匹配到约 ${totalDuration} 分钟训练，小岛会优先贴近你的可用时间，但不会强行凑任务数量。`;
  }

  return "";
}

export function buildRecommendationRoute(input: BuildRecommendationRouteInput): RecommendationRoute {
  const routeType = routeTypeForEnergy(input.todayStatus.energy);
  const recommendedVideos = selectRouteVideos(input);
  const lastMainBodyPart = getLastMainBodyPart(input.checkinRecords);

  return {
    routeType,
    recommendedVideos,
    reason: buildReason(routeType, recommendedVideos, lastMainBodyPart),
    encouragement: buildEncouragement(routeType),
    notice: buildNotice(input, recommendedVideos),
  };
}
