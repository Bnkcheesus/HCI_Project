# Database LibAssist — PostgreSQL và SQL Server

Cùng một schema, cùng một bộ query. Đổi `DB_DIALECT` trong `code/.env` là đổi database,
không phải đổi code.

## Chuẩn bị chung

```bash
cd code
npm install
cp .env.example .env      # rồi sửa cho khớp máy bạn
```

## PostgreSQL

Cách nào cũng được — Docker, Homebrew, hay bản cài sẵn.

```bash
# Docker
docker compose up -d postgres
# DATABASE_URL=postgres://libassist:libassist@localhost:5432/libassist

# Hoặc Homebrew (macOS) — tự tạo database rỗng
createdb libassist
# DATABASE_URL=postgres://<user>@localhost:5432/libassist
```

`.env`:

```
DB_DIALECT=postgres
DATABASE_URL=postgres://libassist:libassist@localhost:5432/libassist
```

```bash
npm run db:migrate
npm run db:seed
npm run test:server      # 18 phép kiểm tra tính toàn vẹn dữ liệu
```

## SQL Server

> **Trạng thái**: schema, seeder và bộ test đã viết để chạy được trên SQL Server, nhưng
> **chưa chạy thật** — máy phát triển là macOS Apple Silicon, không dựng SQL Server. Nhóm
> chạy trên Windows rồi báo lại kết quả `npm run test:server`.

SQL Server **không tự tạo database**, phải tạo tay trước:

```sql
CREATE DATABASE libassist;
```

`.env`:

```
DB_DIALECT=mssql
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=<mật khẩu của bạn>
MSSQL_DATABASE=libassist
MSSQL_TRUST_CERT=true
```

`MSSQL_TRUST_CERT=true` là cần thiết cho bản cài nội bộ dùng chứng chỉ tự ký; production
thật thì đặt `false`.

Sau đó y hệt nhánh Postgres:

```bash
npm run db:migrate
npm run db:seed
npm run test:server
```

**Nếu chạy bằng Docker trên máy Mac Apple Silicon**: ảnh `mcr.microsoft.com/mssql/server`
chỉ có bản linux/amd64, phải bật Docker Desktop → Settings → General → *Use Rosetta for
x86_64/amd64 emulation*, nếu không container khởi động rồi tắt ngay.

## Vì sao một codebase chạy được cả hai

Không phải nhờ ORM che giấu khác biệt, mà nhờ **né đúng những chỗ hai engine khác nhau**.
Chi tiết đầy đủ ở [ke-hoach-backend-database.md](ke-hoach-backend-database.md) mục 4; tóm
lại:

| Điều đã né | Vì sao |
|---|---|
| Cột tự tăng (`serial` / `identity`) | Hai engine khai báo khác nhau, và lấy lại giá trị vừa sinh cần `RETURNING` bên này, `OUTPUT INSERTED` bên kia. Mọi khoá chính ở đây là chuỗi do app sinh |
| `ON CONFLICT` / `MERGE` | Seed là xoá-rồi-chèn trong một transaction |
| `unaccent` / collation không dấu | Cột `search_text` tính sẵn bằng `removeDiacritics` của chính frontend, rồi `LIKE` thuần |
| `FOR UPDATE` / `WITH (UPDLOCK)` | `UPDATE … WHERE copies_available > 0` rồi kiểm số dòng — nguyên tử như nhau trên cả hai |

Hai chỗ **không né được**, xử lý bằng helper:

- **`nvarchar` vs `text`** — `server/db/columnTypes.ts`. SQL Server dùng `varchar` sẽ nuốt
  dấu tiếng Việt ("Giải tích 1" → "Gi?i tích 1"), mà lỗi này **không tái hiện được trên
  Postgres**. Test `preserves Vietnamese diacritics` trong `server/test/seed.spec.ts` là
  chỗ bắt nó.
- **Kiểu ngày** — `server/db/dates.ts`. `date` không có múi giờ, nhưng `pg` dựng `Date` ở
  nửa đêm giờ địa phương còn `tedious` dựng ở nửa đêm UTC — lệch 7 tiếng ở Việt Nam, đủ để
  cùng một dòng ra hai ngày khác nhau. Cả hai được ép trả về chuỗi ISO trước khi rời tầng DB.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run db:migrate` | Tạo/cập nhật schema |
| `npm run db:migrate -- --down` | Gỡ migration cuối |
| `npm run db:seed` | Nạp `src/mocks/` vào DB (xoá sạch rồi nạp lại) |
| `npm run db:reset` | Gỡ → tạo lại → seed |
| `npm run test:server` | Bộ test tính toàn vẹn, chạy trên DB thật |

## `src/mocks/` bây giờ là gì

Là **nguồn seed**, không còn là dữ liệu runtime. 116 đầu sách thật lấy từ Open Library, có
bìa thật, mã ISBN thật. Pipeline cũ vẫn nguyên:

```bash
npm run catalog:offline   # sinh lại mock từ cache
npm run db:seed           # đẩy tiếp vào database
```
