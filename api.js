const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { CellType, CustomerEntry, CustomerSegmentation, Nationality, Role } = require('./enums');
require('dotenv').config();

const apiRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const POSTGRES_CONN_STRING = process.env.POSTGRES_CONN_STRING;
const pool = new Pool({ connectionString: POSTGRES_CONN_STRING, ssl: { rejectUnauthorized: false } });

apiRouter.use(bodyParser.json());

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Middleware to check for superuser
function requireSuperuser(req, res, next) {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role === Role.SUPERUSER) return next();
    res.sendStatus(403);
}

// Register
apiRouter.post('/register', async (req, res) => {
    const { username, password } = req.body;
    console.log('Register attempt:', { username });
    const hash = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', [username, hash]);
        console.log('User registered:', { userId: result.rows[0].id, username });
        res.json({ userId: result.rows[0].id });
    } catch (e) {
        console.error('Registration error:', e.message);
        res.status(400).json({ error: 'Username already exists' });
    }
});

// Login
apiRouter.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (!(await bcrypt.compare(password, user.password_hash))) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token });
});

// --- Superuser Map Configuration APIs ---
// Bulk add map configurations (superuser only)
apiRouter.post('/map-configurations', authenticateToken, requireSuperuser, async (req, res) => {
    const { configs } = req.body; // [{cell_x, cell_y, config_type}, ...]
    if (!Array.isArray(configs) || configs.length === 0) return res.status(400).json({ error: 'No configs provided' });
    // Validate config_type using enums
    const validTypes = Object.values(CellType);
    const filtered = configs.filter(c => validTypes.includes(c.config_type));
    if (filtered.length !== configs.length) return res.status(400).json({ error: 'Invalid config_type in configs' });
    const values = filtered.map(c => `(${req.user.userId}, ${c.cell_x}, ${c.cell_y}, '${c.config_type.replace(/'/g, "''")}')`).join(',');
    try {
        const result = await pool.query(
            `INSERT INTO map_configurations (created_by, cell_x, cell_y, config_type) VALUES ${values} RETURNING config_type`
        );
        const types = result.rows.map(r => r.config_type);
        res.json({ inserted: result.rowCount, types });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Bulk delete map configurations (superuser only)
apiRouter.delete('/map-configurations', authenticateToken, requireSuperuser, async (req, res) => {
    const { ids } = req.body; // [id1, id2, ...]
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No ids provided' });
    try {
        const result = await pool.query(
            `DELETE FROM map_configurations WHERE id = ANY($1::int[])`, [ids]
        );
        res.json({ deleted: result.rowCount });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Get all map configurations
apiRouter.get('/map-configurations', authenticateToken, async (req, res) => {
    const result = await pool.query('SELECT * FROM map_configurations');
    res.json(result.rows);
});

// --- Session Management API ---
// Create session
apiRouter.post('/sessions', authenticateToken, async (req, res) => {
    const { checkin_time } = req.body;
    const result = await pool.query('INSERT INTO sessions (user_id, checkin_time) VALUES ($1, $2) RETURNING id', [req.user.userId, checkin_time]);
    res.json({ sessionId: result.rows[0].id });
});

// Save questionnaire answers to session (with enum validation)
apiRouter.post('/sessions/:sessionId/questionnaire', authenticateToken, async (req, res) => {
    const { customer_entry, customer_segment, nationality } = req.body;
    const { sessionId } = req.params;
    const entryVals = Object.values(CustomerEntry);
    const segmentVals = Object.values(CustomerSegmentation);
    const nationalityVals = Object.values(Nationality);
    if (!entryVals.includes(customer_entry)) return res.status(400).json({ error: 'Invalid customer_entry' });
    if (!segmentVals.includes(customer_segment)) return res.status(400).json({ error: 'Invalid customer_segment' });
    if (!nationalityVals.includes(nationality)) return res.status(400).json({ error: 'Invalid nationality' });
    try {
        await pool.query(
            'UPDATE sessions SET customer_entry = $1, customer_segment = $2, nationality = $3 WHERE id = $4 AND user_id = $5',
            [customer_entry, customer_segment, nationality, sessionId, req.user.userId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Save arrows for a session
apiRouter.post('/sessions/:sessionId/arrows', authenticateToken, async (req, res) => {
    const { arrows } = req.body; // [{start_x, start_y, end_x, end_y}, ...]
    const { sessionId } = req.params;
    if (!Array.isArray(arrows) || arrows.length === 0) return res.status(400).json({ error: 'No arrows provided' });
    const values = arrows.map(a => `(${sessionId}, ${a.start_x}, ${a.start_y}, ${a.end_x}, ${a.end_y})`).join(',');
    try {
        await pool.query(
            `INSERT INTO session_arrows (session_id, start_x, start_y, end_x, end_y) VALUES ${values}`
        );
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Finish session (set checkout time)
apiRouter.post('/sessions/:sessionId/finish', authenticateToken, async (req, res) => {
    const { checkout_time } = req.body;
    const { sessionId } = req.params;
    await pool.query('UPDATE sessions SET checkout_time = $1 WHERE id = $2 AND user_id = $3', [checkout_time, sessionId, req.user.userId]);
    res.json({ success: true });
});


module.exports = apiRouter;
