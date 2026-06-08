import { useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "../components/VideoCard";
import {
  addCheckinRecord,
  getCheckinRecords,
  getPlanByDate,
  getVideos,
  removeVideoFromPlan,
  replacePlanVideos,
  togglePlanItemCompleted,
  updateVideo,
} from "../storage/localStorage";
import type { PlanItem, Video } from "../types/video";
import { getDateKey } from "../utils/date";
import {
  buildRecommendationRoute,
  type AvailableMinutes,
  type RecommendationRoute,
  type RouteType,
  type TodayBodyPart,
  type TodayEnergy,
  type TodayLimitation,
  type TodayStatus,
} from "../utils/recommendationEngine";
import StickerIcon from "../components/StickerIcon";
import { buildCheckinFeedback, type CheckinFeedback } from "../utils/stickerUtils";
import { getDailyTrainingSummary } from "../utils/stats";
import { normalizeBodyPartText } from "../utils/tagOptions";

interface TodayPageProps {
  videos: Video[];
  onVideosChanged: () => void;
  onGoImport: () => void;
  plannerRequest: number;
}

type PlannerStep = "status" | "result";

const energyOptions: Array<{ value: TodayEnergy; label: string; copy: string }> = [
  { value: "low", label: "低能量", copy: "小岛维护日" },
  { value: "normal", label: "普通", copy: "稳稳建设" },
  { value: "good", label: "状态不错", copy: "完整路线" },
  { value: "sweaty", label: "想暴汗", copy: "燃脂派对" },
];

const timeOptions: AvailableMinutes[] = [10, 20, 30, 40, 50, 60];

const bodyPartOptions: Array<{ value: TodayBodyPart; label: string }> = [
  { value: "auto", label: "系统安排" },
  { value: "fullBody", label: "全身" },
  { value: "shoulderNeck", label: "肩颈" },
  { value: "abs", label: "腹部" },
  { value: "glutesLegs", label: "臀腿" },
  { value: "stretchRelax", label: "拉伸放松" },
];

const limitationOptions: Array<{ value: TodayLimitation; label: string }> = [
  { value: "noJump", label: "无跳跃" },
  { value: "kneeFriendly", label: "膝盖友好" },
  { value: "periodFriendly", label: "经期友好" },
  { value: "noEquipment", label: "无器械" },
  { value: "bedtimeRelax", label: "睡前放松" },
];

const routeTypeLabels: Record<RouteType, string> = {
  low_energy: "低能量维护路线",
  default: "今日标准建设路线",
  active: "状态不错建设路线",
  sweaty: "小岛燃脂派对路线",
};

const defaultTodayStatus: TodayStatus = {
  energy: "normal",
  availableMinutes: 30,
  bodyPart: "auto",
  limitations: [],
};

function buildCheckinRecord(video: Video, routeType: RouteType, todayEnergy: TodayEnergy) {
  return {
    id: `checkin-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    videoId: video.id,
    videoTitle: video.title,
    author: video.author,
    bodyPart: normalizeBodyPartText(video.bodyPart),
    duration: video.duration,
    intensity: video.intensity,
    equipment: video.equipment,
    trainingType: video.trainingType,
    specialTags: video.specialTags,
    completedAt: new Date().toISOString(),
    mood: "完成今日计划",
    note: "",
    routeType,
    todayEnergy,
  };
}

function formatStampTime(value: string | null) {
  if (!value) return "刚刚";
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TodayPage({ videos, onVideosChanged, onGoImport, plannerRequest }: TodayPageProps) {
  const today = getDateKey();
  const [planVersion, setPlanVersion] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinFeedback, setCheckinFeedback] = useState<CheckinFeedback | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerStep, setPlannerStep] = useState<PlannerStep>("status");
  const [todayStatus, setTodayStatus] = useState<TodayStatus>(defaultTodayStatus);
  const [routeVariant, setRouteVariant] = useState(0);
  const handledPlannerRequestRef = useRef(plannerRequest);
  const plan = useMemo(() => getPlanByDate(today), [today, planVersion]);
  const checkinRecords = useMemo(() => getCheckinRecords(), [planVersion]);
  const currentRoute = useMemo<RecommendationRoute>(
    () =>
      buildRecommendationRoute({
        videos,
        checkinRecords,
        todayStatus,
        todayPlan: plan,
        variant: routeVariant,
      }),
    [checkinRecords, plan, routeVariant, todayStatus, videos],
  );
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
    : `打卡进度：${completedCount}/${totalCount}。把计划里的小任务逐个完成，就可以点亮今日小岛。`;

  function refreshPlan(message?: string) {
    if (message) setFeedback(message);
    setPlanVersion((version) => version + 1);
  }

  function openPlanner() {
    setPlannerOpen(true);
    setPlannerStep("status");
  }

  function closePlanner() {
    setPlannerOpen(false);
  }

  function updateStatus(updates: Partial<TodayStatus>) {
    setTodayStatus((status) => ({ ...status, ...updates }));
  }

  function toggleLimitation(limitation: TodayLimitation) {
    setTodayStatus((status) => {
      const limitations = status.limitations.includes(limitation)
        ? status.limitations.filter((item) => item !== limitation)
        : [...status.limitations, limitation];
      return { ...status, limitations };
    });
  }

  function generateRoute() {
    setRouteVariant((variant) => variant + 1);
    setPlannerStep("result");
  }

  function addRouteToTodayPlan() {
    if (currentRoute.recommendedVideos.length === 0) {
      setFeedback("还没有可加入的路线，先导入几个训练视频吧。");
      return;
    }

    replacePlanVideos(
      today,
      currentRoute.recommendedVideos.map((video) => video.id),
      completedTodayIds,
    );

    setPlanVersion((version) => version + 1);
    setFeedback(
      completedTodayIds.length > 0
        ? "新路线已替换未打卡项目，今天已经打卡过的训练会留在计划里。"
        : totalCount > 0
          ? "新路线已替换原来的今日计划。"
          : "小岛管理员已经把今日路线放进计划啦。",
    );
    closePlanner();
  }

  function openTraining(video: Video) {
    sessionStorage.setItem("fitnessIsland.activePage", "today");
    window.open(video.url, "_blank", "noopener,noreferrer");
  }

  function toggleTodayPlanItem(videoId: string) {
    togglePlanItemCompleted(today, videoId);
    refreshPlan();
  }

  function confirmRemoveTodayPlan(video: Video) {
    if (alreadyCheckedIn) return;
    if (!window.confirm(`确认从今日计划移除「${video.title}」吗？`)) return;

    removeVideoFromPlan(today, video.id);
    refreshPlan();
  }

  function completeTodayCheckin() {
    if (alreadyCheckedIn) return;
    const storedVideos = getVideos();
    const hadCheckinToday = completedTodayIds.length > 0;
    const itemsToCheckIn = plannedItems.filter(
      ({ item, video }) => item.completed && !completedTodayIds.includes(video.id),
    );

    if (itemsToCheckIn.length === 0) {
      setCheckinFeedback(null);
      setCheckinDialogOpen(false);
      refreshPlan("今天就这样吧。没完成也没关系，身体和生活都可以慢慢来。");
      return;
    }

    const completedVideos: Video[] = [];

    itemsToCheckIn.forEach(({ video }) => {
      const storedVideo = storedVideos.find((item) => item.id === video.id);
      if (!storedVideo) return;

      updateVideo(video.id, {
        completedCount: storedVideo.completedCount + 1,
        lastPracticedAt: today,
      });
      addCheckinRecord(buildCheckinRecord(storedVideo, currentRoute.routeType, todayStatus.energy));
      completedVideos.push(storedVideo);
    });

    if (completedVideos.length === 0) {
      setCheckinFeedback(null);
      setCheckinDialogOpen(false);
      refreshPlan("训练内容暂时没有写入成功，可以稍后再试一次。");
      return;
    }

    const dailySummary = getDailyTrainingSummary(today, getCheckinRecords(), getVideos());
    const nextFeedback = buildCheckinFeedback({
      completedVideos,
      routeType: currentRoute.routeType,
      todayEnergy: todayStatus.energy,
    });

    setCheckinFeedback({
      ...nextFeedback,
      title: hadCheckinToday ? "今日小岛继续营业成功！" : nextFeedback.title,
      managerCopy: hadCheckinToday ? "新的训练已加入今天的小岛记录。今天又多点亮了一块训练区。" : nextFeedback.managerCopy,
      taskCount: dailySummary.completedCount,
      totalMinutes: dailySummary.totalDuration,
      isLowEnergy: nextFeedback.isLowEnergy || dailySummary.isLowEnergy,
    });
    onVideosChanged();
    setCheckinDialogOpen(true);
    refreshPlan(
      hadCheckinToday
        ? "今日小岛继续营业成功，新的训练已经写进今日营业日志。"
        : "今天的小岛点亮成功，贴纸已经送到公告板啦。",
    );
  }

  useEffect(() => {
    if (allCompleted && !alreadyCheckedIn) {
      completeTodayCheckin();
    }
  }, [allCompleted, alreadyCheckedIn, planVersion]);

  useEffect(() => {
    if (plannerRequest !== handledPlannerRequestRef.current) {
      handledPlannerRequestRef.current = plannerRequest;
      openPlanner();
    }
  }, [plannerRequest]);

  return (
    <section className="page-stack">
      <div className="panel hero-panel island-hero">
        <div className="island-hero-copy">
          <p className="section-kicker">{today}</p>
          <h2>{heroTitle}</h2>
          <p>{heroCopy}</p>
        </div>
        <div className="hero-island-status" aria-label={`今日打卡进度 ${completedCount}/${totalCount}`}>
          <span>今日进度</span>
          <strong>
            {completedCount}/{totalCount}
          </strong>
          <div className="island-progress-track">
            <i style={{ width: totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}%` : "0%" }} />
          </div>
        </div>
      </div>

      {feedback && <p className="form-success">{feedback}</p>}

      <div className="panel notice-board today-board">
        <div className="section-header today-board-header">
          <div className="today-board-title">
            <span className="today-board-icon" aria-hidden="true" />
            <h2>今日计划</h2>
          </div>
          <span>
            ({completedCount}/{totalCount})
          </span>
        </div>
        <div className="card-list">
          {plannedItems.length === 0 && (
            <p className="empty-copy today-empty-copy">
              今天的小岛还空着，可以让小岛管理员先帮你安排一条路线，也可以从视频库加入想练的视频。
            </p>
          )}
          {plannedItems.map(({ item, video }) => (
            <div key={item.id} className={item.completed ? "plan-todo-row quest-card completed" : "plan-todo-row quest-card"}>
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
                  <div className={item.completed ? "plan-status stamp-badge done" : "plan-status stamp-badge"}>
                    <span>{item.completed ? "已完成" : "待完成"}</span>
                    {item.completed && <small>{formatStampTime(item.completedAt)}</small>}
                  </div>
                  <div className="plan-actions">
                    <button type="button" disabled={item.completed || alreadyCheckedIn || !video.url} onClick={() => openTraining(video)}>
                      去跟练
                    </button>
                    <button type="button" disabled={alreadyCheckedIn} onClick={() => confirmRemoveTodayPlan(video)}>
                      移除计划
                    </button>
                  </div>
                </VideoCard>
              </div>
            </div>
          ))}
        </div>
        <button className="primary-button checkin-button settlement-button today-checkin-button" type="button" disabled={totalCount === 0 || alreadyCheckedIn} onClick={completeTodayCheckin}>
          {alreadyCheckedIn ? "今日小岛已点亮" : `打卡进度：${completedCount}/${totalCount}`}
        </button>
      </div>

      {plannerOpen && (
        <div className="modal-backdrop planner-backdrop" role="dialog" aria-modal="true" aria-label={plannerStep === "status" ? "今天想让小岛怎么安排？" : "小岛管理员今日路线"}>
          <div className="planner-modal">
            {plannerStep === "status" ? (
              <>
                <div className="planner-modal-header">
                  <p className="section-kicker">Island Planner</p>
                  <h2>今天想让小岛怎么安排？</h2>
                  <p>告诉管理员今天的身体状态，它会按你的时间和限制安排一条可完成的路线。</p>
                </div>

                <div className="planner-field">
                  <span>今日能量</span>
                  <div className="planner-choice-grid energy-grid">
                    {energyOptions.map((option) => (
                      <button
                        key={option.value}
                        className={todayStatus.energy === option.value ? "planner-chip active" : "planner-chip"}
                        type="button"
                        onClick={() => updateStatus({ energy: option.value })}
                      >
                        <strong>{option.label}</strong>
                        <small>{option.copy}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="planner-field">
                  <span>可用时间</span>
                  <div className="planner-choice-grid time-grid">
                    {timeOptions.map((minutes) => (
                      <button
                        key={minutes}
                        className={todayStatus.availableMinutes === minutes ? "planner-chip active" : "planner-chip"}
                        type="button"
                        onClick={() => updateStatus({ availableMinutes: minutes })}
                      >
                        {minutes}min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="planner-field">
                  <span>想练部位</span>
                  <div className="planner-choice-grid body-grid">
                    {bodyPartOptions.map((option) => (
                      <button
                        key={option.value}
                        className={todayStatus.bodyPart === option.value ? "planner-chip active" : "planner-chip"}
                        type="button"
                        onClick={() => updateStatus({ bodyPart: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="planner-field">
                  <span>今日限制</span>
                  <div className="planner-choice-grid body-grid">
                    {limitationOptions.map((option) => (
                      <button
                        key={option.value}
                        className={todayStatus.limitations.includes(option.value) ? "planner-chip multi active" : "planner-chip multi"}
                        type="button"
                        onClick={() => toggleLimitation(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="planner-modal-actions">
                  <button className="primary-button planner-generate-button" type="button" onClick={generateRoute}>
                    生成今日路线
                  </button>
                  <button className="text-button" type="button" onClick={closePlanner}>
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="planner-modal-header route-header">
                  <p className="section-kicker">Route</p>
                  <h2>小岛管理员今日路线</h2>
                  <span className="route-type-pill">{routeTypeLabels[currentRoute.routeType]}</span>
                </div>

                {totalCount > 0 && (
                  <p className="planner-notice">
                    今日计划里已经有训练任务啦，加入新路线会替换未打卡项目，已打卡内容会保留。
                  </p>
                )}
                {currentRoute.notice && <p className="planner-notice">{currentRoute.notice}</p>}

                <div className="route-copy-card">
                  <p>{currentRoute.reason}</p>
                  <strong>{currentRoute.encouragement}</strong>
                </div>

                <div className="route-video-list">
                  {currentRoute.recommendedVideos.length === 0 && (
                    <div className="empty-copy">
                      <p>还没有可推荐的视频，先导入几个训练视频，小岛管理员就能开工啦。</p>
                      <button className="primary-button" type="button" onClick={onGoImport}>
                        去导入视频
                      </button>
                    </div>
                  )}
                  {currentRoute.recommendedVideos.map((video, index) => (
                    <div key={video.id} className="route-video-item">
                      <span className="route-step-badge">任务 {index + 1}</span>
                      <VideoCard video={video} />
                    </div>
                  ))}
                </div>

                <div className="planner-modal-actions route-actions">
                  <button className="primary-button planner-generate-button" type="button" disabled={currentRoute.recommendedVideos.length === 0} onClick={addRouteToTodayPlan}>
                    加入今日计划
                  </button>
                  <button className="text-button" type="button" onClick={generateRoute}>
                    换一条路线
                  </button>
                  <button className="text-button" type="button" onClick={() => setPlannerStep("status")}>
                    返回调整状态
                  </button>
                  <button className="text-button" type="button" onClick={closePlanner}>
                    关闭
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {checkinDialogOpen && (
        <div className="modal-backdrop checkin-backdrop" role="dialog" aria-modal="true" aria-label="小岛点亮成功">
          <div className="checkin-modal stamp-modal island-lit-modal">
            <p className="section-kicker">Check-in</p>
            <h2>{checkinFeedback?.title ?? "今日训练岛营业成功！"}</h2>
            <p>{checkinFeedback?.managerCopy ?? "今天不是变完美，是没有放弃。"}</p>
            {checkinFeedback && (
              <>
                <div className="sticker-reward-card">
                  <StickerIcon kind={checkinFeedback.sticker.kind} label={checkinFeedback.sticker.name} />
                  <div>
                    <strong>{checkinFeedback.sticker.name}</strong>
                    <span>{checkinFeedback.sticker.description}</span>
                  </div>
                </div>
                <div className="checkin-summary-card">
                  <span>今天累计完成 {checkinFeedback.taskCount} 个训练任务</span>
                  {checkinFeedback.totalMinutes > 0 && <span>今日累计训练约 {checkinFeedback.totalMinutes} 分钟</span>}
                  <span>路线类型：{checkinFeedback.routeLabel}</span>
                  {checkinFeedback.isLowEnergy && <strong>低能量模式也算正式完成。</strong>}
                </div>
              </>
            )}
            <button className="primary-button" type="button" onClick={() => setCheckinDialogOpen(false)}>
              收下贴纸
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default TodayPage;
