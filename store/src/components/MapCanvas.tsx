import React, { useRef, useEffect, useState } from 'react';

interface MapCanvasProps {
  arrows: Array<{ start_x: number; start_y: number; end_x: number; end_y: number }>;
  onArrowDraw: (arrow: { start_x: number; start_y: number; end_x: number; end_y: number }) => void;
  backgroundImage: string;
}

const MapCanvas: React.FC<MapCanvasProps> = ({ arrows, onArrowDraw, backgroundImage }) => {
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
      ctx.strokeStyle = '#a020f0';
      ctx.lineWidth = 3 / zoom;
      ctx.lineCap = 'round';
      for (const arrow of arrows) {
        ctx.beginPath();
        ctx.moveTo(arrow.start_x, arrow.start_y);
        ctx.lineTo(arrow.end_x, arrow.end_y);
        ctx.stroke();
        drawArrowhead(ctx, arrow.start_x, arrow.start_y, arrow.end_x, arrow.end_y);
      }
      ctx.restore();
    };
  }, [arrows, backgroundImage, zoom, offset]);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.ctrlKey) {
      setDragging(true);
      dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;
    start.current = { x, y };
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
    onArrowDraw({ start_x: start.current.x, start_y: start.current.y, end_x: x, end_y: y });
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
