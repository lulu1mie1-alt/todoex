import VideoCard from "../components/VideoCard";
import type { Video } from "../types/video";

interface RecordsPageProps {
  videos: Video[];
}

function RecordsPage({ videos }: RecordsPageProps) {
  return (
    <section className="page-stack">
      <div className="panel">
        <div className="section-header">
          <h2>记录 / 复盘</h2>
          <span>本周</span>
        </div>
        <p className="muted">这里先展示打卡复盘入口，后续接入完成记录和备注。</p>
      </div>

      {videos.slice(0, 2).map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </section>
  );
}

export default RecordsPage;
