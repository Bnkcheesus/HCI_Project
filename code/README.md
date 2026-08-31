# LibAssist — ứng dụng

Cài đặt thực tế của LibAssist: **kiosk thư viện thông minh** + **ứng dụng di động đồng hành**,
dựng từ pipeline UX của repo (persona → value proposition → scenario).

Một dự án Vite duy nhất phục vụ hai bề mặt: `/kiosk/*` cho màn hình cảm ứng lớn đặt trong thư
viện, `/mobile/*` cho điện thoại người đọc. Chúng dùng chung design token, chung component, và
nối với nhau bằng **cú bắt tay QR** — mã QR trên trang sách của kiosk mở đúng màn định vị kệ
trên điện thoại.

> **Trạng thái**: 13 màn đã xong và đã qua nhiều vòng chỉnh sửa UI/UX thật. Backend + database
> đang làm dở: schema, migration và seeder đã chạy thật trên PostgreSQL, nhưng **frontend vẫn
> đang đọc `src/mocks/` chứ chưa gọi API**. Lộ trình ở
> [docs/ke-hoach-backend-database.md](docs/ke-hoach-backend-database.md).

## Chạy thử nhanh

Chỉ xem giao diện thì không cần database:

```bash
npm install
npm run dev          # http://localhost:5173/kiosk
```

Kiosk thiết kế cho màn 1280×720 trở lên; các màn `/mobile/*` cho khổ điện thoại (hẹp nhất là
iPhone SE 375×667 — đây là khổ hay làm vỡ bố cục nhất, xem phần Kiểm chứng).

Muốn dựng cả database (chưa cần thiết để xem app chạy):

```bash
cp .env.example .env    # sửa cho khớp máy bạn
npm run db:migrate
npm run db:seed
npm run test:server
```

Hướng dẫn đầy đủ cho cả PostgreSQL lẫn SQL Server: [docs/database.md](docs/database.md).

## Màn hình

| Route | Màn | Giá trị nó phục vụ |
|---|---|---|
| `/kiosk` | Trang chủ | Gợi ý sách, lối tắt chủ đề |
| `/kiosk/search` | Tìm kiếm | Bàn phím ảo có Telex, tìm bằng giọng nói |
| `/kiosk/search/results` | Kết quả | Lọc / sắp xếp / phân trang, bộ lọc nâng cao |
| `/kiosk/ai-chat` | Thủ thư AI | Gain Creator 1 — gợi ý theo môn học/sở thích |
| `/kiosk/books/:bookId` | Chi tiết sách | Tình trạng còn/hết, bản đồ kệ, QR sang điện thoại |
| `/kiosk/scan` | Hướng dẫn tự mượn | Pain Reliever 3 — không cần chờ thủ thư |
| `/kiosk/scan/step-1` | Quét sách | Quét nhiều cuốn, nhập tay khi mã mờ |
| `/kiosk/scan/step-2` | Quét thẻ | Kiểm hạn thẻ, sách quá hạn, giới hạn mượn |
| `/kiosk/borrow-complete` | Phiếu mượn | In phiếu hoặc đồng bộ app |
| `/mobile` | Trang chủ | Đang mượn gì, hạn trả khi nào |
| `/mobile/qr` | Quét mã | Nhận cú bắt tay từ kiosk |
| `/mobile/location` | Định vị kệ | Bản đồ **kèm chỉ dẫn bằng chữ** |
| `/mobile/phieu-muon` | Phiếu mượn | Lịch sử mượn, nhắc hạn trả |

Mỗi màn đều truy vết ngược về một Product/Service, Pain Reliever hoặc Gain Creator trong
`value-proposition/output/value-proposition.md` — comment đầu mỗi file page ghi rõ cái nào.

## Cấu trúc

```
src/
  kiosk/            màn hình /kiosk/*  (scan/ là luồng tự mượn 3 bước)
  mobile/           màn hình /mobile/*
  components/
    kiosk/          ~25 component dùng chung (thẻ sách, bàn phím, chat, bản đồ kệ…)
    mobile/         chrome điện thoại, thẻ phiếu mượn
    ui/             primitive shadcn, thêm khi cần
  lib/              logic thuần, không React: search, librarian, borrow, telex, qrHandoff…
  shared/           dùng chung frontend ↔ server: types, text, borrowRules
  mocks/            catalog/availability/map/students/loans — nguồn seed + fixture test
  state/            4 store Zustand
  styles/tokens.css thang chữ, shadow, override chế độ trợ năng
  index.css         design token (:root), font, Tailwind
server/
  db/               dialect, schema, migration, seeder
  test/             test toàn vẹn dữ liệu, chạy trên DB thật
scripts/            pipeline catalog + script kiểm chứng Playwright
docs/               nguồn dữ liệu, test case mượn sách, database, kế hoạch backend
```

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server, cổng 5173 |
| `npm run build` | `tsc -b` rồi build production |
| `npm run test` | Vitest — 264 test frontend |
| `npm run test:server` | 18 test toàn vẹn dữ liệu, cần DB đã seed |
| `npm run lint` | oxlint |
| `npm run db:migrate` / `db:seed` / `db:reset` | Schema và dữ liệu |
| `npm run catalog` / `catalog:offline` | Sinh lại catalog từ Open Library (hoặc từ cache) |

## Dữ liệu

**Không phải dữ liệu bịa.** 116 đầu tài liệu với tên sách, tác giả, năm xuất bản, ISBN-13 và
ảnh bìa lấy thật từ [Open Library](https://openlibrary.org); chủ đề, mã kệ và mô tả tiếng Việt
là quyết định biên mục của thư viện. Chi tiết ở
[docs/nguon-du-lieu-catalog.md](docs/nguon-du-lieu-catalog.md).

Ba file `src/mocks/catalog.ts`, `availability.ts`, `libraryMap.ts` là **file sinh tự động** —
sửa `scripts/catalog-seed.mjs` rồi chạy lại, đừng sửa trực tiếp.

## Trợ năng không phải việc làm sau

Persona của dự án (Nguyễn Minh Khang) **thị lực kém**, và value proposition dành hẳn một
Product/Service cho việc đó. Nên mọi thành phần tương tác đều phải có focus state thật, vùng
chạm ≥48px, nhãn ARIA, và tương phản đạt WCAG AA **cho chữ thường (4.5:1)** — không dùng ngưỡng
nới lỏng của chữ lớn. Nút trợ năng trên mỗi màn bật `html[data-a11y]`, phóng chữ và đẩy tương
phản lên kịch.

## Kiểm chứng — test xanh là chưa đủ

jsdom (thứ Vitest chạy trên đó) **không dựng flexbox/grid, không phân giải biến CSS, không đo
được tương phản**. Mọi lỗi bố cục, tràn khung và tương phản mà dự án này từng gặp đều vô hình
với `npm run test` và chỉ lộ ra trong trình duyệt thật.

```bash
npm run dev                        # rồi ở terminal khác:
node scripts/check-chrome.mjs      # kiosk: header/footer ghim đúng chỗ, không tràn, trang chủ không cuộn
node scripts/check-mobile.mjs      # mobile: 4 khổ điện thoại, chạm 48px, tương phản chế độ trợ năng
node scripts/check-palette.mjs     # mọi cặp màu component thật sự vẽ ra, đo theo AA chữ thường
node scripts/shot-scan.mjs         # đi hết luồng mượn tới phiếu, chụp từng bước
```

`check-chrome` và `check-mobile` là hai cửa gác chính. **Chạy xong phải mở ảnh chụp ra xem** —
"script in ok" mà không nhìn ảnh đã bỏ lọt lỗi thật nhiều lần trong dự án này.

## Ngôn ngữ

Chữ hiển thị cho người dùng (nhãn, nút, thông báo) bằng **tiếng Việt**. Tên biến, tên hàm,
comment và commit message bằng **tiếng Anh** theo quy ước lập trình. Tài liệu trong `docs/`
bằng tiếng Việt.

## Đọc thêm

- [.claude/skills/code-generator/SKILL.md](../.claude/skills/code-generator/SKILL.md) — quy ước
  kiến trúc, bảng truy vết màn hình, và danh sách **Gotchas** dài ghi lại mọi cạm bẫy đã gặp
  thật (bug `<button>` của WebKit, hành vi thanh cuộn, chế độ a11y gộp token về cùng màu đen…).
  Đọc trước khi sửa gì trong này.
- [docs/database.md](docs/database.md) — dựng PostgreSQL / SQL Server.
- [docs/ke-hoach-backend-database.md](docs/ke-hoach-backend-database.md) — kế hoạch backend và
  tiến độ.
- [docs/test-cases-muon-sach.md](docs/test-cases-muon-sach.md) — bảng test case luồng mượn.
