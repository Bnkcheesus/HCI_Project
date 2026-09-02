# Hướng dẫn cài đặt và chạy LibAssist

Hướng dẫn từng bước cho hai môi trường của nhóm: **macOS + PostgreSQL** và
**Windows + SQL Server**. Cùng một codebase, đổi `DB_DIALECT` là đổi database.

Tổng quan dự án và cấu trúc thư mục: [README.md](README.md).
Chi tiết kỹ thuật về database: [docs/database.md](docs/database.md).

---

## Phần chung — cả hai máy

**Node.js ≥ 22.12** là bắt buộc (Kysely cần ≥ 22, Vite 8 cần ≥ 22.12). Kiểm bằng:

```bash
node -v
```

Nếu thấp hơn, `npm install` vẫn chạy nhưng **chỉ cảnh báo rồi cài tiếp**, và lỗi sẽ nổ lúc
chạy — đừng bỏ qua bước kiểm này.

Không cần mạng để chạy: font tự host qua npm, ảnh bìa nằm sẵn trong `public/covers/`, dữ liệu
sách đã cache trong `scripts/catalog-resolved.json`.

---

## 🍎 macOS + PostgreSQL

### 1. Dựng PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
pg_isready                    # phải in "accepting connections"
createdb libassist            # tạo database rỗng
```

> `npm run db:migrate` tạo **bảng**, không tạo **database**. Database rỗng phải có trước.

Dùng Docker cũng được — `docker compose up -d postgres` tự tạo luôn database tên `libassist`.

### 2. Cài và cấu hình

```bash
cd code
npm install
cp .env.example .env
```

Sửa `.env`:

```
DB_DIALECT=postgres
PORT=3001
DATABASE_URL=postgres://<tên-user-mac-của-bạn>@localhost:5432/libassist
```

Homebrew tạo user Postgres trùng tên tài khoản máy và **không đặt mật khẩu**, nên URL không có
phần `:password`. Nếu dùng Docker thì là
`postgres://libassist:libassist@localhost:5432/libassist`.

### 3. Tạo bảng và nạp dữ liệu

```bash
npm run db:migrate    # tạo 8 bảng
npm run db:seed       # nạp 116 sách, 116 kệ, 5 thẻ, 14 khoản mượn
```

### 4. Chạy

```bash
npm run dev
```

Mở **http://localhost:5173/kiosk** (kiosk) hoặc **http://localhost:5173/mobile** (điện thoại).

Lệnh này chạy hai tiến trình song song: API ở `:3001` và Vite ở `:5173`. Vite proxy `/api` sang
API nên trình duyệt chỉ nói chuyện với **một** origin — không có CORS để cấu hình sai.

### 5. Build bản production

```bash
npm run build      # tsc -b (kiểm kiểu cả frontend lẫn server) rồi vite build → dist/
npm run preview    # xem thử trên :4173 — vẫn proxy /api, nên cần npm run dev:api chạy song song
```

`npm run build` **chỉ đóng gói frontend**. Backend chạy thẳng từ TypeScript qua `tsx`, không có
bước build server riêng — đây là đồ án môn học, không phải sản phẩm triển khai.

---

## 🪟 Windows + SQL Server

> **Nói trước cho rõ**: phần này **chưa chạy thật** — máy phát triển là macOS. Code viết để
> chạy được, có script kiểm tra tính khả chuyển, nhưng người chạy Windows là người xác nhận
> đầu tiên. Chạy xong báo lại kết quả `npm run test:server`.

### 1. Bật SQL Server cho phép kết nối

Đây là chỗ hay hỏng nhất, và hỏng theo kiểu **treo rồi timeout** chứ không báo lỗi rõ ràng.

Mở **SQL Server Configuration Manager**:

- **SQL Server Network Configuration → Protocols → TCP/IP → Enabled = Yes.**
  Bản Express mặc định **tắt** TCP/IP; tắt thì driver không vào được.
- Khởi động lại service SQL Server sau khi đổi.

Rồi trong **SSMS**: chuột phải server → Properties → Security → chọn **SQL Server and Windows
Authentication mode** (mixed mode), và bật login `sa` kèm mật khẩu. Nếu cài ở chế độ
Windows-auth-only thì `sa` đang bị khoá.

### 2. Tạo database

Trong SSMS, hoặc bằng `sqlcmd`:

```sql
CREATE DATABASE libassist;
```

### 3. Cài và cấu hình

```cmd
cd code
npm install
copy .env.example .env
```

*(PowerShell thì dùng `Copy-Item .env.example .env`)*

Sửa `.env` — **chọn một trong hai** tuỳ cách cài SQL Server:

**Nếu là SQL Server bản đầy đủ, cổng 1433:**

```
DB_DIALECT=mssql
PORT=3001
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=<mật khẩu sa của bạn>
MSSQL_DATABASE=libassist
MSSQL_TRUST_CERT=true
```

**Nếu là SQL Server Express** (cài mặc định thành `localhost\SQLEXPRESS`):

```
DB_DIALECT=mssql
PORT=3001
MSSQL_HOST=localhost
MSSQL_INSTANCE=SQLEXPRESS
MSSQL_USER=sa
MSSQL_PASSWORD=<mật khẩu sa của bạn>
MSSQL_DATABASE=libassist
MSSQL_TRUST_CERT=true
```

Express chạy trên **cổng động**, không phải 1433, nên cấu hình bằng `MSSQL_PORT` sẽ timeout.
`MSSQL_INSTANCE` có trong dự án chính vì chỗ này — khi có nó, driver tự hỏi SQL Browser lấy
cổng, và `MSSQL_PORT` bị bỏ qua. **Hai thứ này xung khắc, đặt cả hai là hỏng.**

`MSSQL_TRUST_CERT=true` cần cho bản cài nội bộ dùng chứng chỉ tự ký; production thật đặt `false`.

### 4–5. Y hệt macOS

```cmd
npm run db:migrate
npm run db:seed
npm run dev
```

Các script npm dùng `&&`, nhưng npm chạy chúng qua `cmd.exe` chứ không qua PowerShell, nên
`&&` hoạt động kể cả trên PowerShell 5.1.

---

## Kiểm tra chạy đúng

```bash
npm run test          # 253 test frontend — chạy được ở mọi máy, không cần DB
npm run test:server   # 67 test API + database — tự seed lại rồi chạy trên DB thật
```

`npm run test:server` chính là **phép kiểm khả chuyển**: cùng một bộ assert chạy trên cả hai
engine. Nếu SQL Server dùng nhầm `varchar` thay vì `nvarchar` thì test
`preserves Vietnamese diacritics` sẽ đỏ — lỗi này **không thể tái hiện trên PostgreSQL**, nên
chạy nó trên máy Windows là việc chỉ người dùng Windows làm được.

Muốn chạy thêm script kiểm giao diện thì cần tải trình duyệt một lần:

```bash
npx playwright install chromium
```

Thiếu bước này sẽ gặp `Executable doesn't exist` — gói `playwright` không tự tải trình duyệt
lúc `npm install`.

---

## Khi có sự cố

| Hiện tượng | Nguyên nhân |
|---|---|
| Màn hình chỉ hiện "Đang tải…" | API chưa chạy. Dùng `npm run dev` chứ đừng dùng `dev:web` |
| `Cấu hình không hợp lệ (code/.env)` | Chưa tạo `.env`, hoặc thiếu biến — thông báo lỗi liệt kê đúng biến còn thiếu |
| Migrate báo database không tồn tại | Chưa `createdb libassist` / `CREATE DATABASE libassist` |
| SQL Server timeout khi kết nối | TCP/IP chưa bật, hoặc là Express mà chưa điền `MSSQL_INSTANCE` |
| Dữ liệu lộn xộn sau khi thử mượn | `npm run db:seed` để về trạng thái gốc |

## Thẻ sinh viên để thử

Sau khi seed, năm thẻ demo minh hoạ đủ các kết cục máy tự mượn phải xử lý:

| Mã thẻ | Tên | Trạng thái |
|---|---|---|
| `20215012` | Nguyễn Minh Khang *(persona)* | ✅ mượn được — còn chỗ cho 4 cuốn |
| `25215012` | Lê Trang Anh | ✅ mượn được |
| `20219999` | Trần Thu Hà | ❌ thẻ hết hạn |
| `20218888` | Lê Văn Nam | ❌ có 2 cuốn quá hạn |
| `20217777` | Phạm Gia Bảo | ❌ đang mượn 5 cuốn, chạm giới hạn |

Nút "Mô phỏng quét thẻ" ở bước 2 của luồng tự mượn dùng thẻ persona `20215012`.

---

## Demo mượn – trả

Vòng đầy đủ để diễn trước lớp. Mấu chốt là **tồn kho đi xuống rồi quay lại được**, chứ không
phải chỉ mượn được.

> **Chạy `npm run db:seed` trước khi diễn.** Mỗi lần thử nghiệm đều để lại dấu vết trong
> database, nên con số ở bảng dưới chỉ đúng khi bắt đầu từ trạng thái gốc. Đây là bước dễ quên
> nhất và là lý do phổ biến nhất khiến buổi demo lệch khỏi kịch bản.

| Bước | Làm gì | Nhìn thấy gì |
|---|---|---|
| 1 | Mở `/kiosk/books/cormen-algorithms` | *Còn 3 cuốn* |
| 2 | Bấm **Mượn sách**, đi hết luồng quét | Phiếu mượn in ra |
| 3 | Quay lại trang sách đó | *Còn 2 cuốn* — tồn kho thật đã giảm |
| 4 | Mở `/mobile/phieu-muon` | Sách nằm ở mục **Đang mượn** |
| 5 | Mở **`/admin`**, bấm **Trả sách** | Xác nhận "Đã trả …" |
| 6 | Mở lại `/mobile/phieu-muon` | Sách chuyển sang mục **Đã trả** |
| 7 | Mở lại trang sách trên kiosk | *Còn 3 cuốn* — về đúng mốc ban đầu |

Bước 4 và 6 là chỗ đáng chỉ cho người xem: **không có dòng code nào của màn hình điện thoại
biết đến việc trả sách**. Nó chỉ đọc `returned_at` từ database, nên vừa trả xong là nó tự đổi
mục. Đó là điều chỉ có backend thật mới làm được.

Chạy tự động toàn bộ bảy bước trên trình duyệt thật:

```bash
node scripts/check-return.mjs      # cần npm run dev đang chạy
```

**`/admin` là công cụ nội bộ, không thuộc sản phẩm.** Trả sách không nằm trong value
proposition, và thư viện thật nhận trả ở quầy chứ không ở kiosk tra cứu. Nó tồn tại chỉ để
demo khép được vòng — nếu không, mượn vài lần là hết sách và thẻ kẹt ở giới hạn 5 cuốn, chỉ
còn cách `npm run db:seed` làm lại từ đầu. Trang này **không có đăng nhập**.

Muốn về trạng thái gốc bất cứ lúc nào: `npm run db:seed`.
