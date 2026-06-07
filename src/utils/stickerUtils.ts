import type { CheckinRecord, Video } from "../types/video";
import type { RouteType, TodayEnergy } from "./recommendationEngine";
import { normalizeBodyPartText, parseDurationValue } from "./tagOptions";

export type StickerKind =
  | "leaf"
  | "fire"
  | "stone"
  | "lamp"
  | "moon"
  | "flag"
  | "island";

export interface StickerReward {
  kind: StickerKind;
  name: string;
  description: string;
  managerCopy: string;
}

export interface CheckinFeedback {
  title: string;
  managerCopy: string;
  sticker: StickerReward;
  taskCount: number;
  totalMinutes: number;
  routeLabel: string;
  isLowEnergy: boolean;
}

const routeLabels: Record<RouteType, string> = {
  low_energy: "低能量维护路线",
  default: "今日标准建设路线",
  active: "状态不错建设路线",
  sweaty: "小岛燃脂派对路线",
};

function textFromVideo(video: Pick<Video, "title" | "bodyPart" | "intensity" | "trainingType" | "specialTags" | "note">) {
  return [
    video.title,
    normalizeBodyPartText(video.bodyPart),
    video.intensity,
    video.trainingType,
    video.note,
    ...video.specialTags,
  ].join(" ");
}

function textFromRecord(record: CheckinRecord) {
  return [
    record.videoTitle,
    normalizeBodyPartText(record.bodyPart),
    record.intensity,
    record.trainingType,
    record.note,
    ...record.specialTags,
  ].join(" ");
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function inferStickerReward(input: {
  videos?: Video[];
  records?: CheckinRecord[];
  routeType?: RouteType;
  todayEnergy?: TodayEnergy;
}): StickerReward {
  const text = [
    ...(input.videos ?? []).map(textFromVideo),
    ...(input.records ?? []).map(textFromRecord),
    input.routeType ?? "",
    input.todayEnergy ?? "",
  ].join(" ");

  if (input.routeType === "low_energy" || input.todayEnergy === "low" || includesAny(text, ["低能量", "维护日"])) {
    return {
      kind: "lamp",
      name: "维护小灯贴纸",
      description: "低能量日也成功点亮。",
      managerCopy: "低能量不是失败，是小岛维护日。",
    };
  }

  if (includesAny(text, ["睡前", "月亮", "夜间", "助眠"])) {
    return {
      kind: "moon",
      name: "月光贝壳贴纸",
      description: "睡前放松也算认真收尾。",
      managerCopy: "今天只亮一盏灯，也算认真照顾自己。",
    };
  }

  if (includesAny(text, ["拉伸", "放松", "瑜伽", "肩颈", "舒缓", "恢复"])) {
    return {
      kind: "leaf",
      name: "海风叶子贴纸",
      description: "今天完成了放松维护任务。",
      managerCopy: "小岛今天亮了一盏灯，你也把自己照顾回来了。",
    };
  }

  if (includesAny(text, ["暴汗", "燃脂", "有氧", "HIIT", "高强度", "中高强度", "心率"])) {
    return {
      kind: "fire",
      name: "小岛火苗贴纸",
      description: "训练区今天热闹营业。",
      managerCopy: "训练区营业成功！明天不需要补课，回来就好。",
    };
  }

  if (includesAny(text, ["力量", "塑形", "臀腿", "核心", "腹", "哑铃", "弹力带"])) {
    return {
      kind: "stone",
      name: "山丘木桩贴纸",
      description: "今天给建设区添了一块稳稳的地基。",
      managerCopy: "今天不是变完美，是没有放弃。",
    };
  }

  if (includesAny(text, ["全身", "综合", "循环"])) {
    return {
      kind: "flag",
      name: "全岛小旗贴纸",
      description: "今天的小岛路线完整走过。",
      managerCopy: "小岛今天亮了一盏灯，你也把自己照顾回来了。",
    };
  }

  return {
    kind: "island",
    name: "今日营业贴纸",
    description: "今天的小岛有认真营业。",
    managerCopy: "今天不是变完美，是没有放弃。",
  };
}

export function buildCheckinFeedback(input: {
  completedVideos: Video[];
  routeType: RouteType;
  todayEnergy: TodayEnergy;
}): CheckinFeedback {
  const isLowEnergy = input.routeType === "low_energy" || input.todayEnergy === "low";
  const sticker = inferStickerReward({
    videos: input.completedVideos,
    routeType: input.routeType,
    todayEnergy: input.todayEnergy,
  });
  const totalMinutes = input.completedVideos.reduce((total, video) => total + parseDurationValue(video.duration), 0);

  return {
    title: isLowEnergy ? "小岛维护日完成！" : "今日小岛点亮成功！",
    managerCopy: sticker.managerCopy,
    sticker,
    taskCount: input.completedVideos.length,
    totalMinutes,
    routeLabel: routeLabels[input.routeType],
    isLowEnergy,
  };
}

export function isLowEnergyRecord(record: CheckinRecord) {
  if (record.routeType === "low_energy" || record.todayEnergy === "low") return true;
  return includesAny(textFromRecord(record), ["低能量", "维护日", "低强度", "膝盖友好", "经期友好"]);
}

export function isRecoveryRecord(record: CheckinRecord) {
  return includesAny(textFromRecord(record), ["拉伸", "放松", "瑜伽", "肩颈", "睡前", "恢复", "舒缓"]);
}

export function isHighEnergyRecord(record: CheckinRecord) {
  return includesAny(textFromRecord(record), ["暴汗", "燃脂", "有氧", "HIIT", "高强度", "中高强度", "心率"]);
}
