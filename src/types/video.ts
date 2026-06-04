export type VideoPlatform = "B站" | "小红书" | "抖音" | "Keep" | "其他平台";

export interface Video {
  id: string;
  platform: VideoPlatform;
  url: string;
  author: string;
  title: string;
  bodyPart: string;
  duration: string;
  intensity: string;
  equipment: string;
  trainingType: string;
  specialTags: string[];
  note: string;
  createdAt: string;
  lastPracticedAt: string | null;
  completedCount: number;
  userPreference: string;
}

export type VideoItem = Video;

export interface CheckinRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  author: string;
  bodyPart: string;
  duration: string;
  intensity: string;
  equipment: string;
  trainingType: string;
  specialTags: string[];
  completedAt: string;
  mood: string;
  note: string;
}

export interface PlanItem {
  id: string;
  videoId: string;
  addedAt: string;
  completed: boolean;
  completedAt: string | null;
}

export interface DailyPlan {
  date: string;
  items: PlanItem[];
}
