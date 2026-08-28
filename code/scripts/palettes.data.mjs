/**
 * Candidate palettes for LibAssist, in the shape index.css already uses.
 *
 * Every one keeps the *structure* of the current palette rather than only its hues: a
 * near-neutral ground in three close steps, colour reserved for the three things that
 * carry meaning (the action, the availability signal, the refusal), and four spine
 * accents. Swapping a palette is meant to change the mood, never the semantics — an
 * evenly-coloured interface reads as decorated, and the persona has to be able to tell
 * "available" from "action" from "problem" at a glance.
 *
 * Contrast is audited by scripts/check-palette.mjs. Do not hand-edit a value here without
 * re-running it: the persona has low vision and every pairing has to clear AA for normal
 * text, not the looser large-text threshold.
 */

/** The adopted palette. Named separately so `current` can point at it, not copy it. */
const NUA_DEM = {
  page: '#f4f5f6', chrome: '#ecedef', chromeDeep: '#dfe1e4',
  ink: '#12151b', inkSoft: '#4f545d', inkFaint: '#626871',
  rule: '#dfe1e4', ruleSoft: '#eaebee', sunken: '#8d939c',
  navyDeep: '#0e1526', navy: '#16233d', navySoft: '#8a5a0c',
  live: '#125239', liveInk: '#125239',
  destructive: '#a3202e',
  spine1: '#16233d', spine2: '#125239', spine3: '#8a5a0c', spine4: '#7a3550',
}

export const PALETTES = {
  /**
   * What src/index.css actually ships, as of adopting H. Spread from `nuaDem` rather than
   * copied, so the record cannot drift from the candidate it was chosen as — a duplicated
   * list of hexes would go stale the first time one value is nudged.
   *
   * The palette it replaced failed two of its own checks: `--ink-faint` at 4.33:1 on the
   * chrome bar (AA wants 4.5) and `--sunken` — the border telling a reader where a text
   * field begins — at 1.57:1 on white against the 3:1 WCAG 1.4.11 asks of a control
   * boundary. Both are fixed here.
   */
  current: {
    reference: true,
    label: 'Đang chạy — H · Nửa đêm & Nghệ',
    note: 'Bảng màu hiện có trong src/index.css. Giống hệt mục H bên dưới.',
    ...NUA_DEM,
  },

  cham: {
    label: 'A · Chàm — Indigo & Ngọc lục',
    note:
      'Lạnh và sắc nét hơn hiện tại. Nền xám ngả xanh, hành động là chàm bão hoà, tín hiệu ' +
      'còn sách là ngọc lục. Gần với bảng hiện tại nhất — đổi sang ít rủi ro nhất.',
    page: '#f4f5f7', chrome: '#eceef2', chromeDeep: '#dfe2e8',
    ink: '#14161c', inkSoft: '#51555f', inkFaint: '#666a75',
    rule: '#dfe2e8', ruleSoft: '#ecedf1', sunken: '#8e929e',
    navyDeep: '#1e2a6e', navy: '#2a3a8f', navySoft: '#3b4da8',
    live: '#0b6b46', liveInk: '#0b6b46',
    destructive: '#a3202e',
    spine1: '#2a3a8f', spine2: '#0b6b46', spine3: '#8a5a0c', spine4: '#6b3aa0',
  },

  thanChi: {
    label: 'B · Than chì — Graphite & Hổ phách',
    note:
      'Gần như đơn sắc. Hành động là than chì đen, nên màu duy nhất còn ý nghĩa trên màn ' +
      'hình là xanh "còn sách" và đỏ "quá hạn" — tín hiệu nổi bật nhất trong bốn bảng. ' +
      'Hổ phách chỉ xuất hiện ở gáy sách.',
    page: '#f5f5f4', chrome: '#eeeeec', chromeDeep: '#e1e1de',
    ink: '#17181a', inkSoft: '#53555a', inkFaint: '#68696f',
    rule: '#e1e1de', ruleSoft: '#ebebe9', sunken: '#909089',
    navyDeep: '#17181c', navy: '#26282f', navySoft: '#414450',
    live: '#12603d', liveInk: '#12603d',
    destructive: '#9c2418',
    spine1: '#26282f', spine2: '#12603d', spine3: '#8a5410', spine4: '#7a3520',
  },

  datNung: {
    label: 'C · Đất nung — Gạch & Thông',
    note:
      'Ấm nhất. Nền ngà, hành động là gạch nung, tín hiệu còn sách là xanh thông. ' +
      '⚠ Cảnh báo đã kiểm bằng mắt: trong hàng trạng thái, "Đang mượn" (gạch) và ' +
      '"Quá hạn" (đỏ thẫm) nằm cạnh nhau rất khó tách — cả hai đều đạt AA khi đo riêng, ' +
      'nhưng số đo tương phản không nói được hai sắc độ có phân biệt nổi với nhau hay ' +
      'không. Với persona thị lực kém thì đây là rủi ro thật, không phải chuyện thẩm mỹ.',
    page: '#faf7f2', chrome: '#f3efe7', chromeDeep: '#e7e1d6',
    ink: '#1d1a15', inkSoft: '#585049', inkFaint: '#6b6259',
    rule: '#e7e1d6', ruleSoft: '#f0ebe3', sunken: '#96897a',
    navyDeep: '#7a3712', navy: '#8f4419', navySoft: '#a3552a',
    live: '#155c3b', liveInk: '#155c3b',
    destructive: '#93132f',
    spine1: '#8f4419', spine2: '#155c3b', spine3: '#7a5a12', spine4: '#4a3f6b',
  },

  timTram: {
    label: 'D · Tím trầm — Plum & Rêu',
    note:
      'Khác biệt nhất, ít giống hệ thống hành chính nhất. Nền xám ngả tím, hành động là ' +
      'tím mận, tín hiệu còn sách là rêu. Tách bạch rõ ba màu chức năng vì tím không nằm ' +
      'giữa xanh lá và đỏ trên vòng màu.',
    page: '#f6f4f6', chrome: '#efebf0', chromeDeep: '#e2dde4',
    ink: '#17141a', inkSoft: '#55505c', inkFaint: '#686370',
    rule: '#e2dde4', ruleSoft: '#ebe7ec', sunken: '#948ba0',
    navyDeep: '#4a1f5c', navy: '#5b2a70', navySoft: '#71408a',
    live: '#0f6244', liveInk: '#0f6244',
    destructive: '#a02133',
    spine1: '#5b2a70', spine2: '#0f6244', spine3: '#8a5410', spine4: '#1d5570',
  },

  coVit: {
    label: 'E · Cổ vịt — Teal & Lá mạ',
    note:
      'Hành động là xanh mòng két, tín hiệu còn sách kéo về xanh lá mạ ngả vàng để tách ' +
      'khỏi nó. Nền cũng ngả xanh nhẹ nên toàn màn hình nằm trong một họ màu lạnh, thay ' +
      'vì nền trung tính đỡ cho một điểm nhấn.',
    page: '#f3f6f5', chrome: '#eaefee', chromeDeep: '#dce4e3',
    ink: '#12191a', inkSoft: '#4e585a', inkFaint: '#606c6e',
    rule: '#dce4e3', ruleSoft: '#e9efee', sunken: '#889798',
    navyDeep: '#0a464f', navy: '#0d5560', navySoft: '#146673',
    live: '#2f6b12', liveInk: '#2f6b12',
    destructive: '#a3202e',
    spine1: '#0d5560', spine2: '#2f6b12', spine3: '#8a5410', spine4: '#6b3aa0',
  },

  dienTu: {
    label: 'F · Điện tử — Xanh dương rực & Trắng lạnh',
    note:
      'Sáng và bão hoà nhất — gần với ứng dụng công nghệ hơn là với thư viện. Nền trắng ' +
      'ngả xanh, hành động là xanh dương rực. Được cái nút bấm không thể nhầm với thứ gì ' +
      'khác trên màn hình; mất cái không khí "giấy và gỗ" của các bảng còn lại.',
    page: '#f2f5fa', chrome: '#e9eef7', chromeDeep: '#dae2f0',
    ink: '#101623', inkSoft: '#4d5566', inkFaint: '#5f6879',
    rule: '#dae2f0', ruleSoft: '#e8edf5', sunken: '#8b95aa',
    navyDeep: '#0842ab', navy: '#0b52d1', navySoft: '#1f5fd6',
    live: '#0b6b46', liveInk: '#0b6b46',
    destructive: '#c01730',
    spine1: '#0b52d1', spine2: '#0b6b46', spine3: '#8a5410', spine4: '#7a2fa8',
  },

  datSet: {
    label: 'G · Đất sét — Nền hồng đất & Mực xanh',
    note:
      'Điểm lạ nằm ở *nền*, không ở nút: nền ngà ngả hồng đất, còn hành động lại là mực ' +
      'xanh đen rất trầm. Ba màu chức năng vẫn quen thuộc, nhưng cả màn hình ấm lên và ' +
      'không giống bất kỳ phần mềm hành chính nào.',
    page: '#faf4f3', chrome: '#f3eae8', chromeDeep: '#e8dcd9',
    ink: '#1c1614', inkSoft: '#574d4a', inkFaint: '#6b5f5b',
    rule: '#e8dcd9', ruleSoft: '#f0e7e5', sunken: '#9a8a86',
    navyDeep: '#16263f', navy: '#1c2f4d', navySoft: '#33507d',
    live: '#14603c', liveInk: '#14603c',
    destructive: '#a02030',
    spine1: '#1c2f4d', spine2: '#14603c', spine3: '#8a5216', spine4: '#7a3550',
  },

  nuaDem: {
    label: 'H · Nửa đêm & Nghệ',
    note:
      'Hai màu nhấn thay vì một: nút chính là xanh nửa đêm gần như đen, còn hàng đang ' +
      'chọn chuyển sang vàng nghệ. Thứ người đọc *bấm* và thứ người đọc *đang ở trên* trở ' +
      'thành hai màu khác hẳn nhau — không bảng nào khác làm vậy. ĐÃ CHỌN, đang chạy. ' +
      '⚠ Hiện --navy-soft mới chỉ được dùng ở avatar trên mobile: tab và số trang ở kiosk ' +
      'vẫn tô bg-primary, nên màu nhấn thứ hai đã khai báo nhưng chưa hiện ở nơi nó có ích.',
    ...NUA_DEM,
  },
}
