-- Añadidos para Crea-Labs Community (no elimina las tablas anteriores)
CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY,name TEXT NOT NULL,owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS guild_members (guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL DEFAULT 'member',joined_at INTEGER NOT NULL,PRIMARY KEY(guild_id,user_id));
CREATE INDEX IF NOT EXISTS guild_members_user_idx ON guild_members(user_id);
CREATE TABLE IF NOT EXISTS chat_channels (id TEXT PRIMARY KEY,guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,name TEXT NOT NULL,channel_type TEXT NOT NULL DEFAULT 'text',position INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS chat_channels_guild_idx ON chat_channels(guild_id,position);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,channel_id TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,body TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS messages_channel_time_idx ON messages(channel_id,created_at DESC);
