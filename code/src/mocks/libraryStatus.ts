// Mock library-wide live status — reinforces Gain Creator 4 (dữ liệu theo thời gian thực)
// at the whole-collection level, and gives the persona the opening-hours context they
// need when squeezing a visit between classes (scenario.md: "chỉ có 15 phút").

export interface LibraryStatus {
  isOpen: boolean
  opensAt: string
  closesAt: string
  titlesTotal: number
  titlesAvailable: number
  supportPhone: string
}

export const libraryStatus: LibraryStatus = {
  isOpen: true,
  opensAt: '07:00',
  closesAt: '21:00',
  titlesTotal: 12480,
  titlesAvailable: 3204,
  supportPhone: '1900 6080',
}

/** Popular subjects, surfaced as one-tap shortcuts — Job 1 / Gain Creator 5. */
export const popularSubjects: string[] = [
  'Toán học',
  'Vật lý',
  'Công nghệ thông tin',
  'Khoa học dữ liệu',
  'Kinh tế',
  'Ngoại ngữ',
]
