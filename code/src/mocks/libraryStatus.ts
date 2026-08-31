// Mock library-wide live status — reinforces Gain Creator 4 (dữ liệu theo thời gian thực)
// at the whole-collection level, and gives the persona the opening-hours context they
// need when squeezing a visit between classes (scenario.md: "chỉ có 15 phút").
import type { LibraryStatus } from '@/shared/types'
import { books } from './catalog'

export type { LibraryStatus } from '@/shared/types'

export const libraryStatus: LibraryStatus = {
  isOpen: true,
  opensAt: '07:00',
  closesAt: '21:00',
  titlesTotal: 12480,
  titlesAvailable: 3204,
  supportPhone: '1900 6080',
}

/**
 * Popular subjects, surfaced as one-tap shortcuts — Job 1 / Gain Creator 5.
 *
 * Derived from the catalogue rather than typed out, because a shortcut that leads to
 * "Không tìm thấy tài liệu nào" is worse than no shortcut at all: the persona taps it
 * precisely when they do not know what to type, so a dead end there strands them. The
 * hand-written list had drifted — "Kinh tế" and "Ngoại ngữ" named shelves the library
 * does not stock.
 */
export const popularSubjects: string[] = [...countBySubject()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .map(([subject]) => subject)

function countBySubject(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const book of books) counts.set(book.subject, (counts.get(book.subject) ?? 0) + 1)
  return counts
}
