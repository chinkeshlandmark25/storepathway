// Map and session logic
import { token, showMsg } from './auth.js';

let sessionId = null;
let markedCells = [];
let checkinTime = null;
const gridRows = 30, gridCols = 45;
const cellWidth = 20, cellHeight = 20;
let isDragging = false;
let dragStartCell = null;
let dragCurrentCell = null;

export function setupMapApp() {
    window.startSession = startSession;
    window.finishSession = finishSession;
    drawMap();
    setupCanvasDragSelection();
}

async function startSession() {
    checkinTime = new Date().toISOString();
    const res = await fetch('/api/sessions', {
        method: 'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({checkin_time: checkinTime})
    });
    const data = await res.json();
    if (data.sessionId) {
        sessionId = data.sessionId;
        markedCells = [];
        document.getElementById('map-section').style.display = 'flex';
        document.getElementById('start-session-btn').style.display = 'none';
        drawMap();
        setupCanvasDragSelection();
    } else showMsg('session-msg', 'Could not start session');
}

function getCellsOnLine(x0, y0, x1, y1) {
    // Bresenham's line algorithm for grid cells
    const cells = [];
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;
    while (true) {
        cells.push({cell_x: x, cell_y: y});
        if (x === x1 && y === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
    return cells;
}

function drawMap() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = 'store.jpg';
    img.onload = function() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        // Draw grid
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for(let i=0;i<=gridCols;i++) {
            ctx.beginPath();
            ctx.moveTo(i*cellWidth,0);
            ctx.lineTo(i*cellWidth,canvas.height);
            ctx.stroke();
        }
        for(let j=0;j<=gridRows;j++) {
            ctx.beginPath();
            ctx.moveTo(0,j*cellHeight);
            ctx.lineTo(canvas.width,j*cellHeight);
            ctx.stroke();
        }
        ctx.restore();
        // Highlight marked cells
        ctx.fillStyle = 'rgba(118,75,162,0.7)';
        const highlightWidth = cellWidth * 2/3;
        const highlightHeight = cellHeight * 2/3;
        for(const cell of markedCells) {
            ctx.fillRect(
                cell.cell_x*cellWidth + (cellWidth-highlightWidth)/2,
                cell.cell_y*cellHeight + (cellHeight-highlightHeight)/2,
                highlightWidth,
                highlightHeight
            );
        }
        // If dragging, preview the path
        if (isDragging && dragStartCell && dragCurrentCell) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            const pathCells = getCellsOnLine(dragStartCell.cell_x, dragStartCell.cell_y, dragCurrentCell.cell_x, dragCurrentCell.cell_y);
            for(const cell of pathCells) {
                ctx.fillRect(
                    cell.cell_x*cellWidth + (cellWidth-highlightWidth)/2,
                    cell.cell_y*cellHeight + (cellHeight-highlightHeight)/2,
                    highlightWidth,
                    highlightHeight
                );
            }
        }
    }
}

function addCellsToMarked(pathCells) {
    for(const cell of pathCells) {
        if (!markedCells.some(c=>c.cell_x===cell.cell_x&&c.cell_y===cell.cell_y)) {
            markedCells.push(cell);
        }
    }
}

function setupCanvasDragSelection() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    let lastCell = null;
    let dragMoved = false;
    let downCell = null;
    canvas.onmousedown = function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX-rect.left)/cellWidth);
        const y = Math.floor((e.clientY-rect.top)/cellHeight);
        isDragging = true;
        dragStartCell = {cell_x: x, cell_y: y};
        dragCurrentCell = {cell_x: x, cell_y: y};
        lastCell = {cell_x: x, cell_y: y};
        downCell = {cell_x: x, cell_y: y};
        dragMoved = false;
        drawMap();
    };
    canvas.onmousemove = function(e) {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX-rect.left)/cellWidth);
        const y = Math.floor((e.clientY-rect.top)/cellHeight);
        dragCurrentCell = {cell_x: x, cell_y: y};
        if (lastCell && (lastCell.cell_x !== x || lastCell.cell_y !== y)) {
            const pathCells = getCellsOnLine(lastCell.cell_x, lastCell.cell_y, x, y);
            addCellsToMarked(pathCells);
            lastCell = {cell_x: x, cell_y: y};
            dragMoved = true;
        }
        drawMap();
    };
    canvas.onmouseup = function(e) {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX-rect.left)/cellWidth);
        const y = Math.floor((e.clientY-rect.top)/cellHeight);
        if (!dragMoved && downCell && downCell.cell_x === x && downCell.cell_y === y) {
            // Single tap/click: toggle cell
            const idx = markedCells.findIndex(c=>c.cell_x===x&&c.cell_y===y);
            if (idx === -1) markedCells.push({cell_x:x,cell_y:y});
            else markedCells.splice(idx,1);
        }
        isDragging = false;
        dragStartCell = null;
        dragCurrentCell = null;
        lastCell = null;
        downCell = null;
        dragMoved = false;
        drawMap();
    };
    canvas.onmouseleave = function() {
        if (isDragging) {
            isDragging = false;
            dragStartCell = null;
            dragCurrentCell = null;
            lastCell = null;
            downCell = null;
            dragMoved = false;
            drawMap();
        }
    };
}

async function finishSession() {
    if (!sessionId || markedCells.length===0) return showMsg('session-msg','Mark at least one cell!');
    // Save cells
    await fetch(`/api/sessions/${sessionId}/cells`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({cells: markedCells})
    });
    // Set checkout time
    const checkoutTime = new Date().toISOString();
    await fetch(`/api/sessions/${sessionId}/finish`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({checkout_time: checkoutTime})
    });
    showMsg('session-msg','Session saved!');
    document.getElementById('map-section').style.display = 'none';
    document.getElementById('start-session-btn').style.display = 'block';
}
