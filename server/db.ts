import fs from 'node:fs';
import path from 'node:path';
import {
  Table,
  DiningZone,
  DiningSession,
  TableEvent,
  Alert,
  QueueEntry,
  Camera,
  StaffMember,
  RestaurantSettings,
  User,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tablewatch.json');

export interface DatabaseSchema {
  restaurant: {
    id: string;
    name: string;
    openingHours: string;
    address: string;
  };
  users: User[];
  zones: DiningZone[];
  tables: Table[];
  sessions: DiningSession[];
  events: TableEvent[];
  alerts: Alert[];
  queue: QueueEntry[];
  cameras: Camera[];
  staff: StaffMember[];
  settings: RestaurantSettings;
  lastUpdated: string;
}

// Generate realistic 7-day historical sessions for analytics
function generateHistoricalSessions(zones: DiningZone[], staff: StaffMember[]): DiningSession[] {
  const sessions: DiningSession[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const waiters = staff.filter((s) => s.role === 'WAITER');

  // Days 1 through 7 in the past
  for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
    const dayBase = now - dayOffset * dayMs;
    // Lunch rush (11:30 - 14:30)
    for (let i = 0; i < 12; i++) {
      const tableNum = (i % 16) + 1;
      const startHour = 11.5 + Math.random() * 2.5;
      const seatedTime = new Date(dayBase);
      seatedTime.setHours(Math.floor(startHour), Math.floor((startHour % 1) * 60), 0);

      const firstServiceMin = 2 + Math.floor(Math.random() * 6); // 2-7 min
      const diningDurationMin = 45 + Math.floor(Math.random() * 40); // 45-85 min
      const cleaningWaitMin = 2 + Math.floor(Math.random() * 8);
      const cleaningDurationMin = 5 + Math.floor(Math.random() * 7);

      const firstServiceAt = new Date(seatedTime.getTime() + firstServiceMin * 60000).toISOString();
      const diningCompletedAt = new Date(seatedTime.getTime() + diningDurationMin * 60000).toISOString();
      const cleaningStartedAt = new Date(new Date(diningCompletedAt).getTime() + cleaningWaitMin * 60000).toISOString();
      const cleaningCompletedAt = new Date(new Date(cleaningStartedAt).getTime() + cleaningDurationMin * 60000).toISOString();
      const waiter = waiters[i % waiters.length];

      sessions.push({
        id: `hist-l-${dayOffset}-${i}`,
        tableId: `table-${tableNum}`,
        tableNumber: tableNum,
        partySize: Math.floor(Math.random() * 4) + 2,
        customerName: `Guest Party #${Math.floor(Math.random() * 800 + 100)}`,
        seatedAt: seatedTime.toISOString(),
        firstServiceAt,
        diningCompletedAt,
        cleaningStartedAt,
        cleaningCompletedAt,
        assignedWaiterId: waiter.id,
        assignedWaiterName: waiter.name,
        status: 'COMPLETED',
      });
    }

    // Dinner rush (17:30 - 21:30)
    for (let i = 0; i < 18; i++) {
      const tableNum = (i % 16) + 1;
      const startHour = 17.5 + Math.random() * 3.8;
      const seatedTime = new Date(dayBase);
      seatedTime.setHours(Math.floor(startHour), Math.floor((startHour % 1) * 60), 0);

      const firstServiceMin = 3 + Math.floor(Math.random() * 5); // 3-7 min
      const diningDurationMin = 50 + Math.floor(Math.random() * 50); // 50-100 min
      const cleaningWaitMin = 3 + Math.floor(Math.random() * 7);
      const cleaningDurationMin = 6 + Math.floor(Math.random() * 6);

      const firstServiceAt = new Date(seatedTime.getTime() + firstServiceMin * 60000).toISOString();
      const diningCompletedAt = new Date(seatedTime.getTime() + diningDurationMin * 60000).toISOString();
      const cleaningStartedAt = new Date(new Date(diningCompletedAt).getTime() + cleaningWaitMin * 60000).toISOString();
      const cleaningCompletedAt = new Date(new Date(cleaningStartedAt).getTime() + cleaningDurationMin * 60000).toISOString();
      const waiter = waiters[i % waiters.length];

      sessions.push({
        id: `hist-d-${dayOffset}-${i}`,
        tableId: `table-${tableNum}`,
        tableNumber: tableNum,
        partySize: Math.floor(Math.random() * 5) + 2,
        customerName: `Dinner Guest #${Math.floor(Math.random() * 800 + 100)}`,
        seatedAt: seatedTime.toISOString(),
        firstServiceAt,
        diningCompletedAt,
        cleaningStartedAt,
        cleaningCompletedAt,
        assignedWaiterId: waiter.id,
        assignedWaiterName: waiter.name,
        status: 'COMPLETED',
      });
    }
  }

  return sessions;
}

export function createInitialSeedData(): DatabaseSchema {
  const zones: DiningZone[] = [
    {
      id: 'zone-indoor',
      name: 'Indoor Dining',
      description: 'Main dining hall with acoustical baffles & center chandeliers',
      color: '#3B82F6',
      displayOrder: 1,
    },
    {
      id: 'zone-window',
      name: 'Window Seating',
      description: 'Boulevard panoramic window alcoves with banquettes',
      color: '#10B981',
      displayOrder: 2,
    },
    {
      id: 'zone-patio',
      name: 'Garden Patio',
      description: 'Open-air garden terrace with heated pergolas',
      color: '#F59E0B',
      displayOrder: 3,
    },
    {
      id: 'zone-private',
      name: 'Private Dining',
      description: 'Executive wine vault and sommelier tasting room',
      color: '#8B5CF6',
      displayOrder: 4,
    },
  ];

  const users: User[] = [
    {
      id: 'user-manager-1',
      name: 'Alice Vance',
      email: 'manager@tablewatch.io',
      role: 'MANAGER',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 234-5678',
    },
    {
      id: 'user-staff-1',
      name: 'Marcus Vance',
      email: 'staff@tablewatch.io',
      role: 'STAFF',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 345-6789',
    },
  ];

  const staff: StaffMember[] = [
    {
      id: 'staff-1',
      name: 'Marcus Vance',
      role: 'WAITER',
      email: 'marcus@tablewatch.io',
      status: 'ON_DUTY',
      assignedTableNumbers: [2, 7],
      maxTables: 4,
      shift: '11:00 - 19:30',
    },
    {
      id: 'staff-2',
      name: 'Elena Rostova',
      role: 'WAITER',
      email: 'elena@tablewatch.io',
      status: 'ON_DUTY',
      assignedTableNumbers: [11],
      maxTables: 4,
      shift: '12:00 - 20:30',
    },
    {
      id: 'staff-3',
      name: 'Carlos Diaz',
      role: 'WAITER',
      email: 'carlos@tablewatch.io',
      status: 'ON_DUTY',
      assignedTableNumbers: [],
      maxTables: 4,
      shift: '14:00 - 22:30',
    },
    {
      id: 'staff-4',
      name: 'Samira Khan',
      role: 'BUSSER',
      email: 'samira@tablewatch.io',
      status: 'ON_DUTY',
      assignedTableNumbers: [3],
      maxTables: 6,
      shift: '11:30 - 20:00',
    },
    {
      id: 'staff-5',
      name: 'Julian Thorne',
      role: 'HOST',
      email: 'julian@tablewatch.io',
      status: 'ON_DUTY',
      assignedTableNumbers: [],
      maxTables: 0,
      shift: '11:00 - 19:00',
    },
  ];

  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

  const tables: Table[] = [
    // Indoor Dining (Tables 1-6)
    {
      id: 'table-1',
      tableNumber: 1,
      capacity: 4,
      zoneId: 'zone-indoor',
      zoneName: 'Indoor Dining',
      status: 'AVAILABLE',
    },
    {
      id: 'table-2',
      tableNumber: 2,
      capacity: 2,
      zoneId: 'zone-indoor',
      zoneName: 'Indoor Dining',
      status: 'OCCUPIED',
      partySize: 2,
      customerName: 'Hartman',
      assignedWaiterId: 'staff-1',
      assignedWaiterName: 'Marcus Vance',
      seatedAt: minsAgo(24),
      serviceStartedAt: minsAgo(21),
    },
    {
      id: 'table-3',
      tableNumber: 3,
      capacity: 4,
      zoneId: 'zone-indoor',
      zoneName: 'Indoor Dining',
      status: 'CLEANING',
      cleaningStartedAt: minsAgo(3),
    },
    {
      id: 'table-4',
      tableNumber: 4,
      capacity: 6,
      zoneId: 'zone-indoor',
      zoneName: 'Indoor Dining',
      status: 'WAITING_FOR_WAITER',
      partySize: 5,
      customerName: 'Kowalski Party',
      seatedAt: minsAgo(7), // > 5 mins without waiter!
    },
    {
      id: 'table-5',
      tableNumber: 5,
      capacity: 4,
      zoneId: 'zone-indoor',
      zoneName: 'Indoor Dining',
      status: 'OCCUPIED',
      partySize: 3,
      customerName: 'Chen',
      assignedWaiterId: 'staff-2',
      assignedWaiterName: 'Elena Rostova',
      seatedAt: minsAgo(42),
      serviceStartedAt: minsAgo(38),
    },
    {
      id: 'table-6',
      tableNumber: 6,
      capacity: 2,
      zoneId: 'zone-indoor',
      zoneName: 'Indoor Dining',
      status: 'AVAILABLE',
    },

    // Window Seating (Tables 7-10)
    {
      id: 'table-7',
      tableNumber: 7,
      capacity: 4,
      zoneId: 'zone-window',
      zoneName: 'Window Seating',
      status: 'OCCUPIED',
      partySize: 4,
      customerName: 'O\'Connor Family',
      assignedWaiterId: 'staff-1',
      assignedWaiterName: 'Marcus Vance',
      seatedAt: minsAgo(18),
      serviceStartedAt: minsAgo(14),
    },
    {
      id: 'table-8',
      tableNumber: 8,
      capacity: 2,
      zoneId: 'zone-window',
      zoneName: 'Window Seating',
      status: 'WAITING_FOR_CLEANING',
      cleaningStartedAt: null,
      notes: 'Dining completed 9 mins ago',
    },
    {
      id: 'table-9',
      tableNumber: 9,
      capacity: 4,
      zoneId: 'zone-window',
      zoneName: 'Window Seating',
      status: 'AVAILABLE',
    },
    {
      id: 'table-10',
      tableNumber: 10,
      capacity: 6,
      zoneId: 'zone-window',
      zoneName: 'Window Seating',
      status: 'OCCUPIED',
      partySize: 5,
      customerName: 'Devries Group',
      assignedWaiterId: 'staff-3',
      assignedWaiterName: 'Carlos Diaz',
      seatedAt: minsAgo(55),
      serviceStartedAt: minsAgo(51),
    },

    // Garden Patio (Tables 11-14)
    {
      id: 'table-11',
      tableNumber: 11,
      capacity: 4,
      zoneId: 'zone-patio',
      zoneName: 'Garden Patio',
      status: 'OCCUPIED',
      partySize: 4,
      customerName: 'Morrison',
      assignedWaiterId: 'staff-2',
      assignedWaiterName: 'Elena Rostova',
      seatedAt: minsAgo(31),
      serviceStartedAt: minsAgo(28),
    },
    {
      id: 'table-12',
      tableNumber: 12,
      capacity: 4,
      zoneId: 'zone-patio',
      zoneName: 'Garden Patio',
      status: 'AVAILABLE',
    },
    {
      id: 'table-13',
      tableNumber: 13,
      capacity: 2,
      zoneId: 'zone-patio',
      zoneName: 'Garden Patio',
      status: 'AVAILABLE',
    },
    {
      id: 'table-14',
      tableNumber: 14,
      capacity: 6,
      zoneId: 'zone-patio',
      zoneName: 'Garden Patio',
      status: 'AVAILABLE',
    },

    // Private Dining (Tables 15-16)
    {
      id: 'table-15',
      tableNumber: 15,
      capacity: 8,
      zoneId: 'zone-private',
      zoneName: 'Private Dining',
      status: 'RESERVED',
      reservedFor: 'Dr. Evelyn Reed (Hospital Board)',
      reservedTime: new Date(now.getTime() + 45 * 60000).toISOString(),
    },
    {
      id: 'table-16',
      tableNumber: 16,
      capacity: 10,
      zoneId: 'zone-private',
      zoneName: 'Private Dining',
      status: 'AVAILABLE',
    },
  ];

  const alerts: Alert[] = [
    {
      id: 'alert-waiter-t4',
      tableId: 'table-4',
      tableNumber: 4,
      zoneName: 'Indoor Dining',
      type: 'WAITER_DELAY',
      severity: 'CRITICAL',
      message: 'Table 4 has been waiting 7 minutes without an assigned waiter.',
      createdAt: minsAgo(2),
      status: 'ACTIVE',
      waitingMinutes: 7,
    },
    {
      id: 'alert-clean-t8',
      tableId: 'table-8',
      tableNumber: 8,
      zoneName: 'Window Seating',
      type: 'CLEANING_DELAY',
      severity: 'WARNING',
      message: 'Table 8 finished dining 9 minutes ago and is awaiting cleaning.',
      createdAt: minsAgo(3),
      status: 'ACTIVE',
      waitingMinutes: 9,
    },
  ];

  const queue: QueueEntry[] = [
    {
      id: 'q-101',
      queueNumber: 101,
      customerName: 'Sophie Bennett',
      partySize: 2,
      phone: '+1 (555) 782-9012',
      seatingPreference: 'WINDOW',
      joinTime: minsAgo(14),
      estimatedWaitMinutes: 5,
      confidence: 'HIGH',
      status: 'WAITING',
      recommendedTableId: 'table-9',
      recommendedTableNumber: 9,
      notes: 'Anniversary celebration',
    },
    {
      id: 'q-102',
      queueNumber: 102,
      customerName: 'David Sterling',
      partySize: 4,
      phone: '+1 (555) 641-3890',
      seatingPreference: 'PATIO',
      joinTime: minsAgo(10),
      estimatedWaitMinutes: 8,
      confidence: 'HIGH',
      status: 'WAITING',
      recommendedTableId: 'table-12',
      recommendedTableNumber: 12,
    },
    {
      id: 'q-103',
      queueNumber: 103,
      customerName: 'Amara Okafor',
      partySize: 6,
      phone: '+1 (555) 912-4455',
      seatingPreference: 'INDOOR',
      joinTime: minsAgo(6),
      estimatedWaitMinutes: 18,
      confidence: 'MEDIUM',
      status: 'WAITING',
      recommendedTableId: 'table-4',
      recommendedTableNumber: 4,
      notes: 'Highchair needed',
    },
    {
      id: 'q-104',
      queueNumber: 104,
      customerName: 'Liam Takahashi',
      partySize: 2,
      phone: '+1 (555) 304-8971',
      seatingPreference: 'ANY',
      joinTime: minsAgo(2),
      estimatedWaitMinutes: 12,
      confidence: 'HIGH',
      status: 'WAITING',
      recommendedTableId: 'table-1',
      recommendedTableNumber: 1,
    },
  ];

  const cameras: Camera[] = [
    {
      id: 'cam-01',
      name: 'Main Dining Hall Fisheye',
      location: 'Indoor Dining Ceiling 01',
      zoneId: 'zone-indoor',
      zoneName: 'Indoor Dining',
      rtspUrlStub: 'rtsp://cam-sec.internal.bistro.lan/live/stream1',
      status: 'CONNECTED',
      lastPingAt: new Date().toISOString(),
      resolution: '1920x1080 @ 30fps',
      mappedTableNumbers: [1, 2, 3, 4, 5, 6],
      framerate: 30,
    },
    {
      id: 'cam-02',
      name: 'Boulevard Window View',
      location: 'Window Banquette Wall',
      zoneId: 'zone-window',
      zoneName: 'Window Seating',
      rtspUrlStub: 'rtsp://cam-sec.internal.bistro.lan/live/stream2',
      status: 'CONNECTED',
      lastPingAt: new Date().toISOString(),
      resolution: '1920x1080 @ 30fps',
      mappedTableNumbers: [7, 8, 9, 10],
      framerate: 30,
    },
    {
      id: 'cam-03',
      name: 'Garden Terrace Overhead',
      location: 'Patio Pergola Beam',
      zoneId: 'zone-patio',
      zoneName: 'Garden Patio',
      rtspUrlStub: 'rtsp://cam-sec.internal.bistro.lan/live/stream3',
      status: 'CONNECTED',
      lastPingAt: new Date().toISOString(),
      resolution: '2560x1440 @ 25fps',
      mappedTableNumbers: [11, 12, 13, 14],
      framerate: 25,
    },
  ];

  const events: TableEvent[] = [
    {
      id: 'evt-1',
      tableId: 'table-4',
      tableNumber: 4,
      eventType: 'SEATED',
      timestamp: minsAgo(7),
      details: 'Kowalski Party (5 guests) seated by Julian Thorne',
      actorName: 'Julian Thorne',
    },
    {
      id: 'evt-2',
      tableId: 'table-4',
      tableNumber: 4,
      eventType: 'ALERT_TRIGGERED',
      timestamp: minsAgo(2),
      details: 'Warning: 5 minutes elapsed with no assigned waiter',
      actorName: 'System Engine',
    },
    {
      id: 'evt-3',
      tableId: 'table-8',
      tableNumber: 8,
      eventType: 'DINING_COMPLETED',
      timestamp: minsAgo(9),
      details: 'Guests paid bill and departed; table marked WAITING_FOR_CLEANING',
      actorName: 'Marcus Vance',
    },
    {
      id: 'evt-4',
      tableId: 'table-3',
      tableNumber: 3,
      eventType: 'CLEANING_STARTED',
      timestamp: minsAgo(3),
      details: 'Samira Khan began sanitation & table reset',
      actorName: 'Samira Khan',
    },
    {
      id: 'evt-5',
      tableId: 'table-2',
      tableNumber: 2,
      eventType: 'SERVICE_STARTED',
      timestamp: minsAgo(21),
      details: 'Marcus Vance took drinks and appetizer order',
      actorName: 'Marcus Vance',
    },
  ];

  const historicalSessions = generateHistoricalSessions(zones, staff);

  return {
    restaurant: {
      id: 'rest-01',
      name: 'TableWatch Bistro & Terrace',
      openingHours: '11:00 AM – 11:00 PM',
      address: '742 Evergreen Promenade, Suite 100',
    },
    users,
    zones,
    tables,
    sessions: historicalSessions,
    events,
    alerts,
    queue,
    cameras,
    staff,
    settings: {
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
    },
    lastUpdated: new Date().toISOString(),
  };
}

export class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.warn('Failed reading existing db file, resetting to initial seed', err);
        this.data = createInitialSeedData();
        this.save();
      }
    } else {
      this.data = createInitialSeedData();
      this.save();
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public save(): void {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving tablewatch db file', err);
    }
  }

  public resetSeed(): DatabaseSchema {
    this.data = createInitialSeedData();
    this.save();
    return this.data;
  }

  public logEvent(
    tableId: string,
    tableNumber: number,
    eventType: TableEvent['eventType'],
    details: string,
    actorName: string
  ): TableEvent {
    const event: TableEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tableId,
      tableNumber,
      eventType,
      timestamp: new Date().toISOString(),
      details,
      actorName,
    };
    this.data.events.unshift(event);
    if (this.data.events.length > 100) {
      this.data.events.pop();
    }
    this.save();
    return event;
  }
}

export const db = new DatabaseStore();
