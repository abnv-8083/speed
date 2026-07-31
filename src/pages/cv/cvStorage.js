// ── MongoDB-backed CV save helpers ────────────────────────────────

import { api } from '../../api';

/** Fetch all saves, newest first */
export async function fetchSaves() {
  const data = await api.getCvSaves();
  return (data || []).map(row => ({
    id:       row.id,
    name:     row.name,
    template: row.template,
    data:     row.data,
    savedAt:  row.savedAt || row.saved_at,
  }));
}

/** Upsert a save (insert or update by id) */
export async function upsertSave({ id, name, template, data }) {
  await api.upsertCvSave({ id, name, template, data });
}

/** Delete a save by id */
export async function deleteSave(id) {
  await api.deleteCvSave(id);
}
