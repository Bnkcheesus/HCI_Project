# Nguồn dữ liệu catalog

Dữ liệu sách trong `src/mocks/` **không phải dữ liệu bịa**. Tên sách, tác giả, năm xuất bản,
mã ISBN-13 và ảnh bìa được lấy về từ [Open Library](https://openlibrary.org) — cơ sở dữ liệu
thư mục mở của Internet Archive.

## Quy mô

| | Số lượng |
|---|---|
| Đầu tài liệu | 116 |
| Có ảnh bìa thật | 106 |
| Khu sách | 8 chủ đề, 3 tầng |
| Giáo trình tiếng Việt (metadata nhập tay) | 8 |
| Báo khoa học & tạp chí | 6 |

Phân bố theo chủ đề: Công nghệ thông tin 30 · Toán học 20 · Machine Learning 18 ·
Vật lý 14 · Sinh học 12 · Hóa học 11 · Điện tử – Viễn thông 6 · Khoa học môi trường 5.

Danh mục thiên về **giáo trình đại học** — đây là kho sách của một khoa khoa học tự nhiên,
không phải danh sách bán chạy của nhà sách.

## Cách sinh lại

```bash
npm run catalog           # gọi Open Library, tải bìa, sinh lại 3 file mock
npm run catalog:offline   # chỉ sinh lại từ cache, không cần mạng
```

Sinh ra:

| File | Nội dung |
|---|---|
| `src/mocks/catalog.ts` | danh sách sách |
| `src/mocks/availability.ts` | số bản còn / tổng, ngày hẹn trả |
| `src/mocks/libraryMap.ts` | vị trí kệ + chỉ đường bằng lời cho từng kệ |
| `public/covers/*.jpg` | ảnh bìa, tải một lần rồi dùng lại |
| `scripts/catalog-resolved.json` | **nguyên văn** phản hồi của Open Library |

**Đừng sửa trực tiếp 3 file mock** — chúng bị ghi đè mỗi lần chạy. Sửa
`scripts/catalog-seed.mjs` rồi chạy lại.

## Phân vai: cái gì là thật, cái gì do mình quyết

`scripts/catalog-seed.mjs` giữ phần **thủ thư quyết định**, Open Library giữ phần
**không được bịa**:

| Thuộc tính | Nguồn |
|---|---|
| Tên sách, tác giả, năm, ISBN-13, ảnh bìa | Open Library |
| Chủ đề, mã kệ, tầng, mô tả tiếng Việt | tuyển chọn trong seed |
| Số bản còn / hẹn trả | sinh xác định từ mã sách (chạy lại không đổi) |

Cache `catalog-resolved.json` lưu **nguyên văn** những gì API trả về, nên muốn đổi cách
hiển thị (viết hoa tên sách, gộp tên tác giả trùng) chỉ cần `npm run catalog:offline`,
không phải gọi lại API.

## Vì sao 10 tài liệu không có bìa

Là 8 giáo trình tiếng Việt và các số báo/tạp chí. Open Library có index sách tiếng Việt
nhưng **mất dấu** (`"Số đỏ"` thành `"So do"`, `"tuổi thơ"` thành `"tuỏ̂i thơ"`) và hầu như
không có ảnh bìa — với nhóm này, metadata nhập tay từ bản in *chính xác hơn* API. Các mục
đó đánh dấu `pin` trong seed và bỏ qua bước gọi mạng.

4 cuốn giáo trình tiếng Việt `giai-tich-1`, `vat-ly-dai-cuong`, `lap-trinh-cpp`,
`dai-so-tuyen-tinh` vẫn dùng **ảnh bìa dựng từ Figma** của bản thiết kế trước, không phải
bìa sách thật — đây là chỗ duy nhất còn ảnh minh họa, và chúng không còn xuất hiện trên
trang chủ. Các mục không có bìa rơi về gáy sách chữ (`spine`).

## Bốn cuốn trên trang chủ

`SUGGESTED_IDS` trong `catalog-seed.mjs` — không phải `books.slice(0, 4)`. Bốn cuốn thuộc
bốn khoa khác nhau (Cormen · Stewart · Halliday · Campbell), đều có bìa thật, và số bản
được ghim để **mỗi thẻ mang một trạng thái khác nhau**: còn 3 · còn 1 · đã mượn hết ·
còn 4. Người đọc chỉ toàn thấy chip xanh thì không có lý do gì tin chip đen khi nó xuất
hiện — mà "biết sách đã hết *trước khi* đi bộ tới kệ" chính là điều persona phàn nàn về
hệ thống cũ.

## Dữ liệu thật thì có rác thật

Open Library do cộng đồng đóng góp, nên bản ghi có nhiễu. Script dọn ba loại, mỗi loại đều
gặp thật trong 116 đầu sách này:

- **Tác giả trùng lặp**: một người xuất hiện nhiều biến thể —
  `"David C. Lay"`, `"Lay"`, `"Davic C. Lay"`, `"Judi McDonald David Lay"`, kèm
  `"Addison-Wesley Publishing Staff"`. Gộp theo *chữ cái đầu + họ* (không gộp theo họ
  không thôi, vì David Lay và Steven R. Lay là hai đồng tác giả thật của cùng cuốn).
- **Viết hoa không nhất quán**: `"Discrete-time signal processing"` nằm cạnh
  `"Deep Learning"`. Tên ở dạng câu được nâng lên dạng tiêu đề; tên đã có cách viết hoa
  riêng (`"(SICP)"`) giữ nguyên.
- **Đuôi thừa**: tên bộ sách trong ngoặc
  (`"… (Information Science and Statistics)"`) và tên tác giả lặp lại
  (`"… by David J. Griffiths"`, `"…. Michael Sipser"`).

## Ghi công

Dữ liệu thư mục và ảnh bìa: **Open Library / Internet Archive** (openlibrary.org).
API được gọi tuần tự, có `User-Agent` mô tả rõ và nghỉ 300ms giữa các lượt — đây là dịch vụ
miễn phí do tình nguyện viên vận hành.
