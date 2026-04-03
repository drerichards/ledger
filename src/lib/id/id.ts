/**
 * Generates a short random ID for new entities.
 * Not cryptographically secure — used only as a local primary key
 * for localStorage records where collision probability is negligible.
 *
 * When Supabase is added in Phase 2, this gets replaced by
 * server-generated UUIDs from gen_random_uuid().
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
