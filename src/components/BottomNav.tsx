import type { AppPage } from "../types/navigation";

interface NavItem {
  key: AppPage;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { key: "today", label: "今日", icon: "island" },
  { key: "library", label: "图鉴", icon: "album" },
  { key: "import", label: "投递", icon: "post" },
  { key: "records", label: "周报", icon: "stamp" },
  { key: "settings", label: "设置", icon: "gear" },
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
          aria-current={activePage === item.key ? "page" : undefined}
          onClick={() => onChange(item.key)}
        >
          <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
