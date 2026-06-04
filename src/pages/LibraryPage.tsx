import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import VideoCard from "../components/VideoCard";
import {
  addTagOption,
  addVideoToPlan,
  deleteVideo,
  getTagOptions,
  isDeletableTagOption,
  isVideoInPlan,
  updateVideo,
  type CustomTagGroup,
} from "../storage/localStorage";
import type { Video } from "../types/video";
import { getDateKey, getNextDateKeys } from "../utils/date";
import { DURATION_OPTIONS } from "../utils/tagOptions";

interface LibraryPageProps {
  videos: Video[];
  onVideosChanged: () => void;
}

interface LibraryFilters {
  platform: string;
  bodyPart: string[];
  duration: string;
  intensity: string;
  equipment: string[];
  trainingType: string;
  specialTags: string[];
}

const PLATFORM_OPTIONS = ["B站", "小红书", "抖音", "Keep", "其他平台"];
const emptyFilters: LibraryFilters = {
  platform: "",
  bodyPart: [],
  duration: "",
  intensity: "",
  equipment: [],
  trainingType: "",
  specialTags: [],
};
const LIBRARY_FILTERS_KEY = "fitnessIsland.libraryFilters";
const LIBRARY_QUERY_KEY = "fitnessIsland.libraryQuery";
const LIBRARY_SCROLL_KEY = "fitnessIsland.libraryScrollY";
const ACTIVE_PAGE_KEY = "fitnessIsland.activePage";

function getInitialLibraryFilters(): LibraryFilters {
  try {
    const raw = sessionStorage.getItem(LIBRARY_FILTERS_KEY);
    if (!raw) return emptyFilters;
    const parsed = JSON.parse(raw) as Partial<LibraryFilters>;
    return {
      platform: parsed.platform || "",
      bodyPart: Array.isArray(parsed.bodyPart) ? parsed.bodyPart : [],
      duration: parsed.duration || "",
      intensity: parsed.intensity || "",
      equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
      trainingType: parsed.trainingType || "",
      specialTags: Array.isArray(parsed.specialTags) ? parsed.specialTags : [],
    };
  } catch {
    return emptyFilters;
  }
}

function splitTextTags(value: string) {
  return value
    .split(/[，,\s、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function LibraryPage({ videos, onVideosChanged }: LibraryPageProps) {
  const [query, setQuery] = useState(() => sessionStorage.getItem(LIBRARY_QUERY_KEY) || "");
  const [filters, setFilters] = useState<LibraryFilters>(getInitialLibraryFilters);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editDraft, setEditDraft] = useState<Video | null>(null);
  const [selectableOptions, setSelectableOptions] = useState(() => getTagOptions());
  const [openCustomGroup, setOpenCustomGroup] = useState<string | null>(null);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [planningVideo, setPlanningVideo] = useState<Video | null>(null);
  const [customPlanDate, setCustomPlanDate] = useState(getDateKey());
  const [planFeedback, setPlanFeedback] = useState("");
  const [planVersion, setPlanVersion] = useState(0);
  const today = getDateKey();

  useEffect(() => {
    sessionStorage.setItem(LIBRARY_QUERY_KEY, query);
  }, [query]);

  useEffect(() => {
    sessionStorage.setItem(LIBRARY_FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!planFeedback) return;

    const timer = window.setTimeout(() => {
      setPlanFeedback("");
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [planFeedback]);

  const filteredVideos = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return videos.filter((video) => {
      const searchableText = [
        video.platform,
        video.author,
        video.title,
        video.bodyPart,
        video.duration,
        video.intensity,
        video.equipment,
        video.trainingType,
        video.note,
        ...video.specialTags,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || searchableText.includes(keyword)) &&
        (!filters.platform || video.platform === filters.platform) &&
        filters.bodyPart.every((item) => video.bodyPart.includes(item)) &&
        (!filters.duration || video.duration === filters.duration) &&
        (!filters.intensity || video.intensity === filters.intensity) &&
        filters.equipment.every((item) => video.equipment.includes(item)) &&
        (!filters.trainingType || video.trainingType === filters.trainingType) &&
        filters.specialTags.every((item) => video.specialTags.includes(item))
      );
    });
  }, [filters, query, videos]);

  function setSingleFilter(key: keyof Pick<LibraryFilters, "platform" | "duration" | "intensity" | "trainingType">, value: string) {
    setFilters((current) => ({ ...current, [key]: current[key] === value ? "" : value }));
  }

  function toggleMultiFilter(key: keyof Pick<LibraryFilters, "bodyPart" | "equipment" | "specialTags">, value: string) {
    setFilters((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...current, [key]: nextValues };
    });
  }

  function startEdit(video: Video) {
    setEditingVideo(video);
    setEditDraft({ ...video, specialTags: [...video.specialTags] });
    setOpenCustomGroup(null);
  }

  function saveEdit() {
    if (!editingVideo || !editDraft) return;

    updateVideo(editingVideo.id, {
      ...editDraft,
      author: editDraft.author.trim() || "未知作者",
      title: editDraft.title.trim() || editingVideo.title,
      url: editDraft.url.trim(),
      bodyPart: editDraft.bodyPart.trim(),
      equipment: editDraft.equipment.trim(),
      specialTags: editDraft.specialTags,
      note: editDraft.note.trim(),
    });
    setEditingVideo(null);
    setEditDraft(null);
    onVideosChanged();
  }

  function removeVideo(video: Video) {
    if (!window.confirm(`确认删除「${video.title}」吗？`)) return;
    deleteVideo(video.id);
    onVideosChanged();
  }

  function openSource(video: Video) {
    sessionStorage.setItem(ACTIVE_PAGE_KEY, "library");
    sessionStorage.setItem(LIBRARY_SCROLL_KEY, String(window.scrollY));
    window.open(video.url, "_blank", "noopener,noreferrer");
    onVideosChanged();
  }

  function addPlanForDate(video: Video, date: string, message: string) {
    addVideoToPlan(date, video.id);
    setPlanVersion((version) => version + 1);
    setPlanFeedback(message);
    setPlanningVideo(null);
  }

  function updateDraft(updates: Partial<Video>) {
    setEditDraft((current) => (current ? { ...current, ...updates } : current));
  }

  function updateCustomInput(group: string, value: string) {
    setCustomInputs((current) => ({ ...current, [group]: value }));
  }

  function addCustomValue(group: CustomTagGroup, applyValue: (value: string) => void) {
    const nextValue = (customInputs[group] || "").trim();
    if (!nextValue) return;
    addTagOption(group, nextValue);
    setSelectableOptions(getTagOptions());
    applyValue(nextValue);
    updateCustomInput(group, "");
    setOpenCustomGroup(null);
  }

  function renderCustomAction(group: CustomTagGroup) {
    const open = openCustomGroup === group;
    return (
      <button
        type="button"
        className={open ? "chip active" : "chip"}
        aria-pressed={open}
        onClick={() => setOpenCustomGroup(open ? null : group)}
      >
        ...
      </button>
    );
  }

  function renderCustomInput(group: CustomTagGroup, placeholder: string, applyValue: (value: string) => void) {
    if (openCustomGroup !== group) return null;
    return (
      <div className="custom-tag-inline">
        <input
          value={customInputs[group] || ""}
          onChange={(event) => updateCustomInput(group, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomValue(group, applyValue);
            }
          }}
          placeholder={placeholder}
          autoFocus
        />
        <button type="button" onClick={() => addCustomValue(group, applyValue)}>
          添加
        </button>
      </div>
    );
  }

  function updateDraftMultiText(field: "bodyPart" | "equipment", value: string) {
    if (!editDraft) return;
    const values = splitTextTags(editDraft[field]);
    const nextValues = values.includes(value)
      ? values.length > 1
        ? values.filter((item) => item !== value)
        : values
      : [...values, value];
    updateDraft({ [field]: nextValues.join("、") });
  }

  function updateDraftSpecialTag(value: string) {
    if (!editDraft) return;
    const nextTags = editDraft.specialTags.includes(value)
      ? editDraft.specialTags.filter((item) => item !== value)
      : [...editDraft.specialTags, value];
    updateDraft({ specialTags: nextTags });
  }

  return (
    <section className="page-stack">
      <div className="panel library-hero">
        <div className="section-header">
          <h2>视频库</h2>
          <span>{filteredVideos.length} / {videos.length} 条</span>
        </div>
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索作者、标题、部位或标签"
        />
      </div>

      <div className="filter-panel">
        <FilterRow label="平台" options={PLATFORM_OPTIONS} value={filters.platform} onPick={(value) => setSingleFilter("platform", value)} />
        <FilterRow label="锻炼部位（可多选）" options={selectableOptions.bodyPart} value={filters.bodyPart} onPick={(value) => toggleMultiFilter("bodyPart", value)} multiple />
        <FilterRow label="时长" options={DURATION_OPTIONS} value={filters.duration} onPick={(value) => setSingleFilter("duration", value)} />
        <FilterRow label="强度" options={selectableOptions.intensity} value={filters.intensity} onPick={(value) => setSingleFilter("intensity", value)} />
        <FilterRow label="道具（可多选）" options={selectableOptions.equipment} value={filters.equipment} onPick={(value) => toggleMultiFilter("equipment", value)} multiple />
        <FilterRow label="训练类型" options={selectableOptions.trainingType} value={filters.trainingType} onPick={(value) => setSingleFilter("trainingType", value)} />
        <FilterRow label="特色标签（可多选）" options={selectableOptions.specialTags} value={filters.specialTags} onPick={(value) => toggleMultiFilter("specialTags", value)} multiple />
      </div>

      <div className="card-list">
        {videos.length === 0 && <p className="empty-copy">你的小岛还没有训练视频，先导入一个今天想练的吧。</p>}
        {videos.length > 0 && filteredVideos.length === 0 && <p className="empty-copy">暂时没有符合筛选的视频。</p>}
        {filteredVideos.map((video) => (
          <VideoCard key={video.id} video={video}>
            <div className="card-actions">
              <button type="button" onClick={() => openSource(video)}>打开</button>
              <button type="button" onClick={() => setPlanningVideo(video)}>
                加入计划
              </button>
              <button type="button" onClick={() => startEdit(video)}>编辑</button>
              <button className="danger-action" type="button" onClick={() => removeVideo(video)}>删除</button>
            </div>
          </VideoCard>
        ))}
      </div>

      {editingVideo && editDraft && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="编辑视频">
          <div className="edit-modal">
            <div className="section-header">
              <h2>编辑视频</h2>
              <button className="text-button" type="button" onClick={() => setEditingVideo(null)}>取消</button>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>作者</span>
                <input value={editDraft.author} onChange={(event) => updateDraft({ author: event.target.value })} />
              </label>
              <label className="form-field">
                <span>视频标题</span>
                <input value={editDraft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
              </label>
            </div>
            <label className="form-field">
              <span>链接</span>
              <input value={editDraft.url} onChange={(event) => updateDraft({ url: event.target.value })} />
            </label>

            <EditChipGroup
              label="锻炼部位"
              options={selectableOptions.bodyPart}
              value={splitTextTags(editDraft.bodyPart)}
              onChange={(value) => updateDraftMultiText("bodyPart", value)}
              multiple
              trailingAction={renderCustomAction("bodyPart")}
            />
            {renderCustomInput("bodyPart", "写一个锻炼部位", (value) => updateDraftMultiText("bodyPart", value))}
            <EditChipGroup label="时长" options={DURATION_OPTIONS} value={editDraft.duration} onChange={(duration) => updateDraft({ duration })} scrollable />
            <EditChipGroup
              label="强度"
              options={selectableOptions.intensity}
              value={editDraft.intensity}
              onChange={(intensity) => updateDraft({ intensity })}
              trailingAction={renderCustomAction("intensity")}
            />
            {renderCustomInput("intensity", "写一个强度描述", (value) => updateDraft({ intensity: value }))}
            <EditChipGroup
              label="道具"
              options={selectableOptions.equipment}
              value={splitTextTags(editDraft.equipment)}
              onChange={(value) => updateDraftMultiText("equipment", value)}
              multiple
              trailingAction={renderCustomAction("equipment")}
            />
            {renderCustomInput("equipment", "写一个道具", (value) => updateDraftMultiText("equipment", value))}
            <EditChipGroup
              label="训练类型"
              options={selectableOptions.trainingType}
              value={editDraft.trainingType}
              onChange={(trainingType) => updateDraft({ trainingType })}
              trailingAction={renderCustomAction("trainingType")}
            />
            {renderCustomInput("trainingType", "写一个训练类型", (value) => updateDraft({ trainingType: value }))}
            <EditChipGroup
              label="特色标签"
              options={selectableOptions.specialTags}
              value={editDraft.specialTags}
              onChange={updateDraftSpecialTag}
              multiple
              trailingAction={renderCustomAction("specialTags")}
            />
            {renderCustomInput("specialTags", "写一个自己的标签", updateDraftSpecialTag)}

            <label className="form-field">
              <span>备注</span>
              <textarea value={editDraft.note} onChange={(event) => updateDraft({ note: event.target.value })} />
            </label>
            <button className="primary-button" type="button" onClick={saveEdit}>保存修改</button>
          </div>
        </div>
      )}

      {planFeedback && <p className="floating-feedback">{planFeedback}</p>}

      {planningVideo && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="加入计划">
          <div className="edit-modal">
            <div className="section-header">
              <h2>加入计划</h2>
              <button className="text-button" type="button" onClick={() => setPlanningVideo(null)}>取消</button>
            </div>
            <VideoCard video={planningVideo} />
            <button className="primary-button" type="button" disabled={isVideoInPlan(today, planningVideo.id)} onClick={() => addPlanForDate(planningVideo, today, "已放进今天的小岛计划。")}>
              {isVideoInPlan(today, planningVideo.id) ? "已在今日计划" : "加入今日计划"}
            </button>
            <div className="week-plan-box">
              <span>加入本周计划</span>
              <p className="muted">当前实现为：选择本周/未来 7 天里的某一天加入计划。</p>
              <div className="filter-scroll">
                {getNextDateKeys(7).map((date) => (
                  <button key={date} className="filter-chip" type="button" onClick={() => addPlanForDate(planningVideo, date, `已放进 ${date} 的小岛计划。`)}>
                    {date}
                  </button>
                ))}
              </div>
            </div>
            <label className="form-field">
              <span>自定义日期计划</span>
              <input type="date" value={customPlanDate} onChange={(event) => setCustomPlanDate(event.target.value)} />
            </label>
            <button className="primary-button" type="button" onClick={() => addPlanForDate(planningVideo, customPlanDate, `已放进 ${customPlanDate} 的小岛计划。`)}>
              加入自定义日期计划
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

interface FilterRowProps {
  label: string;
  options: readonly string[];
  value: string | string[];
  onPick: (value: string) => void;
  multiple?: boolean;
}

function FilterRow({ label, options, value, onPick, multiple = false }: FilterRowProps) {
  return (
    <div className="filter-row">
      <span>{label}</span>
      <div className="filter-scroll">
        {options.map((option) => {
          const active = Array.isArray(value) ? value.includes(option) : value === option;
          return (
            <button
              key={option}
              type="button"
              className={active ? "filter-chip active" : "filter-chip"}
              onClick={() => onPick(option)}
            >
              {option}{multiple && active ? " ✓" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface EditChipGroupProps {
  label: string;
  options: readonly string[];
  value: string | string[];
  onChange: (value: string) => void;
  multiple?: boolean;
  scrollable?: boolean;
  trailingAction?: ReactNode;
}

function EditChipGroup({ label, options, value, onChange, multiple = false, scrollable = false, trailingAction }: EditChipGroupProps) {
  return (
    <div className={scrollable ? "chip-group scrollable" : "chip-group"}>
      <span>{multiple ? `${label}（可多选）` : label}</span>
      <div className="chip-list">
        {options.map((option) => {
          const active = Array.isArray(value) ? value.includes(option) : value === option;
          return (
            <button
              key={option}
              type="button"
              className={active ? "chip active" : "chip"}
              aria-pressed={active}
              onClick={() => onChange(option)}
            >
              {option}{multiple && active ? " ✓" : ""}
            </button>
          );
        })}
        {trailingAction}
      </div>
    </div>
  );
}

export default LibraryPage;
