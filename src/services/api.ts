import {
  Table,
  TableStatus,
  Alert,
  QueueEntry,
  Camera,
  StaffMember,
  RestaurantSettings,
  OverviewMetrics,
  DiningZone,
  TableEvent,
  User,
} from '../types.ts';

type WebSocketStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

type EventListener = (data: any) => void;

class ApiClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private wsStatus: WebSocketStatus = 'DISCONNECTED';
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private reconnectTimer: any = null;
  private currentUser: User | null = null;

  constructor() {
    this.initUser();
  }

  private initUser() {
    const saved = localStorage.getItem('tablewatch_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = null;
      }
    } else {
      // Default to manager for demo evaluation
      this.currentUser = {
        id: 'user-manager-1',
        name: 'Alice Vance',
        email: 'manager@tablewatch.io',
        role: 'MANAGER',
      };
      localStorage.setItem('tablewatch_user', JSON.stringify(this.currentUser));
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('tablewatch_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tablewatch_user');
    }
  }

  // --------------------------------------------------
  // WebSocket Management
  // --------------------------------------------------
  public connectWebSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.updateStatus('RECONNECTING');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.updateStatus('CONNECTED');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.emit(payload.type, payload.data);
        } catch (err) {
          console.warn('Error parsing WS message', err);
        }
      };

      this.ws.onclose = () => {
        this.updateStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.updateStatus('DISCONNECTED');
      };
    } catch {
      this.updateStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 3000);
  }

  private updateStatus(status: WebSocketStatus): void {
    this.wsStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  public onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.wsStatus);
    return () => this.statusListeners.delete(callback);
  }

  public on(eventType: string, callback: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => this.listeners.get(eventType)?.delete(callback);
  }

  private emit(eventType: string, data: any): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`Error in WS event listener for ${eventType}:`, err);
        }
      });
    }
  }

  // --------------------------------------------------
  // REST API Methods
  // --------------------------------------------------
  public async fetchOverview(): Promise<{
    metrics: OverviewMetrics;
    activeAlerts: Alert[];
    recentEvents: TableEvent[];
  }> {
    const res = await fetch('/api/overview');
    if (!res.ok) throw new Error('Failed to fetch overview metrics');
    return res.json();
  }

  public async fetchTables(): Promise<{ zones: DiningZone[]; tables: Table[] }> {
    const res = await fetch('/api/tables');
    if (!res.ok) throw new Error('Failed to fetch tables');
    return res.json();
  }

  public async transitionTable(
    tableId: string,
    targetStatus: TableStatus,
    payload: {
      partySize?: number;
      customerName?: string;
      assignedWaiterId?: string;
      notes?: string;
      actorName?: string;
    } = {}
  ): Promise<{ success: boolean; table: Table }> {
    const res = await fetch(`/api/tables/${tableId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetStatus,
        actorName: this.currentUser?.name || 'Staff',
        ...payload,
      }),
    });
    if (!res.ok) throw new Error('Failed to transition table status');
    return res.json();
  }

  public async startService(tableId: string): Promise<{ success: boolean; table: Table }> {
    const res = await fetch(`/api/tables/${tableId}/start-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorName: this.currentUser?.name || 'Staff' }),
    });
    if (!res.ok) throw new Error('Failed to start service');
    return res.json();
  }

  public async assignWaiter(tableId: string, waiterId: string): Promise<{ success: boolean; table: Table }> {
    const res = await fetch(`/api/tables/${tableId}/assign-waiter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waiterId, actorName: this.currentUser?.name || 'Manager' }),
    });
    if (!res.ok) throw new Error('Failed to assign waiter');
    return res.json();
  }

  public async fetchAlerts(): Promise<{ alerts: Alert[] }> {
    const res = await fetch('/api/alerts');
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  }

  public async acknowledgeAlert(alertId: string): Promise<{ success: boolean; alert: Alert }> {
    const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorName: this.currentUser?.name || 'Staff' }),
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  }

  public async resolveAlert(alertId: string): Promise<{ success: boolean; alert: Alert }> {
    const res = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    return res.json();
  }

  public async fetchQueue(): Promise<{ queue: QueueEntry[] }> {
    const res = await fetch('/api/queue');
    if (!res.ok) throw new Error('Failed to fetch queue');
    return res.json();
  }

  public async addQueueEntry(entry: {
    customerName: string;
    partySize: number;
    phone: string;
    seatingPreference: string;
    notes?: string;
  }): Promise<{ success: boolean; entry: QueueEntry }> {
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Failed to add to queue');
    return res.json();
  }

  public async seatQueueEntry(
    queueId: string,
    tableId?: string
  ): Promise<{ success: boolean; table: Table; entry: QueueEntry }> {
    const res = await fetch(`/api/queue/${queueId}/seat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId,
        actorName: this.currentUser?.name || 'Host Stand',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to seat queue party');
    }
    return res.json();
  }

  public async updateQueueStatus(queueId: string, status: string): Promise<any> {
    const res = await fetch(`/api/queue/${queueId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update queue status');
    return res.json();
  }

  public async fetchAnalytics(): Promise<any> {
    const res = await fetch('/api/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  }

  public async fetchCameras(): Promise<{ cameras: Camera[] }> {
    const res = await fetch('/api/cameras');
    if (!res.ok) throw new Error('Failed to fetch cameras');
    return res.json();
  }

  public async updateCameraMapping(cameraId: string, mappedTableNumbers: number[]): Promise<any> {
    const res = await fetch(`/api/cameras/${cameraId}/mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappedTableNumbers }),
    });
    if (!res.ok) throw new Error('Failed to update camera mapping');
    return res.json();
  }

  public async testCameraConnection(cameraId: string): Promise<any> {
    const res = await fetch(`/api/cameras/${cameraId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to test camera connection');
    return res.json();
  }

  public async fetchStaff(): Promise<{ staff: StaffMember[] }> {
    const res = await fetch('/api/staff');
    if (!res.ok) throw new Error('Failed to fetch staff');
    return res.json();
  }

  public async updateStaffStatus(staffId: string, status: string): Promise<any> {
    const res = await fetch(`/api/staff/${staffId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update staff status');
    return res.json();
  }

  public async fetchSettings(): Promise<{ settings: RestaurantSettings }> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  public async updateSettings(settings: Partial<RestaurantSettings>): Promise<any> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }

  public async triggerSimulationAction(action: string, payload: any = {}): Promise<any> {
    let endpoint = '/api/simulation/' + action;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Simulation action ${action} failed`);
    return res.json();
  }

  public async resetDemoData(): Promise<any> {
    const res = await fetch('/api/simulation/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  }
}

export const api = new ApiClient();
