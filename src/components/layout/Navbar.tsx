import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  User,
  ShieldAlert,
  Play,
  RotateCcw,
  Sparkles,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { User as UserType, Alert } from '../../types.ts';

interface NavbarProps {
  currentUser: UserType | null;
  onSwitchUser: (role: 'MANAGER' | 'STAFF') => void;
  onLogout: () => void;
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  activeAlerts: Alert[];
  onOpenAlerts: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  simulationEnabled: boolean;
  onQuickSimulate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  connectionStatus,
  activeAlerts,
  onOpenAlerts,
  soundEnabled,
  onToggleSound,
  simulationEnabled,
  onQuickSimulate,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const totalAlertsCount = activeAlerts.length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Brand & Restaurant Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-tight shadow-xs">
          TW
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-base tracking-tight">TableWatch</span>
            <span className="text-slate-400 text-xs hidden sm:inline">/</span>
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Grand Bistro & Terrace</span>
          </div>
          <div className="text-[11px] text-slate-400 hidden md:block">
            Operations & Table Management
          </div>
        </div>
      </div>

      {/* Zone 2: Real-time Clock & Live Telemetry Indicators */}
      <div className="flex items-center gap-3 text-xs">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-600">
          <span className="text-slate-400">{currentDate}</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono tabular-nums font-semibold text-slate-800">{currentTime}</span>
        </div>

        {/* WebSocket Connection Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
            connectionStatus === 'CONNECTED'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : connectionStatus === 'RECONNECTING'
              ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
          title={`Backend status: ${connectionStatus}`}
        >
          {connectionStatus === 'CONNECTED' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="hidden sm:inline">Live Sync</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>{connectionStatus === 'RECONNECTING' ? 'Reconnecting...' : 'Offline'}</span>
            </>
          )}
        </div>

        {/* Simulation Mode Indicator */}
        {simulationEnabled && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-medium text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sim Running</span>
          </div>
        )}
      </div>

      {/* Zone 3: Actions & User Role Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sound toggle button */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-lg border transition-colors ${
            soundEnabled
              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
          title={soundEnabled ? 'Mute alert audio' : 'Unmute alert audio'}
          aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Alert Bell Button with badge */}
        <button
          onClick={onOpenAlerts}
          className={`relative p-2 rounded-lg border transition-colors ${
            criticalCount > 0
              ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
              : totalAlertsCount > 0
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title={`${totalAlertsCount} active alerts`}
          aria-label="View active alerts"
        >
          <Bell className="w-4 h-4" />
          {totalAlertsCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                criticalCount > 0 ? 'bg-rose-600 animate-bounce' : 'bg-amber-500'
              }`}
            >
              {totalAlertsCount}
            </span>
          )}
        </button>

        {/* Quick Demo Trigger Button */}
        <button
          onClick={onQuickSimulate}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
          title="Trigger a realistic simulation event (customer arrival or delay)"
        >
          <Play className="w-3.5 h-3.5 text-slate-600" />
          <span>Sim Event</span>
        </button>

        {/* User Profile & Role Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-colors"
            aria-expanded={userDropdownOpen}
          >
            <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-semibold">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <div className="font-semibold text-slate-800 leading-tight truncate max-w-[100px]">
                {currentUser?.name}
              </div>
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {currentUser?.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="font-semibold text-slate-800">{currentUser?.name}</div>
                <div className="text-slate-500 text-[11px]">{currentUser?.email}</div>
                <div className="mt-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    Role: {currentUser?.role}
                  </span>
                </div>
              </div>

              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Role / Demo Persona
              </div>

              <button
                onClick={() => {
                  onSwitchUser('MANAGER');
                  setUserDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${
                  currentUser?.role === 'MANAGER' ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                }`}
              >
                <span>Alice Vance (Manager)</span>
                {currentUser?.role === 'MANAGER' && <span className="text-[10px]">Active</span>}
              </button>

              <button
                onClick={() => {
                  onSwitchUser('STAFF');
                  setUserDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${
                  currentUser?.role === 'STAFF' ? 'text-indigo-600 font-semibold' : 'text-slate-700'
                }`}
              >
                <span>Marcus Vance (Staff)</span>
                {currentUser?.role === 'STAFF' && <span className="text-[10px]">Active</span>}
              </button>

              <div className="border-t border-slate-100 mt-2 pt-1">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
