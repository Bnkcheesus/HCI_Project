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

/**
 * The shortest run of digits treated as an ISBN rather than as ordinary text.
 *
 * Every ISBN-13 in the catalogue starts "978", so a three-digit query would match the
 * whole shelf, and four digits would make every year — "2022" — return books whose *code*
 * happens to contain it. Six is past both: long enough that a digit run is a deliberate
 * code, short enough that a reader keying one off a back cover starts seeing it narrow
 * well before the end.
 */
const MIN_ISBN_QUERY = 6

/**
 * The reader's query read as a code, or null if it is not one.
 *
 * Lives here beside the folding rules because it answers the same kind of question — what
 * did the reader mean by what they typed — and because the search endpoint and the search
 * box have to agree on the answer. Punctuation is stripped the way `normalizeIsbn` strips
 * it: the spaces and dashes printed on a back cover are decoration.
 */
export function asIsbnQuery(query: string): string | null {
  const digits = query.replace(/[\s-]/g, '')
  return /^\d+$/.test(digits) && digits.length >= MIN_ISBN_QUERY ? digits : null
}
