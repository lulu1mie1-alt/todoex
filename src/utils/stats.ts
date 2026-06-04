import type { CheckinRecord } from "../types/video";
import { getDateKey, getRecentDateKeys } from "./date";

export interface TrainingTypeCount {
  label: string;
  count: number;
}

export interface TopVideoCount {
  label: string;
  count: number;
}

export interface WeeklyStats {
  records: CheckinRecord[];
  totalCount: number;
  totalMinutes: number;
  topBodyPart: string;
  trainingTypeCounts: TrainingTypeCount[];
  topVideo: TopVideoCount | null;
  dateKeys: string[];
  activeDateKeys: Set<string>;
  summary: string;
}

export function parseDurationToMinutes(duration: string): number {
  if (duration === "5min") return 5;
  if (duration === "10min") return 10;
  if (duration === "15min") return 15;
  if (duration === "20min") return 20;
  if (duration === "30min+") return 30;
  return 0;
}

export function sortRecordsByCompletedAtDesc(records: CheckinRecord[]) {
  return [...records].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

export function filterRecordsWithinRecentDays(records: CheckinRecord[], days: number) {
  const dateKeys = new Set(getRecentDateKeys(days));
  return records.filter((record) => dateKeys.has(getDateKey(new Date(record.completedAt))));
}

export function getTotalTrainingMinutes(records: CheckinRecord[]) {
  return records.reduce((total, record) => total + parseDurationToMinutes(record.duration), 0);
}

function getTopValue(records: CheckinRecord[], getValue: (record: CheckinRecord) => string) {
  const counts = new Map<string, number>();

  records.forEach((record) => {
    const value = getValue(record).trim();
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))[0] ?? null;
}

export function getTrainingTypeCounts(records: CheckinRecord[]): TrainingTypeCount[] {
  const counts = new Map<string, number>();

  records.forEach((record) => {
    const label = record.trainingType.trim() || "未分类";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"));
}

export function getTopVideo(records: CheckinRecord[]): TopVideoCount | null {
  const counts = new Map<string, TopVideoCount>();

  records.forEach((record) => {
    const label = `${record.author || "未知作者"}｜${record.videoTitle}`;
    const current = counts.get(record.videoId);
    counts.set(record.videoId, {
      label,
      count: (current?.count ?? 0) + 1,
    });
  });

  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"))[0] ?? null;
}

export function buildWeeklyStats(records: CheckinRecord[]): WeeklyStats {
  const dateKeys = getRecentDateKeys(7);
  const weeklyRecords = filterRecordsWithinRecentDays(records, 7);
  const activeDateKeys = new Set(weeklyRecords.map((record) => getDateKey(new Date(record.completedAt))));
  const topBodyPart = getTopValue(weeklyRecords, (record) => record.bodyPart)?.[0] ?? "";
  const totalCount = weeklyRecords.length;
  const summary = createWeeklySummary(totalCount, topBodyPart);

  return {
    records: weeklyRecords,
    totalCount,
    totalMinutes: getTotalTrainingMinutes(weeklyRecords),
    topBodyPart,
    trainingTypeCounts: getTrainingTypeCounts(weeklyRecords),
    topVideo: getTopVideo(weeklyRecords),
    dateKeys,
    activeDateKeys,
    summary,
  };
}

function createWeeklySummary(totalCount: number, topBodyPart: string) {
  if (totalCount <= 0) return "如果这周次数不多，也没关系，下一次从 5 分钟开始。";
  if (totalCount >= 3) return `这周你已经点亮小岛 ${totalCount} 次了，很棒，运动正在变成一种温柔的日常。`;
  if (topBodyPart) return `这一周你最常照顾的是${topBodyPart}，身体会记得这些小小的认真。`;
  return `这周你已经点亮小岛 ${totalCount} 次了，慢慢来就很好。`;
}
