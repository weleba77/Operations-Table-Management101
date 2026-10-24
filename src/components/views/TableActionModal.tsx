import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Users,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  UtensilsCrossed,
  Coffee,
  Calendar,
  Layers,
} from 'lucide-react';
import { Table, TableStatus, StaffMember, UserRole } from '../../types.ts';

interface TableActionModalProps {
  table: Table | null;
  onClose: () => void;
  onTransition: (
    tableId: string,
    targetStatus: TableStatus,
    payload?: {
      partySize?: number;
      customerName?: string;
      assignedWaiterId?: string;
      notes?: string;
    }
  ) => Promise<void>;
  onStartService: (tableId: string) => Promise<void>;
  onAssignWaiter: (tableId: string, waiterId: string) => Promise<void>;
  staffList: StaffMember[];
  userRole: UserRole;
}

export const TableActionModal: React.FC<TableActionModalProps> = ({
  table,
  onClose,
  onTransition,
  onStartService,
  onAssignWaiter,
  staffList,
  userRole,
}) => {
  if (!table) return null;

  const [partySize, setPartySize] = useState<number>(table.partySize || 2);
  const [customerName, setCustomerName] = useState<string>(table.customerName || '');
  const [selectedWaiter, setSelectedWaiter] = useState<string>(table.assignedWaiterId || '');
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Real-time duration timer for OCCUPIED (and WAITING_FOR_WAITER) or CLEANING
  useEffect(() => {
    const isOccupied = table.status === 'OCCUPIED' || table.status === 'WAITING_FOR_WAITER';
    const isCleaning = table.status === 'CLEANING';

    if (!isOccupied && !isCleaning) {
      setElapsedSeconds(0);
      return;
    }

    const getStartTime = () => {
      if (isOccupied && table.seatedAt) {
        return new Date(table.seatedAt).getTime();
      }
      if (isCleaning) {
        if (table.cleaningStartedAt) {
          return new Date(table.cleaningStartedAt).getTime();
        }
        // Fallback to 1 minute ago if timestamp was absent
        return Date.now() - 60000;
      }
      return null;
    };

    const updateTimer = () => {
      const start = getStartTime();
      if (start) {
        const diffSecs = Math.max(0, Math.floor((Date.now() - start) / 1000));
        setElapsedSeconds(diffSecs);
      } else {
        setElapsedSeconds(0);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [table.status, table.seatedAt, table.cleaningStartedAt]);

  const formatRealtimeDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(minutes)}m ${pad(seconds)}s`;
  };

  const handleSeat = async () => {
    setLoading(true);
    try {
      await onTransition(table.id, 'OCCUPIED', {
        partySize,
        customerName: customerName || `Guest Party (${partySize})`,
        assignedWaiterId: selectedWaiter || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStartService = async () => {
    setLoading(true);
    try {
      await onStartService(table.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWaiter = async () => {
    if (!selectedWaiter) return;
    setLoading(true);
    try {
      await onAssignWaiter(table.id, selectedWaiter);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDining = async () => {
    setLoading(true);
    try {
      await onTransition(table.id, 'WAITING_FOR_CLEANING');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStartCleaning = async () => {
    setLoading(true);
    try {
      await onTransition(table.id, 'CLEANING');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCleaned = async () => {
    setLoading(true);
    try {
      await onTransition(table.id, 'AVAILABLE');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    setLoading(true);
    try {
      await onTransition(table.id, 'RESERVED', {
        customerName: customerName || 'VIP Guest',
        notes: new Date(Date.now() + 60 * 60000).toISOString(),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    setLoading(true);
    try {
      await onTransition(table.id, 'AVAILABLE');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<TableStatus, { bg: string; text: string; label: string }> = {
    AVAILABLE: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Available' },
    OCCUPIED: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Occupied' },
    WAITING_FOR_WAITER: { bg: 'bg-rose-100 ring-2 ring-rose-400', text: 'text-rose-900', label: 'Waiting for Server' },
    WAITING_FOR_CLEANING: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Awaiting Cleaning' },
    CLEANING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Being Cleaned' },
    RESERVED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reserved' },
  };

  const currentStatusMeta = statusColors[table.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center">
              T{table.tableNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Table {table.tableNumber}</h3>
                <span className="text-xs text-slate-500">· {table.zoneName}</span>
              </div>
              <div className="text-xs text-slate-500">Capacity: {table.capacity} guests</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-slate-500 text-[11px] font-medium">Current Status</div>
              <div className="mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs ${currentStatusMeta.bg} ${currentStatusMeta.text}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse"></span>
                  <span>{currentStatusMeta.label}</span>
                </span>
              </div>
            </div>

            {(table.status === 'OCCUPIED' ||
              table.status === 'WAITING_FOR_WAITER' ||
              table.status === 'CLEANING') && (
              <div className="text-right">
                <div className="text-slate-500 text-[11px] font-medium flex items-center justify-end gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {table.status === 'CLEANING' ? 'Cleaning Duration' : 'Occupancy Duration'}
                  </span>
                </div>
                <div
                  className={`font-mono tabular-nums font-bold text-sm tracking-tight mt-0.5 flex items-center justify-end gap-1.5 ${
                    table.status === 'CLEANING'
                      ? 'text-blue-700'
                      : table.status === 'WAITING_FOR_WAITER'
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping opacity-75"></span>
                  <span>{formatRealtimeDuration(elapsedSeconds)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Form / Details based on table status */}
          {table.status === 'AVAILABLE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Party Size</label>
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: table.capacity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Server</label>
                  <select
                    value={selectedWaiter}
                    onChange={(e) => setSelectedWaiter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned (Staff will claim)</option>
                    {staffList
                      .filter((s) => s.role === 'WAITER' && s.status === 'ON_DUTY')
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.assignedTableNumbers.length}/{w.maxTables} tables)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Reservation Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Miller Party"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSeat}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Seat Customers Now</span>
                </button>
                <button
                  onClick={handleReserve}
                  disabled={loading}
                  className="py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg border border-purple-200 transition-colors"
                >
                  Reserve
                </button>
              </div>
            </div>
          )}

          {(table.status === 'OCCUPIED' || table.status === 'WAITING_FOR_WAITER') && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Party</span>
                  <span className="font-semibold text-slate-800">
                    {table.customerName || 'Walk-in Guests'} ({table.partySize || 2} people)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Server</span>
                  <span className="font-semibold text-slate-800">
                    {table.assignedWaiterName || (
                      <span className="text-rose-600 font-bold">Unassigned</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">First Service</span>
                  <span className="font-semibold text-slate-800">
                    {table.serviceStartedAt ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Recorded</span>
                      </span>
                    ) : (
                      <span className="text-amber-600">Pending Order</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Live Status Duration</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{formatRealtimeDuration(elapsedSeconds)}</span>
                  </span>
                </div>
              </div>

              {/* Waiter assigner selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Change / Assign Server
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedWaiter}
                    onChange={(e) => setSelectedWaiter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select available server...</option>
                    {staffList
                      .filter((s) => s.role === 'WAITER')
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.assignedTableNumbers.length}/{w.maxTables} tables)
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAssignWaiter}
                    disabled={!selectedWaiter || loading}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {!table.serviceStartedAt && (
                  <button
                    onClick={handleStartService}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Coffee className="w-4 h-4" />
                    <span>Start First Service (Order Taken)</span>
                  </button>
                )}

                <button
                  onClick={handleCompleteDining}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>Guests Departed · Mark for Cleaning</span>
                </button>
              </div>
            </div>
          )}

          {table.status === 'WAITING_FOR_CLEANING' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                Dining completed. Table requires bussing, sanitizing, and fresh cutlery.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleStartCleaning}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Start Cleaning Now
                </button>
                <button
                  onClick={handleMarkCleaned}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Mark as Cleaned
                </button>
              </div>
            </div>
          )}

          {table.status === 'CLEANING' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-blue-950">Active Sanitation in Progress</span>
                  </div>
                  <div className="font-mono tabular-nums font-bold text-blue-800 bg-blue-100/90 px-2.5 py-0.5 rounded-md border border-blue-200 text-xs flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatRealtimeDuration(elapsedSeconds)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-blue-800/90 leading-relaxed">
                  Sanitation and tableware reset in progress by floor busser. This timer tracks how long the cleaning cycle has persisted.
                </p>
              </div>
              <button
                onClick={handleMarkCleaned}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sanitation Complete · Mark Table Available</span>
              </button>
            </div>
          )}

          {table.status === 'RESERVED' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs">
                <div className="font-semibold text-purple-950">
                  Reserved for: {table.reservedFor || 'VIP Guest'}
                </div>
                <div className="text-[11px] text-purple-700 mt-1">
                  Expected arrival: {table.reservedTime ? new Date(table.reservedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onTransition(table.id, 'OCCUPIED')}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Seat Reserved Party
                </button>
                <button
                  onClick={handleCancelReservation}
                  disabled={loading}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
