/**
 * TableWatch - Universal Type Definitions
 */

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'WAITING_FOR_WAITER'
  | 'WAITING_FOR_CLEANING'
  | 'CLEANING'
  | 'RESERVED';

export type UserRole = 'STAFF' | 'MANAGER';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type AlertType =
  | 'WAITER_DELAY'
  | 'CLEANING_DELAY'
  | 'LONG_OCCUPANCY'
  | 'CAMERA_DISCONNECTED'
  | 'QUEUE_CONGESTION';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type QueueStatus = 'WAITING' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';

export type CameraStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export type StaffStatus = 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
}

export interface DiningZone {
  id: string;
  name: string;
  description: string;
  color: string;
  displayOrder: number;
}

export interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  zoneId: string;
  zoneName?: string;
  status: TableStatus;
  currentSessionId?: string | null;
  assignedWaiterId?: string | null;
  assignedWaiterName?: string | null;
  seatedAt?: string | null; // ISO string
  serviceStartedAt?: string | null;
  cleaningStartedAt?: string | null;
  reservedFor?: string | null;
  reservedTime?: string | null;
  partySize?: number | null;
  customerName?: string | null;
  notes?: string;
}

export interface DiningSession {
  id: string;
  tableId: number | string;
  tableNumber: number;
  partySize: number;
  customerName?: string;
  seatedAt: string;
  firstServiceAt?: string | null;
  diningCompletedAt?: string | null;
  cleaningStartedAt?: string | null;
  cleaningCompletedAt?: string | null;
  assignedWaiterId?: string | null;
  assignedWaiterName?: string | null;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface TableEvent {
  id: string;
  tableId: string;
  tableNumber: number;
  eventType:
    | 'SEATED'
    | 'WAITER_ASSIGNED'
    | 'SERVICE_STARTED'
    | 'BILL_REQUESTED'
    | 'DINING_COMPLETED'
    | 'CLEANING_STARTED'
    | 'CLEANED'
    | 'RESERVED'
    | 'RESERVATION_CANCELLED'
    | 'ALERT_TRIGGERED';
  timestamp: string;
  details: string;
  actorName: string;
}

export interface Alert {
  id: string;
  tableId?: string;
  tableNumber?: number;
  zoneName?: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  status: AlertStatus;
  acknowledgedBy?: string | null;
  waitingMinutes?: number;
}

export interface QueueEntry {
  id: string;
  queueNumber: number;
  customerName: string;
  partySize: number;
  phone: string;
  seatingPreference: string; // 'ANY' | 'INDOOR' | 'PATIO' | 'WINDOW' | 'PRIVATE'
  joinTime: string;
  estimatedWaitMinutes: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: QueueStatus;
  recommendedTableId?: string | null;
  recommendedTableNumber?: number | null;
  notes?: string;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  zoneId: string;
  zoneName: string;
  rtspUrlStub: string;
  status: CameraStatus;
  lastPingAt: string;
  resolution: string;
  mappedTableNumbers: number[];
  framerate: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'WAITER' | 'HOST' | 'BUSSER' | 'MANAGER';
  email: string;
  status: StaffStatus;
  assignedTableNumbers: number[];
  maxTables: number;
  shift: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  openingHours: string;
  waiterAlertThresholdMinutes: number;
  cleaningAlertThresholdMinutes: number;
  targetTablesPerWaiter: number;
  defaultDiningDurationMinutes: number;
  defaultCleaningDurationMinutes: number;
  maxAcceptableWaitMinutes: number;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  simulationEnabled: boolean;
  simulationSpeed: number; // 1, 2, 5
}

export interface OverviewMetrics {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  waitingForWaiterTables: number;
  waitingForCleaningTables: number;
  cleaningTables: number;
  reservedTables: number;
  avgSeatedToServiceMinutes: number;
  queueSize: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  occupancyRatePercentage: number;
}
