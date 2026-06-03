import type { Video } from "../types/video";

interface VideoCardProps {
  video: Video;
  children?: React.ReactNode;
}

function formatPracticeTime(value: string | null) {
  if (!value) return "还没练过";
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function VideoCard({ video, children }: VideoCardProps) {
  const detailLine = [
    video.bodyPart,
    video.duration,
    video.intensity,
    video.equipment,
    video.specialTags.join("、"),
  ].join("｜");

  return (
    <article className="video-card">
      <div className="video-card-top">
        <span className="body-part-pill">{video.bodyPart}</span>
        <span className="platform-pill">{video.platform}</span>
      </div>
      <p className="video-title-line">
        {video.author}｜{video.title}
      </p>
      <p className="video-detail-line">{detailLine}</p>
      <div className="video-meta-row">
        <span>累计 {video.completedCount} 次</span>
        <span>{formatPracticeTime(video.lastPracticedAt)}</span>
      </div>
      {children}
    </article>
  );
}

export default VideoCard;
