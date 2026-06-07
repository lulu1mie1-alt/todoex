import type { CheckinRecord, Video } from "../types/video";
import { getDateKey, getRecentDateKeys } from "./date";
import { normalizeBodyPartText, parseDurationValue } from "./tagOptions";

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

export interface DailyTrainingItem {
  id: string;
  videoId: string;
  title: string;
  author: string;
  bodyPart: string;
  duration: string;
  durationMinutes: number;
  intensity: string;
  equipment: string;
  trainingType: string;
  specialTags: string[];
  completedAt: string;
}

export interface DailyTrainingSummary {
  date: string;
  records: CheckinRecord[];
  completedItems: DailyTrainingItem[];
  totalDuration: number;
  completedCount: number;
  bodyParts: string[];
  trainingTypes: string[];
  isLowEnergy: boolean;
  routeTypes: string[];
}

const fallbackText = {
  author: "未知作者",
  bodyPart: "未填写部位",
  duration: "未填写时长",
  intensity: "未填写强度",
  equipment: "未填写道具",
  trainingType: "未分类",
  title: "已删除视频",
};

export function parseDurationToMinutes(duration: string): number {
  return parseDurationValue(duration ?? "");
}

export function sortRecordsByCompletedAtDesc(records: CheckinRecord[]) {
  return [...records].sort((a, b) => getRecordTime(b) - getRecordTime(a));
}

export function filterRecordsWithinRecentDays(records: CheckinRecord[], days: number) {
  const dateKeys = new Set(getRecentDateKeys(days));
  return records.filter((record) => {
    const dateKey = getRecordDateKey(record);
    return Boolean(dateKey && dateKeys.has(dateKey));
  });
}

export function getTotalTrainingMinutes(records: CheckinRecord[]) {
  return dedupeRecords(records).reduce((total, record) => total + parseDurationToMinutes(record.duration), 0);
}

function getRecordTime(record: CheckinRecord) {
  const time = new Date(record.completedAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getRecordDateKey(record: CheckinRecord) {
  const time = getRecordTime(record);
  if (!time) return null;
  return getDateKey(new Date(time));
}

function getRecordStableKey(record: CheckinRecord) {
  if (typeof record.id === "string" && record.id.trim()) return record.id;
  return [
    record.videoId ?? "",
    record.videoTitle ?? "",
    record.author ?? "",
    record.completedAt ?? "",
    record.duration ?? "",
  ].join("|");
}

function dedupeRecords(records: CheckinRecord[]) {
  const seen = new Set<string>();
  const result: CheckinRecord[] = [];

  records.forEach((record) => {
    const key = getRecordStableKey(record);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(record);
  });

  return result;
}

function getVideoSnapshot(record: CheckinRecord, videos?: Video[]) {
  return videos?.find((video) => video.id === record.videoId);
}

function normalizeTags(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function toDailyTrainingItem(record: CheckinRecord, videos?: Video[]): DailyTrainingItem {
  const video = getVideoSnapshot(record, videos);
  const title = record.videoTitle?.trim() || video?.title?.trim() || fallbackText.title;
  const duration = record.duration?.trim() || video?.duration?.trim() || fallbackText.duration;

  return {
    id: getRecordStableKey(record),
    videoId: record.videoId || video?.id || "",
    title,
    author: record.author?.trim() || video?.author?.trim() || fallbackText.author,
    bodyPart: normalizeBodyPartText(record.bodyPart || video?.bodyPart || fallbackText.bodyPart),
    duration,
    durationMinutes: parseDurationToMinutes(duration),
    intensity: record.intensity?.trim() || video?.intensity?.trim() || fallbackText.intensity,
    equipment: record.equipment?.trim() || video?.equipment?.trim() || fallbackText.equipment,
    trainingType: record.trainingType?.trim() || video?.trainingType?.trim() || fallbackText.trainingType,
    specialTags: normalizeTags(record.specialTags).length > 0 ? normalizeTags(record.specialTags) : normalizeTags(video?.specialTags),
    completedAt: record.completedAt || "",
  };
}

function uniqueFilled(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function groupRecordsByDate(records: CheckinRecord[]) {
  const groups = new Map<string, CheckinRecord[]>();

  dedupeRecords(records).forEach((record) => {
    const dateKey = getRecordDateKey(record);
    if (!dateKey) return;
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), record]);
  });

  return groups;
}

export function getRecordsByDate(dateKey: string, records: CheckinRecord[]) {
  return sortRecordsByCompletedAtDesc(groupRecordsByDate(records).get(dateKey) ?? []);
}

export function getDailyTrainingSummary(dateKey: string, records: CheckinRecord[], videos?: Video[]): DailyTrainingSummary {
  const dailyRecords = getRecordsByDate(dateKey, records);
  const completedItems = dailyRecords.map((record) => toDailyTrainingItem(record, videos));
  const routeTypes = uniqueFilled(dailyRecords.map((record) => record.routeType ?? ""));

  return {
    date: dateKey,
    records: dailyRecords,
    completedItems,
    totalDuration: completedItems.reduce((total, item) => total + item.durationMinutes, 0),
    completedCount: completedItems.length,
    bodyParts: uniqueFilled(completedItems.map((item) => item.bodyPart)),
    trainingTypes: uniqueFilled(completedItems.map((item) => item.trainingType)),
    isLowEnergy: dailyRecords.some((record) => record.routeType === "low_energy" || record.todayEnergy === "low"),
    routeTypes,
  };
}

export function getWeeklyTrainingDetails(records: CheckinRecord[], videos?: Video[]) {
  return getRecentDateKeys(7).map((dateKey) => getDailyTrainingSummary(dateKey, records, videos));
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

  dedupeRecords(records).forEach((record) => {
    const label = record.trainingType?.trim() || "未分类";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"));
}

export function getTopVideo(records: CheckinRecord[]): TopVideoCount | null {
  const counts = new Map<string, TopVideoCount>();

  dedupeRecords(records).forEach((record) => {
    const label = `${record.author || "未知作者"}｜${record.videoTitle || fallbackText.title}`;
    const key = record.videoId || getRecordStableKey(record);
    const current = counts.get(key);
    counts.set(key, {
      label,
      count: (current?.count ?? 0) + 1,
    });
  });

  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"))[0] ?? null;
}

export function buildWeeklyStats(records: CheckinRecord[]): WeeklyStats {
  const dateKeys = getRecentDateKeys(7);
  const weeklyRecords = dedupeRecords(filterRecordsWithinRecentDays(records, 7));
  const activeDateKeys = new Set(weeklyRecords.map((record) => getRecordDateKey(record)).filter((dateKey): dateKey is string => Boolean(dateKey)));
  const topBodyPart = getTopValue(weeklyRecords, (record) => normalizeBodyPartText(record.bodyPart || ""))?.[0] ?? "";
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
