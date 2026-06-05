export const BODY_PART_OPTIONS = [
  "全身",
  "臀腿",
  "核心腰腹",
  "肩背",
  "手臂",
  "拉伸放松",
] as const;

const BODY_PART_ALIASES: Record<string, string> = {
  核心: "核心腰腹",
  腹部: "核心腰腹",
  腰腹: "核心腰腹",
  肩颈: "肩背",
  背部: "肩背",
};

export function normalizeBodyPartOption(value: string) {
  return BODY_PART_ALIASES[value.trim()] ?? value.trim();
}

export function normalizeBodyPartList(values: readonly string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeBodyPartOption(value))
        .filter(Boolean),
    ),
  );
}

export function normalizeBodyPartText(value: string) {
  return normalizeBodyPartList(value.split(/[，,\s、]+/)).join("、");
}

export const DURATION_OPTIONS = Array.from({ length: 61 }, (_, minute) => `${minute}min`);

export function parseDurationValue(value: string) {
  const match = value.match(/^(\d{1,2})min$/);
  if (!match) return 0;
  return Math.min(60, Math.max(0, Number(match[1])));
}

export function formatDurationValue(value: number) {
  return `${Math.min(60, Math.max(0, Math.round(value)))}min`;
}

export const INTENSITY_OPTIONS = ["低强度", "中强度", "中高强度", "高强度"] as const;

export const EQUIPMENT_OPTIONS = ["无器械", "瑜伽垫", "弹力带", "哑铃", "椅子", "跳绳", "其他"] as const;

export const TRAINING_TYPE_OPTIONS = ["有氧", "力量", "拉伸", "瑜伽", "普拉提", "热身", "放松"] as const;

export const SPECIAL_TAG_OPTIONS = [
  "经期友好",
  "低能量可练",
  "无跳跃",
  "膝盖友好",
  "久坐急救",
  "睡前放松",
  "心率强者",
  "暴汗预警",
  "线条训练",
  "针对训练",
  "重启日友好",
  "快速出汗",
  "温柔拉伸",
  "蜜桃臀启动",
  "天鹅臂",
  "少女背",
] as const;
