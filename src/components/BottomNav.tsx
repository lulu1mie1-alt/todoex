import { Button } from "animal-island-ui";
import type { AppPage } from "../types/navigation";

interface NavItem {
  key: AppPage;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { key: "library", label: "图鉴", icon: "album" },
  { key: "today", label: "今日", icon: "island" },
  { key: "records", label: "周报", icon: "stamp" },
];

interface BottomNavProps {
  activePage: AppPage;
  onChange: (page: AppPage) => void;
}

function BottomNav({ activePage, onChange }: BottomNavProps) {
  return (
    <nav className="island-nav" aria-label="主导航">
      {navItems.map((item) => (
        <Button
          key={item.key}
          htmlType="button"
          type={activePage === item.key ? "primary" : "text"}
          className={activePage === item.key ? "active" : ""}
          aria-current={activePage === item.key ? "page" : undefined}
          onClick={() => onChange(item.key)}
        >
          <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true" />
          <span>{item.label}</span>
        </Button>
      ))}
    </nav>
  );
}

export default BottomNav;
