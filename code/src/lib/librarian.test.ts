import { describe, expect, it } from 'vitest'
import { askLibrarian, SUGGESTED_PROMPTS } from './librarian'
import { availability, books } from '@/mocks'

describe('askLibrarian — finding books', () => {
  // The catalog files these under the English "Machine Learning"; a reader asks in
  // Vietnamese. Without the topic aliases every one of these questions would miss.
  it.each([
    'Sách về trí tuệ nhân tạo',
    'sách machine learning',
    'tài liệu học máy',
    'sách khoa học dữ liệu',
  ])('maps "%s" onto the Machine Learning shelf', (question) => {
    const reply = askLibrarian(question)
    expect(reply.intent).toBe('books')
    expect(reply.books.length).toBeGreaterThan(0)
    expect(reply.books.every((b) => b.subject === 'Machine Learning')).toBe(true)
  })

  it('finds a book named directly by title', () => {
    const reply = askLibrarian('cho mình mượn Giải tích 1')
    expect(reply.books[0].id).toBe('giai-tich-1')
  })

  it('matches a partial title — nobody types a full English title on a kiosk', () => {
    const reply = askLibrarian('sách pattern recognition')
    expect(reply.books.map((b) => b.id)).toContain('pattern-recognition')
  })

  it('narrows to what is actually on the shelf when asked', () => {
    const reply = askLibrarian('sách trí tuệ nhân tạo còn trên kệ')
    expect(reply.books.length).toBeGreaterThan(0)
    expect(reply.books.every((b) => availability[b.id].copiesAvailable > 0)).toBe(true)
    expect(reply.text).toContain('còn trên kệ')
  })

  /**
   * The persona's worst pain is walking to a shelf to find the book gone, so an
   * all-borrowed result must say so up front rather than reading like a hit.
   */
  it('leads with the bad news when every copy is out', () => {
    const reply = askLibrarian('sách lập trình C++')
    expect(reply.books.map((b) => b.id)).toEqual(['lap-trinh-cpp'])
    expect(reply.text).toContain('đang có người mượn')
    expect(reply.text).toContain(availability['lap-trinh-cpp'].dueBack!)
  })

  it('reports how many of a mixed result set are on the shelf', () => {
    const reply = askLibrarian('machine learning')
    const inStock = reply.books.filter((b) => availability[b.id].copiesAvailable > 0)
    expect(inStock.length).toBeGreaterThan(0)
    expect(inStock.length).toBeLessThan(reply.books.length)
    expect(reply.text).toContain(`${inStock.length} cuốn còn trên kệ`)
  })
})

describe('askLibrarian — locating a book', () => {
  it('answers with the shelf, floor and walking directions', () => {
    const reply = askLibrarian('Sách Giải tích 1 nằm ở kệ nào?')
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
    const reply = askLibrarian('Đại số tuyến tính ở đâu')
    expect(reply.books[0].id).toBe('dai-so-tuyen-tinh')
    expect(reply.text).toContain('Đại số tuyến tính')
  })
})

describe('askLibrarian — library questions', () => {
  it('answers opening hours from the live status, not a hardcoded string', () => {
    const reply = askLibrarian('Thư viện mở cửa mấy giờ?')
    expect(reply.intent).toBe('hours')
    expect(reply.text).toContain('07:00')
    expect(reply.text).toContain('21:00')
    expect(reply.books).toHaveLength(0)
  })

  it('explains renewal without sending the reader to the desk', () => {
    const reply = askLibrarian('Làm sao để gia hạn thẻ?')
    expect(reply.intent).toBe('borrowing')
    expect(reply.text).toContain('gia hạn')
  })

  it('greets only when there is nothing else to answer', () => {
    expect(askLibrarian('Xin chào').intent).toBe('greeting')
    // A greeting wrapped around a real request must still get the books.
    expect(askLibrarian('Xin chào, mình cần sách vật lý').intent).toBe('books')
  })

  it('suggests a way forward when nothing matches', () => {
    const reply = askLibrarian('sách về nấu ăn')
    expect(reply.intent).toBe('fallback')
    expect(reply.books).toHaveLength(0)
    expect(reply.text).toContain('sách về nấu ăn')
  })

  it('handles an empty question without crashing', () => {
    expect(askLibrarian('   ').books).toHaveLength(0)
  })
})

describe('SUGGESTED_PROMPTS', () => {
  // A starter chip that produces "mình chưa tìm được gì" teaches the reader the
  // assistant is useless — every one of them must actually work.
  it('every starter chip gets a real answer', () => {
    for (const prompt of SUGGESTED_PROMPTS) {
      expect(askLibrarian(prompt).intent, prompt).not.toBe('fallback')
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
      for (const book of askLibrarian(q).books) {
        expect(books.some((b) => b.id === book.id), `${q} -> ${book.id}`).toBe(true)
      }
    }
  })
})
