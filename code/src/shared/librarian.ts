/**
 * The kiosk's AI librarian — Gain Creator 1 / Product-Service 1 ("bộ gợi ý sách theo
 * từ khoá/môn học/sở thích"), reached from the kiosk-ai-chat screen (Figma 5:779).
 *
 * A deterministic intent matcher over the real catalogue rather than a language model.
 * That is a deliberate trade: every answer it gives is *true* about the data the rest of
 * the app shows — shelf codes, floors and copy counts come from the same rows the
 * book-info screen renders, so the chat can never promise a book the next screen
 * contradicts.
 *
 * It takes the catalogue as an argument rather than importing it. That is what let the
 * whole engine move server-side when the data went into a database: the route hands it
 * rows read from SQL, the frontend test hands it `src/mocks/`, and the matching logic —
 * every alias, every word-boundary rule — is one implementation serving both. Answering
 * questions about the catalogue is not something a browser can do once it no longer holds
 * the catalogue.
 *
 * Kept free of React and of any database so the whole conversation engine is testable
 * without rendering anything or connecting to anything.
 */
import type { Availability, Book, LibraryStatus, ShelfLocation } from './types'
import { removeDiacritics } from './text'

/**
 * Everything the librarian needs to know to answer. Assembled by the caller — from mock
 * modules in a test, from repositories in the route.
 */
export interface LibraryCorpus {
  books: Book[]
  availability: Record<string, Availability>
  shelfLocations: Record<string, ShelfLocation>
  libraryStatus: LibraryStatus
}

export type LibrarianIntent =
  | 'greeting'
  | 'books'
  | 'location'
  | 'hours'
  | 'borrowing'
  | 'fallback'

export interface LibrarianReply {
  intent: LibrarianIntent
  text: string
  /** Books to surface in the side panel alongside this reply. */
  books: Book[]
}

/**
 * One-tap starters for the empty state. A kiosk user does not know what an assistant
 * can be asked, and typing a full question on an on-screen keyboard is slow — so the
 * examples double as the fastest input path. Each one must actually be answerable below.
 */
export const SUGGESTED_PROMPTS: string[] = [
  'Sách về trí tuệ nhân tạo còn trên kệ',
  'Sách Giải tích 1 nằm ở kệ nào?',
  'Có sách nào về lập trình C++ không?',
  'Thư viện mở cửa mấy giờ?',
]

/**
 * Fold to plain lowercase ASCII words. Punctuation becomes whitespace so a keyword can
 * be matched on word boundaries (" ai " must not fire inside "hai" or "email"), while
 * `+` and `#` survive because they carry meaning in language names like "c++".
 */
function normalize(text: string): string {
  return removeDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim()
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n))
}

/**
 * Everyday words a reader would use for a subject, mapped onto the catalog's own
 * `subject` values. Without this "trí tuệ nhân tạo" would miss every book, because the
 * catalog files them all under the English "Machine Learning".
 */
const TOPIC_ALIASES: { subject: string; keywords: string[] }[] = [
  {
    subject: 'Machine Learning',
    keywords: [
      'tri tue nhan tao',
      'machine learning',
      'deep learning',
      'hoc may',
      'hoc sau',
      'mang no ron',
      'khoa hoc du lieu',
      'data science',
      ' ai ',
    ],
  },
  {
    subject: 'Toán học',
    keywords: ['toan', 'giai tich', 'dai so', 'xac suat', 'thong ke', 'vi phan', 'roi rac'],
  },
  {
    subject: 'Vật lý',
    keywords: ['vat ly', 'co hoc', 'dien tu hoc', 'luong tu', 'quang hoc', 'nhiet dong'],
  },
  {
    subject: 'Công nghệ thông tin',
    keywords: [
      'lap trinh',
      'cong nghe thong tin',
      'cntt',
      'c++',
      'cpp',
      'may tinh',
      'phan mem',
      'thuat toan',
      'cau truc du lieu',
      'co so du lieu',
      'he dieu hanh',
      'mang may tinh',
    ],
  },
  {
    // Space-padded: "hoa hoc" is a substring of "khoa hoc", so an unpadded alias would
    // drag the whole chemistry shelf into every question about "khoa học dữ liệu".
    subject: 'Hóa học',
    keywords: [' hoa hoc', ' hoa huu co', ' hoa vo co', ' hoa ly ', ' hoa phan tich', 'hoa sinh'],
  },
  {
    subject: 'Sinh học',
    keywords: ['sinh hoc', 'te bao', 'di truyen', 'vi sinh', 'mien dich', 'sinh thai', 'tin sinh'],
  },
  {
    subject: 'Điện tử – Viễn thông',
    // " dien tu " padded so "điện từ học" stays with Vật lý rather than matching both.
    keywords: [' dien tu ', 'vien thong', 'mach dien', 'tin hieu', 'vi mach', 'thiet ke so'],
  },
  {
    subject: 'Khoa học môi trường',
    keywords: ['moi truong', 'dia chat', 'khi tuong', 'khi hau', 'trai dat'],
  },
]

const LOCATION_WORDS = ['o dau', 'ke nao', 'tang may', 'cho nao', 'vi tri', 'tim o dau', 'loi di']
const AVAILABILITY_WORDS = ['con', 'san sang', 'kha dung', 'muon ngay', 'muon duoc', 'co san']
const HOURS_WORDS = ['may gio', 'mo cua', 'dong cua', 'gio mo', 'gio giac', 'gio lam viec']
const BORROWING_WORDS = ['gia han', 'the thu vien', 'han tra', 'tra sach', 'muon bao lau', 'phat']
const GREETING_WORDS = ['xin chao', 'chao ban', 'hello', 'ban oi']

function copiesFree(corpus: LibraryCorpus, bookId: string): number {
  return corpus.availability[bookId]?.copiesAvailable ?? 0
}

/** Books whose subject, title or author the question mentions. */
function matchBooks(corpus: LibraryCorpus, question: string): Book[] {
  const q = normalize(question)
  // Pad so a word-boundary alias like " ai " can match at the very start or end.
  const padded = ` ${q} `

  const subjects = matchSubjects(padded)
  const bySubject = corpus.books.filter((b) => subjects.includes(b.subject))

  // Free-text fallback: a title or author named directly ("Giải tích 1", "Goodfellow").
  const byText = corpus.books.filter((b) => titleOrAuthorMentioned(b, q))

  // Title/author hits lead: "Giải tích 1 nằm ở kệ nào" also matches the whole Toán học
  // subject, and the answer must be about the book that was actually named.
  const seen = new Set<string>()
  return [...byText, ...bySubject].filter((b) => (seen.has(b.id) ? false : seen.add(b.id)))
}

/**
 * Which subject shelves a question is about.
 *
 * Stripping tones makes several Vietnamese phrases contain one another: "thuật toán" is
 * an algorithm but ends in "toan", and "khoa học" ends in "hoa hoc". Matching the longest
 * alias and discarding any shorter alias contained within it keeps "sách thuật toán" on
 * the computing shelf instead of returning it plus the whole of mathematics.
 */
function matchSubjects(paddedQuestion: string): string[] {
  const hits: { subject: string; keyword: string }[] = []
  for (const topic of TOPIC_ALIASES) {
    for (const keyword of topic.keywords) {
      if (paddedQuestion.includes(keyword)) hits.push({ subject: topic.subject, keyword: keyword.trim() })
    }
  }

  const winning = hits.filter(
    (hit) => !hits.some((other) => other.keyword.length > hit.keyword.length && other.keyword.includes(hit.keyword)),
  )
  return [...new Set(winning.map((h) => h.subject))]
}

/**
 * A question mentions a book when it contains a distinctive run of its title, or the
 * author's surname. Whole-title matching alone is too strict — nobody types
 * "An Introduction to Statistical Learning" on a kiosk keyboard.
 *
 * Every comparison is on whole words: without the padding, "sách khoa học dữ liệu" hits
 * "Hóa học đại cương", because "khoa hoc" ends in "hoa hoc" once the tones are gone.
 */
function titleOrAuthorMentioned(book: Book, normalizedQuestion: string): boolean {
  const haystack = ` ${normalizedQuestion} `
  const title = normalize(book.title)
  if (title.length >= 4 && haystack.includes(` ${title} `)) return true

  // Any 2+ consecutive significant title words, e.g. "giai tich" out of "Giải tích 1".
  const words = title.split(/[^a-z0-9+]+/).filter((w) => w.length >= 3)
  for (let i = 0; i < words.length - 1; i++) {
    if (haystack.includes(` ${words[i]} ${words[i + 1]} `)) return true
  }

  const surname = normalize(book.author).split(/\s+/).pop() ?? ''
  return surname.length >= 4 && haystack.includes(` ${surname} `)
}

function listFloors(list: Book[]): string {
  const floors = [...new Set(list.map((b) => b.floor))].sort((a, b) => a - b)
  if (floors.length === 1) return `tầng ${floors[0]}`
  return `tầng ${floors.slice(0, -1).join(', ')} và ${floors[floors.length - 1]}`
}

/** "3 cuốn" / "2 tạp chí" reads better than a bare number for a mixed result set. */
function countPhrase(list: Book[]): string {
  if (list.length === 0) return 'không tài liệu nào'
  const allSame = list.every((b) => b.type === list[0].type)
  if (!allSame) return `${list.length} tài liệu`
  const noun = list[0].type === 'book' ? 'cuốn sách' : list[0].type === 'journal' ? 'số báo khoa học' : 'số tạp chí'
  return `${list.length} ${noun}`
}

function answerLocation(corpus: LibraryCorpus, list: Book[]): LibrarianReply {
  const book = list[0]
  const place = corpus.shelfLocations[book.shelfCode]
  const free = copiesFree(corpus, book.id)

  const where = place
    ? `kệ ${place.shelfCode}, tầng ${place.floor} — ${place.zone}, cách kiosk khoảng ${place.distanceMetres}m`
    : `kệ ${book.shelfCode}, tầng ${book.floor}`

  const route = place ? ` Đường đi: ${place.directions.join(' → ')}.` : ''
  const stock =
    free > 0
      ? ` Hiện còn ${free} bản trên kệ.`
      : ' Rất tiếc, cả kho hiện đã có người mượn hết.'

  return {
    intent: 'location',
    text: `"${book.title}" nằm ở ${where}.${route}${stock} Chạm vào sách bên phải để xem bản đồ chi tiết và mượn nhé.`,
    books: list,
  }
}

const TAP_HINT = 'Danh sách nằm ở cột bên phải — chạm vào một cuốn để xem vị trí kệ và mượn ngay.'

function answerBooks(
  corpus: LibraryCorpus,
  list: Book[],
  wantsAvailableOnly: boolean,
): LibrarianReply {
  const inStock = list.filter((b) => copiesFree(corpus, b.id) > 0)

  // Nothing on the shelf is worth saying up front whether or not availability was asked
  // about — the persona's worst pain is walking to a shelf only to find the book gone.
  if (inStock.length === 0) {
    const soonest = list
      .map((b) => corpus.availability[b.id]?.dueBack)
      .filter((d): d is string => Boolean(d))
      .sort()[0]
    return {
      intent: 'books',
      text:
        `Mình tìm được ${countPhrase(list)} phù hợp, nhưng tất cả đều đang có người mượn.` +
        (soonest ? ` Cuốn sớm nhất dự kiến được trả vào ngày ${soonest}.` : '') +
        ' Bạn vẫn xem được danh sách bên phải để biết vị trí kệ nhé.',
      books: list,
    }
  }

  if (wantsAvailableOnly) {
    return {
      intent: 'books',
      text: `Mình tìm thấy ${countPhrase(inStock)} đang còn trên kệ ở ${listFloors(inStock)}. ${TAP_HINT}`,
      books: inStock,
    }
  }

  const stockNote =
    inStock.length === list.length
      ? list.length === 1
        ? ' và hiện còn trên kệ'
        : ' và tất cả đều còn trên kệ'
      : `, trong đó ${inStock.length} cuốn còn trên kệ`

  return {
    intent: 'books',
    text: `Mình tìm thấy ${countPhrase(list)} ở ${listFloors(list)}${stockNote}. ${TAP_HINT}`,
    books: list,
  }
}

export function askLibrarian(question: string, corpus: LibraryCorpus): LibrarianReply {
  const { libraryStatus } = corpus
  const q = normalize(question.trim())
  const padded = ` ${q} `

  if (!q) {
    return { intent: 'fallback', text: 'Bạn muốn hỏi mình điều gì ạ?', books: [] }
  }

  // Opening hours and borrowing rules are asked *about the library*, not about a book,
  // so they are checked before any catalog matching.
  if (hasAny(q, HOURS_WORDS)) {
    return {
      intent: 'hours',
      text: `Thư viện mở cửa từ ${libraryStatus.opensAt} đến ${libraryStatus.closesAt} hằng ngày, và ${libraryStatus.isOpen ? 'hiện đang mở cửa' : 'hiện đã đóng cửa'}. Cần hỗ trợ gấp bạn gọi ${libraryStatus.supportPhone} nhé.`,
      books: [],
    }
  }

  if (hasAny(q, BORROWING_WORDS)) {
    return {
      intent: 'borrowing',
      text: 'Bạn mượn tối đa 5 cuốn trong 14 ngày và được gia hạn thêm 7 ngày nếu chưa có người đặt trước. Việc gia hạn làm ngay trong ứng dụng LibAssist trên điện thoại, không cần ra quầy. Mượn sách tại kiosk thì chạm "Mượn sách" ở trang chi tiết rồi quét mã theo hướng dẫn.',
      books: [],
    }
  }

  const matched = matchBooks(corpus, question)

  if (matched.length > 0) {
    if (hasAny(q, LOCATION_WORDS)) return answerLocation(corpus, matched)
    return answerBooks(corpus, matched, hasAny(padded, AVAILABILITY_WORDS))
  }

  // Only greet when there is nothing else to answer — "chào bạn, tìm giúp mình sách
  // Giải tích" should get the books, not a greeting.
  if (hasAny(q, GREETING_WORDS)) {
    return {
      intent: 'greeting',
      text: 'Chào bạn! Mình là trợ lý LibAssist. Bạn cần tìm sách về chủ đề gì, hay muốn biết vị trí một cuốn cụ thể?',
      books: [],
    }
  }

  return {
    intent: 'fallback',
    text: `Mình chưa tìm được tài liệu nào khớp với "${question.trim()}". Bạn thử hỏi theo môn học (ví dụ "sách về trí tuệ nhân tạo"), theo tên sách, hoặc hỏi vị trí một cuốn cụ thể nhé.`,
    books: [],
  }
}
