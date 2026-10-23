import React from 'react';
import {
  UserCheck,
  UserX,
  Coffee,
  CheckCircle2,
  Users,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { StaffMember, Table } from '../../types.ts';

interface StaffViewProps {
  staff: StaffMember[];
  tables: Table[];
  onUpdateStatus: (staffId: string, status: string) => Promise<void>;
}

export const StaffView: React.FC<StaffViewProps> = ({ staff, tables, onUpdateStatus }) => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Floor Roster</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Manager Access
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor floor server workloads, active table sections, and shift duty statuses.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>{staff.filter((s) => s.status === 'ON_DUTY').length} On Duty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>{staff.filter((s) => s.status === 'ON_BREAK').length} Break</span>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => {
          const isDuty = member.status === 'ON_DUTY';
          const isBreak = member.status === 'ON_BREAK';
          const assignedCount = member.assignedTableNumbers.length;
          const maxCapacity = member.maxTables || 4;
          const workloadPct = Math.min(100, Math.round((assignedCount / maxCapacity) * 100));

          return (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Name & Role Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{member.name}</h3>
                      <div className="text-[11px] text-slate-500">{member.shift}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      member.role === 'WAITER'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : member.role === 'BUSSER'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>

                {/* Duty Status Selector */}
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Shift Status
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                    <button
                      onClick={() => onUpdateStatus(member.id, 'ON_DUTY')}
                      className={`py-1 rounded text-center transition-colors ${
                        isDuty
                          ? 'bg-white text-emerald-800 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      On Duty
                    </button>
                    <button
                      onClick={() => onUpdateStatus(member.id, 'ON_BREAK')}
                      className={`py-1 rounded text-center transition-colors ${
                        isBreak
                          ? 'bg-white text-amber-800 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Break
                    </button>
                    <button
                      onClick={() => onUpdateStatus(member.id, 'OFF_DUTY')}
                      className={`py-1 rounded text-center transition-colors ${
                        member.status === 'OFF_DUTY'
                          ? 'bg-white text-slate-800 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Off
                    </button>
                  </div>
                </div>

                {/* Workload Progress Bar (for Waiters/Bussers) */}
                {member.maxTables > 0 && (
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Table Workload</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {assignedCount} / {maxCapacity} tables
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          workloadPct > 80 ? 'bg-rose-500' : workloadPct > 50 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${workloadPct}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Assigned Tables List */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Assigned Floor Tables:
                  </div>
                  {member.assignedTableNumbers.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No tables currently assigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {member.assignedTableNumbers.map((num) => (
                        <span
                          key={num}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-xs border border-slate-200"
                        >
                          T{num}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
