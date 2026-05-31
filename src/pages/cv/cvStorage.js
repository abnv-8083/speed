// ── Supabase-backed CV save helpers ───────────────────────────────
// Replaces the old localStorage cv_saves system.

import { supabase } from '../../supabaseClient';

const TABLE = 'cv_saves';

/** Fetch all saves, newest first */
export async function fetchSaves() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('saved_at', { ascending: false });
  if (error) throw new Error(error.message);
  // Normalize column names to camelCase for the UI
  return (data || []).map(row => ({
    id:       row.id,
    name:     row.name,
    template: row.template,
    data:     row.data,
    savedAt:  row.saved_at,
  }));
}

/** Upsert a save (insert or update by id) */
export async function upsertSave({ id, name, template, data }) {
  const { error } = await supabase.from(TABLE).upsert({
    id,
    name,
    template,
    data,
    saved_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Delete a save by id */
export async function deleteSave(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
