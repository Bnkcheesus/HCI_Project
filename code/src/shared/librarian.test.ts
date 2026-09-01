import { describe, expect, it } from 'vitest'
import { askLibrarian, SUGGESTED_PROMPTS, type LibraryCorpus } from './librarian'
import { availability, books, libraryStatus, shelfLocations } from '@/mocks'

/**
 * The engine takes its catalogue as an argument now — that is what let it move to the
 * server, where the route assembles the same corpus out of SQL. Here it is assembled from
 * the mock modules, which are the fixtures the database is seeded from, so these
 * assertions are about the same books either way.
 */
const CORPUS: LibraryCorpus = { books, availability, shelfLocations, libraryStatus }

const ask = (question: string) => askLibrarian(question, CORPUS)

describe('askLibrarian — finding books', () => {
  // The catalog files these under the English "Machine Learning"; a reader asks in
  // Vietnamese. Without the topic aliases every one of these questions would miss.
  it.each([
    'Sách về trí tuệ nhân tạo',
    'sách machine learning',
    'tài liệu học máy',
    'sách khoa học dữ liệu',
  ])('maps "%s" onto the Machine Learning shelf', (question) => {
    const reply = ask(question)
    expect(reply.intent).toBe('books')

    // The whole shelf comes back, not one lucky title match. Not *only* that shelf,
    // though: "khoa học dữ liệu" legitimately also matches "Cấu trúc dữ liệu và giải
    // thuật" by title, and hiding a book the reader asked for would be the worse bug.
    const onShelf = books.filter((b) => b.subject === 'Machine Learning')
    const returned = reply.books.filter((b) => b.subject === 'Machine Learning')
    expect(returned).toHaveLength(onShelf.length)
  })

  it('finds a book named directly by title', () => {
    const reply = ask('cho mình mượn Giải tích 1')
    expect(reply.books[0].id).toBe('giai-tich-1')
  })

  it('matches a partial title — nobody types a full English title on a kiosk', () => {
    const reply = ask('sách pattern recognition')
    expect(reply.books.map((b) => b.id)).toContain('pattern-recognition')
  })

  it('narrows to what is actually on the shelf when asked', () => {
    const reply = ask('sách trí tuệ nhân tạo còn trên kệ')
    expect(reply.books.length).toBeGreaterThan(0)
    expect(reply.books.every((b) => availability[b.id].copiesAvailable > 0)).toBe(true)
    expect(reply.text).toContain('còn trên kệ')
  })

  /**
   * The persona's worst pain is walking to a shelf to find the book gone, so an
   * all-borrowed result must say so up front rather than reading like a hit.
   */
  it('leads with the bad news when every copy is out', () => {
    // Named by title so the result is exactly one book, and that book is fully out on
    // loan — a subject query would now pull in the rest of the shelf alongside it.
    const reply = ask('sách pattern recognition')
    expect(reply.books.map((b) => b.id)).toEqual(['pattern-recognition'])
    expect(reply.text).toContain('đang có người mượn')
    expect(reply.text).toContain(availability['pattern-recognition'].dueBack!)
  })

  /**
   * Tone-stripping makes Vietnamese phrases swallow each other: "thuật toán" ends in
   * "toan", "khoa học" ends in "hoa hoc", "điện từ học" starts with "điện tử". Matching
   * on bare substrings answered each of these with two shelves at once — a reader asking
   * for algorithms was handed the whole of mathematics as well.
   */
  it.each([
    ['sách thuật toán', 'Công nghệ thông tin'],
    ['sách khoa học dữ liệu', 'Machine Learning'],
    ['sách điện từ học', 'Vật lý'],
    ['sách điện tử', 'Điện tử – Viễn thông'],
    ['sách hóa học', 'Hóa học'],
  ])('answers "%s" with the %s shelf and nothing else', (question, subject) => {
    const reply = ask(question)
    expect(reply.books.length).toBeGreaterThan(0)
    expect([...new Set(reply.books.map((b) => b.subject))]).toEqual([subject])
  })

  it('reports how many of a mixed result set are on the shelf', () => {
    const reply = ask('machine learning')
    const inStock = reply.books.filter((b) => availability[b.id].copiesAvailable > 0)
    expect(inStock.length).toBeGreaterThan(0)
    expect(inStock.length).toBeLessThan(reply.books.length)
    expect(reply.text).toContain(`${inStock.length} cuốn còn trên kệ`)
  })
})

describe('askLibrarian — locating a book', () => {
  it('answers with the shelf, floor and walking directions', () => {
    const reply = ask('Sách Giải tích 1 nằm ở kệ nào?')
    expect(reply.intent).toBe('location')
    expect(reply.text).toContain('MA-101')
    expect(reply.text).toContain('tầng 1')
    // Text directions, not just a picture — Pain Reliever 5 / Gain 6.
    expect(reply.text).toContain('Rẽ trái ở quầy thủ thư')
  })

  /**
   * "Giải tích 1" also matches the whole Toán học subject, so the named book has to win
   * the lead slot or the answer describes the wrong shelf.
   */
  it('describes the book that was actually named, not a subject sibling', () => {
    const reply = ask('Đại số tuyến tính ở đâu')
    expect(reply.books[0].id).toBe('dai-so-tuyen-tinh')
    expect(reply.text).toContain('Đại số tuyến tính')
  })
})

describe('askLibrarian — library questions', () => {
  it('answers opening hours from the live status, not a hardcoded string', () => {
    const reply = ask('Thư viện mở cửa mấy giờ?')
    expect(reply.intent).toBe('hours')
    expect(reply.text).toContain('07:00')
    expect(reply.text).toContain('21:00')
    expect(reply.books).toHaveLength(0)
  })

  it('explains renewal without sending the reader to the desk', () => {
    const reply = ask('Làm sao để gia hạn thẻ?')
    expect(reply.intent).toBe('borrowing')
    expect(reply.text).toContain('gia hạn')
  })

  it('greets only when there is nothing else to answer', () => {
    expect(ask('Xin chào').intent).toBe('greeting')
    // A greeting wrapped around a real request must still get the books.
    expect(ask('Xin chào, mình cần sách vật lý').intent).toBe('books')
  })

  it('suggests a way forward when nothing matches', () => {
    const reply = ask('sách về nấu ăn')
    expect(reply.intent).toBe('fallback')
    expect(reply.books).toHaveLength(0)
    expect(reply.text).toContain('sách về nấu ăn')
  })

  it('handles an empty question without crashing', () => {
    expect(ask('   ').books).toHaveLength(0)
  })
})

describe('SUGGESTED_PROMPTS', () => {
  // A starter chip that produces "mình chưa tìm được gì" teaches the reader the
  // assistant is useless — every one of them must actually work.
  it('every starter chip gets a real answer', () => {
    for (const prompt of SUGGESTED_PROMPTS) {
      expect(ask(prompt).intent, prompt).not.toBe('fallback')
    }
  })
})

describe('askLibrarian — consistency with the rest of the app', () => {
  /**
   * The chat must never promise a book the book-info screen then contradicts, so every
   * id it returns has to be a real, openable catalog entry.
   */
  it('only ever returns ids that exist in the catalog', () => {
    const questions = [...SUGGESTED_PROMPTS, 'machine learning', 'sách toán', 'vật lý']
    for (const q of questions) {
      for (const book of ask(q).books) {
        expect(books.some((b) => b.id === book.id), `${q} -> ${book.id}`).toBe(true)
      }
    }
  })
})
