import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import { broadcast } from './websocket.ts';
import {
  triggerManualWaiterDelay,
  triggerManualCleaningAlert,
  simulateQueueArrival,
  toggleCameraConnection,
} from './simulation.ts';
import { Table, TableStatus, Alert, DiningSession, QueueEntry } from '../src/types.ts';

export const apiRouter = Router();

// ----------------------------------------------------
// 1. Authentication & Session
// ----------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const users = db.getData().users;

  // Development demo accounts check
  // manager@tablewatch.io -> Alice Vance (MANAGER)
  // staff@tablewatch.io -> Marcus Vance (STAFF)
  const user = users.find((u) => u.email.toLowerCase() === email?.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Accept demo passwords "password123" or any 6+ char string in demo
  if (password !== 'password123' && password !== 'admin123' && password?.length < 6) {
    return res.status(401).json({ error: 'Incorrect credentials' });
  }

  // Set simple session token
  const token = `token-${user.id}-${Date.now()}`;
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
    },
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const users = db.getData().users;
  if (authHeader?.includes('user-manager-1')) {
    return res.json({ user: users[0] });
  }
  return res.json({ user: users[1] }); // Default to staff
});

// ----------------------------------------------------
// 2. Overview Metrics & Activity Feed
// ----------------------------------------------------
apiRouter.get('/overview', (req: Request, res: Response) => {
  const data = db.getData();
  const tables = data.tables;
  const activeAlerts = data.alerts.filter((a) => a.status === 'ACTIVE');

  // Authoritative calculations
  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedTables = tables.filter(
    (t) => t.status === 'OCCUPIED' || t.status === 'WAITING_FOR_WAITER'
  ).length;
  const waitingForWaiterTables = tables.filter((t) => t.status === 'WAITING_FOR_WAITER').length;
  const waitingForCleaningTables = tables.filter((t) => t.status === 'WAITING_FOR_CLEANING').length;
  const cleaningTables = tables.filter((t) => t.status === 'CLEANING').length;
  const reservedTables = tables.filter((t) => t.status === 'RESERVED').length;

  // Calculate actual seated-to-first-service average from recent sessions
  const completedSessions = data.sessions.filter(
    (s) => s.firstServiceAt && s.seatedAt
  );
  let totalServiceWaitMins = 0;
  for (const session of completedSessions.slice(-30)) {
    const seated = new Date(session.seatedAt).getTime();
    const service = new Date(session.firstServiceAt!).getTime();
    totalServiceWaitMins += Math.max(1, (service - seated) / 60000);
  }
  const avgSeatedToServiceMinutes = completedSessions.length > 0
    ? Number((totalServiceWaitMins / Math.min(30, completedSessions.length)).toFixed(1))
    : 3.5;

  const queueSize = data.queue.filter((q) => q.status === 'WAITING').length;
  const criticalAlertsCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const occupancyRatePercentage = Math.round((occupiedTables / Math.max(1, totalTables)) * 100);

  return res.json({
    metrics: {
      totalTables,
      availableTables,
      occupiedTables,
      waitingForWaiterTables,
      waitingForCleaningTables,
      cleaningTables,
      reservedTables,
      avgSeatedToServiceMinutes,
      queueSize,
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount,
      occupancyRatePercentage,
    },
    activeAlerts: activeAlerts.slice(0, 5),
    recentEvents: data.events.slice(0, 15),
  });
});

// ----------------------------------------------------
// 3. Tables & State Transitions
// ----------------------------------------------------
apiRouter.get('/tables', (req: Request, res: Response) => {
  const data = db.getData();
  return res.json({
    zones: data.zones,
    tables: data.tables,
  });
});

apiRouter.post('/tables/:id/transition', (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetStatus, partySize, customerName, assignedWaiterId, notes, actorName } = req.body;
  const data = db.getData();
  const table = data.tables.find((t) => t.id === id || t.tableNumber === Number(id));

  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const prevStatus = table.status;
  const now = new Date();
  const actor = actorName || 'Staff Member';

  switch (targetStatus as TableStatus) {
    case 'OCCUPIED': {
      table.status = 'OCCUPIED';
      table.partySize = partySize || table.partySize || 2;
      table.customerName = customerName || table.customerName || `Party of ${table.partySize}`;
      table.seatedAt = now.toISOString();
      table.serviceStartedAt = null;

      if (assignedWaiterId) {
        const staffMember = data.staff.find((s) => s.id === assignedWaiterId);
        table.assignedWaiterId = assignedWaiterId;
        table.assignedWaiterName = staffMember ? staffMember.name : null;
      }

      db.logEvent(
        table.id,
        table.tableNumber,
        'SEATED',
        `Seated ${table.customerName} (${table.partySize} guests)`,
        actor
      );
      break;
    }

    case 'WAITING_FOR_WAITER': {
      table.status = 'WAITING_FOR_WAITER';
      break;
    }

    case 'WAITING_FOR_CLEANING': {
      table.status = 'WAITING_FOR_CLEANING';
      // Record completed dining session
      const newSession: DiningSession = {
        id: `sess-${Date.now()}`,
        tableId: table.id,
        tableNumber: table.tableNumber,
        partySize: table.partySize || 2,
        customerName: table.customerName || undefined,
        seatedAt: table.seatedAt || now.toISOString(),
        firstServiceAt: table.serviceStartedAt,
        diningCompletedAt: now.toISOString(),
        assignedWaiterId: table.assignedWaiterId,
        assignedWaiterName: table.assignedWaiterName,
        status: 'COMPLETED',
      };
      data.sessions.push(newSession);

      // Resolve any waiter delay alerts for this table
      data.alerts
        .filter((a) => a.tableId === table.id && a.type === 'WAITER_DELAY' && a.status === 'ACTIVE')
        .forEach((a) => {
          a.status = 'RESOLVED';
          a.resolvedAt = now.toISOString();
          broadcast('alert_updated', a);
        });

      db.logEvent(
        table.id,
        table.tableNumber,
        'DINING_COMPLETED',
        `Dining completed; table marked awaiting cleaning`,
        actor
      );
      break;
    }

    case 'CLEANING': {
      table.status = 'CLEANING';
      table.cleaningStartedAt = now.toISOString();
      db.logEvent(
        table.id,
        table.tableNumber,
        'CLEANING_STARTED',
        `Staff began sanitizing and resetting Table ${table.tableNumber}`,
        actor
      );
      break;
    }

    case 'AVAILABLE': {
      table.status = 'AVAILABLE';
      table.partySize = null;
      table.customerName = null;
      table.seatedAt = null;
      table.serviceStartedAt = null;
      table.cleaningStartedAt = null;
      table.assignedWaiterId = null;
      table.assignedWaiterName = null;
      table.reservedFor = null;
      table.reservedTime = null;

      // Resolve any active alerts for this table
      data.alerts
        .filter((a) => a.tableId === table.id && a.status === 'ACTIVE')
        .forEach((a) => {
          a.status = 'RESOLVED';
          a.resolvedAt = now.toISOString();
          broadcast('alert_updated', a);
        });

      db.logEvent(
        table.id,
        table.tableNumber,
        'CLEANED',
        `Table is cleaned, sanitized and available for new seating`,
        actor
      );
      break;
    }

    case 'RESERVED': {
      table.status = 'RESERVED';
      table.reservedFor = customerName || 'VIP Reservation';
      table.reservedTime = notes || new Date(now.getTime() + 60 * 60000).toISOString();
      db.logEvent(
        table.id,
        table.tableNumber,
        'RESERVED',
        `Reserved for ${table.reservedFor}`,
        actor
      );
      break;
    }

    default:
      return res.status(400).json({ error: `Invalid target status ${targetStatus}` });
  }

  db.save();
  broadcast('table_updated', table);
  return res.json({ success: true, table, previousStatus: prevStatus });
});

apiRouter.post('/tables/:id/start-service', (req: Request, res: Response) => {
  const { id } = req.params;
  const { actorName } = req.body;
  const data = db.getData();
  const table = data.tables.find((t) => t.id === id || t.tableNumber === Number(id));

  if (!table) return res.status(404).json({ error: 'Table not found' });

  table.serviceStartedAt = new Date().toISOString();
  if (table.status === 'WAITING_FOR_WAITER') {
    table.status = 'OCCUPIED';
  }

  // Resolve waiter delay alerts
  data.alerts
    .filter((a) => a.tableId === table.id && a.type === 'WAITER_DELAY' && a.status === 'ACTIVE')
    .forEach((a) => {
      a.status = 'RESOLVED';
      a.resolvedAt = new Date().toISOString();
      broadcast('alert_updated', a);
    });

  db.logEvent(
    table.id,
    table.tableNumber,
    'SERVICE_STARTED',
    `First service recorded by ${actorName || table.assignedWaiterName || 'staff'}`,
    actorName || 'Staff'
  );

  db.save();
  broadcast('table_updated', table);
  return res.json({ success: true, table });
});

apiRouter.post('/tables/:id/assign-waiter', (req: Request, res: Response) => {
  const { id } = req.params;
  const { waiterId, actorName } = req.body;
  const data = db.getData();
  const table = data.tables.find((t) => t.id === id || t.tableNumber === Number(id));

  if (!table) return res.status(404).json({ error: 'Table not found' });

  const staffMember = data.staff.find((s) => s.id === waiterId);
  if (!staffMember) return res.status(404).json({ error: 'Waiter not found' });

  table.assignedWaiterId = staffMember.id;
  table.assignedWaiterName = staffMember.name;
  if (table.status === 'WAITING_FOR_WAITER') {
    table.status = 'OCCUPIED';
  }

  // Resolve waiter delay alerts
  data.alerts
    .filter((a) => a.tableId === table.id && a.type === 'WAITER_DELAY' && a.status === 'ACTIVE')
    .forEach((a) => {
      a.status = 'RESOLVED';
      a.resolvedAt = new Date().toISOString();
      broadcast('alert_updated', a);
    });

  db.logEvent(
    table.id,
    table.tableNumber,
    'WAITER_ASSIGNED',
    `${staffMember.name} assigned to Table ${table.tableNumber}`,
    actorName || 'Manager'
  );

  db.save();
  broadcast('table_updated', table);
  return res.json({ success: true, table });
});

// ----------------------------------------------------
// 4. Alerts
// ----------------------------------------------------
apiRouter.get('/alerts', (req: Request, res: Response) => {
  const data = db.getData();
  return res.json({ alerts: data.alerts });
});

apiRouter.post('/alerts/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const { actorName } = req.body;
  const data = db.getData();
  const alert = data.alerts.find((a) => a.id === id);

  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  alert.status = 'ACKNOWLEDGED';
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = actorName || 'Staff Member';

  db.save();
  broadcast('alert_updated', alert);
  return res.json({ success: true, alert });
});

apiRouter.post('/alerts/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const alert = data.alerts.find((a) => a.id === id);

  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date().toISOString();

  db.save();
  broadcast('alert_updated', alert);
  return res.json({ success: true, alert });
});

// ----------------------------------------------------
// 5. Queue Management
// ----------------------------------------------------
apiRouter.get('/queue', (req: Request, res: Response) => {
  const data = db.getData();
  return res.json({ queue: data.queue });
});

apiRouter.post('/queue', (req: Request, res: Response) => {
  const { customerName, partySize, phone, seatingPreference, notes } = req.body;
  const data = db.getData();

  const nextNumber = 100 + data.queue.length + 1;
  const waitEstimate = Math.max(5, Math.floor(Number(partySize) * 3 + Math.random() * 8));

  // Find recommended table
  const matchingTable = data.tables.find(
    (t) =>
      t.status === 'AVAILABLE' &&
      t.capacity >= Number(partySize) &&
      (seatingPreference === 'ANY' ||
        (seatingPreference === 'INDOOR' && t.zoneId === 'zone-indoor') ||
        (seatingPreference === 'WINDOW' && t.zoneId === 'zone-window') ||
        (seatingPreference === 'PATIO' && t.zoneId === 'zone-patio'))
  );

  const entry: QueueEntry = {
    id: `q-${Date.now()}`,
    queueNumber: nextNumber,
    customerName: customerName || 'Walk-in Guest',
    partySize: Number(partySize) || 2,
    phone: phone || '',
    seatingPreference: seatingPreference || 'ANY',
    joinTime: new Date().toISOString(),
    estimatedWaitMinutes: waitEstimate,
    confidence: matchingTable ? 'HIGH' : 'MEDIUM',
    status: 'WAITING',
    recommendedTableId: matchingTable ? matchingTable.id : undefined,
    recommendedTableNumber: matchingTable ? matchingTable.tableNumber : undefined,
    notes,
  };

  data.queue.push(entry);
  db.save();
  broadcast('queue_updated', data.queue);
  return res.status(201).json({ success: true, entry });
});

apiRouter.post('/queue/:id/seat', (req: Request, res: Response) => {
  const { id } = req.params;
  const { tableId, actorName } = req.body;
  const data = db.getData();
  const entry = data.queue.find((q) => q.id === id);

  if (!entry) return res.status(404).json({ error: 'Queue entry not found' });

  const targetTable = tableId
    ? data.tables.find((t) => t.id === tableId || t.tableNumber === Number(tableId))
    : data.tables.find((t) => t.status === 'AVAILABLE' && t.capacity >= entry.partySize);

  if (!targetTable) {
    return res.status(400).json({ error: 'No suitable available table found' });
  }

  // Seat customer at table
  targetTable.status = 'OCCUPIED';
  targetTable.partySize = entry.partySize;
  targetTable.customerName = entry.customerName;
  targetTable.seatedAt = new Date().toISOString();

  entry.status = 'SEATED';
  entry.recommendedTableId = targetTable.id;
  entry.recommendedTableNumber = targetTable.tableNumber;

  db.logEvent(
    targetTable.id,
    targetTable.tableNumber,
    'SEATED',
    `Seated queue guest #${entry.queueNumber} ${entry.customerName} (party of ${entry.partySize})`,
    actorName || 'Host Stand'
  );

  db.save();
  broadcast('table_updated', targetTable);
  broadcast('queue_updated', data.queue);
  return res.json({ success: true, table: targetTable, entry });
});

apiRouter.post('/queue/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = db.getData();
  const entry = data.queue.find((q) => q.id === id);

  if (!entry) return res.status(404).json({ error: 'Queue entry not found' });

  entry.status = status;
  db.save();
  broadcast('queue_updated', data.queue);
  return res.json({ success: true, entry });
});

// ----------------------------------------------------
// 6. Analytics & CSV Export
// ----------------------------------------------------
apiRouter.get('/analytics', (req: Request, res: Response) => {
  const data = db.getData();
  const sessions = data.sessions;
  const settings = data.settings;

  // 1. Peak Hours (11:00 to 22:00)
  const hourCounts: { [hour: number]: { count: number; totalDuration: number } } = {};
  for (let h = 11; h <= 22; h++) {
    hourCounts[h] = { count: 0, totalDuration: 0 };
  }

  sessions.forEach((s) => {
    const hour = new Date(s.seatedAt).getHours();
    if (hourCounts[hour]) {
      hourCounts[hour].count++;
      if (s.diningCompletedAt) {
        const dur = (new Date(s.diningCompletedAt).getTime() - new Date(s.seatedAt).getTime()) / 60000;
        hourCounts[hour].totalDuration += dur;
      }
    }
  });

  const peakHoursData = Object.entries(hourCounts).map(([h, val]) => ({
    hour: `${h}:00`,
    seatedGuests: val.count,
    avgDurationMin: val.count > 0 ? Math.round(val.totalDuration / val.count) : 60,
  }));

  // 2. Busiest Days of Week
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayBuckets: { [day: string]: number } = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  sessions.forEach((s) => {
    const day = daysOfWeek[new Date(s.seatedAt).getDay()];
    dayBuckets[day]++;
  });

  const busiestDaysData = Object.entries(dayBuckets).map(([day, count]) => ({
    day,
    completedSessions: count,
  }));

  // 3. Table Turnover Performance
  const tableCounts: { [tNum: number]: number } = {};
  for (let i = 1; i <= 16; i++) {
    tableCounts[i] = 0;
  }
  sessions.forEach((s) => {
    if (tableCounts[s.tableNumber] !== undefined) {
      tableCounts[s.tableNumber]++;
    }
  });

  const tableTurnoverData = Object.entries(tableCounts).map(([num, count]) => ({
    tableNumber: `Table ${num}`,
    sessions7Days: count,
    avgTurnoverPerDay: Number((count / 7).toFixed(1)),
  }));

  // 4. Seated-to-Service Times & Percentiles
  const serviceTimes: number[] = [];
  sessions.forEach((s) => {
    if (s.firstServiceAt && s.seatedAt) {
      const wait = (new Date(s.firstServiceAt).getTime() - new Date(s.seatedAt).getTime()) / 60000;
      if (wait > 0 && wait < 60) {
        serviceTimes.push(wait);
      }
    }
  });
  serviceTimes.sort((a, b) => a - b);

  const medianService = serviceTimes.length > 0 ? serviceTimes[Math.floor(serviceTimes.length * 0.5)] : 3.8;
  const p90Service = serviceTimes.length > 0 ? serviceTimes[Math.floor(serviceTimes.length * 0.9)] : 5.8;
  const avgService = serviceTimes.length > 0
    ? serviceTimes.reduce((acc, curr) => acc + curr, 0) / serviceTimes.length
    : 3.9;

  // 5. Cleaning Performance
  let totalCleanWait = 0;
  let totalCleanDur = 0;
  let cleanCount = 0;

  sessions.forEach((s) => {
    if (s.diningCompletedAt && s.cleaningStartedAt && s.cleaningCompletedAt) {
      const wait = (new Date(s.cleaningStartedAt).getTime() - new Date(s.diningCompletedAt).getTime()) / 60000;
      const dur = (new Date(s.cleaningCompletedAt).getTime() - new Date(s.cleaningStartedAt).getTime()) / 60000;
      if (wait >= 0 && dur >= 0) {
        totalCleanWait += wait;
        totalCleanDur += dur;
        cleanCount++;
      }
    }
  });

  const avgCleanWaitMin = cleanCount > 0 ? Number((totalCleanWait / cleanCount).toFixed(1)) : 4.2;
  const avgCleanDurMin = cleanCount > 0 ? Number((totalCleanDur / cleanCount).toFixed(1)) : 7.1;

  // 6. Dynamic Waiter Staffing Schedule Recommendation
  const targetPerWaiter = settings.targetTablesPerWaiter || 4;
  const slots = [
    { timeSlot: '11:00 – 13:00', forecastDemand: 'Moderate', expectedOccupied: 8 },
    { timeSlot: '13:00 – 15:00', forecastDemand: 'High (Lunch Rush)', expectedOccupied: 14 },
    { timeSlot: '15:00 – 17:00', forecastDemand: 'Low (Afternoon Lull)', expectedOccupied: 5 },
    { timeSlot: '17:00 – 19:30', forecastDemand: 'High (Early Dinner)', expectedOccupied: 13 },
    { timeSlot: '19:30 – 21:30', forecastDemand: 'Peak (Prime Dinner)', expectedOccupied: 16 },
    { timeSlot: '21:30 – 23:00', forecastDemand: 'Moderate (Late Night)', expectedOccupied: 6 },
  ];

  const staffingSchedule = slots.map((slot) => {
    const suggested = Math.max(2, Math.ceil(slot.expectedOccupied / targetPerWaiter));
    return {
      ...slot,
      suggestedWaiters: suggested,
      targetTablesPerWaiter: targetPerWaiter,
    };
  });

  return res.json({
    peakHoursData,
    busiestDaysData,
    tableTurnoverData,
    seatedToServiceStats: {
      average: Number(avgService.toFixed(1)),
      median: Number(medianService.toFixed(1)),
      p90: Number(p90Service.toFixed(1)),
      totalRecorded: serviceTimes.length,
    },
    cleaningPerformance: {
      avgCleaningWaitMinutes: avgCleanWaitMin,
      avgCleaningDurationMinutes: avgCleanDurMin,
      totalCleanedSessions: cleanCount,
    },
    staffingSchedule,
    historicalTotalSessions: sessions.length,
  });
});

apiRouter.get('/analytics/export', (req: Request, res: Response) => {
  const sessions = db.getData().sessions;
  const rows = [
    'SessionID,TableNumber,PartySize,SeatedAt,FirstServiceAt,DiningCompletedAt,CleaningCompletedAt,WaiterName,Status',
  ];

  sessions.forEach((s) => {
    rows.push(
      `"${s.id}",${s.tableNumber},${s.partySize},"${s.seatedAt}","${s.firstServiceAt || ''}","${s.diningCompletedAt || ''}","${s.cleaningCompletedAt || ''}","${s.assignedWaiterName || ''}","${s.status}"`
    );
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tablewatch-dining-sessions.csv"');
  return res.send(rows.join('\n'));
});

// ----------------------------------------------------
// 7. Cameras
// ----------------------------------------------------
apiRouter.get('/cameras', (req: Request, res: Response) => {
  const data = db.getData();
  return res.json({ cameras: data.cameras });
});

apiRouter.post('/cameras/:id/mapping', (req: Request, res: Response) => {
  const { id } = req.params;
  const { mappedTableNumbers } = req.body;
  const data = db.getData();
  const camera = data.cameras.find((c) => c.id === id);

  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  camera.mappedTableNumbers = mappedTableNumbers || [];
  db.save();
  broadcast('camera_updated', camera);
  return res.json({ success: true, camera });
});

apiRouter.post('/cameras/:id/test', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const camera = data.cameras.find((c) => c.id === id);

  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  camera.status = 'CONNECTED';
  camera.lastPingAt = new Date().toISOString();
  db.save();
  broadcast('camera_updated', camera);
  return res.json({ success: true, camera, latencyMs: 24 });
});

// ----------------------------------------------------
// 8. Staff Management
// ----------------------------------------------------
apiRouter.get('/staff', (req: Request, res: Response) => {
  const data = db.getData();
  // Compute active assigned tables for each staff member
  const staffWithTables = data.staff.map((s) => {
    const assignedTables = data.tables
      .filter((t) => t.assignedWaiterId === s.id && (t.status === 'OCCUPIED' || t.status === 'WAITING_FOR_WAITER'))
      .map((t) => t.tableNumber);
    return {
      ...s,
      assignedTableNumbers: assignedTables,
    };
  });
  return res.json({ staff: staffWithTables });
});

apiRouter.post('/staff/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = db.getData();
  const staffMember = data.staff.find((s) => s.id === id);

  if (!staffMember) return res.status(404).json({ error: 'Staff member not found' });

  staffMember.status = status;
  db.save();
  return res.json({ success: true, staff: staffMember });
});

// ----------------------------------------------------
// 9. Restaurant Settings
// ----------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  const data = db.getData();
  return res.json({ settings: data.settings });
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const data = db.getData();
  data.settings = {
    ...data.settings,
    ...req.body,
  };
  db.save();
  broadcast('settings_updated', data.settings);
  return res.json({ success: true, settings: data.settings });
});

// ----------------------------------------------------
// 10. Simulation Controls
// ----------------------------------------------------
apiRouter.post('/simulation/trigger-waiter-delay', (req: Request, res: Response) => {
  const { tableNumber } = req.body;
  try {
    const table = triggerManualWaiterDelay(tableNumber ? Number(tableNumber) : undefined);
    return res.json({ success: true, table });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/simulation/trigger-cleaning-delay', (req: Request, res: Response) => {
  const { tableNumber } = req.body;
  try {
    const table = triggerManualCleaningAlert(tableNumber ? Number(tableNumber) : undefined);
    return res.json({ success: true, table });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/simulation/simulate-party', (req: Request, res: Response) => {
  const entry = simulateQueueArrival();
  return res.json({ success: true, entry });
});

apiRouter.post('/simulation/toggle-camera', (req: Request, res: Response) => {
  const { cameraId } = req.body;
  toggleCameraConnection(cameraId || 'cam-01');
  return res.json({ success: true });
});

apiRouter.post('/simulation/reset', (req: Request, res: Response) => {
  const freshData = db.resetSeed();
  broadcast('init', {
    restaurant: freshData.restaurant,
    zones: freshData.zones,
    tables: freshData.tables,
    alerts: freshData.alerts,
    queue: freshData.queue,
    cameras: freshData.cameras,
    staff: freshData.staff,
    settings: freshData.settings,
    recentEvents: freshData.events.slice(0, 20),
  });
  return res.json({ success: true, message: 'Sample restaurant data successfully reset to seed.' });
});
