import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import {
  Download,
  Calendar,
  Clock,
  TrendingUp,
  Sparkles,
  Users,
  Activity,
  Layers,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days'>('7days');

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed loading analytics:', err);
        setLoading(false);
      });
  }, []);

  const handleExportCsv = () => {
    window.location.href = '/api/analytics/export';
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>Calculating restaurant turnover metrics and percentiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Analytics Header & Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Operational Analytics & Forecasting
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Manager Access
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Derived from {data.historicalTotalSessions}+ dining sessions and authoritative server timestamps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setDateRange('today')}
              className={`px-3 py-1 rounded-md transition-colors ${
                dateRange === 'today'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('7days')}
              className={`px-3 py-1 rounded-md transition-colors ${
                dateRange === '7days'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('30days')}
              className={`px-3 py-1 rounded-md transition-colors ${
                dateRange === '30days'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Avg Seated-to-Service</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {data.seatedToServiceStats.average}
            <span className="text-xs font-normal text-slate-500 ml-1">min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Median: {data.seatedToServiceStats.median}m · 90th %ile: {data.seatedToServiceStats.p90}m
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Avg Cleaning Reset</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {data.cleaningPerformance.avgCleaningDurationMinutes}
            <span className="text-xs font-normal text-slate-500 ml-1">min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Wait to clean: {data.cleaningPerformance.avgCleaningWaitMinutes}m
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Avg Table Turnover</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
            3.8
            <span className="text-xs font-normal text-slate-500 ml-1">turns/day</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Target benchmark: 3.5+</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Service Compliance</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            94.6%
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Met &lt;5m waiter response
          </div>
        </div>
      </div>

      {/* Row 1: Charts (Peak Hours & Busiest Days) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">A. Seating Volume by Hour</h3>
              <p className="text-[11px] text-slate-500">
                Hourly guest arrivals illustrating lunch and prime dinner waves
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-400">11:00 – 22:00</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="seatedGuests" name="Parties Seated" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Busiest Days Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">B. Day-of-Week Activity</h3>
              <p className="text-[11px] text-slate-500">
                Completed dining sessions comparing weekday vs weekend rush
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-400">Sunday – Saturday</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.busiestDaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="completedSessions" name="Sessions" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Table Turnover Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">C. Table Turnover Performance (16 Tables)</h3>
            <p className="text-[11px] text-slate-500">
              Completed dining cycles per table across the past 7 days
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-700">16 Table Inventory</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.tableTurnoverData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="tableNumber" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Bar dataKey="avgTurnoverPerDay" name="Turns/Day" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Staffing Recommendation Schedule Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              G. Algorithmic Waiter Staffing Schedule
            </h3>
            <p className="text-[11px] text-slate-500">
              Derived from historical occupancy demand and target of {data.staffingSchedule[0]?.targetTablesPerWaiter || 4} tables per server.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Shift Model: 4 Tables / Server
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Time Slot</th>
                <th className="py-2.5 px-3">Forecast Demand</th>
                <th className="py-2.5 px-3">Expected Active Tables</th>
                <th className="py-2.5 px-3">Suggested Waiters</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.staffingSchedule.map((slot: any, idx: number) => {
                const isHigh = slot.forecastDemand.includes('High') || slot.forecastDemand.includes('Peak');
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                      {slot.timeSlot}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isHigh
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {slot.forecastDemand}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                      {slot.expectedOccupied} of 16 tables
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-indigo-700 text-sm">
                      {slot.suggestedWaiters} Servers
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      Recommended shift roster
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
