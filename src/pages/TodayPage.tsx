import { useEffect, useMemo, useState } from "react";
import VideoCard from "../components/VideoCard";
import {
  addCheckinRecord,
  addVideoToPlan,
  getCheckinRecords,
  getPlanByDate,
  getVideos,
  isVideoInPlan,
  removeVideoFromPlan,
  togglePlanItemCompleted,
  updateVideo,
} from "../storage/localStorage";
import type { PlanItem, Video } from "../types/video";
import { getDateKey } from "../utils/date";

interface TodayPageProps {
  videos: Video[];
  onVideosChanged: () => void;
  onGoImport: () => void;
}

type QuickMood = "easy" | "sweat" | "stretch" | "legs" | "ten";

const quickMoodLabels: Record<QuickMood, string> = {
  easy: "我今天想轻松一点",
  sweat: "我想快速出汗",
  stretch: "我想拉伸放松",
  legs: "我想练臀腿",
  ten: "我只有 10 分钟",
};

function scoreVideo(video: Video, mood: QuickMood) {
  const text = [video.bodyPart, video.duration, video.intensity, video.trainingType, ...video.specialTags].join(" ");

  if (mood === "easy") {
    return Number(text.includes("低强度")) + Number(text.includes("低能量可练")) + Number(text.includes("拉伸")) + Number(text.includes("睡前放松"));
  }
  if (mood === "sweat") {
    return Number(text.includes("有氧")) + Number(text.includes("高强度")) + Number(text.includes("暴汗预警")) + Number(text.includes("心率强者"));
  }
  if (mood === "stretch") {
    return Number(["拉伸", "瑜伽", "放松"].includes(video.trainingType)) + Number(video.bodyPart.includes("肩颈")) + Number(video.bodyPart.includes("拉伸放松"));
  }
  if (mood === "legs") {
    return Number(video.bodyPart.includes("臀腿"));
  }
  return Number(video.duration === "5min") + Number(video.duration === "10min");
}

function matchesQuickMood(video: Video, mood: QuickMood) {
  const text = [video.bodyPart, video.duration, video.intensity, video.trainingType, ...video.specialTags].join(" ");

  if (mood === "easy") {
    return text.includes("低强度") || text.includes("低能量可练") || text.includes("拉伸") || text.includes("睡前放松");
  }
  if (mood === "sweat") {
    return text.includes("有氧") || text.includes("高强度") || text.includes("暴汗预警") || text.includes("心率强者");
  }
  if (mood === "stretch") {
    return ["拉伸", "瑜伽", "放松"].includes(video.trainingType) || video.bodyPart.includes("肩颈") || video.bodyPart.includes("拉伸放松");
  }
  if (mood === "legs") {
    return video.bodyPart.includes("臀腿");
  }
  return video.duration === "5min" || video.duration === "10min";
}

function buildCheckinRecord(video: Video) {
  return {
    id: `checkin-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    videoId: video.id,
    videoTitle: video.title,
    author: video.author,
    bodyPart: video.bodyPart,
    duration: video.duration,
    intensity: video.intensity,
    equipment: video.equipment,
    trainingType: video.trainingType,
    specialTags: video.specialTags,
    completedAt: new Date().toISOString(),
    mood: "完成今日计划",
    note: "",
  };
}

function TodayPage({ videos, onVideosChanged, onGoImport }: TodayPageProps) {
  const today = getDateKey();
  const [quickMood, setQuickMood] = useState<QuickMood>("easy");
  const [planVersion, setPlanVersion] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [swipedPlanItemId, setSwipedPlanItemId] = useState<string | null>(null);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const plan = useMemo(() => getPlanByDate(today), [today, planVersion]);
  const checkinRecords = useMemo(() => getCheckinRecords(), [planVersion]);
  const completedTodayIds = checkinRecords
    .filter((record) => getDateKey(new Date(record.completedAt)) === today)
    .map((record) => record.videoId);

  const plannedItems = plan.items
    .map((item) => ({ item, video: videos.find((video) => video.id === item.videoId) }))
    .filter((entry): entry is { item: PlanItem; video: Video } => Boolean(entry.video));

  const completedCount = plannedItems.filter((entry) => entry.item.completed).length;
  const totalCount = plannedItems.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const alreadyCheckedIn = totalCount > 0 && plannedItems.every((entry) => completedTodayIds.includes(entry.video.id));
  const heroTitle = alreadyCheckedIn ? "今天的小岛已经亮起来了" : "今天的小岛，慢慢亮起来";
  const heroCopy = alreadyCheckedIn
    ? `你完成了今日计划的 ${totalCount} 个小任务。今天的你，已经认真照顾过自己了。`
    : `打卡进度（${completedCount}/${totalCount}）。把计划里的小任务逐个完成，就可以点亮今日小岛。`;

  const recommendations = useMemo(() => {
    return [...videos]
      .filter((video) => matchesQuickMood(video, quickMood))
      .sort((a, b) => scoreVideo(b, quickMood) - scoreVideo(a, quickMood))
      .slice(0, 3);
  }, [quickMood, videos]);

  function refreshPlan(message?: string) {
    if (message) setFeedback(message);
    setPlanVersion((version) => version + 1);
  }

  function addTodayPlan(video: Video) {
    addVideoToPlan(today, video.id);
    refreshPlan("已放进今天的小岛计划。");
  }

  function arrangeTodayPlan() {
    const nextVideo = recommendations.find((video) => !isVideoInPlan(today, video.id));
    if (!nextVideo) {
      refreshPlan("当前推荐已经都在今日计划里啦。");
      return;
    }

    addTodayPlan(nextVideo);
  }

  function openTraining(video: Video) {
    sessionStorage.setItem("fitnessIsland.activePage", "today");
    window.open(video.url, "_blank", "noopener,noreferrer");
  }

  function toggleTodayPlanItem(videoId: string) {
    togglePlanItemCompleted(today, videoId);
    setSwipedPlanItemId(null);
    refreshPlan();
  }

  function confirmRemoveTodayPlan(video: Video) {
    if (alreadyCheckedIn) return;
    if (!window.confirm(`确认从今日计划移除「${video.title}」吗？`)) return;

    removeVideoFromPlan(today, video.id);
    setSwipedPlanItemId(null);
    refreshPlan();
  }

  function handlePlanTouchEnd(event: React.TouchEvent, itemId: string) {
    if (swipeStartX === null) return;

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    if (deltaX < -45 && !alreadyCheckedIn) {
      setSwipedPlanItemId(itemId);
    }
    if (deltaX > 45) {
      setSwipedPlanItemId(null);
    }
    setSwipeStartX(null);
  }

  function completeTodayCheckin() {
    if (alreadyCheckedIn) return;
    const storedVideos = getVideos();
    const itemsToCheckIn = plannedItems.filter(
      ({ item, video }) => item.completed && !completedTodayIds.includes(video.id),
    );

    if (itemsToCheckIn.length === 0) {
      setCheckinDialogOpen(true);
      refreshPlan("今天就这样吧。没完成也没关系，身体和生活都可以慢慢来。");
      return;
    }

    itemsToCheckIn.forEach(({ video }) => {
      const storedVideo = storedVideos.find((item) => item.id === video.id);
      if (!storedVideo) return;

      updateVideo(video.id, {
        completedCount: storedVideo.completedCount + 1,
        lastPracticedAt: today,
      });
      addCheckinRecord(buildCheckinRecord(storedVideo));
    });

    onVideosChanged();
    setCheckinDialogOpen(true);
    refreshPlan("今天的小岛亮起来了。你完成了今日计划的小任务，不是每一天都要暴汗，今天完成就已经很棒。");
  }

  useEffect(() => {
    if (allCompleted && !alreadyCheckedIn) {
      completeTodayCheckin();
    }
  }, [allCompleted, alreadyCheckedIn, planVersion]);

  useEffect(() => {
    if (alreadyCheckedIn) {
      setSwipedPlanItemId(null);
    }
  }, [alreadyCheckedIn]);

  return (
    <section className="page-stack">
      <div className="panel hero-panel island-hero">
        <p className="section-kicker">{today}</p>
        <h2>{heroTitle}</h2>
        <p>{heroCopy}</p>
      </div>

      {feedback && <p className="form-success">{feedback}</p>}

      <div className="panel">
        <div className="section-header">
          <h2>今日计划</h2>
          <span>（{completedCount}/{totalCount}）</span>
        </div>
        <div className="card-list">
          {plannedItems.length === 0 && <p className="empty-copy">今天的小岛还空着，先从推荐或视频库加入一个想练的视频吧。</p>}
          {plannedItems.map(({ item, video }) => (
            <div
              key={item.id}
              className={swipedPlanItemId === item.id ? "plan-todo-row swiped" : "plan-todo-row"}
              onTouchStart={(event) => setSwipeStartX(event.touches[0].clientX)}
              onTouchEnd={(event) => handlePlanTouchEnd(event, item.id)}
            >
              <button
                className="plan-swipe-remove"
                type="button"
                disabled={alreadyCheckedIn}
                onClick={() => confirmRemoveTodayPlan(video)}
              >
                移除
              </button>
              <div className="plan-todo-foreground">
                <label className="todo-checkbox" aria-label={item.completed ? "标记为未完成" : "标记为完成"}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={alreadyCheckedIn}
                    onChange={() => toggleTodayPlanItem(video.id)}
                  />
                </label>
                <VideoCard video={video}>
                  <div className="plan-status">{item.completed ? "已完成" : "未完成"}</div>
                  <div className="plan-actions">
                    <button type="button" disabled={item.completed || alreadyCheckedIn} onClick={() => openTraining(video)}>
                      去跟练
                    </button>
                  </div>
                </VideoCard>
              </div>
            </div>
          ))}
        </div>
        <button className="primary-button checkin-button" type="button" disabled={totalCount === 0 || alreadyCheckedIn} onClick={completeTodayCheckin}>
          {alreadyCheckedIn ? "今日小岛已点亮" : "今天就这样吧"}
        </button>
      </div>

      {checkinDialogOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="今日打卡完成">
          <div className="checkin-modal">
            <p className="section-kicker">Check-in</p>
            <h2>今天的小岛亮起来了</h2>
            <p>你已经认真照顾过自己了。今天就这样吧，也很好。</p>
            <button className="primary-button" type="button" onClick={() => setCheckinDialogOpen(false)}>
              收好这次打卡
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="section-header">
          <h2>今日推荐</h2>
          <button className="helper-action" type="button" onClick={arrangeTodayPlan}>
            帮我安排
          </button>
        </div>
        <div className="quick-grid">
          {(Object.keys(quickMoodLabels) as QuickMood[]).map((mood) => (
            <button key={mood} className={quickMood === mood ? "quick-chip active" : "quick-chip"} type="button" onClick={() => setQuickMood(mood)}>
              {quickMoodLabels[mood]}
            </button>
          ))}
        </div>
        <div className="card-list">
          {recommendations.length === 0 && (
            <div className="empty-copy">
              <p>还没有相关训练，快去添加吧~</p>
              <button className="primary-button" type="button" onClick={onGoImport}>
                去导入视频
              </button>
            </div>
          )}
          {recommendations.map((video) => (
            <VideoCard key={video.id} video={video}>
              <button
                className="primary-button"
                type="button"
                disabled={isVideoInPlan(today, video.id)}
                onClick={() => addTodayPlan(video)}
              >
                {isVideoInPlan(today, video.id) ? "已在今日计划" : "加入今日计划"}
              </button>
            </VideoCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TodayPage;
