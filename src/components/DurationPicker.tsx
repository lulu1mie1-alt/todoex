import { formatDurationValue, parseDurationValue } from "../utils/tagOptions";

interface DurationPickerProps {
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}

const TENS_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const ONES_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function DurationPicker({ value, onChange, allowEmpty = false }: DurationPickerProps) {
  const minute = parseDurationValue(value);
  const tens = Math.floor(minute / 10);
  const ones = minute % 10;

  function updateDuration(nextTens: number, nextOnes: number) {
    const nextMinute = nextTens === 6 ? 60 : nextTens * 10 + nextOnes;
    onChange(formatDurationValue(nextMinute));
  }

  return (
    <div className="duration-picker">
      {allowEmpty && (
        <button className={!value ? "duration-clear active" : "duration-clear"} type="button" onClick={() => onChange("")}>
          全部时长
        </button>
      )}
      <div className="duration-display" aria-live="polite">
        <strong>{allowEmpty && !value ? "全部" : formatDurationValue(minute)}</strong>
        <span>{allowEmpty && !value ? "不限时间" : "已选时长"}</span>
      </div>
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
}

export default DurationPicker;
