import { useMemo, useState } from "react";
import islandSecretaryDog from "../assets/island-secretary-dog.png";
import { getCheckinRecords } from "../storage/localStorage";
import StickerIcon from "../components/StickerIcon";
import type { CheckinRecord, Video } from "../types/video";
import { getDateKey } from "../utils/date";
import {
  buildWeeklyStats,
  type DailyTrainingSummary,
  filterRecordsWithinRecentDays,
  getWeeklyTrainingDetails,
  sortRecordsByCompletedAtDesc,
} from "../utils/stats";
import { normalizeBodyPartText } from "../utils/tagOptions";
import { buildWeeklyIslandReport } from "../utils/weeklyReportUtils";

interface RecordsPageProps {
  videos: Video[];
}

type RecordFilter = "7d" | "30d" | "all";

const filterLabels: Record<RecordFilter, string> = {
  "7d": "最近 7 天",
  "30d": "最近 30 天",
  all: "全部记录",
};

function formatRecordDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "未知日期";
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatDayLabel(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("zh-CN", {
    weekday: "short",
  });
}

function formatDayTitle(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatCompletedTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "完成时间未知";
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFilteredRecords(records: CheckinRecord[], filter: RecordFilter) {
  if (filter === "7d") return filterRecordsWithinRecentDays(records, 7);
  if (filter === "30d") return filterRecordsWithinRecentDays(records, 30);
  return records;
}

function RecordsPage({ videos }: RecordsPageProps) {
  const [filter, setFilter] = useState<RecordFilter>("7d");
  const [selectedDate, setSelectedDate] = useState(getDateKey());
  const records = useMemo(() => sortRecordsByCompletedAtDesc(getCheckinRecords()), []);
  const weeklyStats = useMemo(() => buildWeeklyStats(records), [records]);
  const weeklyReport = useMemo(() => buildWeeklyIslandReport(weeklyStats), [weeklyStats]);
  const weeklyDetails = useMemo(() => getWeeklyTrainingDetails(records, videos), [records, videos]);
  const selectedDaySummary =
    weeklyDetails.find((summary) => summary.date === selectedDate) ?? weeklyDetails[weeklyDetails.length - 1];
  const filteredRecords = useMemo(() => sortRecordsByCompletedAtDesc(getFilteredRecords(records, filter)), [filter, records]);
  const maxTrainingTypeCount = Math.max(...weeklyStats.trainingTypeCounts.map((item) => item.count), 1);

  return (
    <section className="page-stack">
      <div className="panel hero-panel records-hero">
        <p className="section-kicker">Weekly Review</p>
        <h2>小岛周报</h2>
        <p>{weeklyReport.managerSummary}</p>
        <img className="records-hero-mascot" src={islandSecretaryDog} alt="" aria-hidden="true" />
      </div>

      <section className="panel recap-panel weekly-island-report" aria-label="最近 7 天小岛周报">
        <div className="section-header weekly-report-header">
          <div>
            <p className="section-kicker">Island Report</p>
            <h2>训练岛营业报告</h2>
          </div>
          <span>{weeklyReport.islandTitle}</span>
        </div>

        <div className="weekly-announcement">
          <StickerIcon kind={weeklyReport.representativeSticker.kind} label={weeklyReport.representativeSticker.name} />
          <div>
            <strong>{weeklyReport.representativeSticker.name}</strong>
            <p>{weeklyReport.representativeSticker.description}</p>
          </div>
        </div>

        <div className="recap-grid island-report-grid">
          <div className="recap-stat featured">
            <span>本周小岛点亮</span>
            <strong>{weeklyReport.activeDayCount}/7</strong>
            <small>没亮的日子只是休息日</small>
          </div>
          <div className="recap-stat">
            <span>本周完成训练</span>
            <strong>{weeklyStats.totalCount}</strong>
            <small>次任务</small>
          </div>
          <div className="recap-stat">
            <span>本周回来过</span>
            <strong>{weeklyReport.returnCount}</strong>
            <small>天</small>
          </div>
          <div className="recap-stat">
            <span>累计时长</span>
            <strong>{weeklyStats.totalMinutes}</strong>
            <small>分钟</small>
          </div>
          <div className="recap-stat">
            <span>最常建设区域</span>
            <strong>{weeklyStats.topBodyPart || "慢慢积累"}</strong>
            <small>最近 7 天</small>
          </div>
          <div className="recap-stat">
            <span>主要训练类型</span>
            <strong>{weeklyReport.mainTrainingType || "暂未分类"}</strong>
            <small>{weeklyReport.showLowEnergyCount ? `维护日 ${weeklyReport.lowEnergyCount} 次` : "按记录自动统计"}</small>
          </div>
        </div>

        <div className="weekly-summary-card">
          <div className="weekly-summary-copy">
            <span>小岛管理员总结</span>
            <p>{weeklyReport.managerSummary}</p>
          </div>
          <img className="weekly-summary-mascot" src={islandSecretaryDog} alt="" aria-hidden="true" />
        </div>

        <div className="week-route-title">
          <strong>本周小岛亮了 {weeklyReport.activeDayCount} 天</strong>
          <span>空白不是失败，只是小岛休息日。</span>
        </div>
        <div className="week-dots" aria-label="最近 7 天打卡日历">
          {weeklyStats.dateKeys.map((dateKey) => {
            const active = weeklyStats.activeDateKeys.has(dateKey);
            const selected = selectedDaySummary?.date === dateKey;
            return (
              <button
                key={dateKey}
                type="button"
                className={`${active ? "week-dot-day active" : "week-dot-day"}${selected ? " selected" : ""}`}
                aria-pressed={selected}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span>{formatDayLabel(dateKey)}</span>
                <i aria-hidden="true" />
                <small>{active ? "亮灯" : "休息"}</small>
              </button>
            );
          })}
        </div>

        {selectedDaySummary && <DayTrainingDetails summary={selectedDaySummary} />}

        <div className="recap-detail-grid">
          <div className="recap-box">
            <span>训练类型分布</span>
            {weeklyStats.trainingTypeCounts.length === 0 && <p className="muted">还没有可以统计的训练类型。</p>}
            {weeklyStats.trainingTypeCounts.map((item) => (
              <div key={item.label} className="type-row">
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.count} 次</span>
                </div>
                <meter min={0} max={maxTrainingTypeCount} value={item.count} />
              </div>
            ))}
          </div>

          <div className="recap-box">
            <span>本周最常使用视频</span>
            {weeklyStats.topVideo ? (
              <p className="top-video-copy">
                {weeklyStats.topVideo.label}
                <small>{weeklyStats.topVideo.count} 次</small>
              </p>
            ) : (
              <p className="muted">还没有重复练习的视频。</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>打卡记录</h2>
          <span>{filteredRecords.length} 条</span>
        </div>

        <div className="record-filter-row" role="group" aria-label="打卡记录筛选">
          {(Object.keys(filterLabels) as RecordFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "filter-chip active" : "filter-chip"}
              onClick={() => setFilter(key)}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>

        <div className="record-list">
          {filteredRecords.length === 0 && (
            <p className="empty-copy">这一周还没有点亮小岛，今天可以从一个 5 分钟视频开始。</p>
          )}
          {filteredRecords.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      </section>
    </section>
  );
}

function RecordCard({ record }: { record: CheckinRecord }) {
  const specialTags = Array.isArray(record.specialTags) ? record.specialTags : [];
  const tagText = specialTags.length > 0 ? specialTags.join("、") : "无特色标签";
  const detailText = [
    normalizeBodyPartText(record.bodyPart || "未填写部位"),
    record.duration || "未填写时长",
    record.intensity || "未填写强度",
    record.equipment || "未填写道具",
    tagText,
  ].join("｜");

  return (
    <article className="record-card">
      <div className="record-card-top">
        <span>{formatRecordDate(record.completedAt)}</span>
        <span>{Number.isFinite(new Date(record.completedAt).getTime()) ? getDateKey(new Date(record.completedAt)) : "未知日期"}</span>
      </div>
      <h3>{record.author || "未知作者"}｜{record.videoTitle || "已删除视频"}</h3>
      <p>{detailText}</p>
      <div className="record-type-pill">{record.trainingType || "未分类"}</div>
    </article>
  );
}

function DayTrainingDetails({ summary }: { summary: DailyTrainingSummary }) {
  return (
    <div className="day-training-details" aria-live="polite">
      <div className="day-training-header">
        <span className="day-log-icon icon-logbook" aria-hidden="true" />
        <div>
          <span>小岛每日营业日志</span>
          <strong>{formatDayTitle(summary.date)}</strong>
        </div>
        <small>
          <span className="day-chip-icon icon-stamp" aria-hidden="true" />
          {summary.completedCount > 0
            ? `${summary.completedCount} 个训练任务 · 约 ${summary.totalDuration} 分钟`
            : "休息日"}
        </small>
      </div>

      {summary.completedItems.length === 0 ? (
        <p className="empty-copy day-empty-copy">这天小岛休息中，没有需要补课。</p>
      ) : (
        <div className="day-training-list">
          {summary.completedItems.map((item, index) => (
            <article key={item.id} className="day-training-item">
              <div className="day-training-item-top">
                <span className="time-pill">
                  <i className="meta-icon icon-clock" aria-hidden="true" />
                  {formatCompletedTime(item.completedAt)}
                </span>
                <span className="training-type-pill">
                  <i className="meta-icon icon-flag" aria-hidden="true" />
                  {item.trainingType}
                </span>
              </div>
              <h3>
                <span className="item-index-badge">#{index + 1}</span>
                {item.author}｜{item.title}
              </h3>
              <dl className="day-training-meta">
                <div>
                  <dt><i className="meta-icon icon-leaf" aria-hidden="true" />部位</dt>
                  <dd>{item.bodyPart}</dd>
                </div>
                <div>
                  <dt><i className="meta-icon icon-timer" aria-hidden="true" />时长</dt>
                  <dd>{item.duration}</dd>
                </div>
                <div>
                  <dt><i className="meta-icon icon-spark" aria-hidden="true" />强度</dt>
                  <dd>{item.intensity}</dd>
                </div>
                <div>
                  <dt><i className="meta-icon icon-tool" aria-hidden="true" />道具</dt>
                  <dd>{item.equipment}</dd>
                </div>
                <div>
                  <dt><i className="meta-icon icon-tag" aria-hidden="true" />标签</dt>
                  <dd>{item.specialTags.length > 0 ? item.specialTags.join("、") : "无特色标签"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecordsPage;
