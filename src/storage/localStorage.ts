import type { AppSettings } from "../types/settings";
import type { CheckinRecord, DailyPlan, PlanItem, Video } from "../types/video";
import { defaultVideos } from "../data/defaultVideos";
import {
  BODY_PART_OPTIONS,
  EQUIPMENT_OPTIONS,
  INTENSITY_OPTIONS,
  SPECIAL_TAG_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  normalizeBodyPartList,
  normalizeBodyPartOption,
} from "../utils/tagOptions";

const VIDEO_STORAGE_KEY = "fitnessIsland.videos";
const CHECKIN_STORAGE_KEY = "fitnessIsland.checkinRecords";
const SETTINGS_STORAGE_KEY = "fitnessIsland.settings";
const CUSTOM_TAG_OPTIONS_KEY = "fitnessIsland.customTagOptions";
const PLANS_STORAGE_KEY = "fitnessIsland.plans";
const DEFAULT_VIDEOS_INITIALIZED_KEY = "fitnessIsland.defaultVideosInitialized";

export type CustomTagGroup = "bodyPart" | "intensity" | "equipment" | "trainingType" | "specialTags";

export interface CustomTagOptions {
  bodyPart: string[];
  intensity: string[];
  equipment: string[];
  trainingType: string[];
  specialTags: string[];
}

interface StoredTagOptions {
  bodyPart: string[];
  intensity: string[];
  equipment: string[];
  trainingType: string[];
  specialTags: string[] | null;
}

const defaultSettings: AppSettings = {
  userName: "",
  defaultMood: "",
  reminderEnabled: false,
};

const defaultStoredTagOptions: StoredTagOptions = {
  bodyPart: [],
  intensity: [],
  equipment: [],
  trainingType: [],
  specialTags: null,
};

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readArrayStorage<T>(key: string): T[] {
  const value = readStorage<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeTextOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function mergeOptions(baseOptions: readonly string[], customOptions: string[]) {
  return Array.from(new Set([...baseOptions, ...customOptions]));
}

function mergeBodyPartOptions(customOptions: string[]) {
  return normalizeBodyPartList([...BODY_PART_OPTIONS, ...customOptions]);
}

function getStoredTagOptions(): StoredTagOptions {
  const stored = readStorage<Partial<StoredTagOptions>>(CUSTOM_TAG_OPTIONS_KEY, defaultStoredTagOptions);
  return {
    bodyPart: normalizeTextOptions(stored.bodyPart),
    intensity: normalizeTextOptions(stored.intensity),
    equipment: normalizeTextOptions(stored.equipment),
    trainingType: normalizeTextOptions(stored.trainingType),
    specialTags: Array.isArray(stored.specialTags) ? normalizeTextOptions(stored.specialTags) : null,
  };
}

function saveStoredTagOptions(options: StoredTagOptions) {
  writeStorage(CUSTOM_TAG_OPTIONS_KEY, options);
}

export function initializeDefaultVideosIfNeeded(): Video[] {
  const videos = readArrayStorage<Video>(VIDEO_STORAGE_KEY);
  const initialized = localStorage.getItem(DEFAULT_VIDEOS_INITIALIZED_KEY);

  if (initialized) return videos;

  if (videos.length === 0) {
    writeStorage(VIDEO_STORAGE_KEY, defaultVideos);
    localStorage.setItem(DEFAULT_VIDEOS_INITIALIZED_KEY, "true");
    return defaultVideos;
  }

  localStorage.setItem(DEFAULT_VIDEOS_INITIALIZED_KEY, "true");
  return videos;
}

export function getVideos(): Video[] {
  return initializeDefaultVideosIfNeeded();
}

export function saveVideos(videos: Video[]) {
  writeStorage(VIDEO_STORAGE_KEY, videos);
}

export function restoreDefaultVideos() {
  const videos = readArrayStorage<Video>(VIDEO_STORAGE_KEY);
  const existingIds = new Set(videos.map((video) => video.id));
  const existingUrls = new Set(videos.map((video) => video.url));
  const missingDefaultVideos = defaultVideos.filter(
    (video) => !existingIds.has(video.id) && !existingUrls.has(video.url),
  );

  if (missingDefaultVideos.length > 0) {
    saveVideos([...missingDefaultVideos, ...videos]);
  }

  localStorage.setItem(DEFAULT_VIDEOS_INITIALIZED_KEY, "true");

  return {
    restoredCount: missingDefaultVideos.length,
    totalDefaultCount: defaultVideos.length,
  };
}

export function addVideo(video: Video) {
  const videos = getVideos();
  saveVideos([video, ...videos]);
}

export function updateVideo(videoId: string, updates: Partial<Video>) {
  const videos = getVideos();
  saveVideos(videos.map((video) => (video.id === videoId ? { ...video, ...updates, id: video.id } : video)));
}

export function deleteVideo(videoId: string) {
  const videos = getVideos();
  saveVideos(videos.filter((video) => video.id !== videoId));
}

export function getCheckinRecords(): CheckinRecord[] {
  return readArrayStorage<CheckinRecord>(CHECKIN_STORAGE_KEY);
}

export function saveCheckinRecords(records: CheckinRecord[]) {
  writeStorage(CHECKIN_STORAGE_KEY, records);
}

export function addCheckinRecord(record: CheckinRecord) {
  const records = getCheckinRecords();
  saveCheckinRecords([record, ...records]);
}

export function getAllPlans(): DailyPlan[] {
  return readArrayStorage<DailyPlan>(PLANS_STORAGE_KEY);
}

export function saveAllPlans(plans: DailyPlan[]) {
  writeStorage(PLANS_STORAGE_KEY, plans);
}

export function getPlanByDate(date: string): DailyPlan {
  const plans = getAllPlans();
  return plans.find((plan) => plan.date === date) ?? { date, items: [] };
}

function createPlanItem(videoId: string): PlanItem {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    videoId,
    addedAt: new Date().toISOString(),
    completed: false,
    completedAt: null,
  };
}

export function addVideoToPlan(date: string, videoId: string) {
  const plans = getAllPlans();
  const existingPlan = plans.find((plan) => plan.date === date);

  if (existingPlan) {
    if (existingPlan.items.some((item) => item.videoId === videoId)) return;
    saveAllPlans(
      plans.map((plan) =>
        plan.date === date ? { ...plan, items: [...plan.items, createPlanItem(videoId)] } : plan,
      ),
    );
    return;
  }

  saveAllPlans([...plans, { date, items: [createPlanItem(videoId)] }]);
}

export function removeVideoFromPlan(date: string, videoId: string) {
  const plans = getAllPlans();
  saveAllPlans(
    plans
      .map((plan) =>
        plan.date === date ? { ...plan, items: plan.items.filter((item) => item.videoId !== videoId) } : plan,
      )
      .filter((plan) => plan.items.length > 0),
  );
}

export function togglePlanItemCompleted(date: string, videoId: string) {
  const plans = getAllPlans();
  saveAllPlans(
    plans.map((plan) => {
      if (plan.date !== date) return plan;
      return {
        ...plan,
        items: plan.items.map((item) => {
          if (item.videoId !== videoId) return item;
          const completed = !item.completed;
          return {
            ...item,
            completed,
            completedAt: completed ? new Date().toISOString() : null,
          };
        }),
      };
    }),
  );
}

export function isVideoInPlan(date: string, videoId: string): boolean {
  return getPlanByDate(date).items.some((item) => item.videoId === videoId);
}

export function clearPlanByDate(date: string) {
  const plans = getAllPlans();
  saveAllPlans(plans.filter((plan) => plan.date !== date));
}

export function getSettings(): AppSettings {
  return readStorage<AppSettings>(SETTINGS_STORAGE_KEY, defaultSettings);
}

export function saveSettings(settings: AppSettings) {
  writeStorage(SETTINGS_STORAGE_KEY, settings);
}

export function getTagOptions(): CustomTagOptions {
  const stored = getStoredTagOptions();

  return {
    bodyPart: mergeBodyPartOptions(stored.bodyPart),
    intensity: mergeOptions(INTENSITY_OPTIONS, stored.intensity),
    equipment: mergeOptions(EQUIPMENT_OPTIONS, stored.equipment),
    trainingType: mergeOptions(TRAINING_TYPE_OPTIONS, stored.trainingType),
    specialTags: stored.specialTags ?? [...SPECIAL_TAG_OPTIONS],
  };
}

export function addTagOption(group: CustomTagGroup, value: string) {
  const nextValue = group === "bodyPart" ? normalizeBodyPartOption(value) : value.trim();
  if (!nextValue) return;

  const stored = getStoredTagOptions();
  const currentOptions = group === "specialTags" ? stored.specialTags ?? [...SPECIAL_TAG_OPTIONS] : stored[group];

  if (currentOptions.includes(nextValue)) return;

  saveStoredTagOptions({
    ...stored,
    [group]: [...currentOptions, nextValue],
  });
}

export function deleteTagOption(group: CustomTagGroup, value: string) {
  const stored = getStoredTagOptions();

  if (group === "specialTags") {
    const currentOptions = stored.specialTags ?? [...SPECIAL_TAG_OPTIONS];
    saveStoredTagOptions({
      ...stored,
      specialTags: currentOptions.filter((item) => item !== value),
    });
    return;
  }

  saveStoredTagOptions({
    ...stored,
    [group]: stored[group].filter((item) => item !== value),
  });
}

export function isDeletableTagOption(group: CustomTagGroup, value: string): boolean {
  if (group === "specialTags") return true;
  return getStoredTagOptions()[group].includes(value);
}

export function clearAllData() {
  localStorage.removeItem(VIDEO_STORAGE_KEY);
  localStorage.removeItem(CHECKIN_STORAGE_KEY);
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.removeItem(CUSTOM_TAG_OPTIONS_KEY);
  localStorage.removeItem(PLANS_STORAGE_KEY);
  localStorage.removeItem(DEFAULT_VIDEOS_INITIALIZED_KEY);
}
