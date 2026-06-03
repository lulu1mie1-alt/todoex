import type { VideoPlatform } from "../types/video";

export function detectPlatform(url: string): VideoPlatform {
  const value = url.toLowerCase();

  if (value.includes("bilibili.com") || value.includes("b23.tv")) return "B站";
  if (value.includes("xiaohongshu.com") || value.includes("xhslink.com")) return "小红书";
  if (value.includes("douyin.com") || value.includes("iesdouyin.com")) return "抖音";
  if (value.includes("keep.com")) return "Keep";

  return "其他平台";
}
