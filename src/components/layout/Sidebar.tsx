import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Bell,
  Users,
  BarChart3,
  Video,
  UserCheck,
  Settings,
  Lock,
  ChevronRight,
  X,
} from 'lucide-react';
import { UserRole } from '../../types.ts';

export type NavTab =
  | 'overview'
  | 'floorplan'
  | 'alerts'
  | 'queue'
  | 'analytics'
  | 'cameras'
  | 'staff'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  activeAlertsCount: number;
  waitingQueueCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  activeAlertsCount,
  waitingQueueCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const isManager = userRole === 'MANAGER';

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
    managerOnly?: boolean;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'floorplan', label: 'Live Floor Plan', icon: Grid },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: activeAlertsCount,
      badgeColor: activeAlertsCount > 0 ? 'bg-rose-500 text-white' : undefined,
    },
    {
      id: 'queue',
      label: 'Queue Management',
      icon: Users,
      badge: waitingQueueCount,
      badgeColor: waitingQueueCount > 0 ? 'bg-amber-500 text-white' : undefined,
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, managerOnly: true },
    { id: 'cameras', label: 'Camera Setup', icon: Video, managerOnly: true },
    { id: 'staff', label: 'Staff Management', icon: UserCheck, managerOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 select-none">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-xs">
            TW
          </div>
          <span>TableWatch</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation section */}
      <div className="p-3">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
          Operations
        </div>
        <nav className="space-y-1">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Management Section */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Management
          </span>
          {!isManager && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>Mgr only</span>
            </span>
          )}
        </div>
        <nav className="space-y-1">
          {navItems.slice(4).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const locked = item.managerOnly && !isManager;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (locked) {
                    alert('This section requires Manager privileges. Switch to the Manager role in the top-right profile menu to test.');
                    return;
                  }
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : locked
                    ? 'text-slate-500 opacity-60 hover:bg-slate-850 cursor-not-allowed'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {locked && <Lock className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Info */}
      <div className="mt-auto p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 font-medium">Floor Coverage</span>
          <span className="text-emerald-400 font-mono tabular-nums">16 / 16 Tables</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full w-full"></div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
          <span>v2.4.0 Operations</span>
          <span>Port 3000</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 h-[calc(100vh-4rem)] sticky top-16 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
