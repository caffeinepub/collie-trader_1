import { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Brain,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  Settings,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/insights', label: 'AI Insights', icon: Brain },
  { path: '/risk', label: 'Risk Mgmt', icon: ShieldAlert },
  { path: '/recovery', label: 'Recovery', icon: TrendingUp },
  { path: '/statistics', label: 'Statistics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-terminal-900/95 backdrop-blur-sm">
        <div className="flex items-center h-14 px-4 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Activity className="w-4 h-4 text-profit" />
            </div>
            <span className="font-bold text-sm tracking-wider text-foreground hidden sm:block">
              COLLIE<span className="text-profit">TRADER</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary/20 text-profit border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Status indicator */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
              <span className="terminal-text">LIVE</span>
            </div>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden ml-auto">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-terminal-900 border-border p-0">
                <div className="flex items-center gap-2 p-4 border-b border-border">
                  <Activity className="w-5 h-5 text-profit" />
                  <span className="font-bold text-sm tracking-wider">
                    COLLIE<span className="text-profit">TRADER</span>
                  </span>
                </div>
                <nav className="flex flex-col p-3 gap-1">
                  {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path;
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary/20 text-profit border border-primary/30'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto scrollbar-thin">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-terminal-900/80 py-3 px-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} CollieTrader — Binance Futures</span>
          <span className="flex items-center gap-1">
            Built with{' '}
            <span className="text-loss">♥</span>{' '}
            using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'collie-trader')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-profit hover:underline"
            >
              caffeine.ai
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
