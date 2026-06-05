import type { Video } from "../types/video";
import { detectPlatform } from "./platform";
import { normalizeBodyPartList } from "./tagOptions";

export interface VideoImportForm {
  shareText: string;
  url: string;
  platform: Video["platform"];
  author: string;
  title: string;
  bodyPart: string[];
  duration: string;
  intensity: string;
  equipment: string[];
  trainingType: string;
  specialTags: string[];
  note: string;
}

export function extractFirstUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s，。、“”‘’"'<>]+/i);
  return match ? match[0].replace(/[),.;!?，。；！？]+$/, "") : "";
}

export function extractCandidateTitle(text: string, url: string): string {
  if (!url) return "";

  const beforeUrl = text.slice(0, text.indexOf(url));
  return beforeUrl
    .replace(/^[\s#【】「」《》"'“”‘’]+|[\s#【】「」《》"'“”‘’]+$/g, "")
    .replace(/(复制|打开|点击|分享|链接|视频|来自|我在.+?发现了)/g, "")
    .replace(/\s+/g, " ")
    .replace(/[，。；:：|-]+$/g, "")
    .trim()
    .slice(0, 80);
}

export function createVideoFromForm(form: VideoImportForm): Video {
  const now = new Date().toISOString();
  const bodyPart = normalizeBodyPartList(form.bodyPart).join("、");

  return {
    id: `video-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    platform: form.platform || detectPlatform(form.url),
    url: form.url.trim(),
    author: form.author.trim() || "未知作者",
    title: form.title.trim(),
    bodyPart,
    duration: form.duration,
    intensity: form.intensity,
    equipment: form.equipment.join("、"),
    trainingType: form.trainingType,
    specialTags: form.specialTags,
    note: form.note.trim(),
    createdAt: now,
    lastPracticedAt: null,
    completedCount: 0,
    userPreference: "",
  };
}
