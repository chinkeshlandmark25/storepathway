-- 001_create_users.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 002_create_sessions.sql
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    checkin_time TIMESTAMP NOT NULL,
    checkout_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 003_create_session_cells.sql
CREATE TABLE IF NOT EXISTS session_cells (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL
);

-- Add role to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Add questionnaire columns to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS customer_entry VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS customer_segment VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS nationality VARCHAR(255);

-- Table for map configurations (turning points, fixtures, gates)
CREATE TABLE IF NOT EXISTS map_configurations (
    id SERIAL PRIMARY KEY,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    config_type VARCHAR(50) NOT NULL, -- e.g., 'turning_point', 'fixture', 'entry_gate', 'exit_gate'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing arrows (paths) drawn by users
CREATE TABLE IF NOT EXISTS session_arrows (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    start_x INTEGER NOT NULL,
    start_y INTEGER NOT NULL,
    end_x INTEGER NOT NULL,
    end_y INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS session_cells;

ALTER TABLE map_configurations ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Table for storing interactions with fixtures in sessions
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
