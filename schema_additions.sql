-- ── CV Saves table ────────────────────────────────────────────────
CREATE TABLE cv_saves (
  id          text PRIMARY KEY,              -- client-generated UUID
  name        text NOT NULL,
  template    text NOT NULL DEFAULT 'modern',
  data        jsonb NOT NULL,               -- full CV data object
  saved_at    timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE cv_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public cv_saves" ON cv_saves FOR ALL USING (true) WITH CHECK (true);

-- ── Vault store table ──────────────────────────────────────────────
-- One row per device/user identified by a client-generated device_id.
-- The vault is stored as an AES-256-GCM encrypted blob; the master
-- password is never sent to the server.
CREATE TABLE vault_store (
  device_id   text PRIMARY KEY,             -- client-generated UUID stored in localStorage
  salt        text NOT NULL,               -- base64 PBKDF2 salt
  ver_hash    text NOT NULL,               -- SHA-256 hash of master password (for unlock check)
  vault_data  text,                        -- base64 AES-GCM encrypted JSON blob (iv + data)
  updated_at  timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE vault_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public vault_store" ON vault_store FOR ALL USING (true) WITH CHECK (true);
