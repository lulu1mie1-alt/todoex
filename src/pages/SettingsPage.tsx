import { useState } from "react";
import { restoreDefaultVideos } from "../storage/localStorage";

interface SettingsPageProps {
  onVideosChanged: () => void;
}

function SettingsPage({ onVideosChanged }: SettingsPageProps) {
  const [feedback, setFeedback] = useState("");

  function handleRestoreDefaultVideos() {
    const result = restoreDefaultVideos();
    onVideosChanged();
    setFeedback(
      result.restoredCount > 0
        ? `已恢复 ${result.restoredCount} 条默认视频。`
        : "默认视频库已经齐全啦。",
    );
  }

  return (
    <section className="page-stack">
      <div className="panel">
        <div className="section-header">
          <h2>设置</h2>
          <span>MVP</span>
        </div>
        <p className="muted">后续可以在这里放数据导出、清理本地数据、默认强度等偏好。</p>
      </div>

      <div className="panel">
        <div className="section-header">
          <h2>默认视频库</h2>
          <span>本地</span>
        </div>
        <p className="muted">如果想重新找回内置的训练视频，可以把缺失的视频补回视频库。你自己添加的视频不会被删除。</p>
        {feedback && <p className="form-success">{feedback}</p>}
        <button className="primary-button" type="button" onClick={handleRestoreDefaultVideos}>
          恢复默认视频库
        </button>
      </div>
    </section>
  );
}

export default SettingsPage;
