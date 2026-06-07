import type { CheckinRecord } from "../types/video";
import type { WeeklyStats } from "./stats";
import { inferStickerReward, isHighEnergyRecord, isLowEnergyRecord, isRecoveryRecord, type StickerReward } from "./stickerUtils";

export interface WeeklyIslandReport {
  activeDayCount: number;
  returnCount: number;
  mainTrainingType: string;
  lowEnergyCount: number;
  representativeSticker: StickerReward;
  islandTitle: string;
  managerSummary: string;
  showLowEnergyCount: boolean;
}

function getMainTrainingType(stats: WeeklyStats) {
  return stats.trainingTypeCounts[0]?.label ?? "";
}

function getDiversityScore(stats: WeeklyStats) {
  return stats.trainingTypeCounts.filter((item) => item.count > 0).length;
}

function buildIslandTitle(stats: WeeklyStats, reportBase: Pick<WeeklyIslandReport, "lowEnergyCount">) {
  const total = stats.totalCount;
  const recoveryCount = stats.records.filter(isRecoveryRecord).length;
  const highEnergyCount = stats.records.filter(isHighEnergyRecord).length;

  if (total <= 0) return "小岛休港中";
  if (getDiversityScore(stats) >= 3) return "均衡探索型岛主";
  if (recoveryCount + reportBase.lowEnergyCount >= Math.max(2, Math.ceil(total * 0.55))) return "温柔维护型岛主";
  if (highEnergyCount >= Math.max(2, Math.ceil(total * 0.45))) return "活力建设型岛主";
  if (total <= 2) return "重新上线的岛主";
  if (total <= 4) return "稳定营业的岛主";
  return "稳定营业的岛主";
}

function buildManagerSummary(stats: WeeklyStats, lowEnergyCount: number) {
  const total = stats.totalCount;
  const recoveryCount = stats.records.filter(isRecoveryRecord).length;
  const highEnergyCount = stats.records.filter(isHighEnergyRecord).length;
  const notes: string[] = [];

  if (total <= 0) {
    notes.push("这周小岛暂时休港。没关系，下一次回来时，从一盏灯开始就好。");
  } else if (total <= 2) {
    notes.push("这周小岛亮起了几次灯。节奏不需要完美，愿意回来就已经是重启。");
  } else if (total <= 4) {
    notes.push("这周小岛稳定营业中。你不是靠逼自己坚持，而是一次次把身体接回来。");
  } else {
    notes.push("这周小岛非常热闹！记得让身体有维护日，亮灯之外也需要休息。");
  }

  if (lowEnergyCount >= 2) {
    notes.push("这周有几次是维护日路线。低能量不是拖后腿，它让小岛没有彻底熄灯。");
  } else if (recoveryCount >= 2) {
    notes.push("这周小岛的维护区很常营业。拉伸和放松也是训练的一部分。");
  } else if (highEnergyCount >= 2) {
    notes.push("这周训练区火力很足。下周可以适当安排一点恢复路线，让小岛持续营业。");
  }

  return notes.join(" ");
}

export function buildWeeklyIslandReport(stats: WeeklyStats): WeeklyIslandReport {
  const lowEnergyCount = stats.records.filter(isLowEnergyRecord).length;
  const representativeSticker = inferStickerReward({ records: stats.records });
  const base = { lowEnergyCount };

  return {
    activeDayCount: stats.activeDateKeys.size,
    returnCount: stats.activeDateKeys.size,
    mainTrainingType: getMainTrainingType(stats),
    lowEnergyCount,
    representativeSticker,
    islandTitle: buildIslandTitle(stats, base),
    managerSummary: buildManagerSummary(stats, lowEnergyCount),
    showLowEnergyCount: lowEnergyCount > 0,
  };
}
