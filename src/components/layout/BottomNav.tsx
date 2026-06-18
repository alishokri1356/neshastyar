import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Tag, Users, Settings, Mic2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  /** Extra paths that should also mark this tab active. */
  match?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'خانه', icon: Home, path: '/home' },
  { label: 'برچسب‌ها', icon: Tag, path: '/tags', match: ['/tag/', '/tags/'] },
  { label: 'افراد', icon: Users, path: '/participants', match: ['/participant/', '/participants/'] },
  { label: 'تنظیمات', icon: Settings, path: '/account/manage' },
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

  // Split items so the Record FAB sits in the visual center.
  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  const renderItem = (item: NavItem) => {
    const active = isActive(item);
    const Icon = item.icon;
    return (
      <button
        key={item.path}
        type="button"
        onClick={() => navigate(item.path)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="leading-none">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-lg pb-safe">
      <div className="relative mx-auto flex h-16 w-full max-w-3xl items-stretch px-2">
        {left.map(renderItem)}

        {/* Center Record FAB */}
        <div className="flex w-16 shrink-0 items-start justify-center">
          <button
            type="button"
            onClick={() => navigate('/record')}
            aria-label="ضبط جلسه"
            className="-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow ring-4 ring-background transition-transform active:scale-95"
          >
            <Mic2 className="h-7 w-7" />
          </button>
        </div>

        {right.map(renderItem)}
      </div>
    </nav>
  );
};

export default BottomNav;
