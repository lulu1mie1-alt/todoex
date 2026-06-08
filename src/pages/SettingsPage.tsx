import { useRef, useState } from "react";
import { restoreDefaultVideos } from "../storage/localStorage";
import {
  clearLocalDataForUser,
  downloadBackup,
  getLocalDataSummary,
  importBackupOverwrite,
  validateBackupFile,
  type LocalDataSummary,
} from "../utils/backup";

interface SettingsPageProps {
  onVideosChanged: () => void;
}

function formatLastCheckin(value: string | null) {
  if (!value) return "暂无";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "未知日期";

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function SettingsPage({ onVideosChanged }: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [summary, setSummary] = useState<LocalDataSummary>(() => getLocalDataSummary());

  function showSuccess(message: string) {
    setFeedbackType("success");
    setFeedback(message);
  }

  function showError(message: string) {
    setFeedbackType("error");
    setFeedback(message);
  }

  function refreshLocalState() {
    setSummary(getLocalDataSummary());
    onVideosChanged();
  }

  function handleExportBackup() {
    try {
      const payload = downloadBackup();
      showSuccess(`小岛数据已导出：${payload.data.videos.length} 个视频、${payload.data.checkinRecords.length} 条打卡记录。`);
    } catch {
      showError("导出失败了，请确认浏览器允许下载文件后再试一次。");
    }
  }

  function openImportPicker() {
    fileInputRef.current?.click();
  }

  async function handleImportBackup(file: File | undefined) {
    if (!file) return;

    try {
      const payload = await validateBackupFile(file);
      const confirmed = window.confirm(
        "覆盖导入会替换当前设备上的视频库、计划和打卡记录。建议先导出当前数据备份。\n\n确认要导入这个小岛备份吗？",
      );

      if (!confirmed) {
        showSuccess("已取消导入，当前本地数据没有变化。");
        return;
      }

      importBackupOverwrite(payload);
      refreshLocalState();
      showSuccess("小岛数据已导入成功，页面即将刷新以读取最新存档。");

      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (error) {
      showError(error instanceof Error ? error.message : "导入失败了，请换一个备份文件再试。");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleClearLocalData() {
    const confirmed = window.confirm(
      "确认清空本地数据吗？\n\n这会清空：视频库、今日计划、日期计划、打卡记录和周报统计来源数据。清空后不会自动恢复默认视频库，你可以之后手动点击“恢复默认视频库”。",
    );

    if (!confirmed) {
      showSuccess("已取消清空，本地数据没有变化。");
      return;
    }

    try {
      clearLocalDataForUser();
      refreshLocalState();
      showSuccess("本地数据已清空。刷新页面后也不会自动恢复默认视频库。");
    } catch {
      showError("清空失败了，请稍后再试。");
    }
  }

  function handleRestoreDefaultVideos() {
    try {
      const result = restoreDefaultVideos();
      refreshLocalState();
      showSuccess(
        result.restoredCount > 0
          ? `已恢复 ${result.restoredCount} 条默认视频。`
          : "默认视频库已经齐全，不会重复加入。",
      );
    } catch {
      showError("恢复默认视频库失败了，请稍后再试。");
    }
  }

  return (
    <section className="page-stack">
      <div className="panel">
        <div className="section-header">
          <h2>设置</h2>
          <span>本地</span>
        </div>
        <p className="muted">这里管理保存在当前浏览器里的小岛数据。备份文件只会下载到你的设备，不会上传到服务器。</p>
      </div>

      <div className="panel data-management-panel">
        <div className="section-header">
          <h2>小岛存档</h2>
          <span>localStorage</span>
        </div>
        <p className="muted">换设备、换浏览器或清缓存前，可以先导出一份 JSON 备份；导入时会覆盖当前设备上的本地数据。</p>

        {feedback && (
          <p className={feedbackType === "error" ? "form-error" : "form-success"} role="status">
            {feedback}
          </p>
        )}

        <div className="data-summary-grid" aria-label="本地数据概况">
          <div className="data-summary-item">
            <span>当前视频数</span>
            <strong>{summary.videoCount} 个</strong>
          </div>
          <div className="data-summary-item">
            <span>打卡记录数</span>
            <strong>{summary.checkinRecordCount} 条</strong>
          </div>
          <div className="data-summary-item">
            <span>已安排计划天数</span>
            <strong>{summary.plannedDayCount} 天</strong>
          </div>
          <div className="data-summary-item">
            <span>最近一次打卡</span>
            <strong>{formatLastCheckin(summary.lastCheckinDate)}</strong>
          </div>
          <div className="data-summary-item wide">
            <span>存储方式</span>
            <strong>{summary.storageLabel}</strong>
          </div>
        </div>

        <div className="data-action-grid">
          <button className="primary-button" type="button" onClick={handleExportBackup}>
            导出小岛数据
          </button>
          <button className="text-button data-action-button" type="button" onClick={openImportPicker}>
            导入小岛数据
          </button>
          <button className="text-button data-action-button" type="button" onClick={handleRestoreDefaultVideos}>
            恢复默认视频库
          </button>
          <button className="text-button data-action-button danger-action" type="button" onClick={handleClearLocalData}>
            清空本地数据
          </button>
        </div>

        <input
          ref={fileInputRef}
          className="hidden-file-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => handleImportBackup(event.target.files?.[0])}
        />
      </div>
    </section>
  );
}

export default SettingsPage;
