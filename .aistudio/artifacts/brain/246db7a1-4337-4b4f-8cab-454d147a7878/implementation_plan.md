# TableWatch — Restaurant Operations Dashboard

TableWatch is an enterprise-grade restaurant table monitoring and operational intelligence platform designed for managers and floor staff to track table occupancies, automate waiter response and cleaning alerts, optimize waitlist queuing, and supervise dining room camera feeds in real time.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions were confirmed through Phase 1 requirements alignment:

- **Data Persistence & Backend Architecture**: Full-stack Express backend with local file-backed SQLite database (powered by `better-sqlite3` / relational tables matching PostgreSQL schema specifications) with persistent data migrations and a robust server-side simulation engine so all connected clients observe shared authoritative state.
- **Floor Plan Presentation**: An interactive visual dining room floor plan organized across four distinct zones (*Indoor Dining*, *Window Seating*, *Patio*, *Private Dining*) with high-contrast status indicators, live elapsed seating counters, and contextual quick-action drawers.
- **Camera Monitoring**: A multi-camera CCTV monitoring grid equipped with synthetic animated canvas/video feeds, bounding box table overlays, connection diagnostic badges, and table-to-camera zone mapping.
- **Role-Based Access Control**: Pre-seeded authenticated roles for `Staff` (floor operations, waiter assignment, cleaning, seating) and `Manager` (full staff permissions plus analytics, camera configuration, threshold controls, staff roster management, and simulation controls).

---

### 1. Overview & Core Concept

- **What It Does**: TableWatch provides a real-time command center for dining rooms. It continuously tracks the state of every table (`AVAILABLE`, `OCCUPIED`, `WAITING_FOR_WAITER`, `WAITING_FOR_CLEANING`, `CLEANING`, `RESERVED`), sounds automated visual and audio alerts when waiter response times exceed thresholds (default 5 minutes) or when tables sit dirty, manages party waitlists with dynamic turnover forecasting, and displays simulated AI camera detection feeds.
- **Target Audience / Persona**:
  - *Floor Staff & Hosts*: Need immediate, glanceable table awareness from a host stand or mobile tablet, 1-click status transitions, and prioritized alert resolution.
  - *Restaurant Managers & Shift Leads*: Need comprehensive turnover analytics, peak hour heatmaps, waiter demand forecasting, camera zone mappings, and configurable service thresholds.
- **Key Value**: Drastically cuts seated-to-first-service wait times, accelerates table turnaround, minimizes lost walk-ins via accurate queue wait estimates, and prevents unserviced tables during rush periods.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Seating & Table Onboarding**: A host receives a party from the Queue Management tab. The system recommends the best matching table based on party size and dining zone preference. Seating the group automatically transitions the table to `OCCUPIED`, initiates the authoritative server occupancy timestamp, and arms the 5-minute unassigned waiter alert countdown.
2. **Waiter Assignment & Service Start**: Floor staff taps the occupied table. The Table Action Drawer opens. Staff assigns an available waiter (e.g., Marcus V., Elena R.) or clicks "Start Service". If service is not started within 5 minutes, a high-severity `WAITING_FOR_WAITER` alert is triggered across the top alert banner and Alerts view.
3. **Dining Completion & Cleaning Workflow**: When guests finish, staff marks "Dining Complete". The table immediately transitions to `WAITING_FOR_CLEANING` (amber) and raises a cleaning alert. Bussing staff can tap "Start Cleaning" (shifting status to `CLEANING` in calm blue) and subsequently "Mark Cleaned" to instantly return the table to `AVAILABLE` (emerald green) and resolve active alerts.
4. **Queue Management & Wait-Time Forecasting**: Walk-in parties are entered with party size and seating preference. The algorithmic engine analyzes current table durations, average dining session lengths, and pending turnover to estimate wait time with explicit confidence levels (*High*, *Medium*, *Low*). Staff can seat, mark no-show, or cancel with single clicks.
5. **Manager CCTV & Alert Supervision**: Managers inspect the Camera Setup tab with 3 simulated camera streams (Main Floor Fisheye, Window Seating Cam, Patio Deck Cam), reviewing bounding boxes and re-mapping tables to camera coverage. In Analytics, managers review 7-day turnover, peak hour volume, and automated waiter staffing recommendations.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-contrast, clean modern SaaS operations interface following modern enterprise principles (dark navy sidebar `#0F172A`, light neutral canvas `#F8FAFC`, crisp white cards `#FFFFFF` with hairline `#E2E8F0` borders).
- **Domain Status Color Tokens**:
  - `AVAILABLE`: Emerald Green (`#059669` / `#10B981`)
  - `OCCUPIED`: Coral Crimson (`#E11D48` / `#F43F5E`)
  - `WAITING_FOR_WAITER`: Warning Amber/Crimson Pulse (`#D97706` / `#DC2626`)
  - `WAITING_FOR_CLEANING`: Warm Amber (`#D97706` / `#F59E0B`)
  - `CLEANING`: Informational Blue (`#2563EB` / `#3B82F6`)
  - `RESERVED`: Royal Indigo/Violet (`#7C3AED` / `#8B5CF6`)
- **Typography & Hierarchy**:
  - Headings & Navigation: `Plus Jakarta Sans` / modern geometric sans with balanced title-case prose.
  - Timers, Numeric Counters & Stats: Monospace tabular numerals (`font-mono tabular-nums`) to prevent layout jitter on live second-by-second updates.
- **Zero-Pill & Metadata Discipline**: Unboxed metadata with quiet typographic separators (`·` and `/`), natural editorial labels, and functional segmented button controls for filtering.

---

### 3. Key Product Decisions & Trade-Offs

- **Backend Architecture & Storage Engine**:
  - *Chosen Approach*: Node.js Express server running an embedded SQLite database using `better-sqlite3`, paired with a Prisma schema definition (`prisma/schema.prisma`) for relational modeling (Restaurants, DiningZones, Tables, DiningSessions, TableEvents, WaiterAssignments, Alerts, QueueEntries, Cameras, Staff).
  - *Why*: SQLite is fully zero-config and persistent within container runtimes, eliminating external container network dependencies while faithfully executing ACID transactions, relational foreign keys, and sub-millisecond query performance.
- **Real-Time Communication**:
  - *Chosen Approach*: Real-time WebSocket / SSE bidirectional event protocol integrated into the Express HTTP server on port 3000.
  - *Why*: Broadcasts state deltas (`table:updated`, `alert:triggered`, `alert:resolved`, `queue:updated`, `camera:status`) to all connected client tabs simultaneously without requiring polling or manual refreshes.
- **Simulation Engine**:
  - *Chosen Approach*: Server-side simulation ticker with configurable speed (1x, 2x, 5x, paused), manual trigger actions (simulate waiter delay, simulate cleaning alert, simulate party arrival, toggle camera offline), and full seed reset.
  - *Why*: Ensures multi-device testing displays genuine synchronized server state rather than client-only randomized illusions.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TableWatch Frontend (React + Vite)                    │
│                                                                             │
│  ┌──────────────┐  ┌─────────────────────────────────────────────────────┐  │
│  │ Dark Navy    │  │ Main Content Viewport                               │  │
│  │ Sidebar Nav  │  │  ├─ Overview (KPI Summary Cards + Live Event Feed)  │  │
│  │ ──────────── │  │  ├─ Live Floor Plan (Zoned Grid + Interactive Cards)│  │
│  │ 1. Overview  │  │  ├─ Alerts (Active Alarms + Audio Toggle + Acknow.) │  │
│  │ 2. Floor Plan│  │  ├─ Queue Management (Waitlist + Algorithmic ETA)   │  │
│  │ 3. Alerts    │  │  ├─ Analytics (Recharts Turnover + Staffing Matrix) │  │
│  │ 4. Queue     │  │  ├─ Camera Setup (Multi-Stream Grid + Overlays)     │  │
│  │ 5. Analytics │  │  ├─ Staff Management (Roster + Active Shift Tables) │  │
│  │ 6. Cameras   │  │  └─ Settings (Thresholds, Demo Mode & Data Reset)   │  │
│  │ 7. Staff     │  └─────────────────────────────────────────────────────┘  │
│  │ 8. Settings  │  ┌─────────────────────────────────────────────────────┐  │
│  └──────────────┘  │ Table Action Drawer / Modal (State Transitions)     │  │
│                    └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ WebSocket & REST API (/api/*)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TableWatch Backend (Express + Node.js)                   │
│                                                                             │
│  ┌───────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ Authentication & RBAC     │  │ Real-Time WebSocket Broadcaster        │  │
│  │ (Staff vs. Manager roles) │  │ (table:update, alert:new, queue:sync)  │  │
│  └─────────────┬─────────────┘  └───────────────────┬────────────────────┘  │
│                │                                    │                       │
│  ┌─────────────▼─────────────┐  ┌───────────────────▼────────────────────┐  │
│  │ Business Logic & Services │  │ Background Simulation Engine           │  │
│  │ ├─ Table State Engine     │  │ ├─ Auto Customer Seating & Turnover    │  │
│  │ ├─ Smart Alert Engine     │  │ ├─ Waiter Delay Alert Generator        │  │
│  │ ├─ Queue Wait-Time Model  │  │ ├─ Dirty Table Cleaning Simulator      │  │
│  │ └─ Turnover & Staff Recs  │  │ └─ Camera Connection Simulator         │  │
│  └─────────────┬─────────────┘  └───────────────────┬────────────────────┘  │
│                │                                    │                       │
│  ┌─────────────▼────────────────────────────────────▼────────────────────┐  │
│  │ SQLite Database Layer (better-sqlite3) & Prisma Relational Schema     │  │
│  │ Tables, DiningSessions, TableEvents, Alerts, Queue, Cameras, Staff    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Key Data Entities
1. **User**: `id`, `name`, `email`, `passwordHash`, `role` (`MANAGER` | `STAFF`), `avatarUrl`.
2. **DiningZone**: `id`, `name` (*Indoor Dining*, *Window Seating*, *Patio*, *Private Dining*), `displayOrder`.
3. **Table**: `id`, `tableNumber`, `capacity`, `zoneId`, `status` (`AVAILABLE`, `OCCUPIED`, `WAITING_FOR_WAITER`, `WAITING_FOR_CLEANING`, `CLEANING`, `RESERVED`), `currentSessionId`, `assignedWaiterId`, `seatedAt`, `posX`, `posY`.
4. **DiningSession**: `id`, `tableId`, `partySize`, `seatedAt`, `firstServiceAt`, `diningCompletedAt`, `cleaningStartedAt`, `cleaningCompletedAt`, `assignedWaiterId`, `status` (`ACTIVE` | `COMPLETED`).
5. **TableEvent**: `id`, `tableId`, `eventType` (`SEATED`, `WAITER_ASSIGNED`, `SERVICE_STARTED`, `BILL_REQUESTED`, `DINING_COMPLETED`, `CLEANING_STARTED`, `CLEANED`, `RESERVED`), `timestamp`, `details`, `actorUserId`.
6. **Alert**: `id`, `tableId`, `type` (`WAITER_DELAY`, `CLEANING_DELAY`, `LONG_OCCUPANCY`, `CAMERA_DISCONNECTED`), `severity` (`CRITICAL`, `WARNING`, `INFO`), `message`, `createdAt`, `acknowledgedAt`, `resolvedAt`, `status` (`ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`).
7. **QueueEntry**: `id`, `customerName`, `partySize`, `phone`, `seatingPreference`, `joinTime`, `estimatedWaitMinutes`, `status` (`WAITING`, `SEATED`, `CANCELLED`, `NO_SHOW`), `assignedTableId`.
8. **Camera**: `id`, `name`, `location`, `rtspUrlStub`, `zoneId`, `status` (`CONNECTED`, `RECONNECTING`, `DISCONNECTED`), `lastPingAt`, `resolution`.
9. **StaffMember**: `id`, `name`, `role`, `status` (`ON_DUTY`, `ON_BREAK`, `OFF_DUTY`), `activeTableCount`, `maxTables`.
10. **RestaurantSettings**: `id`, `restaurantName`, `waiterAlertThresholdMinutes` (default 5), `cleaningAlertThresholdMinutes` (default 10), `targetTablesPerWaiter` (default 4), `simulationEnabled`, `simulationSpeed`.

---

### 5. Implementation Sequence & Execution Plan

1. **Backend Foundation & Database Engine**:
   - Install required runtime packages: `better-sqlite3`, `@types/better-sqlite3`, `ws`, `@types/ws`, `recharts`, `canvas-confetti`.
   - Setup SQLite database migrations and initial seed data: 16 realistic tables across 4 zones, 7 days of historical dining sessions for rich analytics, 5 on-duty staff members, initial queue parties, and active simulated alerts.
   - Implement Express REST endpoints (`/api/auth`, `/api/tables`, `/api/alerts`, `/api/queue`, `/api/analytics`, `/api/cameras`, `/api/staff`, `/api/settings`, `/api/simulation`) with validation and RBAC.
   - Implement WebSocket server broadcasting table transitions, alerts, and queue updates.
2. **Simulation & Alert Engine**:
   - Build authoritative timer loop on the server that checks for tables waiting > 5 min without a waiter or dirty tables > 10 min.
   - Implement automatic background simulator (customer arrivals, dining progression, bill settlement, camera reconnects).
3. **Frontend Application Shell & Layout**:
   - Navigation sidebar with active indicators, connection status pill, user role switch / profile, and global alert banner.
   - Audio chime synthesizer for new alerts (with user mute/unmute toggle).
4. **Live Floor Plan & Interactive Table Drawer**:
   - Zoned visual floor plan with color-coded table cards, live elapsed timers, capacity badges, waiter tags.
   - Comprehensive action modal supporting 1-click state transitions: Seat Party, Assign Waiter, Start Service, Complete Dining, Start Cleaning, Mark Cleaned, Reserve Table.
5. **Overview & Queue Management**:
   - KPI metrics cards: Available, Occupied, Waiting for Waiter, Dirty, Avg First-Service Time, Queue Count.
   - Live real-time event ticker.
   - Queue wait-time estimation engine with party-to-table matching, manual seating actions, and walk-in entry modal.
6. **Analytics & Camera Setup (Manager Features)**:
   - Recharts visual charts: Peak hours bar chart, turnover rate by table, seated-to-service time percentiles, cleaning delays, and automated waiter staffing schedule table.
   - Multi-camera CCTV grid with canvas-rendered simulated motion, table bounding boxes, connection toggles, and table mapping selector.
7. **Verification & Testing**:
   - Compile TypeScript, verify build without errors, test real-time WebSocket sync across mock clients, and verify simulation controls.
