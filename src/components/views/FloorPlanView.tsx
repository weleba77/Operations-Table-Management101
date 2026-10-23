import React, { useState } from 'react';
import {
  Users,
  Clock,
  User,
  AlertTriangle,
  Sparkles,
  Filter,
  CheckCircle2,
  Coffee,
  RotateCcw,
} from 'lucide-react';
import { Table, DiningZone, TableStatus } from '../../types.ts';

interface FloorPlanViewProps {
  zones: DiningZone[];
  tables: Table[];
  onSelectTable: (table: Table) => void;
  onQuickSimulate: () => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  zones,
  tables,
  onSelectTable,
  onQuickSimulate,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredTables = tables.filter((t) => {
    if (selectedZone !== 'ALL' && t.zoneId !== selectedZone) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Available',
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Occupied',
        };
      case 'WAITING_FOR_WAITER':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-400/40',
          dot: 'bg-rose-600 animate-pulse',
          label: 'Needs Server (>5m)',
        };
      case 'WAITING_FOR_CLEANING':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Awaiting Cleaning',
        };
      case 'CLEANING':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Cleaning',
        };
      case 'RESERVED':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          label: 'Reserved',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: status,
        };
    }
  };

  const getElapsedDisplay = (table: Table) => {
    if (!table.seatedAt) return null;
    const diffMins = Math.floor((Date.now() - new Date(table.seatedAt).getTime()) / 60000);
    return `${Math.max(0, diffMins)}m`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Floor Plan Header & Filtering Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Live Restaurant Floor Plan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              16 interactive tables across 4 dining zones with second-by-second server updates.
            </p>
          </div>
          <button
            onClick={onQuickSimulate}
            className="self-start sm:self-auto px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Simulate Traffic</span>
          </button>
        </div>

        {/* Zone Tabs & Status Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Zone Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedZone('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedZone === 'ALL'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Zones ({tables.length})
            </button>
            {zones.map((zone) => {
              const count = tables.filter((t) => t.zoneId === zone.id).length;
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedZone === zone.id
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {zone.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="WAITING_FOR_WAITER">Needs Server</option>
              <option value="WAITING_FOR_CLEANING">Needs Cleaning</option>
              <option value="CLEANING">Being Cleaned</option>
              <option value="RESERVED">Reserved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
          Legend:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-400 animate-pulse"></span>
          <span className="font-semibold text-rose-700">Waiting for Server (&gt;5m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Awaiting Cleaning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Being Cleaned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>Reserved</span>
        </div>
      </div>

      {/* Table Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const statusMeta = getStatusBadge(table.status);
          const elapsed = getElapsedDisplay(table);
          const isAttention =
            table.status === 'WAITING_FOR_WAITER' || table.status === 'WAITING_FOR_CLEANING';

          return (
            <div
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`bg-white rounded-xl border p-4.5 cursor-pointer transition-all duration-150 hover:shadow-md hover:border-slate-400/80 flex flex-col justify-between relative overflow-hidden ${
                table.status === 'WAITING_FOR_WAITER'
                  ? 'border-rose-400 ring-2 ring-rose-400/30'
                  : table.status === 'WAITING_FOR_CLEANING'
                  ? 'border-amber-300'
                  : 'border-slate-200'
              }`}
            >
              {/* Top Row: Table Number & Capacity */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm tracking-tight ${
                      table.status === 'AVAILABLE'
                        ? 'bg-emerald-600 text-white'
                        : table.status === 'OCCUPIED'
                        ? 'bg-rose-600 text-white'
                        : table.status === 'WAITING_FOR_WAITER'
                        ? 'bg-rose-600 text-white ring-2 ring-rose-400 animate-pulse'
                        : table.status === 'WAITING_FOR_CLEANING'
                        ? 'bg-amber-600 text-white'
                        : table.status === 'CLEANING'
                        ? 'bg-blue-600 text-white'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    T{table.tableNumber}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Table {table.tableNumber}
                    </div>
                    <div className="text-[11px] text-slate-500">{table.zoneName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>{table.capacity}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusMeta.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`}></span>
                  <span>{statusMeta.label}</span>
                </span>
              </div>

              {/* Middle Context Information */}
              <div className="text-xs space-y-1.5 py-2 border-t border-slate-100 flex-1">
                {table.status === 'AVAILABLE' && (
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Cleaned & ready for guests</span>
                  </div>
                )}

                {(table.status === 'OCCUPIED' || table.status === 'WAITING_FOR_WAITER') && (
                  <>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-[11px] text-slate-500">Party:</span>
                      <span className="font-semibold truncate max-w-[120px]">
                        {table.customerName || `Guests (${table.partySize || 2})`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-[11px] text-slate-500">Server:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                        {table.assignedWaiterName || (
                          <span className="text-rose-600 font-bold">Unassigned</span>
                        )}
                      </span>
                    </div>

                    {elapsed && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-[11px] text-slate-500">Seated:</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{elapsed}</span>
                        </span>
                      </div>
                    )}
                  </>
                )}

                {table.status === 'WAITING_FOR_CLEANING' && (
                  <div className="text-amber-800 text-[11px] py-1">
                    Departed · Requires busser reset
                  </div>
                )}

                {table.status === 'CLEANING' && (
                  <div className="text-blue-800 text-[11px] py-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Sanitation in progress</span>
                  </div>
                )}

                {table.status === 'RESERVED' && (
                  <div className="text-purple-800 text-[11px] py-1 truncate">
                    For: {table.reservedFor || 'VIP Guest'}
                  </div>
                )}
              </div>

              {/* Card Footer Quick Action */}
              <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Click to manage</span>
                <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  Manage &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
