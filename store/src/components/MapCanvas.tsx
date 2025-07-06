import React, { useRef, useEffect } from 'react';

interface MapCanvasProps {
  arrows: Array<{ start_x: number; start_y: number; end_x: number; end_y: number }>;
  onArrowDraw: (arrow: { start_x: number; start_y: number; end_x: number; end_y: number }) => void;
  backgroundImage: string;
}

const MapCanvas: React.FC<MapCanvasProps> = ({ arrows, onArrowDraw, backgroundImage }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new window.Image();
    img.src = backgroundImage;
    img.onload = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.strokeStyle = '#a020f0';
      ctx.lineWidth = 3;
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
  }, [arrows, backgroundImage]);

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
    const rect = e.currentTarget.getBoundingClientRect();
    start.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    drawing.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !start.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    onArrowDraw({ start_x: start.current.x, start_y: start.current.y, end_x: end.x, end_y: end.y });
    drawing.current = false;
    start.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={600}
      style={{ border: '1px solid #fff', maxWidth: '100%', maxHeight: '80vh', display: 'block', cursor: 'pointer' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
};

export default MapCanvas;
