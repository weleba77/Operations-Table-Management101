import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api.ts';
import { useSound } from './hooks/useSound.ts';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar, NavTab } from './components/layout/Sidebar.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { OverviewView } from './components/views/OverviewView.tsx';
import { FloorPlanView } from './components/views/FloorPlanView.tsx';
import { AlertsView } from './components/views/AlertsView.tsx';
import { QueueView } from './components/views/QueueView.tsx';
import { AnalyticsView } from './components/views/AnalyticsView.tsx';
import { CameraSetupView } from './components/views/CameraSetupView.tsx';
import { StaffView } from './components/views/StaffView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { TableActionModal } from './components/views/TableActionModal.tsx';
import {
  Table,
  DiningZone,
  Alert,
  QueueEntry,
  Camera,
  StaffMember,
  RestaurantSettings,
  TableEvent,
  User,
  TableStatus,
} from './types.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(api.getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [zones, setZones] = useState<DiningZone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [recentEvents, setRecentEvents] = useState<TableEvent[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>({
    restaurantName: 'TableWatch Bistro & Terrace',
    openingHours: '11:00 AM – 11:00 PM',
    waiterAlertThresholdMinutes: 5,
    cleaningAlertThresholdMinutes: 10,
    targetTablesPerWaiter: 4,
    defaultDiningDurationMinutes: 65,
    defaultCleaningDurationMinutes: 8,
    maxAcceptableWaitMinutes: 45,
    soundEnabled: true,
    browserNotificationsEnabled: false,
    simulationEnabled: true,
    simulationSpeed: 1,
  });

  const [selectedTableForModal, setSelectedTableForModal] = useState<Table | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { playAlertChime, playSuccessChime, playSeatedChime } = useSound();

  // Show transient toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  // Initialize data and WebSocket connection
  useEffect(() => {
    api.connectWebSocket();
    const unsubscribeStatus = api.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Initial snapshot handler
    const unsubInit = api.on('init', (data: any) => {
      if (data.zones) setZones(data.zones);
      if (data.tables) setTables(data.tables);
      if (data.alerts) setAlerts(data.alerts);
      if (data.queue) setQueue(data.queue);
      if (data.cameras) setCameras(data.cameras);
      if (data.staff) setStaff(data.staff);
      if (data.settings) setSettings(data.settings);
      if (data.recentEvents) setRecentEvents(data.recentEvents);
    });

    // Real-time table update
    const unsubTable = api.on('table_updated', (updatedTable: Table) => {
      setTables((prev) =>
        prev.map((t) => (t.id === updatedTable.id ? updatedTable : t))
      );
      if (selectedTableForModal?.id === updatedTable.id) {
        setSelectedTableForModal(updatedTable);
      }
    });

    // Real-time batch tables update
    const unsubTablesBatch = api.on('tables_batch', (allTables: Table[]) => {
      setTables(allTables);
      if (selectedTableForModal) {
        const found = allTables.find((t) => t.id === selectedTableForModal.id);
        if (found) setSelectedTableForModal(found);
      }
    });

    // New Alert triggered
    const unsubAlertCreated = api.on('alert_created', (newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);
      if (soundEnabled) {
        playAlertChime();
      }
      showToast(`Alert: ${newAlert.message}`);
    });

    // Alert updated
    const unsubAlertUpdated = api.on('alert_updated', (updatedAlert: Alert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
      );
    });

    // Queue update
    const unsubQueue = api.on('queue_updated', (updatedQueue: QueueEntry[]) => {
      setQueue(updatedQueue);
    });

    // Camera update
    const unsubCamera = api.on('camera_updated', (updatedCamera: Camera) => {
      setCameras((prev) =>
        prev.map((c) => (c.id === updatedCamera.id ? updatedCamera : c))
      );
    });

    // Settings update
    const unsubSettings = api.on('settings_updated', (updatedSettings: RestaurantSettings) => {
      setSettings(updatedSettings);
    });

    // Fallback initial REST load if needed
    api.fetchOverview().then((overview) => {
      if (overview.recentEvents) setRecentEvents(overview.recentEvents);
    }).catch(() => {});

    api.fetchTables().then((res) => {
      setZones(res.zones);
      setTables(res.tables);
    }).catch(() => {});

    api.fetchAlerts().then((res) => setAlerts(res.alerts)).catch(() => {});
    api.fetchQueue().then((res) => setQueue(res.queue)).catch(() => {});
    api.fetchCameras().then((res) => setCameras(res.cameras)).catch(() => {});
    api.fetchStaff().then((res) => setStaff(res.staff)).catch(() => {});
    api.fetchSettings().then((res) => setSettings(res.settings)).catch(() => {});

    return () => {
      unsubscribeStatus();
      unsubInit();
      unsubTable();
      unsubTablesBatch();
      unsubAlertCreated();
      unsubAlertUpdated();
      unsubQueue();
      unsubCamera();
      unsubSettings();
    };
  }, [playAlertChime, selectedTableForModal, showToast, soundEnabled]);

  // Auth Persona Switcher
  const handleSwitchUser = (role: 'MANAGER' | 'STAFF') => {
    if (role === 'MANAGER') {
      const mgr: User = {
        id: 'user-manager-1',
        name: 'Alice Vance',
        email: 'manager@tablewatch.io',
        role: 'MANAGER',
      };
      api.setCurrentUser(mgr);
      setCurrentUser(mgr);
      showToast('Switched to Manager persona (Alice Vance)');
    } else {
      const stf: User = {
        id: 'user-staff-1',
        name: 'Marcus Vance',
        email: 'staff@tablewatch.io',
        role: 'STAFF',
      };
      api.setCurrentUser(stf);
      setCurrentUser(stf);
      showToast('Switched to Staff persona (Marcus Vance)');
      if (activeTab === 'analytics' || activeTab === 'cameras' || activeTab === 'staff') {
        setActiveTab('floorplan');
      }
    }
  };

  const handleLogout = () => {
    api.setCurrentUser(null);
    setCurrentUser(null);
  };

  // Table action handlers
  const handleTransitionTable = async (
    tableId: string,
    targetStatus: TableStatus,
    payload: any = {}
  ) => {
    const res = await api.transitionTable(tableId, targetStatus, payload);
    if (targetStatus === 'OCCUPIED') {
      playSeatedChime();
      showToast(`Table ${res.table.tableNumber} is now occupied`);
    } else if (targetStatus === 'AVAILABLE') {
      playSuccessChime();
      showToast(`Table ${res.table.tableNumber} is sanitized and available`);
    } else {
      showToast(`Table ${res.table.tableNumber} status updated to ${targetStatus}`);
    }
  };

  const handleStartService = async (tableId: string) => {
    const res = await api.startService(tableId);
    playSuccessChime();
    showToast(`First service recorded for Table ${res.table.tableNumber}`);
  };

  const handleAssignWaiter = async (tableId: string, waiterId: string) => {
    const res = await api.assignWaiter(tableId, waiterId);
    showToast(`Server assigned to Table ${res.table.tableNumber}`);
  };

  // Alert handlers
  const handleAcknowledgeAlert = async (alertId: string) => {
    await api.acknowledgeAlert(alertId);
    showToast('Alert acknowledged');
  };

  const handleResolveAlert = async (alertId: string) => {
    await api.resolveAlert(alertId);
    showToast('Alert marked resolved');
  };

  // Queue handlers
  const handleAddQueueParty = async (party: any) => {
    await api.addQueueEntry(party);
    playSuccessChime();
    showToast(`${party.customerName} added to waitlist`);
  };

  const handleSeatQueueParty = async (queueId: string, tableId?: string) => {
    const res = await api.seatQueueEntry(queueId, tableId);
    playSeatedChime();
    showToast(`Party seated at Table ${res.table.tableNumber}`);
  };

  const handleUpdateQueueStatus = async (queueId: string, status: string) => {
    await api.updateQueueStatus(queueId, status);
    showToast(`Queue entry marked ${status}`);
  };

  // Simulation Triggers
  const handleSimulateWaiterDelay = async () => {
    await api.triggerSimulationAction('trigger-waiter-delay');
  };

  const handleSimulateCleaningDelay = async () => {
    await api.triggerSimulationAction('trigger-cleaning-delay');
  };

  const handleSimulateQueueArrival = async () => {
    await api.triggerSimulationAction('simulate-party');
    showToast('New walk-in party joined the queue');
  };

  const handleToggleCamera = async (cameraId: string) => {
    await api.triggerSimulationAction('toggle-camera', { cameraId });
  };

  const handleResetDemoData = async () => {
    await api.resetDemoData();
    playSuccessChime();
    showToast('Sample restaurant database successfully reset to seed');
  };

  // Overview metrics computation
  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedTables = tables.filter(
    (t) => t.status === 'OCCUPIED' || t.status === 'WAITING_FOR_WAITER'
  ).length;
  const waitingForWaiterTables = tables.filter((t) => t.status === 'WAITING_FOR_WAITER').length;
  const waitingForCleaningTables = tables.filter((t) => t.status === 'WAITING_FOR_CLEANING').length;
  const cleaningTables = tables.filter((t) => t.status === 'CLEANING').length;
  const reservedTables = tables.filter((t) => t.status === 'RESERVED').length;
  const activeAlerts = alerts.filter((a) => a.status !== 'RESOLVED');
  const waitingQueue = queue.filter((q) => q.status === 'WAITING');

  const metrics = {
    totalTables,
    availableTables,
    occupiedTables,
    waitingForWaiterTables,
    waitingForCleaningTables,
    cleaningTables,
    reservedTables,
    avgSeatedToServiceMinutes: 3.8,
    queueSize: waitingQueue.length,
    activeAlertsCount: activeAlerts.length,
    criticalAlertsCount: activeAlerts.filter((a) => a.severity === 'CRITICAL').length,
    occupancyRatePercentage: Math.round((occupiedTables / Math.max(1, totalTables)) * 100),
  };

  if (!currentUser) {
    return <LoginPage onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        connectionStatus={connectionStatus}
        activeAlerts={activeAlerts}
        onOpenAlerts={() => setActiveTab('alerts')}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        simulationEnabled={settings.simulationEnabled}
        onQuickSimulate={handleSimulateWaiterDelay}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={currentUser.role}
          activeAlertsCount={activeAlerts.length}
          waitingQueueCount={waitingQueue.length}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && (
            <OverviewView
              metrics={metrics}
              recentEvents={recentEvents}
              activeAlerts={activeAlerts}
              tables={tables}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenTableModal={(tbl) => setSelectedTableForModal(tbl)}
              onQuickSimulate={handleSimulateWaiterDelay}
            />
          )}

          {activeTab === 'floorplan' && (
            <FloorPlanView
              zones={zones}
              tables={tables}
              onSelectTable={(tbl) => setSelectedTableForModal(tbl)}
              onQuickSimulate={handleSimulateWaiterDelay}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              tables={tables}
              staff={staff}
              onAcknowledge={handleAcknowledgeAlert}
              onResolve={handleResolveAlert}
              onAssignWaiter={handleAssignWaiter}
              onMarkCleaned={(tblId) => handleTransitionTable(tblId, 'AVAILABLE')}
              onStartCleaning={(tblId) => handleTransitionTable(tblId, 'CLEANING')}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onSimulateWaiterDelay={handleSimulateWaiterDelay}
              onSimulateCleaningDelay={handleSimulateCleaningDelay}
            />
          )}

          {activeTab === 'queue' && (
            <QueueView
              queue={queue}
              tables={tables}
              onAddParty={handleAddQueueParty}
              onSeatParty={handleSeatQueueParty}
              onUpdateStatus={handleUpdateQueueStatus}
              onSimulateArrival={handleSimulateQueueArrival}
            />
          )}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'cameras' && (
            <CameraSetupView
              cameras={cameras}
              tables={tables}
              zones={zones}
              onUpdateMapping={async (camId, mapped) => {
                await api.updateCameraMapping(camId, mapped);
                showToast('Camera coverage updated');
              }}
              onTestConnection={async (camId) => {
                await api.testCameraConnection(camId);
                showToast('Camera connection verified');
              }}
              onToggleCamera={handleToggleCamera}
            />
          )}

          {activeTab === 'staff' && (
            <StaffView
              staff={staff}
              tables={tables}
              onUpdateStatus={async (staffId, status) => {
                await api.updateStaffStatus(staffId, status);
                showToast('Staff status updated');
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={async (newSet) => {
                await api.updateSettings(newSet);
                showToast('Restaurant settings updated');
              }}
              onResetDemoData={handleResetDemoData}
              onTriggerWaiterDelay={handleSimulateWaiterDelay}
              onTriggerCleaningDelay={handleSimulateCleaningDelay}
              onSimulateArrival={handleSimulateQueueArrival}
            />
          )}
        </main>
      </div>

      {/* Floating Action / Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Table Detail & Action Drawer/Modal */}
      <TableActionModal
        table={selectedTableForModal}
        onClose={() => setSelectedTableForModal(null)}
        onTransition={handleTransitionTable}
        onStartService={handleStartService}
        onAssignWaiter={handleAssignWaiter}
        staffList={staff}
        userRole={currentUser.role}
      />
    </div>
  );
}
