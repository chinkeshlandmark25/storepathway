// main.js - extracted and modularized from index.html
import { login, register } from './auth.js';
import { setupMapApp } from './map.js';

// Enum values for dropdowns
const CustomerEntry = ["Royal rest", "HomeBox", "Lift"];
const CustomerSegmentation = ["Single - Male", "Single - Female", "Couple", "Couple with Children", "Large Family"];
const Nationality = ["National", "Arab Expats", "ISC", "SEAC", "Africans", "Western"];

function populateQuestionnaireDropdowns() {
    const entrySel = document.getElementById('customer_entry');
    const segSel = document.getElementById('customer_segment');
    const natSel = document.getElementById('nationality');
    CustomerEntry.forEach(val => entrySel.appendChild(new Option(val, val)));
    CustomerSegmentation.forEach(val => segSel.appendChild(new Option(val, val)));
    Nationality.forEach(val => natSel.appendChild(new Option(val, val)));
}

window.startSession = async function() {
    const token = localStorage.getItem('jwt_token');
    const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ checkin_time: new Date().toISOString() })
    });
    const data = await res.json();
    if (!data.sessionId) {
        document.getElementById('session-msg').textContent = 'Could not start session.';
        return;
    }
    window.currentSessionId = data.sessionId;
    populateQuestionnaireDropdowns();
    const modal = new bootstrap.Modal(document.getElementById('questionnaireModal'));
    modal.show();
    document.getElementById('questionnaire-form').onsubmit = async function(e) {
        e.preventDefault();
        const customer_entry = document.getElementById('customer_entry').value;
        const customer_segment = document.getElementById('customer_segment').value;
        const nationality = document.getElementById('nationality').value;
        const qRes = await fetch(`/api/sessions/${window.currentSessionId}/questionnaire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ customer_entry, customer_segment, nationality })
        });
        if (qRes.ok) {
            modal.hide();
            document.getElementById('map-section').style.display = '';
        } else {
            const err = await qRes.json();
            document.getElementById('questionnaire-msg').textContent = err.error || 'Invalid input.';
        }
    };
};

// Utility to load HTML template into #main-content
async function loadTemplate(templateName) {
    const res = await fetch(`/templates/${templateName}.html`);
    const html = await res.text();
    document.getElementById('main-content').innerHTML = html;
}

// Router setup
window.addEventListener('DOMContentLoaded', () => {
    // Router setup
    page('/login', async () => {
        await loadTemplate('login-form');
        attachLoginListeners();
    });
    page('/session', async () => {
        await loadTemplate('session-container');
        // Attach session/map listeners here
        attachSessionListeners();
    });
    page('/configure-map', async () => {
        await loadTemplate('session-container');
        // Attach session/map listeners here
        attachSessionListeners();
        // Optionally show only configure map section
        document.getElementById('session-container').style.display = 'none';
        document.getElementById('configure-map-section').style.display = 'flex';
    });
    page('*', async () => {
        await loadTemplate('login-form');
        attachLoginListeners();
    });
    page();
    const token = localStorage.getItem('jwt_token');
    if (!token) page('/login');
});

function attachSessionListeners() {
    // Ensure session container is visible when entering /session
    const sessionCont = document.getElementById('session-container');
    if (sessionCont) sessionCont.style.display = '';
    // Hide map section by default; will be shown after questionnaire
    const mapSection = document.getElementById('map-section');
    if (mapSection) mapSection.style.display = 'none';

    // Map of button IDs to their handlers
    const buttonHandlers = [
        { id: 'start-session-btn', handler: () => window.startSession() },
        { id: 'finish-session-btn', handler: () => window.finishSession() },
        { id: 'configure-map-btn', handler: showConfigureMap },
        { id: 'config-back-btn', handler: backToSession },
        { id: 'config-add-btn', handler: function() {
            configMode = 'add';
            const canvas = document.getElementById('configure-map-canvas');
            if (canvas) canvas.style.cursor = 'crosshair';
        } },
        { id: 'config-remove-btn', handler: function() {
            configMode = 'remove';
            const canvas = document.getElementById('configure-map-canvas');
            if (canvas) canvas.style.cursor = 'not-allowed';
        } },
        { id: 'config-save-btn', handler: async function() {
            const token = localStorage.getItem('jwt_token');
            let msg = '';
            if (configCellsToAdd.length > 0) {
                try {
                    const res = await fetch('/api/map-configurations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                        body: JSON.stringify({ configs: configCellsToAdd })
                    });
                    if (!res.ok) throw new Error('Failed to add cells');
                    msg += 'Added: ' + configCellsToAdd.length + ' cells. ';
                    configCellsToAdd = [];
                } catch (err) {
                    msg += 'Error adding cells. ';
                }
            }
            if (configCellsToRemove.length > 0) {
                try {
                    const res = await fetch('/api/map-configurations', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                        body: JSON.stringify({ ids: configCellsToRemove.map(c => c.id) })
                    });
                    if (!res.ok) throw new Error('Failed to remove cells');
                    msg += 'Removed: ' + configCellsToRemove.length + ' cells.';
                    configCellsToRemove = [];
                } catch (err) {
                    msg += 'Error removing cells.';
                }
            }
            const msgElem = document.getElementById('config-msg');
            if (msgElem) msgElem.textContent = msg || 'Nothing to save.';
            drawConfigureMap();
        } },
    ];
    // Attach handlers
    buttonHandlers.forEach(({ id, handler }) => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = handler;
        }
    });
    // Canvas click handler
    const configCanvas = document.getElementById('configure-map-canvas');
    if (configCanvas) configCanvas.onclick = configureMapCanvasClick;
    setupMapApp();
}

// Attach all event listeners after DOM is loaded
function attachLoginListeners() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    if (loginBtn && registerBtn) {
        loginBtn.onclick = login;
        registerBtn.onclick = register;
    } else {
        setTimeout(attachLoginListeners, 100); // Retry until elements exist
    }
}

// Sidebar logic
function setSidebarState(expanded) {
    const sidebar = document.getElementById('sidebar');
    const labels = sidebar.querySelectorAll('.sidebar-label');
    if (expanded) {
        sidebar.style.width = '200px';
        labels.forEach(l => l.classList.remove('d-none'));
        localStorage.setItem('sidebar_expanded', '1');
    } else {
        sidebar.style.width = '60px';
        labels.forEach(l => l.classList.add('d-none'));
        localStorage.setItem('sidebar_expanded', '0');
    }
}
export function showSidebar() {
    if (!document.getElementById('sidebar')) {
        fetch('/templates/sidebar.html')
            .then(res => res.text())
            .then(html => {
                document.body.insertAdjacentHTML('beforeend', html);
                setSidebarState(localStorage.getItem('sidebar_expanded') === '1');
                enableSidebarHandlers();
            });
    }
}
function enableSidebarHandlers() {
    document.getElementById('sidebar-toggle-btn').onclick = function() {
        const expanded = localStorage.getItem('sidebar_expanded') === '1';
        setSidebarState(!expanded);
    };
    document.getElementById('logout-btn').onclick = function() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sidebar_expanded');
        location.reload();
    };
}

// Configure Map UI logic
let configMode = null;
let configCellsToAdd = [];
let configCellsToRemove = [];
function showConfigureMap() {
    document.getElementById('session-container').style.display = 'none';
    document.getElementById('configure-map-section').style.display = 'flex';
    drawConfigureMap();
}
function backToSession() {
    document.getElementById('configure-map-section').style.display = 'none';
    document.getElementById('session-container').style.display = '';
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
