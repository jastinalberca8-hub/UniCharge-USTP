BEGIN;

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id TEXT PRIMARY KEY,
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  station_id TEXT NOT NULL,
  station_code TEXT NOT NULL,
  station_name TEXT NOT NULL,
  slot_number INTEGER NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_at_idx
  ON public.user_notifications (user_uid, created_at);

COMMIT;
