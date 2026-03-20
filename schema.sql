-- schema.sql
-- Run this once on your Neon database to set up tables
-- Neon console: https://console.neon.tech → SQL Editor

CREATE TABLE IF NOT EXISTS events (
  id          VARCHAR(12)  PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  event_date  DATE,
  password    VARCHAR(255),         -- bcrypt hash; NULL = use master keyword "eiei"
  locked      BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
  id          SERIAL       PRIMARY KEY,
  event_id    VARCHAR(12)  REFERENCES events(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  recipient   VARCHAR(100),         -- assigned giftee (set after lock)
  has_drawn   BOOLEAN      DEFAULT FALSE,
  joined_at   TIMESTAMP    DEFAULT NOW(),
  UNIQUE(event_id, name)            -- prevent duplicate names per event
);

-- Index for fast lookup by event
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
