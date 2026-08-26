// Mock real-time availability — backs Gain Creator 4 / Pain Reliever 2
// (hiển thị tình trạng khả dụng của sách theo thời gian thực).

export type AvailabilityStatus = 'available' | 'borrowed' | 'reserved'

export interface Availability {
  bookId: string
  status: AvailabilityStatus
  copiesTotal: number
  copiesAvailable: number
  /** When every copy is out, the date the next one is due back ("Chờ trả: 25/11"). */
  dueBack?: string
}

export const availability: Record<string, Availability> = {
  'giai-tich-1': { bookId: 'giai-tich-1', status: 'available', copiesTotal: 4, copiesAvailable: 3 },
  'vat-ly-dai-cuong': {
    bookId: 'vat-ly-dai-cuong',
    status: 'available',
    copiesTotal: 3,
    copiesAvailable: 1,
  },
  'lap-trinh-cpp': {
    bookId: 'lap-trinh-cpp',
    status: 'borrowed',
    copiesTotal: 2,
    copiesAvailable: 0,
    dueBack: '02/09',
  },
  'dai-so-tuyen-tinh': {
    bookId: 'dai-so-tuyen-tinh',
    status: 'available',
    copiesTotal: 5,
    copiesAvailable: 4,
  },
  'statistical-learning': {
    bookId: 'statistical-learning',
    status: 'available',
    copiesTotal: 3,
    copiesAvailable: 2,
  },
  'pattern-recognition': {
    bookId: 'pattern-recognition',
    status: 'borrowed',
    copiesTotal: 2,
    copiesAvailable: 0,
    dueBack: '25/11',
  },
  'hands-on-ml': {
    bookId: 'hands-on-ml',
    status: 'available',
    copiesTotal: 4,
    copiesAvailable: 1,
  },
  'mathematics-for-ml': {
    bookId: 'mathematics-for-ml',
    status: 'available',
    copiesTotal: 2,
    copiesAvailable: 2,
  },
  'jmlr-deep-learning': {
    bookId: 'jmlr-deep-learning',
    status: 'available',
    copiesTotal: 1,
    copiesAvailable: 1,
  },
  'nature-machine-intelligence': {
    bookId: 'nature-machine-intelligence',
    status: 'borrowed',
    copiesTotal: 1,
    copiesAvailable: 0,
    dueBack: '30/08',
  },
  'tia-sang-ai': {
    bookId: 'tia-sang-ai',
    status: 'available',
    copiesTotal: 2,
    copiesAvailable: 2,
  },
}
