import React, { useRef, useEffect, useState } from 'react';

interface MapPoint {
  x: number;
  y: number;
  config_type: string;
}

interface ArrowGrid {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
}

interface MapCanvasProps {
  arrows: ArrowGrid[];
  onArrowDraw: (arrow: ArrowGrid) => void;
  backgroundImage: string;
  points?: Array<MapPoint>;
  showGrid?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  TURNING_POINT: '#0074D9', // blue
  FIXTURE: '#ff4136', // red
  ENTRY_GATE: '#2ECC40', // green
  EXIT_GATE: '#FFDC00', // yellow
};

const GRID_SIZE = 10; // 900/90 = 10, 600/60 = 10

const MapCanvas: React.FC<MapCanvasProps> = ({ arrows, onArrowDraw, backgroundImage, points = [], showGrid }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new window.Image();
    img.src = backgroundImage;
    img.onload = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Draw grid overlay if enabled
      if (showGrid) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 1 / zoom;
        for (let x = 0; x <= 900; x += GRID_SIZE) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 600);
          ctx.stroke();
        }
        for (let y = 0; y <= 600; y += GRID_SIZE) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(900, y);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.strokeStyle = '#a020f0';
      ctx.lineWidth = 3 / zoom;
      ctx.lineCap = 'round';
      for (const arrow of arrows) {
        ctx.beginPath();
        ctx.moveTo(arrow.start_x * GRID_SIZE, arrow.start_y * GRID_SIZE);
        ctx.lineTo(arrow.end_x * GRID_SIZE, arrow.end_y * GRID_SIZE);
        ctx.stroke();
        drawArrowhead(ctx,
          arrow.start_x * GRID_SIZE,
          arrow.start_y * GRID_SIZE,
          arrow.end_x * GRID_SIZE,
          arrow.end_y * GRID_SIZE
        );
      }
      for (const pt of points) {
        ctx.beginPath();
        if (pt.config_type === 'FIXTURE') {
          ctx.rect(pt.x - GRID_SIZE / 2, pt.y - GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
        } else {
          ctx.arc(pt.x, pt.y, GRID_SIZE / 2, 0, 2 * Math.PI);
        }
        ctx.fillStyle = COLOR_MAP[pt.config_type] || '#fff';
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }
      ctx.restore();
    };
  }, [arrows, backgroundImage, zoom, offset, points, showGrid]);

  function drawArrowhead(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const len = 15;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - len * Math.cos(angle - Math.PI / 7), y1 - len * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x1 - len * Math.cos(angle + Math.PI / 7), y1 - len * Math.sin(angle + Math.PI / 7));
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
    ctx.restore();
  }

  const findClosestPoint = (x: number, y: number, points: MapPoint[]): MapPoint | null => {
    if (!points || points.length === 0) return null;
    let minDist = Infinity;
    let closest: MapPoint | null = null;
    for (const pt of points) {
      const dx = pt.x - x;
      const dy = pt.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = pt;
      }
    }
    return closest;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.ctrlKey) {
      setDragging(true);
      dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;
    // Find closest cell
    const closest = findClosestPoint(x, y, points);
    if (!closest) return;
    start.current = { x: closest.x, y: closest.y };
    drawing.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging) {
      setDragging(false);
      return;
    }
    if (!drawing.current || !start.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;
    // Find closest cell
    const closest = findClosestPoint(x, y, points);
    if (!closest) {
      drawing.current = false;
      start.current = null;
      return;
    }
    // Convert to grid numbers
    const start_grid_x = Math.round(start.current.x / GRID_SIZE);
    const start_grid_y = Math.round(start.current.y / GRID_SIZE);
    const end_grid_x = Math.round(closest.x / GRID_SIZE);
    const end_grid_y = Math.round(closest.y / GRID_SIZE);
    // Only allow if both start and end are valid points and not the same
    if ((start_grid_x !== end_grid_x || start_grid_y !== end_grid_y)) {
      onArrowDraw({
        start_x: start_grid_x,
        start_y: start_grid_y,
        end_x: end_grid_x,
        end_y: end_grid_y,
      });
    }
    drawing.current = false;
    start.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging && dragStart.current) {
      setOffset({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => {
      const newZoom = z * scale;
      return Math.max(1, Math.min(5, newZoom));
    });
  };

  // Touch event helpers
  const getTouchPos = (touch: Touch, rect: DOMRect) => {
    return {
      x: (touch.clientX - rect.left - offset.x) / zoom,
      y: (touch.clientY - rect.top - offset.y) / zoom
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return; // Only single touch to draw
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0] as unknown as Touch;
    const { x, y } = getTouchPos(touch, rect);
    // Find closest cell
    const closest = findClosestPoint(x, y, points);
    if (!closest) return;
    start.current = { x: closest.x, y: closest.y };
    drawing.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !start.current) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    // Use changedTouches if available, else last known position
    const touch = (e.changedTouches[0] || e.touches[0]) as unknown as Touch;
    if (!touch) return;
    const { x, y } = getTouchPos(touch, rect);
    // Find closest cell
    const closest = findClosestPoint(x, y, points);
    if (!closest) {
      drawing.current = false;
      start.current = null;
      return;
    }
    const start_grid_x = Math.round(start.current.x / GRID_SIZE);
    const start_grid_y = Math.round(start.current.y / GRID_SIZE);
    const end_grid_x = Math.round(closest.x / GRID_SIZE);
    const end_grid_y = Math.round(closest.y / GRID_SIZE);
    if ((start_grid_x !== end_grid_x || start_grid_y !== end_grid_y)) {
      onArrowDraw({
        start_x: start_grid_x,
        start_y: start_grid_y,
        end_x: end_grid_x,
        end_y: end_grid_y,
      });
    }
    drawing.current = false;
    start.current = null;
  };

  // Prevent scrolling while drawing
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (drawing.current) {
      e.preventDefault();
    }
  };

  return (
    <div style={{ position: 'relative', width: 900, height: 600 }}>
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        style={{ border: '2px solid #fff', background: '#222', display: 'block', cursor: dragging ? 'grab' : 'crosshair', width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      />
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn btn-light btn-sm" onClick={() => setZoom(z => Math.min(5, z * 1.1))}>+</button>
        <button className="btn btn-light btn-sm" onClick={() => setZoom(z => Math.max(1, z * 0.9))}>-</button>
        <button className="btn btn-light btn-sm" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
      </div>
    </div>
  );
};

export default MapCanvas;
