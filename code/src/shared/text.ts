/**
 * Vietnamese text folding — the one definition of "ignore the tones", shared by the
 * browser and the server.
 *
 * This lived in `lib/telex.ts` alongside the on-screen keyboard's Telex input engine.
 * It moved here the moment the catalogue went into a database: the seeder computes each
 * book's `search_text` column with `removeDiacritics`, and the search endpoint folds the
 * incoming query with it before the LIKE. If the two ever disagreed by so much as a
 * character, a reader would type a query that matches nothing while the same query
 * typed into the old client-side search found the book.
 *
 * `lib/telex.ts` re-exports both functions, so nothing that imports them had to change.
 */

/**
 * Fold Vietnamese diacritics for matching, so a query typed without tones still
 * finds the book ("giai tich" -> "Giải tích 1"). Telex is how you *enter* tones;
 * this makes entering them optional rather than required.
 */
export function removeDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

/** Case- and diacritic-insensitive "does the haystack contain the query" test. */
export function vietnameseIncludes(haystack: string, query: string): boolean {
  return removeDiacritics(haystack).toLowerCase().includes(removeDiacritics(query).toLowerCase())
}

/**
 * The exact string stored in `books.search_text`.
 *
 * Written here rather than inline in the seeder because the search endpoint has to fold
 * the reader's query the identical way — same fields, same separator, same case. Keeping
 * the recipe in one function is what makes "the column and the query agree" checkable
 * instead of hopeful.
 */
export function buildSearchText(parts: string[]): string {
  return removeDiacritics(parts.join(' ')).toLowerCase()
}
