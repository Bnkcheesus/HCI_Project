# Kế hoạch: Backend + Database (PostgreSQL và SQL Server)

Trạng thái theo mục 9 (Thứ tự thực hiện):

| Bước | Trạng thái |
|---|---|
| 1. Hạ tầng server (env, dialect, docker-compose, .env.example) | ✅ xong |
| 2. `src/shared/` + re-export shim ở `src/lib/` | ✅ xong |
| 3. Migration + seeder, chạy thật trên PostgreSQL | ✅ xong — xem [database.md](database.md) |
| 4. Repos + routes đọc | ✅ xong — 44 test |
| 5. `services/checkout.ts` + `POST /api/loans` | ✅ xong — 16 test |
| 6. `src/api/` + hook Query | ✅ xong |
| 7. Cắt frontend sang API | ✅ xong — 27 file, 0 file runtime còn đọc `@/mocks` |
| 8. Xoá `loanSlips.ts`, gỡ `src/mocks` khỏi runtime | ✅ xong |
| 9. `check-sql-portability.mjs` + cập nhật CLAUDE.md/SKILL.md | ✅ xong |

**Toàn bộ kế hoạch đã hoàn tất trên nhánh PostgreSQL.** Nhánh SQL Server vẫn chưa chạy thật —
xem mục 10.

Chạy thử: `npm run dev` (Vite + API song song), rồi mở `http://localhost:5173/kiosk`.

## 1. Vì sao cần backend

Toàn bộ dữ liệu của LibAssist hiện là **mảng ở cấp module**: `src/mocks/` xuất `books`,
`availability`, `shelfLocations`, `students`, `loanHistory`, `libraryStatus`, và 42 file import
trực tiếp. Không có server, không có DB, không có ghi.

Điều đó làm **hai lời hứa trong value proposition bị hụt**, và cả hai đều đã được ghi nhận bằng
comment trong chính source:

1. **Gain Creator 3 — "đồng bộ app"**: `src/lib/loanSlips.ts` nói thẳng rằng nó dùng
   `localStorage`, chỉ chạy khi kiosk và điện thoại là *cùng một trình duyệt*, và "does not
   work, and cannot, until there is a server". Kiosk thật + điện thoại thật thì phiếu mượn
   không bao giờ tới nơi.
2. **Gain Creator 4 — "tình trạng sách theo thời gian thực"**: mượn xong không có gì giảm
   `copiesAvailable`. `src/lib/accountSlips.ts` gọi đây là "known divergence, deliberate" —
   `checkEligibility` ở kiosk chỉ đếm `loanHistory` tĩnh, không đếm phiếu vừa lập.

Backend + DB không phải hạ tầng cho vui: nó **đóng lại hai chỗ hở đó**. Giao dịch mượn sách —
kiểm thẻ, trừ số bản còn, ghi phiếu, hiện lên điện thoại — là nghiệp vụ duy nhất trong dự án
thật sự cần một server.

Yêu cầu chạy được trên **cả PostgreSQL và SQL Server** là ràng buộc chi phối tầng DB; mọi quyết
định ở mục 4 đều sinh ra từ nó.

## 2. Quyết định đã chốt

| | |
|---|---|
| Stack | Node + TypeScript, Fastify, **Kysely** (`PostgresDialect` + `MssqlDialect`, chọn ở runtime bằng env) |
| Phạm vi | **Toàn bộ** — catalog, availability, kệ, thẻ SV, lịch sử mượn, phiếu đều về DB |
| SQL Server | Chạy trên máy Windows của nhóm. Ở máy phát triển này chỉ kiểm chứng được nhánh PostgreSQL; nhánh SQL Server có migration, script kiểm tra và hướng dẫn, nhưng **chưa chạy thật** |
| Data fetching | TanStack Query |

Vì sao Kysely chứ không Prisma: `provider` trong `schema.prisma` là literal, không đọc được từ
env — muốn hai DB phải nuôi hai file schema song song. Kysely nhận dialect như một object lúc
khởi tạo, nên **một codebase, đổi biến môi trường là đổi DB**.

## 3. Kiến trúc thư mục

Server nằm **trong** `code/` (cùng `package.json`, cùng `node_modules`, cùng vitest) — không
dựng npm workspace cho một project môn học.

```
code/
  server/
    index.ts                 # Fastify bootstrap + đăng ký routes
    env.ts                   # DB_DIALECT / connection / PORT, validate bằng zod
    db/
      dialect.ts             # dựng Kysely<DB> từ env — nơi DUY NHẤT biết đang chạy DB nào
      schema.ts              # interface DB của Kysely (các bảng)
      columnTypes.ts         # helper kiểu cột theo dialect, dùng trong migration
      migrations/001-initial.ts
      seed.ts                # đọc ../src/mocks, ghi vào DB
    repos/                   # books, availability, shelves, students, loans, status
    services/checkout.ts     # giao dịch mượn sách — phần đắt giá nhất của backend
    routes/                  # books, library, students, loans, accounts, librarian
    scripts/check-sql-portability.mjs
    test/                    # integration test, chạy trên DB thật
  src/
    shared/                  # dùng chung frontend ↔ server
      types.ts               # Book, Availability, ShelfLocation, Student, LoanSlip, AccountSlip...
      text.ts                # removeDiacritics (tách khỏi lib/telex.ts)
      borrowRules.ts         # MAX_BOOKS_PER_LOAN, LOAN_DAYS, normalizeIsbn, định dạng mã phiếu
    api/
      client.ts              # fetch wrapper có kiểu
      queries.ts             # hook TanStack Query + query keys
```

`src/mocks/` **không bị xoá**. Nó đổi vai: từ nguồn dữ liệu runtime thành **nguồn seed cho DB và
fixture cho test**. Pipeline `npm run catalog` (Open Library) vẫn chạy y nguyên, chỉ là đầu ra
của nó đi tiếp một chặng nữa vào database.

## 4. Quy tắc khả chuyển (phần cốt lõi — mọi thứ khác chỉ là CRUD)

Vì SQL Server không chạy được ở máy phát triển, nguyên tắc là **né mọi cấu trúc khác nhau giữa
hai engine, thay vì viết hai nhánh code rồi chỉ test được một nhánh.**

| Vấn đề | PostgreSQL | SQL Server | Cách xử lý |
|---|---|---|---|
| Khoá chính tự tăng | `serial` / `identity` | `int identity(1,1)` | **Không dùng auto-increment ở đâu cả.** Mọi PK là chuỗi do app sinh — `books.id` vốn đã là slug, mã phiếu đã có định dạng riêng, `loans.id` = `${slipId}::${bookId}` |
| Lấy lại hàng vừa insert | `RETURNING` | `OUTPUT INSERTED` | Không dùng. App tự sinh id trước, insert xong select lại |
| Upsert | `ON CONFLICT` | `MERGE` | Không dùng. Seed là delete-rồi-insert trong một transaction |
| Chuỗi Unicode | `text` | **`nvarchar`, không phải `varchar`** | `columnTypes.ts`. Đây là bẫy dễ mất dấu tiếng Việt nhất |
| Phân trang | `LIMIT/OFFSET` | `OFFSET…FETCH`, **bắt buộc có ORDER BY** | Kysely tự biên dịch đúng; quy tắc của ta: mọi truy vấn có limit đều phải kèm `orderBy` |
| Tìm không dấu | `unaccent` / `ILIKE` | `COLLATE Latin1_General_CI_AI` | **Né cả hai**: cột `search_text` tính sẵn (thường + bỏ dấu bằng `removeDiacritics`), rồi `LIKE '%q%'` thuần. Không cần extension, không cần cấu hình collation |
| Khoá hàng khi trừ tồn | `SELECT … FOR UPDATE` | `WITH (UPDLOCK, HOLDLOCK)` | **Né**: `UPDATE availability SET copies_available = copies_available - 1 WHERE book_id = ? AND copies_available > 0` rồi kiểm `numUpdatedRows === 1n`. Nguyên tử và giống hệt nhau trên cả hai engine |
| Kiểu ngày | `date` → driver trả `Date` **local midnight** | `date` → tedious trả `Date` **UTC midnight** | Lệch múi giờ thật. Ép cả hai về chuỗi ISO ngay ở tầng driver: `pg.types.setTypeParser(1082, v => v)` bên Postgres, mapper trong repo bên MSSQL. Cả app vốn đã coi ngày là chuỗi `'YYYY-MM-DD'` và so sánh bằng `<` |
| Boolean | `boolean` | `bit` | `columnTypes.ts` + `toBool()` trong mapper |

Kèm theo là **`server/scripts/check-sql-portability.mjs`**: quét source server tìm `RETURNING`,
`ON CONFLICT`, `MERGE`, `ILIKE`, `SERIAL`, `FOR UPDATE`, và `limit()` không có `orderBy`. Rẻ, và
nó canh đúng loại lỗi mà ở máy phát triển không thể phát hiện bằng cách chạy thử.

## 5. Schema

```
books(id PK, title, isbn UNIQUE, author, subject, type, cover_url NULL, spine,
      description, shelf_code FK, floor, year, language, search_text)
shelf_locations(shelf_code PK, floor, zone, aisle, along_aisle, distance_metres)
shelf_directions(shelf_code FK, step_no, text)        -- directions[] chuẩn hoá
availability(book_id PK/FK, status, copies_total, copies_available, due_back NULL)
students(card_code PK, name, student_id, faculty, expires_at)
loan_slips(id PK, card_code FK, borrowed_at, due_at, created_at)
loans(id PK, slip_id FK, card_code FK, book_id FK, borrowed_at, due_at, returned_at NULL)
library_status(id PK = 1, is_open, opens_at, closes_at, titles_total, titles_available, support_phone)
```

`loan_slips` là bảng thật chứ không suy ra từ `loans`, đúng như comment trong
`mocks/loanHistory.ts` đã lập luận: hai lượt mượn khác nhau trong cùng một ngày sẽ dính làm một
nếu nhóm theo `borrowedAt + dueAt`.

Ngày lưu dạng `date`, đọc ra luôn là chuỗi ISO (xem mục 4). `search_text` do seeder ghi bằng
chính `removeDiacritics` mà frontend đang dùng — một định nghĩa "bỏ dấu" duy nhất cho cả hệ
thống, không có hai cách hiểu.

## 6. API

```
GET  /api/health
GET  /api/library/status           → { status, popularSubjects, yearMin, yearMax }
GET  /api/books?q=                 → { books, availability }
GET  /api/books/suggested          → { books, availability }
GET  /api/books/:id                → { book, availability, shelf }
GET  /api/books/by-isbn/:isbn      → { book, availability } | 404
GET  /api/availability?ids=a,b,c   → Record<bookId, Availability>
GET  /api/students/:cardCode       → { student, blocks: BorrowBlock[] }
POST /api/loans   { cardCode, bookIds }  → { slip }
GET  /api/accounts/:cardCode/slips → AccountSlip[]
GET  /api/slips/:id                → AccountSlip
POST /api/librarian  { question }  → { intent, text, bookIds }
```

`yearMin`/`yearMax` phải nằm trong response: `src/lib/search.ts` hiện tính chúng ở cấp module từ
`books`, và không còn `books` cục bộ thì hằng số đó không có gì để tính. `popularSubjects` cũng
vậy — nó chuyển thành `GROUP BY subject ORDER BY count DESC LIMIT 6`.

Ba điểm đáng lưu ý:

- **`POST /api/loans` là lý do backend tồn tại.** Trong một transaction: tra thẻ → chạy
  `checkEligibility` với dữ liệu *thật trong DB* → trừ tồn từng cuốn bằng câu `UPDATE … WHERE
  copies_available > 0` ở mục 4, cuốn nào trả về 0 hàng thì rollback toàn bộ → ghi `loan_slips`
  + `loans`. Server là nơi phán quyết; client chỉ hiển thị.
- **`askLibrarian` chuyển sang server.** `src/lib/librarian.ts` (328 dòng) quét toàn bộ catalog
  đồng bộ — không còn catalog ở client thì nó không chạy được. Logic và bộ test 159 dòng của nó
  chuyển gần như nguyên vẹn sang `server/`.
- **Lọc / sắp xếp / phân trang vẫn ở client.** `applyAdvancedFilters`, `sortResults`, `paginate`
  là hàm thuần đã có test; catalog 116 cuốn nên đẩy chúng xuống DB chỉ đổi lấy churn. Server lo
  phần *tìm*, client lo phần *thu hẹp*.

## 7. Cắt frontend — quy tắc một câu

**Page fetch bằng hook Query; component lá nhận dữ liệu qua props.**

Đây là chỗ chịu nhiều thay đổi nhất (42 file import `@/mocks`), nên cần một luật lặp lại được
thay vì sửa từng ca. `AvailabilityChip` là ví dụ mẫu: nó đang tự đọc `availability[bookId]` từ
biến toàn cục ở tận đáy cây component — đổi thành nhận `copiesAvailable` qua props vừa gỡ được
phụ thuộc, vừa là thiết kế đúng hơn kể cả khi không có backend.

Kiểm soát bán kính ảnh hưởng:

- `import type { Book } from '@/mocks'` → `@/shared/types`. Đây là phần lớn số import, và là
  phần đổi rẻ nhất (sửa đường dẫn, không sửa logic).
- `src/lib/telex.ts` và `src/lib/borrow.ts` giữ nguyên đường dẫn, chỉ re-export từ `src/shared/`
  — các file đang import chúng không phải đụng tới.
- `src/lib/loanSlips.ts` (localStorage) **bị xoá**. `src/lib/accountSlips.ts` mất phần trộn hai
  nguồn, chỉ còn map response API — cùng với đó là hai comment "known divergence" và "does not
  work across devices" biến mất khỏi codebase, vì chúng không còn đúng nữa.
- `useChatStore.ask` thành async. Giữ độ trễ tối thiểu `THINKING_MS`: comment trong store nói rõ
  khoảng nghỉ đó tồn tại để vùng `aria-live` có một thay đổi riêng cho trình đọc màn hình công
  bố — mất nó là mất một hành vi trợ năng, không phải mất hiệu ứng.

Test: thêm `src/test/renderWithQuery.tsx` (QueryClientProvider + `retry: false`) và một stub
`fetch` nạp từ chính `src/mocks/`. 264 test hiện có phần lớn giữ nguyên phần assert, chỉ đổi hàm
render và thêm `await` cho trạng thái loading.

## 8. Dev / chạy

Vite proxy `/api` → `http://localhost:3001`, để **mọi script Playwright trong `code/scripts/`
vẫn trỏ `localhost:5173` như cũ, không phải sửa** (chúng đều giả định `npm run dev` đang chạy).

```bash
# .env trong code/ — có .env.example kèm theo
DB_DIALECT=postgres          # hoặc mssql
DATABASE_URL=postgres://libassist:libassist@localhost:5432/libassist
MSSQL_HOST=... MSSQL_PORT=1433 MSSQL_USER=sa MSSQL_PASSWORD=... MSSQL_DATABASE=libassist

npm run db:migrate           # Kysely migrator, theo DB_DIALECT
npm run db:seed              # src/mocks → DB
npm run dev                  # vite + api song song
```

`docker-compose.yml` khai báo cả `postgres:16` lẫn `mssql/server:2022`. Ở máy phát triển chỉ
dựng postgres. Service mssql viết sẵn để nhóm chạy trên Windows — kèm ghi chú Apple Silicon cần
bật Rosetta, phòng khi sau này ai đó thử trên máy Mac.

## 9. Thứ tự thực hiện

1. Deps + `server/env.ts` + `db/dialect.ts` + `docker-compose.yml` + `.env.example`
2. `src/shared/` (types, text, borrowRules) + re-export shim ở `src/lib/` — chưa sờ component
3. Migration + `columnTypes.ts` + seeder từ `src/mocks`; chạy migrate/seed trên Postgres
4. Repos + routes đọc (books, availability, shelves, status, librarian) + integration test
5. `services/checkout.ts` + `POST /api/loans` + `/api/accounts/:card/slips` — phần ghi
6. `src/api/` (client + hook Query) + `renderWithQuery`
7. Cắt frontend theo cụm: catalog/tìm kiếm → book-info/location → scan/checkout → mobile
8. Xoá `loanSlips.ts`, rút gọn `accountSlips.ts`, gỡ `src/mocks` khỏi runtime (giữ làm seed +
   fixture)
9. `check-sql-portability.mjs`; cập nhật `CLAUDE.md` + `.claude/skills/code-generator/SKILL.md`
   ("No backend exists" ở SKILL.md và mục "Trạng thái hiện tại" ở CLAUDE.md đều sẽ sai sau đợt
   này)

## 10. Verification

```bash
cd code
npm run db:migrate && npm run db:seed     # Postgres
npm run test                              # vitest: frontend + server integration
npm run build && npm run lint
node server/scripts/check-sql-portability.mjs
```

Rồi mở trình duyệt thật — theo đúng quy tắc đã có trong repo, test xanh **không đủ** để kết luận:

```bash
npm run dev
node scripts/check-chrome.mjs      # kiosk: 4 khổ màn, không tràn, không cuộn ở home
node scripts/check-mobile.mjs      # mobile: 4 khổ điện thoại, chạm 48px, tương phản a11y
node scripts/shot-scan.mjs         # đi hết luồng mượn tới phiếu — và mở ảnh ra xem
```

Ba phép kiểm phải đạt, vì đó là ba lời hứa đợt này mở khoá:

1. **Trừ tồn thật**: mượn `cormen-algorithms` ở kiosk → `copiesAvailable` giảm 1 → tải lại trang
   tìm kiếm thấy con số mới (Gain Creator 4).
2. **Đồng bộ liên thiết bị thật**: mượn ở kiosk trên trình duyệt A → mở `/mobile/phieu-muon`
   trên trình duyệt B (khác profile, sạch localStorage) → phiếu có ở đó (Gain Creator 3).
3. **Giới hạn mượn thật**: mượn tới ngưỡng `MAX_BOOKS_PER_LOAN` rồi mượn tiếp → server chặn,
   không phải client chặn dựa trên dữ liệu tĩnh.

Nhánh SQL Server: migration + seed + cùng bộ integration test chạy được bằng `DB_DIALECT=mssql`,
kèm hướng dẫn trong `code/docs/database.md`. **Chưa chạy thật ở máy phát triển** — nhóm chạy
trên Windows rồi báo lại kết quả.
