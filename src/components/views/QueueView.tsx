import React, { useState } from 'react';
import {
  Users,
  Clock,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Phone,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { QueueEntry, Table } from '../../types.ts';

interface QueueViewProps {
  queue: QueueEntry[];
  tables: Table[];
  onAddParty: (party: {
    customerName: string;
    partySize: number;
    phone: string;
    seatingPreference: string;
    notes?: string;
  }) => Promise<void>;
  onSeatParty: (queueId: string, tableId?: string) => Promise<void>;
  onUpdateStatus: (queueId: string, status: string) => Promise<void>;
  onSimulateArrival: () => void;
}

export const QueueView: React.FC<QueueViewProps> = ({
  queue,
  tables,
  onAddParty,
  onSeatParty,
  onUpdateStatus,
  onSimulateArrival,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [phone, setPhone] = useState('');
  const [preference, setPreference] = useState('ANY');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const waitingList = queue.filter((q) => q.status === 'WAITING');
  const completedList = queue.filter((q) => q.status !== 'WAITING');

  // Calculate algorithm metrics
  const now = Date.now();
  let longestWaitMinutes = 0;
  waitingList.forEach((q) => {
    const elapsed = Math.floor((now - new Date(q.joinTime).getTime()) / 60000);
    if (elapsed > longestWaitMinutes) longestWaitMinutes = elapsed;
  });

  const availableSuitableTables = tables.filter((t) => t.status === 'AVAILABLE');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAddParty({
        customerName: customerName || 'Walk-in Guest',
        partySize,
        phone,
        seatingPreference: preference,
        notes,
      });
      setModalOpen(false);
      setCustomerName('');
      setPhone('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Metrics */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Queue Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic wait-time algorithm evaluating party capacity, dining duration & busser reset.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Party to Queue</span>
          </button>
          <button
            onClick={onSimulateArrival}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Simulate Arrival</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Waiting Parties</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600">
            {waitingList.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Live active queue</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Longest Wait</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {longestWaitMinutes}
            <span className="text-xs font-normal text-slate-500 ml-1">min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Party at head of queue</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Next Available Table</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
            {availableSuitableTables.length > 0
              ? `T${availableSuitableTables[0].tableNumber}`
              : 'Turnover soon'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {availableSuitableTables.length > 0 ? 'Ready for seating' : 'Dining concluding'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 mb-1">Prediction Confidence</div>
          <div className="text-2xl font-bold text-slate-900">
            <span className="text-emerald-600">High</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Grounded in 7-day averages</div>
        </div>
      </div>

      {/* Waiting List Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
          <span>Active Waitlist ({waitingList.length})</span>
          <span className="text-slate-400 font-normal">Sorted by arrival priority</span>
        </div>

        {waitingList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <div className="font-semibold text-slate-700 text-sm">No Waiting Parties</div>
            <p className="mt-1">All walk-in parties have been seated or waitlist is empty.</p>
          </div>
        ) : (
          waitingList.map((party) => {
            const elapsed = Math.floor((now - new Date(party.joinTime).getTime()) / 60000);
            const recommendedTable = tables.find(
              (t) =>
                t.status === 'AVAILABLE' &&
                t.capacity >= party.partySize &&
                (party.seatingPreference === 'ANY' ||
                  (party.seatingPreference === 'INDOOR' && t.zoneId === 'zone-indoor') ||
                  (party.seatingPreference === 'WINDOW' && t.zoneId === 'zone-window') ||
                  (party.seatingPreference === 'PATIO' && t.zoneId === 'zone-patio'))
            );

            return (
              <div
                key={party.id}
                className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left party details */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold font-mono text-sm flex items-center justify-center shrink-0">
                    #{party.queueNumber}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{party.customerName}</span>
                      <span className="text-xs font-medium text-slate-500">
                        · {party.partySize} {party.partySize === 1 ? 'Guest' : 'Guests'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Pref: {party.seatingPreference}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {party.phone && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{party.phone}</span>
                        </span>
                      )}
                      <span>
                        Waiting: <strong className="font-mono text-slate-800">{elapsed}m</strong>
                      </span>
                      {party.notes && <span className="italic text-slate-400">"{party.notes}"</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Algorithm ETA & Seating Action */}
                <div className="flex flex-wrap items-center gap-3 self-end md:self-center shrink-0">
                  {/* Algorithmic Estimate Pill */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Est. Wait Range
                    </div>
                    <div className="text-xs font-bold text-slate-800 font-mono tabular-nums">
                      {party.estimatedWaitMinutes} – {party.estimatedWaitMinutes + 5} min
                    </div>
                  </div>

                  {/* Recommended Table Badge */}
                  {recommendedTable ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Ready: Table {recommendedTable.tableNumber}</span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-500 text-xs font-medium">
                      Est. next: 10m
                    </div>
                  )}

                  {/* Actions */}
                  <button
                    onClick={() => onSeatParty(party.id, recommendedTable?.id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Seat Party</span>
                  </button>

                  <button
                    onClick={() => onUpdateStatus(party.id, 'NO_SHOW')}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                    title="Mark No-Show"
                  >
                    No-Show
                  </button>

                  <button
                    onClick={() => onUpdateStatus(party.id, 'CANCELLED')}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Cancel from waitlist"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for adding walk-in party */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Party to Waitlist</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter walk-in guest details. The algorithm will predict wait times.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Guest / Party Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Party Size</label>
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} Guests
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Seating Area</label>
                  <select
                    value={preference}
                    onChange={(e) => setPreference(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="ANY">First Available</option>
                    <option value="INDOOR">Indoor Dining</option>
                    <option value="WINDOW">Window Seating</option>
                    <option value="PATIO">Garden Patio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Special Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Highchair needed, Birthday"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
                >
                  Confirm & Join Queue
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
