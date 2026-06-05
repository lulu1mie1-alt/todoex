import { useState } from "react";
import { formatDurationValue, parseDurationValue } from "../utils/tagOptions";

interface DurationPickerProps {
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  variant?: "compact" | "panel";
}

const TENS_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const ONES_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function DurationPicker({ value, onChange, allowEmpty = false, variant = "compact" }: DurationPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const minute = parseDurationValue(value);
  const tens = Math.floor(minute / 10);
  const ones = minute % 10;
  const summary = allowEmpty && !value ? "全部时长" : formatDurationValue(minute);

  function updateDuration(nextTens: number, nextOnes: number) {
    const nextMinute = nextTens === 6 ? 60 : nextTens * 10 + nextOnes;
    onChange(formatDurationValue(nextMinute));
  }

  const pickerPanel = (
    <div className="duration-picker-panel">
      {allowEmpty && (
        <button className={!value ? "duration-clear active" : "duration-clear"} type="button" onClick={() => onChange("")}>
          全部时长
        </button>
      )}
      <div className="duration-digit-row">
        <span>十位</span>
        <div className="duration-digit-strip" role="group" aria-label="时长十位">
          {TENS_OPTIONS.map((option) => (
            <button
              key={option}
              className={value && tens === option ? "duration-digit active" : "duration-digit"}
              type="button"
              onClick={() => updateDuration(option, option === 6 ? 0 : ones)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="duration-digit-row">
        <span>个位</span>
        <div className="duration-digit-strip" role="group" aria-label="时长个位">
          {ONES_OPTIONS.map((option) => {
            const disabled = tens === 6 && option > 0;
            return (
              <button
                key={option}
                className={value && ones === option ? "duration-digit active" : "duration-digit"}
                type="button"
                disabled={disabled}
                onClick={() => updateDuration(tens, option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (variant === "panel") {
    return <div className="duration-picker">{pickerPanel}</div>;
  }

  return (
    <div className="duration-picker">
      <button
        className="filter-combo-trigger duration-trigger"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>{summary}</span>
        <b>{expanded ? "收起" : "展开"}</b>
      </button>
      {expanded && pickerPanel}
    </div>
  );
}

export default DurationPicker;
