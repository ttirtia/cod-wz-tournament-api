-- Useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id        UUID DEFAULT uuid_generate_v4 (),
  pseudo    TEXT NOT NULL,
  email     TEXT NOT NULL,
  password  TEXT NOT NULL,
  is_admin  BOOLEAN DEFAULT false
);

-- TODO: remove test data
INSERT INTO users(pseudo, email, password) VALUES('test_user', 'test@example.com', 'pwd');
