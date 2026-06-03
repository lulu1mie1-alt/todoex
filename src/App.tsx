import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import TodayPage from "./pages/TodayPage";
import LibraryPage from "./pages/LibraryPage";
import ImportPage from "./pages/ImportPage";
import RecordsPage from "./pages/RecordsPage";
import SettingsPage from "./pages/SettingsPage";
import { getVideos } from "./storage/localStorage";
import { mockVideos } from "./storage/mockVideos";
import type { AppPage } from "./types/navigation";

const pageTitles: Record<AppPage, string> = {
  today: "今日打卡",
  library: "视频库",
  import: "导入视频",
  records: "记录复盘",
  settings: "设置",
};

const ACTIVE_PAGE_KEY = "fitnessIsland.activePage";
const validPages: AppPage[] = ["today", "library", "import", "records", "settings"];

function getInitialActivePage(): AppPage {
  const storedPage = sessionStorage.getItem(ACTIVE_PAGE_KEY);
  return validPages.includes(storedPage as AppPage) ? (storedPage as AppPage) : "today";
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>(getInitialActivePage);
  const [savedVideos, setSavedVideos] = useState(() => getVideos());
  const videos = [...savedVideos, ...mockVideos];

  function refreshSavedVideos() {
    setSavedVideos(getVideos());
  }

  useEffect(() => {
    function syncVideosFromStorage() {
      setSavedVideos(getVideos());
    }

    window.addEventListener("focus", syncVideosFromStorage);
    document.addEventListener("visibilitychange", syncVideosFromStorage);

    return () => {
      window.removeEventListener("focus", syncVideosFromStorage);
      document.removeEventListener("visibilitychange", syncVideosFromStorage);
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem(ACTIVE_PAGE_KEY, activePage);

    if (activePage === "library") {
      window.requestAnimationFrame(() => {
        const storedY = Number(sessionStorage.getItem("fitnessIsland.libraryScrollY") || "0");
        if (storedY > 0) {
          window.scrollTo({ top: storedY });
        }
      });
    }
  }, [activePage]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Fitness Island</p>
          <h1>居家跟练打卡小岛</h1>
        </div>
        <div className="page-chip">{pageTitles[activePage]}</div>
      </header>

      <main className="page-body">
        {activePage === "today" && <TodayPage videos={videos} />}
        {activePage === "library" && <LibraryPage videos={savedVideos} onVideosChanged={refreshSavedVideos} />}
        {activePage === "import" && (
          <ImportPage
            onSaved={() => {
              refreshSavedVideos();
              setActivePage("library");
            }}
          />
        )}
        {activePage === "records" && <RecordsPage videos={videos} />}
        {activePage === "settings" && <SettingsPage />}
      </main>

      <BottomNav activePage={activePage} onChange={setActivePage} />
    </div>
  );
}

export default App;
