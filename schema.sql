PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Otros',
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS videos_feed_idx ON videos(status,created_at DESC);
CREATE INDEX IF NOT EXISTS videos_channel_idx ON videos(channel_id,created_at DESC);

CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,video_id)
);
CREATE INDEX IF NOT EXISTS likes_video_idx ON likes(video_id);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_video_idx ON comments(video_id,created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscriber_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(subscriber_id,channel_id)
);
