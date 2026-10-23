import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Users,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Database,
  Radio,
  Sliders,
  Play,
  Pause,
} from 'lucide-react';
import { RestaurantSettings } from '../../types.ts';

interface SettingsViewProps {
  settings: RestaurantSettings;
  onUpdateSettings: (newSettings: Partial<RestaurantSettings>) => Promise<void>;
  onResetDemoData: () => Promise<void>;
  onTriggerWaiterDelay: () => void;
  onTriggerCleaningDelay: () => void;
  onSimulateArrival: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetDemoData,
  onTriggerWaiterDelay,
  onTriggerCleaningDelay,
  onSimulateArrival,
}) => {
  const [formData, setFormData] = useState<RestaurantSettings>(settings);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof RestaurantSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdateSettings(formData);
      setSavedMessage('Settings saved successfully.');
      setTimeout(() => setSavedMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await onResetDemoData();
      setResetConfirm(false);
      setSavedMessage('Sample restaurant database successfully restored.');
      setTimeout(() => setSavedMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Threshold Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure waiter response alarms, cleaning delays, simulation controls, and demo state.
          </p>
        </div>

        {savedMessage && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{savedMessage}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Alert Thresholds */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">1. Smart Alert Engine Thresholds</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Waiter Response Threshold (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.waiterAlertThresholdMinutes}
                  onChange={(e) =>
                    handleChange('waiterAlertThresholdMinutes', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-slate-500 shrink-0">mins</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Trigger critical alert when a table is occupied &gt; {formData.waiterAlertThresholdMinutes}m without an assigned server. (Default: 5 min)
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cleaning Delay Threshold (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={formData.cleaningAlertThresholdMinutes}
                  onChange={(e) =>
                    handleChange('cleaningAlertThresholdMinutes', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <span className="text-slate-500 shrink-0">mins</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Trigger warning alert when a completed table waits &gt; {formData.cleaningAlertThresholdMinutes}m for busser reset.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Staffing & Queue Assumptions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">2. Staffing & Wait-Time Algorithm</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Tables Per Server
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.targetTablesPerWaiter}
                onChange={(e) => handleChange('targetTablesPerWaiter', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Used to calculate recommended shift headcounts in Analytics.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Dining Duration (Minutes)
              </label>
              <input
                type="number"
                min="20"
                max="180"
                value={formData.defaultDiningDurationMinutes}
                onChange={(e) =>
                  handleChange('defaultDiningDurationMinutes', Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Base parameter for walk-in queue prediction models.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cleaning Reset Duration (Minutes)
              </label>
              <input
                type="number"
                min="2"
                max="30"
                value={formData.defaultCleaningDurationMinutes}
                onChange={(e) =>
                  handleChange('defaultCleaningDurationMinutes', Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Estimated time required to sanitize and reset a table.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Simulation Engine & Demo Control */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">3. Real-Time Simulation Engine</h2>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Shared Server Loop
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">Automatic Traffic Simulation</div>
                <div className="text-[11px] text-slate-500">
                  When enabled, the server automatically simulates customer arrivals, waiter service progression, bill settlement, and table cleaning.
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleChange('simulationEnabled', !formData.simulationEnabled)}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${
                  formData.simulationEnabled
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {formData.simulationEnabled ? 'Enabled' : 'Paused'}
              </button>
            </div>

            {/* Simulation Speed */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Simulation Speed</label>
              <div className="flex gap-2">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleChange('simulationSpeed', speed)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      formData.simulationSpeed === speed
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {speed}x Normal Velocity
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Scenario Triggers */}
            <div className="pt-2">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Manual Demo Scenario Triggers
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onTriggerWaiterDelay}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-rose-600" />
                  <span>Trigger 5m+ Waiter Delay Alert</span>
                </button>
                <button
                  type="button"
                  onClick={onTriggerCleaningDelay}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg border border-amber-200 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-amber-600" />
                  <span>Trigger Cleaning Delay Alert</span>
                </button>
                <button
                  type="button"
                  onClick={onSimulateArrival}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Simulate Walk-in Arrival</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Integrations Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Radio className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">4. System & Integration Diagnostics</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 text-[11px]">Database Layer</div>
              <div className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <Database className="w-3.5 h-3.5" />
                <span>SQLite (Persistent File)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 text-[11px]">WebSocket Bus</div>
              <div className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <Radio className="w-3.5 h-3.5" />
                <span>Active (/ws)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 text-[11px]">RTSP Video Gateway</div>
              <div className="font-bold text-indigo-700 flex items-center gap-1 mt-0.5">
                <Radio className="w-3.5 h-3.5" />
                <span>Simulated Adapter Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            Save Configuration Changes
          </button>

          {/* Reset Demo Data Button */}
          {!resetConfirm ? (
            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Database to Initial Seed</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-600 font-medium">Reset all demo tables & events?</span>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-3 py-1 bg-rose-600 text-white font-bold text-xs rounded-md"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
