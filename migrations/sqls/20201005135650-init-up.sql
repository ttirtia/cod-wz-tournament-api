-- Useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  username  TEXT UNIQUE NOT NULL,
  email     TEXT UNIQUE NOT NULL,
  password  TEXT NOT NULL,
  is_admin  BOOLEAN DEFAULT false
);
