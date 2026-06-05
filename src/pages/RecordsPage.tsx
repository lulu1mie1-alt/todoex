import { useMemo, useState } from "react";
import { getCheckinRecords } from "../storage/localStorage";
import type { CheckinRecord, Video } from "../types/video";
import { getDateKey } from "../utils/date";
import {
  buildWeeklyStats,
  filterRecordsWithinRecentDays,
  sortRecordsByCompletedAtDesc,
} from "../utils/stats";
import { normalizeBodyPartText } from "../utils/tagOptions";

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
  return new Date(value).toLocaleDateString("zh-CN", {
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

function getFilteredRecords(records: CheckinRecord[], filter: RecordFilter) {
  if (filter === "7d") return filterRecordsWithinRecentDays(records, 7);
  if (filter === "30d") return filterRecordsWithinRecentDays(records, 30);
  return records;
}

function RecordsPage({ videos: _videos }: RecordsPageProps) {
  const [filter, setFilter] = useState<RecordFilter>("7d");
  const records = useMemo(() => sortRecordsByCompletedAtDesc(getCheckinRecords()), []);
  const weeklyStats = useMemo(() => buildWeeklyStats(records), [records]);
  const filteredRecords = useMemo(() => sortRecordsByCompletedAtDesc(getFilteredRecords(records, filter)), [filter, records]);
  const maxTrainingTypeCount = Math.max(...weeklyStats.trainingTypeCounts.map((item) => item.count), 1);

  return (
    <section className="page-stack">
      <div className="panel hero-panel records-hero">
        <p className="section-kicker">Weekly Review</p>
        <h2>记录 / 复盘</h2>
        <p>{weeklyStats.summary}</p>
      </div>

      <section className="panel recap-panel weekly-island-report" aria-label="最近 7 天周复盘">
        <div className="section-header">
          <h2>最近 7 天周复盘</h2>
          <span>{weeklyStats.totalCount} 次</span>
        </div>

        <div className="recap-grid">
          <div className="recap-stat">
            <span>完成次数</span>
            <strong>{weeklyStats.totalCount}</strong>
            <small>次点亮</small>
          </div>
          <div className="recap-stat">
            <span>估计时长</span>
            <strong>{weeklyStats.totalMinutes}</strong>
            <small>分钟</small>
          </div>
          <div className="recap-stat">
            <span>常练部位</span>
            <strong>{weeklyStats.topBodyPart || "慢慢积累"}</strong>
            <small>最近 7 天</small>
          </div>
        </div>

        <div className="week-dots" aria-label="最近 7 天打卡日历">
          {weeklyStats.dateKeys.map((dateKey) => {
            const active = weeklyStats.activeDateKeys.has(dateKey);
            return (
              <div key={dateKey} className={active ? "week-dot-day active" : "week-dot-day"}>
                <span>{formatDayLabel(dateKey)}</span>
                <i aria-hidden="true" />
              </div>
            );
          })}
        </div>

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
            <span>使用最多的视频</span>
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
  const tagText = record.specialTags.length > 0 ? record.specialTags.join("、") : "无特色标签";
  const detailText = [normalizeBodyPartText(record.bodyPart), record.duration, record.intensity, record.equipment, tagText].join("｜");

  return (
    <article className="record-card">
      <div className="record-card-top">
        <span>{formatRecordDate(record.completedAt)}</span>
        <span>{getDateKey(new Date(record.completedAt))}</span>
      </div>
      <h3>{record.author || "未知作者"}｜{record.videoTitle}</h3>
      <p>{detailText}</p>
      <div className="record-type-pill">{record.trainingType || "未分类"}</div>
    </article>
  );
}

export default RecordsPage;
