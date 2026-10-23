import { db } from './db.ts';
import { broadcast } from './websocket.ts';
import { Table, Alert, DiningSession, QueueEntry } from '../src/types.ts';

let simulationInterval: NodeJS.Timeout | null = null;
let tickCount = 0;

export function startSimulationEngine(): void {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  // Ticks every 3 seconds
  simulationInterval = setInterval(() => {
    try {
      tickSimulation();
    } catch (err) {
      console.error('Error during simulation tick:', err);
    }
  }, 3000);
}

export function stopSimulationEngine(): void {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function tickSimulation(): void {
  tickCount++;
  const data = db.getData();
  const now = Date.now();
  const settings = data.settings;
  let tablesChanged = false;
  let alertsChanged = false;

  // 1. Authoritative alert evaluation (Runs always, even if auto-simulation is disabled)
  for (const table of data.tables) {
    // Check WAITING_FOR_WAITER threshold
    if (
      (table.status === 'OCCUPIED' || table.status === 'WAITING_FOR_WAITER') &&
      !table.assignedWaiterId &&
      table.seatedAt
    ) {
      const seatedTime = new Date(table.seatedAt).getTime();
      const elapsedMinutes = Math.floor((now - seatedTime) / 60000);

      if (elapsedMinutes >= settings.waiterAlertThresholdMinutes) {
        if (table.status !== 'WAITING_FOR_WAITER') {
          table.status = 'WAITING_FOR_WAITER';
          tablesChanged = true;
        }

        // Check if alert already active
        const existingAlert = data.alerts.find(
          (a) => a.tableId === table.id && a.type === 'WAITER_DELAY' && a.status === 'ACTIVE'
        );

        if (!existingAlert) {
          const newAlert: Alert = {
            id: `alert-waiter-${table.id}-${Date.now()}`,
            tableId: table.id,
            tableNumber: table.tableNumber,
            zoneName: table.zoneName,
            type: 'WAITER_DELAY',
            severity: 'CRITICAL',
            message: `Table ${table.tableNumber} has been waiting ${elapsedMinutes}m without an assigned waiter in ${table.zoneName || 'dining room'}.`,
            createdAt: new Date().toISOString(),
            status: 'ACTIVE',
            waitingMinutes: elapsedMinutes,
          };
          data.alerts.unshift(newAlert);
          alertsChanged = true;
          broadcast('alert_created', newAlert);
          db.logEvent(
            table.id,
            table.tableNumber,
            'ALERT_TRIGGERED',
            `Waiter delay alert triggered (${elapsedMinutes}m elapsed)`,
            'Smart Alert Engine'
          );
        } else {
          // Update waiting minutes
          existingAlert.waitingMinutes = elapsedMinutes;
        }
      }
    }

    // Check WAITING_FOR_CLEANING delay
    if (table.status === 'WAITING_FOR_CLEANING') {
      const refTime = table.seatedAt ? new Date(table.seatedAt).getTime() : now - 10 * 60000;
      const elapsedMinutes = Math.floor((now - refTime) / 60000);

      if (elapsedMinutes >= settings.cleaningAlertThresholdMinutes) {
        const existingAlert = data.alerts.find(
          (a) => a.tableId === table.id && a.type === 'CLEANING_DELAY' && a.status === 'ACTIVE'
        );

        if (!existingAlert) {
          const newAlert: Alert = {
            id: `alert-clean-${table.id}-${Date.now()}`,
            tableId: table.id,
            tableNumber: table.tableNumber,
            zoneName: table.zoneName,
            type: 'CLEANING_DELAY',
            severity: 'WARNING',
            message: `Table ${table.tableNumber} in ${table.zoneName} has been awaiting cleaning for ${elapsedMinutes}m.`,
            createdAt: new Date().toISOString(),
            status: 'ACTIVE',
            waitingMinutes: elapsedMinutes,
          };
          data.alerts.unshift(newAlert);
          alertsChanged = true;
          broadcast('alert_created', newAlert);
          db.logEvent(
            table.id,
            table.tableNumber,
            'ALERT_TRIGGERED',
            `Cleaning delay alert triggered (${elapsedMinutes}m)`,
            'Smart Alert Engine'
          );
        }
      }
    }
  }

  // 2. Automatic Restaurant Activity Simulation (if enabled)
  if (settings.simulationEnabled) {
    const speed = settings.simulationSpeed || 1;
    // Cadence check based on speed
    const triggerCadence = Math.max(2, Math.floor(6 / speed));

    if (tickCount % triggerCadence === 0) {
      // Step A: Progress CLEANING tables -> AVAILABLE
      const cleaningTable = data.tables.find((t) => t.status === 'CLEANING');
      if (cleaningTable) {
        cleaningTable.status = 'AVAILABLE';
        cleaningTable.partySize = null;
        cleaningTable.customerName = null;
        cleaningTable.seatedAt = null;
        cleaningTable.serviceStartedAt = null;
        cleaningTable.cleaningStartedAt = null;
        cleaningTable.assignedWaiterId = null;
        cleaningTable.assignedWaiterName = null;
        tablesChanged = true;

        // Resolve cleaning alerts
        data.alerts
          .filter((a) => a.tableId === cleaningTable.id && a.status === 'ACTIVE')
          .forEach((a) => {
            a.status = 'RESOLVED';
            a.resolvedAt = new Date().toISOString();
            alertsChanged = true;
            broadcast('alert_updated', a);
          });

        db.logEvent(
          cleaningTable.id,
          cleaningTable.tableNumber,
          'CLEANED',
          `Table sanitized and prepared for guests`,
          'Samira Khan'
        );
      } else {
        // Step B: Progress WAITING_FOR_CLEANING -> CLEANING
        const dirtyTable = data.tables.find((t) => t.status === 'WAITING_FOR_CLEANING');
        if (dirtyTable && Math.random() > 0.4) {
          dirtyTable.status = 'CLEANING';
          dirtyTable.cleaningStartedAt = new Date().toISOString();
          tablesChanged = true;
          db.logEvent(
            dirtyTable.id,
            dirtyTable.tableNumber,
            'CLEANING_STARTED',
            `Staff started sanitizing Table ${dirtyTable.tableNumber}`,
            'Samira Khan'
          );
        }
      }

      // Step C: Auto-seat from waiting Queue if available table matches
      const waitingQueueEntry = data.queue.find((q) => q.status === 'WAITING');
      if (waitingQueueEntry) {
        const suitableTable = data.tables.find(
          (t) =>
            t.status === 'AVAILABLE' &&
            t.capacity >= waitingQueueEntry.partySize &&
            (waitingQueueEntry.seatingPreference === 'ANY' ||
              (waitingQueueEntry.seatingPreference === 'INDOOR' && t.zoneId === 'zone-indoor') ||
              (waitingQueueEntry.seatingPreference === 'WINDOW' && t.zoneId === 'zone-window') ||
              (waitingQueueEntry.seatingPreference === 'PATIO' && t.zoneId === 'zone-patio'))
        );

        if (suitableTable && Math.random() > 0.4) {
          // Seat party!
          suitableTable.status = 'OCCUPIED';
          suitableTable.partySize = waitingQueueEntry.partySize;
          suitableTable.customerName = waitingQueueEntry.customerName;
          suitableTable.seatedAt = new Date().toISOString();
          waitingQueueEntry.status = 'SEATED';
          waitingQueueEntry.recommendedTableId = suitableTable.id;
          waitingQueueEntry.recommendedTableNumber = suitableTable.tableNumber;

          tablesChanged = true;
          db.logEvent(
            suitableTable.id,
            suitableTable.tableNumber,
            'SEATED',
            `Party of ${waitingQueueEntry.partySize} (${waitingQueueEntry.customerName}) seated from Queue`,
            'Julian Thorne'
          );
          broadcast('queue_updated', data.queue);
        }
      }

      // Step D: Finish dining for an occupied table that has been dining long enough
      const occupiedTables = data.tables.filter(
        (t) => (t.status === 'OCCUPIED' || t.status === 'WAITING_FOR_WAITER') && t.seatedAt
      );
      if (occupiedTables.length > 3 && Math.random() > 0.7) {
        const finishCandidate = occupiedTables[Math.floor(Math.random() * occupiedTables.length)];
        finishCandidate.status = 'WAITING_FOR_CLEANING';
        tablesChanged = true;

        // Resolve waiter alerts if any
        data.alerts
          .filter((a) => a.tableId === finishCandidate.id && a.status === 'ACTIVE')
          .forEach((a) => {
            a.status = 'RESOLVED';
            a.resolvedAt = new Date().toISOString();
            alertsChanged = true;
            broadcast('alert_updated', a);
          });

        db.logEvent(
          finishCandidate.id,
          finishCandidate.tableNumber,
          'DINING_COMPLETED',
          `Guests completed payment and departed. Table ready for bussing.`,
          'Marcus Vance'
        );
      }
    }
  }

  if (tablesChanged) {
    db.save();
    broadcast('tables_batch', data.tables);
  }

  if (alertsChanged) {
    db.save();
  }
}

// Manual trigger functions for full user demonstration control
export function triggerManualWaiterDelay(tableNumber?: number): Table {
  const data = db.getData();
  const targetTable = tableNumber
    ? data.tables.find((t) => t.tableNumber === tableNumber)
    : data.tables.find((t) => t.status === 'AVAILABLE') || data.tables[0];

  if (!targetTable) throw new Error('No table available to trigger waiter delay');

  const now = Date.now();
  targetTable.status = 'WAITING_FOR_WAITER';
  targetTable.partySize = 4;
  targetTable.customerName = 'Simulated Delayed Party';
  targetTable.seatedAt = new Date(now - 6 * 60000).toISOString(); // 6 mins ago
  targetTable.assignedWaiterId = null;
  targetTable.assignedWaiterName = null;

  const newAlert: Alert = {
    id: `alert-waiter-${targetTable.id}-${Date.now()}`,
    tableId: targetTable.id,
    tableNumber: targetTable.tableNumber,
    zoneName: targetTable.zoneName,
    type: 'WAITER_DELAY',
    severity: 'CRITICAL',
    message: `Table ${targetTable.tableNumber} has been waiting 6m without an assigned waiter in ${targetTable.zoneName}.`,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
    waitingMinutes: 6,
  };

  data.alerts.unshift(newAlert);
  db.logEvent(
    targetTable.id,
    targetTable.tableNumber,
    'ALERT_TRIGGERED',
    `Manual simulation: Table seated 6m ago without waiter`,
    'Simulation Engine'
  );

  db.save();
  broadcast('table_updated', targetTable);
  broadcast('alert_created', newAlert);
  return targetTable;
}

export function triggerManualCleaningAlert(tableNumber?: number): Table {
  const data = db.getData();
  const targetTable = tableNumber
    ? data.tables.find((t) => t.tableNumber === tableNumber)
    : data.tables.find((t) => t.status === 'AVAILABLE') || data.tables[0];

  if (!targetTable) throw new Error('No table available to trigger cleaning alert');

  targetTable.status = 'WAITING_FOR_CLEANING';
  targetTable.seatedAt = new Date(Date.now() - 12 * 60000).toISOString();

  const newAlert: Alert = {
    id: `alert-clean-${targetTable.id}-${Date.now()}`,
    tableId: targetTable.id,
    tableNumber: targetTable.tableNumber,
    zoneName: targetTable.zoneName,
    type: 'CLEANING_DELAY',
    severity: 'WARNING',
    message: `Table ${targetTable.tableNumber} in ${targetTable.zoneName} has been awaiting cleaning for 12m.`,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
    waitingMinutes: 12,
  };

  data.alerts.unshift(newAlert);
  db.logEvent(
    targetTable.id,
    targetTable.tableNumber,
    'ALERT_TRIGGERED',
    `Manual simulation: Cleaning required for Table ${targetTable.tableNumber}`,
    'Simulation Engine'
  );

  db.save();
  broadcast('table_updated', targetTable);
  broadcast('alert_created', newAlert);
  return targetTable;
}

export function simulateQueueArrival(): QueueEntry {
  const data = db.getData();
  const names = ['Camilla Perez', 'Dr. Nathan Drake', 'Zoe Martinez', 'Lucas Wright', 'Seraphina Frost'];
  const partySizes = [2, 3, 4, 6];
  const prefs = ['ANY', 'INDOOR', 'WINDOW', 'PATIO'];

  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomSize = partySizes[Math.floor(Math.random() * partySizes.length)];
  const randomPref = prefs[Math.floor(Math.random() * prefs.length)];
  const nextNum = 100 + data.queue.length + 1;

  const newEntry: QueueEntry = {
    id: `q-${Date.now()}`,
    queueNumber: nextNum,
    customerName: randomName,
    partySize: randomSize,
    phone: `+1 (555) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`,
    seatingPreference: randomPref,
    joinTime: new Date().toISOString(),
    estimatedWaitMinutes: Math.floor(randomSize * 3 + Math.random() * 6),
    confidence: 'HIGH',
    status: 'WAITING',
  };

  data.queue.push(newEntry);
  db.save();
  broadcast('queue_updated', data.queue);
  return newEntry;
}

export function toggleCameraConnection(cameraId: string): void {
  const data = db.getData();
  const cam = data.cameras.find((c) => c.id === cameraId);
  if (!cam) return;

  cam.status = cam.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
  cam.lastPingAt = new Date().toISOString();

  if (cam.status === 'DISCONNECTED') {
    const alert: Alert = {
      id: `alert-cam-${cam.id}-${Date.now()}`,
      type: 'CAMERA_DISCONNECTED',
      severity: 'WARNING',
      message: `Camera "${cam.name}" connection lost. Surveillance feed suspended.`,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
    data.alerts.unshift(alert);
    broadcast('alert_created', alert);
  }

  db.save();
  broadcast('camera_updated', cam);
}
