// Helpers that make flat numbers comparable regardless of how they were typed.
//
// A flat is uniquely identified by (apartmentId, flatKey). The flatKey strips case and punctuation,
// so "A-101", "a101", "A 101" and "A_101" all refer to the same flat inside one society.

/** Display form: trimmed, uppercase, inner whitespace collapsed. "  a-101 " -> "A-101" */
const normalizeFlatNumber = (value) =>
  String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');

/** Comparison key: uppercase letters and digits only. "A-101" -> "A101" */
const toFlatKey = (value) =>
  String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Society code form: uppercase, letters and digits only. " sri-4821 " -> "SRI4821" */
const normalizeSocietyCode = (value) =>
  String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

module.exports = { normalizeFlatNumber, toFlatKey, normalizeSocietyCode };
