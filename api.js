const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
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
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ token });
});
// Create session
apiRouter.post('/sessions', authenticateToken, async (req, res) => {
    const { checkin_time } = req.body;
    const result = await pool.query('INSERT INTO sessions (user_id, checkin_time) VALUES ($1, $2) RETURNING id', [req.user.userId, checkin_time]);
    res.json({ sessionId: result.rows[0].id });
});
// Mark cells in a session
apiRouter.post('/sessions/:sessionId/cells', authenticateToken, async (req, res) => {
    const { cells } = req.body; // [{cell_x, cell_y}, ...]
    const { sessionId } = req.params;
    const values = cells.map(cell => `(${sessionId}, ${cell.cell_x}, ${cell.cell_y})`).join(',');
    await pool.query(`INSERT INTO session_cells (session_id, cell_x, cell_y) VALUES ${values}`);
    res.json({ success: true });
});
// Finish session (set checkout time)
apiRouter.post('/sessions/:sessionId/finish', authenticateToken, async (req, res) => {
    const { checkout_time } = req.body;
    const { sessionId } = req.params;
    await pool.query('UPDATE sessions SET checkout_time = $1 WHERE id = $2 AND user_id = $3', [checkout_time, sessionId, req.user.userId]);
    res.json({ success: true });
});
// Pool status endpoint
apiRouter.get('/pool-status', (req, res) => {
    res.json({
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });
});

module.exports = apiRouter;
