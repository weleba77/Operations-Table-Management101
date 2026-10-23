import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Layers,
  Info,
  Shield,
  Eye,
  Crosshair,
} from 'lucide-react';
import { Camera, Table, DiningZone } from '../../types.ts';

interface CameraSetupViewProps {
  cameras: Camera[];
  tables: Table[];
  zones: DiningZone[];
  onUpdateMapping: (cameraId: string, mappedTableNumbers: number[]) => Promise<void>;
  onTestConnection: (cameraId: string) => Promise<void>;
  onToggleCamera: (cameraId: string) => void;
}

export const CameraSetupView: React.FC<CameraSetupViewProps> = ({
  cameras,
  tables,
  zones,
  onUpdateMapping,
  onTestConnection,
  onToggleCamera,
}) => {
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || '');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0];

  // Animated synthetic camera feed canvas renderer
  useEffect(() => {
    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark CCTV surveillance background with grain
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      if (activeCamera?.status === 'CONNECTED') {
        // Draw room perspective lines (isometric floor grid)
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + 20, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y + 10);
          ctx.stroke();
        }

        // Render synthetic tables & bounding boxes for mapped tables
        const mappedTables = tables.filter((t) =>
          activeCamera.mappedTableNumbers.includes(t.tableNumber)
        );

        mappedTables.forEach((tbl, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          const bx = 80 + col * 180 + Math.sin(frame * 0.02 + idx) * 2;
          const by = 60 + row * 110;
          const bw = 120;
          const bh = 80;

          // Table furniture graphic
          ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
          ctx.beginPath();
          ctx.roundRect(bx + 10, by + 10, bw - 20, bh - 20, 8);
          ctx.fill();

          // AI Bounding Box Overlay
          let boxColor = '#10B981'; // Green for Available
          if (tbl.status === 'OCCUPIED') boxColor = '#F43F5E';
          if (tbl.status === 'WAITING_FOR_WAITER') boxColor = '#EF4444';
          if (tbl.status === 'WAITING_FOR_CLEANING') boxColor = '#F59E0B';
          if (tbl.status === 'CLEANING') boxColor = '#3B82F6';

          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);

          // Bounding box label
          ctx.fillStyle = boxColor;
          ctx.fillRect(bx, by - 18, 90, 18);
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(`T${tbl.tableNumber}: ${tbl.status.slice(0, 7)}`, bx + 4, by - 5);

          // Silhouette dot if occupied
          if (tbl.status === 'OCCUPIED' || tbl.status === 'WAITING_FOR_WAITER') {
            ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
            ctx.beginPath();
            ctx.arc(bx + bw / 2, by + bh / 2, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Scanline bar scrolling down
        const scanY = (frame * 2) % height;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(0, scanY, width, 4);

        // Security OSD Header (On-Screen Display)
        ctx.fillStyle = '#38bdf8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(`CAM: [${activeCamera.name.toUpperCase()}]`, 15, 25);
        ctx.fillText(`RTSP: GATEWAY OK · 30 FPS`, 15, 42);

        // UTC Live OSD Clock
        const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
        ctx.fillText(`UTC: ${nowIso}`, width - 210, 25);

        // AI Vision inference badge
        ctx.fillStyle = '#10B981';
        ctx.fillText(`CV ENGINE: OPTICAL FLOW ACTIVE`, width - 240, height - 15);
      } else {
        // Disconnected Static Screen
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        // Random noise
        for (let i = 0; i < 400; i++) {
          const rx = Math.random() * width;
          const ry = Math.random() * height;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)';
          ctx.fillRect(rx, ry, 2, 2);
        }

        ctx.fillStyle = '#f43f5e';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL · RTSP STREAM TIMEOUT', width / 2, height / 2 - 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Check IP camera gateway or power cycle switch', width / 2, height / 2 + 15);
        ctx.textAlign = 'left';
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeCamera, tables]);

  const handleTest = async (camId: string) => {
    setTestingId(camId);
    setTestResult(null);
    try {
      await onTestConnection(camId);
      setTestResult('Ping response: 24ms · Stream verified');
    } catch {
      setTestResult('Connection failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleTableMapping = async (tableNum: number) => {
    if (!activeCamera) return;
    const exists = activeCamera.mappedTableNumbers.includes(tableNum);
    const updated = exists
      ? activeCamera.mappedTableNumbers.filter((n) => n !== tableNum)
      : [...activeCamera.mappedTableNumbers, tableNum].sort((a, b) => a - b);
    await onUpdateMapping(activeCamera.id, updated);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Camera Setup & Vision Mapping</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Manager Access
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance stream integration, dining zone coverage, and table bounding-box assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleCamera(activeCamera.id)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            {activeCamera.status === 'CONNECTED' ? (
              <>
                <VideoOff className="w-3.5 h-3.5 text-rose-500" />
                <span>Simulate Disconnect</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulate Reconnect</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RTSP Architecture Notice */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-300 text-xs flex items-start gap-3 shadow-xs">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-white">
            Architecture Notice: IP Security Camera Stream Ingestion
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            Modern web browsers cannot decode raw RTSP network sockets directly inside standard HTML5 video elements. TableWatch routes RTSP streams through an edge gateway that converts H.264/H.265 camera feeds into low-latency WebRTC/HLS packets. Credentials and private stream URLs remain strictly protected server-side.
          </div>
        </div>
      </div>

      {/* Camera Selection & Video Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Camera Selector List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Configured Cameras ({cameras.length})
          </h2>

          <div className="space-y-2.5">
            {cameras.map((cam) => {
              const isSelected = cam.id === activeCamera?.id;
              const isConnected = cam.status === 'CONNECTED';

              return (
                <div
                  key={cam.id}
                  onClick={() => setSelectedCameraId(cam.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{cam.name}</div>
                        <div className="text-[11px] text-slate-500">{cam.location}</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      ></span>
                      <span>{cam.status}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span>Coverage:</span>
                      <span className="font-semibold text-slate-700">
                        {cam.mappedTableNumbers.length} Tables (T
                        {cam.mappedTableNumbers.join(', T') || 'None'})
                      </span>
                    </div>
                    <div className="flex justify-between font-mono text-[10px] text-slate-400">
                      <span>Stream:</span>
                      <span className="truncate max-w-[140px]">{cam.rtspUrlStub}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Canvas Feed Preview & Table Mapping */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-lg relative">
            {/* Top OSD Bar */}
            <div className="bg-slate-900/90 px-4 py-2 flex items-center justify-between text-xs text-slate-300 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-white">{activeCamera?.name}</span>
                <span className="text-slate-500">· {activeCamera?.zoneName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(activeCamera.id)}
                  disabled={testingId === activeCamera.id}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${testingId === activeCamera.id ? 'animate-spin' : ''}`}
                  />
                  <span>Test Feed</span>
                </button>
              </div>
            </div>

            {/* Video Canvas */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-contain"
              />
            </div>

            {testResult && (
              <div className="p-2 bg-slate-900 text-emerald-400 text-center font-mono text-[11px] border-t border-slate-800">
                {testResult}
              </div>
            )}
          </div>

          {/* Table-to-Camera Mapping Matrix */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Visible Table Mapping for {activeCamera?.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Toggle tables visible within this camera's optical field of view.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-indigo-600">
                {activeCamera?.mappedTableNumbers.length} mapped
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
              {tables.map((table) => {
                const isMapped = activeCamera?.mappedTableNumbers.includes(table.tableNumber);
                return (
                  <button
                    key={table.id}
                    onClick={() => handleToggleTableMapping(table.tableNumber)}
                    className={`p-2.5 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center transition-all ${
                      isMapped
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>T{table.tableNumber}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">{table.capacity}p</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
