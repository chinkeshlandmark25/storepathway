// session.js - handles session and configure-map UI logic
import { setupMapApp } from './map.js';

// Configure Map UI state
let configMode = null;
let configCellsToAdd = [];
let configCellsToRemove = [];

export function attachSessionListeners() {
    const startBtn = document.getElementById('start-session-btn');
    const finishBtn = document.getElementById('finish-session-btn');
    const configBtn = document.getElementById('configure-map-btn');
    const configBackBtn = document.getElementById('config-back-btn');
    const configAddBtn = document.getElementById('config-add-btn');
    const configRemoveBtn = document.getElementById('config-remove-btn');
    const configCanvas = document.getElementById('configure-map-canvas');
    const configSaveBtn = document.getElementById('config-save-btn');
    if (startBtn) startBtn.onclick = startSession;
    if (finishBtn) finishBtn.onclick = finishSession;
    if (configBtn) configBtn.onclick = showConfigureMap;
    if (configBackBtn) configBackBtn.onclick = backToSession;
    if (configAddBtn) configAddBtn.onclick = setConfigModeAdd;
    if (configRemoveBtn) configRemoveBtn.onclick = setConfigModeRemove;
    if (configCanvas) configCanvas.onclick = configureMapCanvasClick;
    if (configSaveBtn) configSaveBtn.onclick = saveConfigChanges;
    setupMapApp();
}

async function startSession() {
    if (!window.startSession) return;
    await window.startSession();
}

async function finishSession() {
    if (!window.finishSession) return;
    await window.finishSession();
}

function showConfigureMap() {
    const sessionContainer = document.getElementById('session-container');
    const configSection = document.getElementById('configure-map-section');
    if (sessionContainer) sessionContainer.style.display = 'none';
    if (configSection) configSection.style.display = 'flex';
    drawConfigureMap();
}

function backToSession() {
    const sessionContainer = document.getElementById('session-container');
    const configSection = document.getElementById('configure-map-section');
    if (configSection) configSection.style.display = 'none';
    if (sessionContainer) sessionContainer.style.display = '';
}

function setConfigModeAdd() {
    configMode = 'add';
    const canvas = document.getElementById('configure-map-canvas');
    if (canvas) canvas.style.cursor = 'crosshair';
}

function setConfigModeRemove() {
    configMode = 'remove';
    const canvas = document.getElementById('configure-map-canvas');
    if (canvas) canvas.style.cursor = 'not-allowed';
}

function drawConfigureMap() {
    const canvas = document.getElementById('configure-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = 'store.jpg';
    img.onload = function() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        ctx.fillStyle = 'rgba(40,200,40,0.7)';
        for(const cell of configCellsToAdd) {
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, 10, 0, 2*Math.PI);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(200,40,40,0.7)';
        for(const cell of configCellsToRemove) {
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, 10, 0, 2*Math.PI);
            ctx.fill();
        }
    }
}

function configureMapCanvasClick(e) {
    if (!configMode) return;
    const canvas = document.getElementById('configure-map-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    if (configMode === 'add') {
        configCellsToAdd.push({ x, y, config_type: 'TURNING_POINT' });
    } else if (configMode === 'remove') {
        configCellsToRemove.push({ x, y });
    }
    drawConfigureMap();
}

async function saveConfigChanges() {
    const token = localStorage.getItem('jwt_token');
    let msg = '';
    if (configCellsToAdd.length > 0) {
        const res = await fetch('/api/map-configurations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ configs: configCellsToAdd })
        });
        msg += 'Added: ' + configCellsToAdd.length + ' cells. ';
        configCellsToAdd = [];
    }
    if (configCellsToRemove.length > 0) {
        const res = await fetch('/api/map-configurations', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ ids: configCellsToRemove.map(c => c.id) })
        });
        msg += 'Removed: ' + configCellsToRemove.length + ' cells.';
        configCellsToRemove = [];
    }
    const msgElem = document.getElementById('config-msg');
    if (msgElem) msgElem.textContent = msg || 'Nothing to save.';
    drawConfigureMap();
}
