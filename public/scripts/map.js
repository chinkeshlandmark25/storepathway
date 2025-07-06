import { showMsg } from './auth.js';

let sessionId = null;
let arrows = [];
let arrowStart = null;
let checkinTime = null;

export function setupMapApp() {
    window.startSession = startSession;
    window.finishSession = finishSession;
    drawMap();
    setupCanvasArrowDrawing();
}

async function startSession() {
    checkinTime = new Date().toISOString();
    const token = localStorage.getItem('jwt_token');
    const res = await fetch('/api/sessions', {
        method: 'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({checkin_time: checkinTime})
    });
    const data = await res.json();
    if (data.sessionId) {
        sessionId = data.sessionId;
        arrows = [];
        document.getElementById('map-section').style.display = 'flex';
        document.getElementById('start-session-btn').style.display = 'none';
        drawMap();
        setupCanvasArrowDrawing();
    } else showMsg('session-msg', 'Could not start session');
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
        // Draw arrows
        ctx.save();
        ctx.strokeStyle = '#a020f0'; // purple
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for(const arrow of arrows) {
            ctx.beginPath();
            ctx.moveTo(arrow.start_x, arrow.start_y);
            ctx.lineTo(arrow.end_x, arrow.end_y);
            ctx.stroke();
            // Draw arrowhead
            drawArrowhead(ctx, arrow.start_x, arrow.start_y, arrow.end_x, arrow.end_y);
        }
        ctx.restore();
        // If drawing a new arrow
        if (arrowStart && currentMouse) {
            ctx.save();
            ctx.strokeStyle = '#a020f0'; // purple
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(arrowStart.x, arrowStart.y);
            ctx.lineTo(currentMouse.x, currentMouse.y);
            ctx.stroke();
            drawArrowhead(ctx, arrowStart.x, arrowStart.y, currentMouse.x, currentMouse.y);
            ctx.restore();
        }
    }
}

function drawArrowhead(ctx, x0, y0, x1, y1) {
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const len = 15;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - len * Math.cos(angle - Math.PI/7), y1 - len * Math.sin(angle - Math.PI/7));
    ctx.lineTo(x1 - len * Math.cos(angle + Math.PI/7), y1 - len * Math.sin(angle + Math.PI/7));
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
}

let currentMouse = null;
function setupCanvasArrowDrawing() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    // Mouse events
    canvas.onmousedown = function(e) {
        const rect = canvas.getBoundingClientRect();
        arrowStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        currentMouse = { ...arrowStart };
    };
    canvas.onmousemove = function(e) {
        if (!arrowStart) return;
        const rect = canvas.getBoundingClientRect();
        currentMouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        drawMap();
    };
    canvas.onmouseup = function(e) {
        if (!arrowStart) return;
        const rect = canvas.getBoundingClientRect();
        const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        arrows.push({ start_x: arrowStart.x, start_y: arrowStart.y, end_x: end.x, end_y: end.y });
        arrowStart = null;
        currentMouse = null;
        drawMap();
    };
    canvas.onmouseleave = function() {
        arrowStart = null;
        currentMouse = null;
        drawMap();
    };
}

export async function finishSession() {
    if (!sessionId) return;
    const token = localStorage.getItem('jwt_token');
    const checkoutTime = new Date().toISOString();
    const res = await fetch(`/api/sessions/${sessionId}/finish`, {
        method: 'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({checkout_time: checkoutTime, arrows})
    });
    if (res.ok) {
        showMsg('session-msg', 'Session finished!');
        document.getElementById('map-section').style.display = 'none';
        document.getElementById('start-session-btn').style.display = '';
    } else {
        showMsg('session-msg', 'Could not finish session');
    }
}
