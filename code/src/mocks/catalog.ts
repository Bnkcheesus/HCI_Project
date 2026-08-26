// Mock book catalog — backs Job 1 / Product-Service 1 (tìm kiếm từ khóa + gợi ý AI).
// Swap this module for a real API client later; keep the exported shape stable.
// Titles, authors, cover art and shelf labels come from the Figma file
// (kiosk-home 5:715, kiosk-search-results 5:868, kiosk-book-info 19:243).

/** Document type, used by the result-type filter chips on the results screen. */
export type DocumentType = 'book' | 'journal' | 'magazine'

/** Catalogue language, used by the advanced-filter language checkboxes. */
export type Language = 'vi' | 'en'

export const LANGUAGE_LABEL: Record<Language, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  book: 'Sách',
  journal: 'Báo khoa học',
  magazine: 'Tạp chí',
}

export interface Book {
  id: string
  title: string
  author: string
  subject: string
  type: DocumentType
  coverUrl?: string
  /** Fallback spine color when no cover art exists — the editorial motif on book cards. */
  spine: 1 | 2 | 3 | 4
  description: string
  shelfCode: string
  /** Floor the shelf sits on — shown as "Kệ A3 · Tầng 2". */
  floor: number
  /** Publication year, filtered by the advanced-filter year range. */
  year: number
  language: Language
}

export const books: Book[] = [
  {
    id: 'giai-tich-1',
    title: 'Giải tích 1',
    author: 'Tác giả A',
    subject: 'Toán học',
    type: 'book',
    coverUrl: '/covers/giai-tich-1.jpg',
    spine: 1,
    description: 'Giáo trình giải tích một biến dành cho sinh viên năm nhất khối kỹ thuật.',
    shelfCode: 'MA-101',
    floor: 1,
    year: 2018,
    language: 'vi',
  },
  {
    id: 'vat-ly-dai-cuong',
    title: 'Vật lý đại cương',
    author: 'Tác giả B',
    subject: 'Vật lý',
    type: 'book',
    coverUrl: '/covers/vat-ly-dai-cuong.jpg',
    spine: 2,
    description: 'Tổng quan cơ học, nhiệt học và điện từ học cho chương trình đại cương.',
    shelfCode: 'PH-204',
    floor: 1,
    year: 2016,
    language: 'vi',
  },
  {
    id: 'lap-trinh-cpp',
    title: 'Lập trình C++',
    author: 'Tác giả C',
    subject: 'Công nghệ thông tin',
    type: 'book',
    coverUrl: '/covers/lap-trinh-cpp.jpg',
    spine: 3,
    description: 'Nhập môn lập trình hướng đối tượng với C++, kèm bài tập thực hành.',
    shelfCode: 'CS-312',
    floor: 2,
    year: 2020,
    language: 'vi',
  },
  {
    id: 'dai-so-tuyen-tinh',
    title: 'Đại số tuyến tính',
    author: 'Tác giả D',
    subject: 'Toán học',
    type: 'book',
    coverUrl: '/covers/dai-so-tuyen-tinh.jpg',
    spine: 4,
    description: 'Không gian vector, ma trận và ánh xạ tuyến tính, có ứng dụng thực tế.',
    shelfCode: 'MA-215',
    floor: 1,
    year: 2019,
    language: 'vi',
  },

  // Machine-learning shelf — the result set the Figma results screen demonstrates.
  {
    id: 'statistical-learning',
    title: 'An Introduction to Statistical Learning',
    author: 'Gareth James',
    subject: 'Machine Learning',
    type: 'book',
    coverUrl: '/covers/statistical-learning.jpg',
    spine: 1,
    description:
      'This book is intended for students in a variety of fields who want to develop practical machine-learning skills.',
    shelfCode: 'A3',
    floor: 2,
    year: 2021,
    language: 'en',
  },
  {
    id: 'pattern-recognition',
    title: 'Pattern Recognition and Machine Learning',
    author: 'Christopher Bishop',
    subject: 'Machine Learning',
    type: 'book',
    coverUrl: '/covers/pattern-recognition.jpg',
    spine: 4,
    description: 'Giáo trình kinh điển về nhận dạng mẫu và mô hình xác suất trong học máy.',
    shelfCode: 'A5',
    floor: 2,
    year: 2006,
    language: 'en',
  },
  {
    id: 'hands-on-ml',
    title: 'Hands-On Machine Learning',
    author: 'Aurélien Géron',
    subject: 'Machine Learning',
    type: 'book',
    coverUrl: '/covers/hands-on-ml.jpg',
    spine: 3,
    description: 'Thực hành học máy với Scikit-Learn, Keras và TensorFlow.',
    shelfCode: 'A4',
    floor: 2,
    year: 2022,
    language: 'en',
  },
  {
    id: 'mathematics-for-ml',
    title: 'Mathematics for Machine Learning',
    author: 'Marc Peter Deisenroth',
    subject: 'Machine Learning',
    type: 'book',
    coverUrl: '/covers/mathematics-for-ml.jpg',
    spine: 2,
    description: 'Nền tảng đại số tuyến tính, giải tích và xác suất cần cho học máy.',
    shelfCode: 'B2',
    floor: 2,
    year: 2020,
    language: 'en',
  },
  {
    id: 'jmlr-deep-learning',
    title: 'Deep Learning Advances (JMLR tuyển tập)',
    author: 'Journal of Machine Learning Research',
    subject: 'Machine Learning',
    type: 'journal',
    spine: 1,
    description: 'Tuyển tập bài báo về tiến bộ gần đây trong học sâu.',
    shelfCode: 'J1',
    floor: 3,
    year: 2024,
    language: 'en',
  },
  {
    id: 'nature-machine-intelligence',
    title: 'Nature Machine Intelligence (số mới nhất)',
    author: 'Nature Publishing Group',
    subject: 'Machine Learning',
    type: 'journal',
    spine: 2,
    description: 'Tạp chí khoa học về trí tuệ máy và ứng dụng liên ngành.',
    shelfCode: 'J2',
    floor: 3,
    year: 2025,
    language: 'en',
  },
  {
    id: 'tia-sang-ai',
    title: 'Tia Sáng — chuyên đề Trí tuệ nhân tạo',
    author: 'Tạp chí Tia Sáng',
    subject: 'Machine Learning',
    type: 'magazine',
    spine: 3,
    description: 'Chuyên đề phổ thông về trí tuệ nhân tạo và tác động xã hội.',
    shelfCode: 'M1',
    floor: 3,
    year: 2024,
    language: 'vi',
  },
]

/** Books surfaced on the kiosk home screen (Gain Creator 1 — bộ gợi ý sách). */
export const suggestedBooks = books.slice(0, 4)
