/**
 * Strips all undefined properties from an object before saving to Firestore to prevent SDK crashes.
 */
export function sanitizePayload<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizePayload(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}
