import React from 'react';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  UserCheck,
  Coffee,
  CheckSquare,
} from 'lucide-react';
import { OverviewMetrics, TableEvent, Alert, Table } from '../../types.ts';

interface OverviewViewProps {
  metrics: OverviewMetrics;
  recentEvents: TableEvent[];
  activeAlerts: Alert[];
  tables: Table[];
  onNavigate: (tab: any) => void;
  onOpenTableModal: (table: Table) => void;
  onQuickSimulate: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  recentEvents,
  activeAlerts,
  tables,
  onNavigate,
  onOpenTableModal,
  onQuickSimulate,
}) => {
  const attentionTables = tables.filter(
    (t) => t.status === 'WAITING_FOR_WAITER' || t.status === 'WAITING_FOR_CLEANING'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operations Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live dining room occupancy, service delays, queue velocity, and automated alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('floorplan')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-xs"
          >
            <span>Live Floor Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onQuickSimulate}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Simulate Traffic</span>
          </button>
        </div>
      </div>

      {/* Critical Alert Warning Bar (if critical alerts active) */}
      {metrics.criticalAlertsCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900">
                {metrics.criticalAlertsCount} Critical Waiter Delay Alert{metrics.criticalAlertsCount > 1 ? 's' : ''} Active
              </div>
              <div className="text-[11px] text-rose-700">
                Guests seated &gt; 5 minutes without an assigned server. Immediate floor response required.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
          >
            Review Alerts
          </button>
        </div>
      )}

      {/* Primary KPI Grid (8 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Tables</span>
            <span className="text-[11px] font-mono text-slate-400">4 Zones</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics.totalTables}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Occupancy Rate</span>
            <span className="font-semibold text-slate-700 font-mono tabular-nums">
              {metrics.occupancyRatePercentage}%
            </span>
          </div>
        </div>

        {/* Available Tables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Available</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
            {metrics.availableTables}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Ready for immediate seating
          </div>
        </div>

        {/* Occupied Tables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Occupied</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600">
            {metrics.occupiedTables}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Active dining sessions
          </div>
        </div>

        {/* Waiting for Waiter */}
        <div
          className={`p-4 rounded-xl border shadow-xs ${
            metrics.waitingForWaiterTables > 0
              ? 'bg-rose-50/50 border-rose-200 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium text-slate-700">Waiting for Server</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                metrics.waitingForWaiterTables > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'
              }`}
            ></span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              metrics.waitingForWaiterTables > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {metrics.waitingForWaiterTables}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Threshold: &gt; 5 minutes unassigned
          </div>
        </div>

        {/* Waiting for Cleaning */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Awaiting Cleaning</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600">
            {metrics.waitingForCleaningTables}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Bussing required
          </div>
        </div>

        {/* Cleaning In Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Being Cleaned</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-600">
            {metrics.cleaningTables}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Sanitation in progress
          </div>
        </div>

        {/* Avg Seated to Service */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Avg Seated-to-Service</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics.avgSeatedToServiceMinutes}
            <span className="text-xs font-normal text-slate-500 ml-1">min</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Target: &lt; 5.0m</span>
          </div>
        </div>

        {/* Queue Size */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Queue Size</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600">
            {metrics.queueSize}
            <span className="text-xs font-normal text-slate-500 ml-1">parties</span>
          </div>
          <button
            onClick={() => onNavigate('queue')}
            className="mt-2 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            <span>Manage Waitlist</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mid Section: Attention Tables & Real-Time Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Attention Tables */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">Tables Requiring Action</h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {attentionTables.length} pending
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {attentionTables.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <span>All tables are properly serviced and cleaned!</span>
              </div>
            ) : (
              attentionTables.map((table) => {
                const isWaiterDelay = table.status === 'WAITING_FOR_WAITER';
                return (
                  <div
                    key={table.id}
                    onClick={() => onOpenTableModal(table)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-xs flex items-center justify-between ${
                      isWaiterDelay
                        ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                        : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          Table {table.tableNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {table.zoneName}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] font-medium mt-0.5 ${
                          isWaiterDelay ? 'text-rose-700' : 'text-amber-700'
                        }`}
                      >
                        {isWaiterDelay
                          ? 'Awaiting Server Assignment (>5m)'
                          : 'Guests departed · Needs bussing'}
                      </div>
                    </div>
                    <button className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50">
                      Manage
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">Real-Time Operational Feed</h2>
            </div>
            <span className="text-xs text-slate-400">Live authoritative events</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1 divide-y divide-slate-100">
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No recent events recorded.
              </div>
            ) : (
              recentEvents.map((evt) => {
                const timeStr = new Date(evt.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                let iconColor = 'bg-slate-100 text-slate-700';
                if (evt.eventType === 'ALERT_TRIGGERED') iconColor = 'bg-rose-100 text-rose-700';
                else if (evt.eventType === 'CLEANED') iconColor = 'bg-emerald-100 text-emerald-700';
                else if (evt.eventType === 'SEATED') iconColor = 'bg-blue-100 text-blue-700';
                else if (evt.eventType === 'WAITER_ASSIGNED') iconColor = 'bg-indigo-100 text-indigo-700';

                return (
                  <div key={evt.id} className="pt-2.5 first:pt-0 flex items-start gap-3 text-xs">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${iconColor}`}
                    >
                      T{evt.tableNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-800 font-medium leading-relaxed">
                        {evt.details}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono tabular-nums">{timeStr}</span>
                        <span>·</span>
                        <span>{evt.actorName}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
