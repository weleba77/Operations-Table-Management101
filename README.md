# TableWatch — Restaurant Operations Dashboard

TableWatch is a full-stack, web-based restaurant table monitoring and operational intelligence platform. Designed for busy restaurant environments, it tracks table occupancies in real time, automates waiter response and cleaning alerts, estimates customer queue wait times, supervises camera feeds, and provides operational analytics.

---

## 1. Demo Credentials (Development Accounts)

The application comes pre-seeded with development accounts:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Manager** | `manager@tablewatch.io` | `password123` | Full access: Floor plan, Alerts, Queue, Analytics, Camera Setup, Staff Roster, Threshold Settings, Simulation |
| **Staff** | `staff@tablewatch.io` | `password123` | Floor operations: Floor plan, Table seating/cleaning, Waiter assignment, Queue waitlist, Alert acknowledgement |

> **Security Note:** These credentials are for development and demonstration purposes only.

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Vite.
- **Styling:** Tailwind CSS with responsive dark navy sidebar and high-contrast status colors.
- **Visual Icons:** Lucide React.
- **Visual Analytics:** Recharts for peak hours, busiest days, table turnover, and percentiles.
- **Backend:** Node.js, Express, and WebSocket server on port 3000.
- **Data Persistence:** Persistent SQLite database (`data/tablewatch.json`) with ACID updates and full relational schema (`prisma/schema.prisma`).
- **Real-Time Communication:** Bidirectional WebSocket sync (`/ws`) with auto-reconnection and event broadcasting across multiple connected browser tabs.
- **Audio Synthesizer:** Web Audio API procedural sound synthesizer for alert warning chimes and status transitions.

---

## 3. Floor Plan & Table States

16 tables organized across 4 dining zones:
- **Indoor Dining** (Tables 1–6)
- **Window Seating** (Tables 7–10)
- **Garden Patio** (Tables 11–14)
- **Private Dining** (Tables 15–16)

### Table Status Lifecycle:
1. `AVAILABLE` (Emerald Green): Table is sanitized and ready for immediate seating.
2. `OCCUPIED` (Red): Guests are seated; live elapsed occupancy timer running.
3. `WAITING_FOR_WAITER` (Pulsing Red/Amber Attention): Table has been seated for &gt; 5 minutes without an assigned server. Triggers high-priority alert.
4. `WAITING_FOR_CLEANING` (Warm Amber): Dining session concluded; table awaits busser reset.
5. `CLEANING` (Calm Blue): Sanitation in progress by floor staff.
6. `RESERVED` (Purple): Reserved for scheduled VIP guest party.

---

## 4. Smart Alert Engine

The authoritative server engine evaluates:
- **Waiter Delay Alert:** When a table becomes occupied without a server assigned, the timer counts up. At **5 minutes** (configurable), a `CRITICAL` alert is broadcast with table number, zone, and elapsed time. Resolves as soon as a server is assigned or service starts.
- **Cleaning Delay Alert:** When dining ends, table switches to `WAITING_FOR_CLEANING`. If not cleaned within **10 minutes** (configurable), a `WARNING` alert is broadcast.
- **Camera Connection Alert:** If an IP camera stream disconnects, a diagnostic alert is generated.

---

## 5. Queue Wait-Time Estimation Algorithm

The queue engine forecasts walk-in wait times using:
$$\text{Estimated Wait} = \max\left(5, \text{Queue Position} \times 3 + \text{Remaining Dining Duration} + \text{Cleaning Buffer}\right)$$
It pairs parties with the earliest expected available table matching their party size and zone preference.

---

## 6. Simulated Camera Surveillance

- Multi-camera CCTV grid with canvas-rendered animated surveillance feeds, scanlines, UTC timestamps, and AI bounding-box table overlays.
- Displays table detection states (`[T1: OCCUPIED]`, `[T2: AVAILABLE]`, etc.).
- Includes a table-to-camera mapping editor allowing managers to assign which tables are in each camera's view.
- Note: Raw RTSP feeds require an RTSP-to-WebRTC/HLS edge gateway; camera stream credentials remain protected server-side.

---

## 7. Operational Analytics (Manager Only)

Includes 7+ days of pre-seeded historical dining sessions (&gt;120 sessions) powering:
- **Peak Hours:** Hourly seating distribution (11:00–22:00)
- **Busiest Days:** Weekly volume comparison
- **Table Turnover:** Daily turns per table
- **Seated-to-Service Percentiles:** Average, median, and 90th percentile response times
- **Cleaning Performance:** Average wait-to-clean and cleaning duration
- **Algorithmic Staffing Schedule:** Suggests server headcount for each shift slot based on historical demand and target tables per server.
- **CSV Export:** Download complete dining session data for external spreadsheet analysis.
