import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  UserCheck,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Alert, Table, StaffMember } from '../../types.ts';

interface AlertsViewProps {
  alerts: Alert[];
  tables: Table[];
  staff: StaffMember[];
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve: (alertId: string) => Promise<void>;
  onAssignWaiter: (tableId: string, waiterId: string) => Promise<void>;
  onMarkCleaned: (tableId: string) => Promise<void>;
  onStartCleaning: (tableId: string) => Promise<void>;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSimulateWaiterDelay: () => void;
  onSimulateCleaningDelay: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  tables,
  staff,
  onAcknowledge,
  onResolve,
  onAssignWaiter,
  onMarkCleaned,
  onStartCleaning,
  soundEnabled,
  onToggleSound,
  onSimulateWaiterDelay,
  onSimulateCleaningDelay,
}) => {
  const [filter, setFilter] = useState<'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [selectedWaiters, setSelectedWaiters] = useState<{ [alertId: string]: string }>({});

  const activeAlerts = alerts.filter((a) => a.status !== 'RESOLVED');
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED');

  const displayedAlerts = filter === 'ACTIVE' ? activeAlerts : resolvedAlerts;

  const handleWaiterChange = (alertId: string, waiterId: string) => {
    setSelectedWaiters((prev) => ({ ...prev, [alertId]: waiterId }));
  };

  const handleExecuteAssign = async (alert: Alert) => {
    if (!alert.tableId) return;
    const waiterId = selectedWaiters[alert.id];
    if (!waiterId) return;
    await onAssignWaiter(alert.tableId, waiterId);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Alerts Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Smart Alert Engine</h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeAlerts.length > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activeAlerts.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated monitoring for server response delays (&gt; 5m) and cleaning backlogs.
          </p>
        </div>

        {/* Audio Toggle & Quick Simulator Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleSound}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Chime Active' : 'Muted'}</span>
          </button>

          <button
            onClick={onSimulateWaiterDelay}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 flex items-center gap-1 transition-colors"
            title="Simulate a table waiting > 5 mins without server"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Trigger Waiter Delay</span>
          </button>

          <button
            onClick={onSimulateCleaningDelay}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1 transition-colors"
            title="Simulate table needing cleaning"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Trigger Cleaning Alert</span>
          </button>
        </div>
      </div>

      {/* Tabs: Active Alerts vs Alert History */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('ACTIVE')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            filter === 'ACTIVE'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Incidents ({activeAlerts.length})
        </button>
        <button
          onClick={() => setFilter('RESOLVED')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            filter === 'RESOLVED'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Resolved History ({resolvedAlerts.length})
        </button>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {displayedAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              {filter === 'ACTIVE' ? 'All Clear — No Active Alerts' : 'No resolved alerts in history'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filter === 'ACTIVE'
                ? 'Floor operations are proceeding within all defined service thresholds.'
                : 'Resolved alert incidents will appear here.'}
            </p>
          </div>
        ) : (
          displayedAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isAcknowledged = alert.status === 'ACKNOWLEDGED';
            const table = tables.find((t) => t.id === alert.tableId);

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border p-4.5 shadow-xs transition-all ${
                  isCritical
                    ? 'border-rose-200 bg-rose-50/20 ring-1 ring-rose-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Icon & Description */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {alert.type.replace('_', ' ')}
                        </span>
                        {alert.tableNumber && (
                          <span className="font-bold text-xs text-slate-900">
                            Table {alert.tableNumber}
                          </span>
                        )}
                        {alert.zoneName && (
                          <span className="text-xs text-slate-500">· {alert.zoneName}</span>
                        )}
                        {isAcknowledged && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                            Acknowledged by {alert.acknowledgedBy}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-medium text-slate-800 leading-normal">
                        {alert.message}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="font-mono tabular-nums">
                          {new Date(alert.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        {alert.waitingMinutes && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-rose-600 font-mono tabular-nums">
                              {alert.waitingMinutes}m elapsed
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Operational Resolution Buttons */}
                  {alert.status !== 'RESOLVED' && (
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                      {/* For WAITER_DELAY: Quick assign server */}
                      {alert.type === 'WAITER_DELAY' && alert.tableId && (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={selectedWaiters[alert.id] || ''}
                            onChange={(e) => handleWaiterChange(alert.id, e.target.value)}
                            className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white text-slate-700"
                          >
                            <option value="">Select Server...</option>
                            {staff
                              .filter((s) => s.role === 'WAITER')
                              .map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleExecuteAssign(alert)}
                            disabled={!selectedWaiters[alert.id]}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition-colors"
                          >
                            Assign Server
                          </button>
                        </div>
                      )}

                      {/* For CLEANING_DELAY: Clean buttons */}
                      {alert.type === 'CLEANING_DELAY' && alert.tableId && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onStartCleaning(alert.tableId!)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Start Cleaning
                          </button>
                          <button
                            onClick={() => onMarkCleaned(alert.tableId!)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Mark Cleaned
                          </button>
                        </div>
                      )}

                      {/* Acknowledge Button */}
                      {!isAcknowledged && (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}

                      {/* Manual Resolve */}
                      <button
                        onClick={() => onResolve(alert.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
