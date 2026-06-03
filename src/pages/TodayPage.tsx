import VideoCard from "../components/VideoCard";
import type { Video } from "../types/video";

interface TodayPageProps {
  videos: Video[];
}

function TodayPage({ videos }: TodayPageProps) {
  const featuredVideo = videos[0];

  return (
    <section className="page-stack">
      <div className="panel hero-panel">
        <p className="section-kicker">Today</p>
        <h2>今天跟练哪一条？</h2>
        <p>先用 mock 数据搭出选择和打卡的骨架，后续再接入 localStorage。</p>
      </div>

      <div className="panel">
        <div className="section-header">
          <h2>推荐开始</h2>
          <span>Mock</span>
        </div>
        {featuredVideo ? <VideoCard video={featuredVideo} /> : <p className="muted">暂无视频。</p>}
        <button className="primary-button" type="button">
          标记为今日计划
        </button>
      </div>
    </section>
  );
}

export default TodayPage;
