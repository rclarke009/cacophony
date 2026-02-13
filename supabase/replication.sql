-- Enable Realtime for the messages table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor).
-- Same effect as: Database → Replication → enable replication for `messages`.

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
