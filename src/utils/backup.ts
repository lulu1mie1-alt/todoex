import type { AppSettings } from "../types/settings";
import type { CheckinRecord, DailyPlan, PlanItem, Video, VideoPlatform } from "../types/video";
import { FITNESS_ISLAND_STORAGE_KEYS, readStorage, writeStorage } from "../storage/localStorage";

const BACKUP_APP_ID = "fitness-island";
const BACKUP_VERSION = 1;

interface StoredTagOptionsBackup {
  bodyPart: string[];
  intensity: string[];
  equipment: string[];
  trainingType: string[];
  specialTags: string[] | null;
}

export interface FitnessIslandBackupData {
  videos: Video[];
  checkinRecords: CheckinRecord[];
  plans: DailyPlan[];
  settings: AppSettings;
  customTagOptions: StoredTagOptionsBackup;
  defaultVideosInitialized: boolean;
}

export interface FitnessIslandBackupPayload {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: FitnessIslandBackupData;
}

export interface LocalDataSummary {
  videoCount: number;
  checkinRecordCount: number;
  plannedDayCount: number;
  lastCheckinDate: string | null;
  storageLabel: string;
}

const defaultSettings: AppSettings = {
  userName: "",
  defaultMood: "",
  reminderEnabled: false,
};

const defaultCustomTagOptions: StoredTagOptionsBackup = {
  bodyPart: [],
  intensity: [],
  equipment: [],
  trainingType: [],
  specialTags: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toNumberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toBooleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function readRawJson<T>(key: string, fallback: T): T {
  return readStorage<T>(key, fallback);
}

function normalizeSettings(value: unknown): AppSettings {
  if (!isRecord(value)) return defaultSettings;
  return {
    userName: toStringValue(value.userName),
    defaultMood: toStringValue(value.defaultMood),
    reminderEnabled: toBooleanValue(value.reminderEnabled),
  };
}

function normalizeCustomTagOptions(value: unknown): StoredTagOptionsBackup {
  if (!isRecord(value)) return defaultCustomTagOptions;
  return {
    bodyPart: toStringArray(value.bodyPart),
    intensity: toStringArray(value.intensity),
    equipment: toStringArray(value.equipment),
    trainingType: toStringArray(value.trainingType),
    specialTags: Array.isArray(value.specialTags) ? toStringArray(value.specialTags) : null,
  };
}

function normalizeVideo(value: unknown): Video | null {
  if (!isRecord(value)) return null;

  const id = toStringValue(value.id).trim();
  const url = toStringValue(value.url).trim();
  const title = toStringValue(value.title).trim();
  if (!id || !url || !title) return null;

  return {
    id,
    platform: toStringValue(value.platform, "其他平台") as VideoPlatform,
    url,
    author: toStringValue(value.author, "未知作者"),
    title,
    bodyPart: toStringValue(value.bodyPart, "未填写部位"),
    duration: toStringValue(value.duration, "未填写时长"),
    intensity: toStringValue(value.intensity, "未填写强度"),
    equipment: toStringValue(value.equipment, "未填写道具"),
    trainingType: toStringValue(value.trainingType, "未分类"),
    specialTags: toStringArray(value.specialTags),
    note: toStringValue(value.note),
    createdAt: toStringValue(value.createdAt, new Date().toISOString()),
    lastPracticedAt: toNullableString(value.lastPracticedAt),
    completedCount: toNumberValue(value.completedCount),
    userPreference: toStringValue(value.userPreference),
  };
}

function normalizePlanItem(value: unknown): PlanItem | null {
  if (!isRecord(value)) return null;

  const id = toStringValue(value.id).trim();
  const videoId = toStringValue(value.videoId).trim();
  if (!id || !videoId) return null;

  return {
    id,
    videoId,
    addedAt: toStringValue(value.addedAt, new Date().toISOString()),
    completed: toBooleanValue(value.completed),
    completedAt: toNullableString(value.completedAt),
  };
}

function normalizePlan(value: unknown): DailyPlan | null {
  if (!isRecord(value)) return null;

  const date = toStringValue(value.date).trim();
  if (!date || !Array.isArray(value.items)) return null;

  return {
    date,
    items: value.items.map(normalizePlanItem).filter((item): item is PlanItem => Boolean(item)),
  };
}

function normalizeCheckinRecord(value: unknown): CheckinRecord | null {
  if (!isRecord(value)) return null;

  const id = toStringValue(value.id).trim();
  const completedAt = toStringValue(value.completedAt).trim();
  if (!id || !completedAt) return null;

  return {
    id,
    videoId: toStringValue(value.videoId),
    videoTitle: toStringValue(value.videoTitle, "已导入打卡记录"),
    author: toStringValue(value.author, "未知作者"),
    bodyPart: toStringValue(value.bodyPart, "未填写部位"),
    duration: toStringValue(value.duration, "未填写时长"),
    intensity: toStringValue(value.intensity, "未填写强度"),
    equipment: toStringValue(value.equipment, "未填写道具"),
    trainingType: toStringValue(value.trainingType, "未分类"),
    specialTags: toStringArray(value.specialTags),
    completedAt,
    mood: toStringValue(value.mood),
    note: toStringValue(value.note),
    routeType:
      value.routeType === "low_energy" || value.routeType === "default" || value.routeType === "active" || value.routeType === "sweaty"
        ? value.routeType
        : undefined,
    todayEnergy:
      value.todayEnergy === "low" || value.todayEnergy === "normal" || value.todayEnergy === "good" || value.todayEnergy === "sweaty"
        ? value.todayEnergy
        : undefined,
  };
}

function normalizeArray<T>(value: unknown, normalizeItem: (item: unknown) => T | null, fieldName: string): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${fieldName} 数据结构不正确。`);
  return value.map(normalizeItem).filter((item): item is T => Boolean(item));
}

function normalizeBackupData(value: unknown): FitnessIslandBackupData {
  if (!isRecord(value)) throw new Error("备份文件缺少 data 数据。");

  return {
    videos: normalizeArray(value.videos, normalizeVideo, "视频库"),
    checkinRecords: normalizeArray(value.checkinRecords, normalizeCheckinRecord, "打卡记录"),
    plans: normalizeArray(value.plans, normalizePlan, "计划"),
    settings: normalizeSettings(value.settings),
    customTagOptions: normalizeCustomTagOptions(value.customTagOptions),
    defaultVideosInitialized: value.defaultVideosInitialized === undefined ? true : toBooleanValue(value.defaultVideosInitialized, true),
  };
}

export function createBackupPayload(): FitnessIslandBackupPayload {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      videos: readRawJson<Video[]>(FITNESS_ISLAND_STORAGE_KEYS.videos, []),
      checkinRecords: readRawJson<CheckinRecord[]>(FITNESS_ISLAND_STORAGE_KEYS.checkinRecords, []),
      plans: readRawJson<DailyPlan[]>(FITNESS_ISLAND_STORAGE_KEYS.plans, []),
      settings: readRawJson<AppSettings>(FITNESS_ISLAND_STORAGE_KEYS.settings, defaultSettings),
      customTagOptions: readRawJson<StoredTagOptionsBackup>(FITNESS_ISLAND_STORAGE_KEYS.customTagOptions, defaultCustomTagOptions),
      defaultVideosInitialized: localStorage.getItem(FITNESS_ISLAND_STORAGE_KEYS.defaultVideosInitialized) === "true",
    },
  };
}

export function downloadBackup() {
  const payload = createBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");

  link.href = url;
  link.download = `fitness-island-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return payload;
}

export async function validateBackupFile(file: File): Promise<FitnessIslandBackupPayload> {
  if (!file.name.toLowerCase().endsWith(".json") && file.type && file.type !== "application/json") {
    throw new Error("请选择 JSON 格式的备份文件。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("备份文件无法解析，请确认文件没有损坏。");
  }

  if (!isRecord(parsed) || parsed.app !== BACKUP_APP_ID) {
    throw new Error("这不是 Fitness Island 导出的备份文件。");
  }

  const version = toNumberValue(parsed.version, 0);
  if (version < 1) {
    throw new Error("备份文件版本不受支持。");
  }

  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: toStringValue(parsed.exportedAt, new Date().toISOString()),
    data: normalizeBackupData(parsed.data),
  };
}

export function importBackupOverwrite(payload: FitnessIslandBackupPayload) {
  const { data } = payload;

  writeStorage(FITNESS_ISLAND_STORAGE_KEYS.videos, data.videos);
  writeStorage(FITNESS_ISLAND_STORAGE_KEYS.checkinRecords, data.checkinRecords);
  writeStorage(FITNESS_ISLAND_STORAGE_KEYS.plans, data.plans);
  writeStorage(FITNESS_ISLAND_STORAGE_KEYS.settings, data.settings);
  writeStorage(FITNESS_ISLAND_STORAGE_KEYS.customTagOptions, data.customTagOptions);
  localStorage.setItem(FITNESS_ISLAND_STORAGE_KEYS.defaultVideosInitialized, "true");
}

export function clearLocalDataForUser() {
  localStorage.removeItem(FITNESS_ISLAND_STORAGE_KEYS.videos);
  localStorage.removeItem(FITNESS_ISLAND_STORAGE_KEYS.checkinRecords);
  localStorage.removeItem(FITNESS_ISLAND_STORAGE_KEYS.plans);
  localStorage.removeItem(FITNESS_ISLAND_STORAGE_KEYS.settings);
  localStorage.removeItem(FITNESS_ISLAND_STORAGE_KEYS.customTagOptions);
  localStorage.setItem(FITNESS_ISLAND_STORAGE_KEYS.defaultVideosInitialized, "true");
}

export function getLocalDataSummary(): LocalDataSummary {
  const videos = readRawJson<unknown>(FITNESS_ISLAND_STORAGE_KEYS.videos, []);
  const checkinRecords = readRawJson<unknown>(FITNESS_ISLAND_STORAGE_KEYS.checkinRecords, []);
  const plans = readRawJson<unknown>(FITNESS_ISLAND_STORAGE_KEYS.plans, []);
  const validRecords = Array.isArray(checkinRecords)
    ? checkinRecords.map(normalizeCheckinRecord).filter((record): record is CheckinRecord => Boolean(record))
    : [];
  const lastCheckinDate =
    validRecords
      .map((record) => record.completedAt)
      .filter((value) => Number.isFinite(new Date(value).getTime()))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    videoCount: Array.isArray(videos) ? videos.length : 0,
    checkinRecordCount: Array.isArray(checkinRecords) ? checkinRecords.length : 0,
    plannedDayCount: Array.isArray(plans) ? plans.filter((plan) => isRecord(plan) && Array.isArray(plan.items) && plan.items.length > 0).length : 0,
    lastCheckinDate,
    storageLabel: "本设备浏览器 localStorage",
  };
}
