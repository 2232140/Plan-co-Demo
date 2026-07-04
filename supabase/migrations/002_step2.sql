-- 既存roomsテーブルに追加
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'setup';

CREATE UNIQUE INDEX IF NOT EXISTS rooms_invite_code_idx
  ON rooms (invite_code) WHERE invite_code IS NOT NULL;

-- room_membersテーブル新規作成
CREATE TABLE IF NOT EXISTS room_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      text        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname     text        NOT NULL,
  avatar_color text        NOT NULL,
  is_host      boolean     NOT NULL DEFAULT false,
  joined_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON room_members FOR ALL TO public USING (true) WITH CHECK (true);
