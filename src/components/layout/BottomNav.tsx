import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Home, MessageSquare, Settings, Tag, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  match?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "خانه", icon: Home, path: "/home" },
  { label: "بر حسب تاریخ", icon: Calendar, path: "/meetings-by-date" },
  { label: "گفتگو", icon: MessageSquare, path: "/chat", match: ["/chat/", "/chat-history"] },
  { label: "برچسب‌ها", icon: Tag, path: "/tags", match: ["/tag/", "/tags/", "/meetings/untagged"] },
  { label: "افراد", icon: Users, path: "/participants", match: ["/participant/", "/participants/"] },
  { label: "تنظیمات", icon: Settings, path: "/account/manage", match: ["/account"] },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (item: NavItem) => {
    if (pathname === item.path) return true;
    if (item.match?.some((m) => pathname.startsWith(m))) return true;
    return false;
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8E2D5]/70 bg-white pb-safe">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-stretch px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium transition-colors",
                active ? "text-[#0D4D4D]" : "text-[#66625B] hover:text-[#1C1B18]",
              )}
            >
              <Icon className="h-[20px] w-[20px]" />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
