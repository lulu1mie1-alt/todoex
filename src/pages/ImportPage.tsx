import { useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BODY_PART_OPTIONS,
  DURATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  INTENSITY_OPTIONS,
  SPECIAL_TAG_OPTIONS,
  TRAINING_TYPE_OPTIONS,
} from "../utils/tagOptions";
import { detectPlatform } from "../utils/platform";
import {
  addTagOption,
  addVideo,
  deleteTagOption,
  getTagOptions,
  isDeletableTagOption,
  type CustomTagGroup,
} from "../storage/localStorage";
import {
  createVideoFromForm,
  extractCandidateTitle,
  extractFirstUrl,
  type VideoImportForm,
} from "../utils/videoImport";

interface ImportPageProps {
  onSaved: () => void;
}

const initialForm: VideoImportForm = {
  shareText: "",
  url: "",
  platform: "其他平台",
  author: "",
  title: "",
  bodyPart: [BODY_PART_OPTIONS[0]],
  duration: DURATION_OPTIONS[1],
  intensity: INTENSITY_OPTIONS[1],
  equipment: [EQUIPMENT_OPTIONS[0]],
  trainingType: TRAINING_TYPE_OPTIONS[0],
  specialTags: [],
  note: "",
};

function ImportPage({ onSaved }: ImportPageProps) {
  const [form, setForm] = useState<VideoImportForm>(initialForm);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [openCustomGroup, setOpenCustomGroup] = useState<string | null>(null);
  const [selectableOptions, setSelectableOptions] = useState(() => getTagOptions());

  function updateForm(updates: Partial<VideoImportForm>) {
    setForm((current) => ({ ...current, ...updates }));
    setError("");
    setFeedback("");
  }

  function handleShareTextChange(value: string) {
    const url = extractFirstUrl(value);
    const title = url ? extractCandidateTitle(value, url) : "";

    updateForm({
      shareText: value,
      url,
      platform: url ? detectPlatform(url) : "其他平台",
      title: title || form.title,
    });
  }

  function toggleSpecialTag(tag: string) {
    const nextTags = form.specialTags.includes(tag)
      ? form.specialTags.filter((item) => item !== tag)
      : [...form.specialTags, tag];
    updateForm({ specialTags: nextTags });
  }

  function toggleRequiredMulti(field: "bodyPart" | "equipment", value: string) {
    const currentValues = form[field];
    const nextValues = currentValues.includes(value)
      ? currentValues.length > 1
        ? currentValues.filter((item) => item !== value)
        : currentValues
      : [...currentValues, value];
    updateForm({ [field]: nextValues });
  }

  function updateCustomInput(group: string, value: string) {
    setCustomInputs((current) => ({ ...current, [group]: value }));
  }

  function addCustomValue(group: CustomTagGroup) {
    const nextValue = (customInputs[group] || "").trim();
    if (!nextValue) return;

    addTagOption(group, nextValue);
    setSelectableOptions(getTagOptions());

    if (group === "bodyPart" || group === "equipment") {
      toggleRequiredMulti(group, nextValue);
    }
    if (group === "intensity") {
      updateForm({ intensity: nextValue });
    }
    if (group === "trainingType") {
      updateForm({ trainingType: nextValue });
    }
    if (group === "specialTags" && !form.specialTags.includes(nextValue)) {
      updateForm({ specialTags: [...form.specialTags, nextValue] });
    }

    updateCustomInput(group, "");
    setOpenCustomGroup(null);
  }

  function deleteSelectableOption(group: CustomTagGroup, value: string) {
    if (!isDeletableTagOption(group, value)) return;

    deleteTagOption(group, value);
    const nextOptions = getTagOptions();
    setSelectableOptions(nextOptions);

    if (group === "bodyPart" || group === "equipment") {
      const currentValues = form[group];
      if (!currentValues.includes(value)) return;
      const nextValues = currentValues.filter((item) => item !== value);
      updateForm({ [group]: nextValues.length > 0 ? nextValues : [nextOptions[group][0]] });
    }

    if (group === "intensity" && form.intensity === value) {
      updateForm({ intensity: nextOptions.intensity[0] });
    }

    if (group === "trainingType" && form.trainingType === value) {
      updateForm({ trainingType: nextOptions.trainingType[0] });
    }

    if (group === "specialTags") {
      updateForm({ specialTags: form.specialTags.filter((tag) => tag !== value) });
    }
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

  function renderCustomInput(group: CustomTagGroup, placeholder: string) {
    if (openCustomGroup !== group) return null;
    return (
      <div className="custom-tag-inline">
        <input
          value={customInputs[group] || ""}
          onChange={(event) => updateCustomInput(group, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomValue(group);
            }
          }}
          placeholder={placeholder}
          autoFocus
        />
        <button type="button" onClick={() => addCustomValue(group)}>
          添加
        </button>
      </div>
    );
  }

  function handleSave() {
    if (!form.url) {
      setError("暂时没有识别到链接。可以再检查一下复制内容，或把原链接单独贴进来。");
      return;
    }

    if (!form.title.trim()) {
      setError("给这条跟练起个名字吧，之后在小岛里会更好找。");
      return;
    }

    addVideo(createVideoFromForm(form));
    setFeedback("收好啦，这条跟练已经放进小岛。");
    setForm(initialForm);
    window.setTimeout(onSaved, 650);
  }

  return (
    <section className="page-stack">
      <div className="panel hero-panel import-hero">
        <p className="section-kicker">Import</p>
        <h2>把跟练链接放进小岛</h2>
        <p>把你刚刚复制的跟练链接贴在这里，我来帮你放进小岛。识别不到也没关系，可以手动补全。</p>
      </div>

      <div className="panel import-panel island-post-box">
        <div className="section-header">
          <h2>导入视频</h2>
          <span>{form.platform}</span>
        </div>

        <label className="form-field">
          <span>分享内容</span>
          <textarea
            value={form.shareText}
            onChange={(event) => handleShareTextChange(event.target.value)}
            placeholder="把 B站、小红书、抖音、Keep 的分享文案或链接粘贴到这里。"
          />
        </label>

        <div className="recognition-box">
          <div>
            <span>平台</span>
            <strong>{form.platform}</strong>
          </div>
          <div>
            <span>链接</span>
            <strong>{form.url || "还没识别到链接"}</strong>
          </div>
          <div>
            <span>候选标题</span>
            <strong>{form.title || "可以手动输入"}</strong>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {feedback && <p className="form-success">{feedback}</p>}

        <div className="form-grid">
          <label className="form-field">
            <span>作者</span>
            <input
              value={form.author}
              onChange={(event) => updateForm({ author: event.target.value })}
              placeholder="可以先空着，保存后会显示未知作者"
            />
          </label>
          <label className="form-field">
            <span>视频标题</span>
            <input
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              placeholder="例：肩颈放松 10min"
            />
          </label>
        </div>

        <ChipGroup
          label="锻炼部位"
          options={selectableOptions.bodyPart}
          value={form.bodyPart}
          onChange={(bodyPart) => toggleRequiredMulti("bodyPart", bodyPart)}
          multiple
          trailingAction={renderCustomAction("bodyPart")}
          canDeleteOption={(option) => isDeletableTagOption("bodyPart", option)}
          onDeleteOption={(option) => deleteSelectableOption("bodyPart", option)}
        />
        {renderCustomInput("bodyPart", "写一个锻炼部位")}
        <ChipGroup
          label="时长"
          options={DURATION_OPTIONS}
          value={form.duration}
          onChange={(duration) => updateForm({ duration })}
          scrollable
        />
        <ChipGroup
          label="强度"
          options={selectableOptions.intensity}
          value={form.intensity}
          onChange={(intensity) => updateForm({ intensity })}
          trailingAction={renderCustomAction("intensity")}
          canDeleteOption={(option) => isDeletableTagOption("intensity", option)}
          onDeleteOption={(option) => deleteSelectableOption("intensity", option)}
        />
        {renderCustomInput("intensity", "写一个强度描述")}
        <ChipGroup
          label="道具"
          options={selectableOptions.equipment}
          value={form.equipment}
          onChange={(equipment) => toggleRequiredMulti("equipment", equipment)}
          multiple
          trailingAction={renderCustomAction("equipment")}
          canDeleteOption={(option) => isDeletableTagOption("equipment", option)}
          onDeleteOption={(option) => deleteSelectableOption("equipment", option)}
        />
        {renderCustomInput("equipment", "写一个道具")}
        <ChipGroup
          label="训练类型"
          options={selectableOptions.trainingType}
          value={form.trainingType}
          onChange={(trainingType) => updateForm({ trainingType })}
          trailingAction={renderCustomAction("trainingType")}
          canDeleteOption={(option) => isDeletableTagOption("trainingType", option)}
          onDeleteOption={(option) => deleteSelectableOption("trainingType", option)}
        />
        {renderCustomInput("trainingType", "写一个训练类型")}
        <ChipGroup
          label="特色标签"
          options={selectableOptions.specialTags}
          value={form.specialTags}
          onChange={toggleSpecialTag}
          multiple
          trailingAction={renderCustomAction("specialTags")}
          canDeleteOption={(option) => isDeletableTagOption("specialTags", option)}
          onDeleteOption={(option) => deleteSelectableOption("specialTags", option)}
        />
        {renderCustomInput("specialTags", "写一个自己的标签")}

        <label className="form-field">
          <span>备注</span>
          <textarea
            value={form.note}
            onChange={(event) => updateForm({ note: event.target.value })}
            placeholder="比如：适合没精神的时候，或者练完肩颈很舒服。"
            rows={3}
          />
        </label>

        <button className="primary-button" type="button" onClick={handleSave}>
          放进小岛视频库
        </button>
      </div>
    </section>
  );
}

interface ChipGroupProps {
  label: string;
  options: readonly string[];
  value: string | string[];
  onChange: (value: string) => void;
  multiple?: boolean;
  scrollable?: boolean;
  trailingAction?: ReactNode;
  canDeleteOption?: (value: string) => boolean;
  onDeleteOption?: (value: string) => void;
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
  multiple = false,
  scrollable = false,
  trailingAction,
  canDeleteOption,
  onDeleteOption,
}: ChipGroupProps) {
  return (
    <div className={scrollable ? "chip-group scrollable" : "chip-group"}>
      <span>{multiple ? `${label}（可多选）` : label}</span>
      <div className="chip-list">
        {options.map((option) => {
          const active = Array.isArray(value) ? value.includes(option) : value === option;
          const deletable = canDeleteOption?.(option) ?? false;
          return (
            <ChipButton
              key={option}
              active={active}
              deletable={deletable}
              label={`${option}${multiple && active ? " ✓" : ""}`}
              onClick={() => onChange(option)}
              onDelete={() => onDeleteOption?.(option)}
            />
          );
        })}
        {trailingAction}
      </div>
    </div>
  );
}

interface ChipButtonProps {
  active: boolean;
  deletable: boolean;
  label: string;
  onClick: () => void;
  onDelete: () => void;
}

function ChipButton({ active, deletable, label, onClick, onDelete }: ChipButtonProps) {
  const longPressTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const longPressed = useRef(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function startLongPress() {
    if (!deletable) return;
    longPressed.current = false;
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setDeleteArmed(true);
    }, 650);
  }

  function handleClick() {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onClick();
  }

  return (
    <span className="chip-wrap">
      <button
        type="button"
        className={active ? "chip active" : "chip"}
        aria-pressed={active}
        title={deletable ? "右键或长按显示删除按钮" : undefined}
        onClick={handleClick}
        onContextMenu={(event) => {
          if (!deletable) return;
          event.preventDefault();
          setDeleteArmed(true);
        }}
        onMouseDown={startLongPress}
        onMouseLeave={clearLongPressTimer}
        onMouseUp={clearLongPressTimer}
        onTouchStart={startLongPress}
        onTouchCancel={clearLongPressTimer}
        onTouchEnd={clearLongPressTimer}
      >
        {label}
      </button>
      {deleteArmed && (
        <button
          type="button"
          className="chip-delete"
          aria-label={`删除 ${label.replace(" ✓", "")}`}
          onClick={(event) => {
            event.stopPropagation();
            setDeleteArmed(false);
            onDelete();
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

export default ImportPage;
