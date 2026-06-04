import type { AppPage } from "../types/navigation";

interface NavItem {
  key: AppPage;
  label: string;
}

const navItems: NavItem[] = [
  { key: "today", label: "今日" },
  { key: "library", label: "视频库" },
  { key: "import", label: "导入" },
  { key: "records", label: "记录" },
  { key: "settings", label: "设置" },
];

interface BottomNavProps {
  activePage: AppPage;
  onChange: (page: AppPage) => void;
}

function BottomNav({ activePage, onChange }: BottomNavProps) {
  return (
    <nav className="island-nav" aria-label="主导航">
      {navItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={activePage === item.key ? "active" : ""}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
