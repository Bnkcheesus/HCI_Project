# Test case — Quy trình mượn sách tại kiosk LibAssist

Bộ test case cho luồng tự mượn sách (`/kiosk/scan` → `/kiosk/scan/step-1` → `/kiosk/scan/step-2` → `/kiosk/borrow-complete`), tương ứng các frame Figma `kiosk-book-scan-instruction` (5:971), `kiosk-book-scan-step1` (20:366), `kiosk-book-scan-step1-fail` (39:82), `kiosk-book-scan-step2` (24:72) và `kiosk-borrow-complete` (5:1033).

Truy vết giá trị: **Job 3 / Pain Reliever 3 / Product-Service 3** (tự mượn tại kiosk, không chờ thủ thư), **Gain Creator 3** (in phiếu hoặc đồng bộ app), **Gain Creator 4 / Pain Reliever 2** (tình trạng sách theo thời gian thực), **Pain Reliever 4** (app nhắc hạn trả).

## Quy tắc nghiệp vụ đang áp dụng

| Quy tắc | Giá trị | Nguồn |
|---|---|---|
| Số sách tối đa mỗi lượt | 5 | `MAX_BOOKS_PER_LOAN` — trợ lý AI cũng trả lời con số này |
| Thời hạn mượn | 14 ngày | `LOAN_DAYS` |
| Hết phiên khi không thao tác | 90 giây | `IDLE_SECONDS` |
| Cảnh báo trước khi hết phiên | còn 25 giây | `IDLE_WARN_AT` |

## Dữ liệu thử

**Thẻ thư viện** (`src/mocks/students.ts`)

| Mã thẻ | Người | Tình trạng |
|---|---|---|
| `20215012` | Nguyễn Minh Khang | Hợp lệ, đang mượn 1 cuốn còn hạn |
| `20219999` | Trần Thu Hà | Thẻ đã hết hạn |
| `20218888` | Lê Văn Nam | Đang có 2 cuốn quá hạn |
| `20217777` | Phạm Gia Bảo | Đang mượn đủ 5 cuốn |

**Sách** (`src/mocks/catalog.ts`) — ví dụ: `9786040123456` Giải tích 1 (còn 3 bản), `9786040345678` Lập trình C++ (**hết bản**), `9780387310732` Pattern Recognition (**hết bản**).

---

## A. Bước 1 — Quét sách

| ID | Mục tiêu | Tiền điều kiện | Các bước | Kết quả mong đợi | Tự động |
|---|---|---|---|---|---|
| TC-B01 | Quét sách bằng ISBN | Ở bước 1, phiếu rỗng | Nhập `9786040123456` → OK | Sách vào phiếu, hiện "Đã thêm … vào phiếu mượn", đếm `1/5 cuốn` | ✅ `adds a book scanned by ISBN and announces it` |
| TC-B02 | Quét bằng camera (mô phỏng) | Ở bước 1 | Chạm "Mô phỏng quét một cuốn" | Một cuốn còn bản được thêm vào phiếu | ✅ script `shot-scan.mjs` |
| TC-B03 | Mượn nhiều cuốn cùng lúc | Ở bước 1 | Quét lần lượt 3 cuốn khác nhau | Phiếu có đủ 3 cuốn, đếm `3/5 cuốn` | ✅ `collects several books in one checkout` |
| TC-B04 | Mã ISBN có dấu cách / gạch ngang | — | Nhập mã kèm khoảng trắng và `-` | Vẫn nhận đúng sách | ✅ `ignores spaces and dashes in the code` |
| TC-B05 | Mã ISBN không tồn tại | Ở bước 1 | Nhập `0000000000000` → OK | Báo "Mã sách không hợp lệ…", phiếu không đổi | ✅ `explains an invalid code instead of failing silently` |
| TC-B06 | Mã rỗng | Ở bước 1 | Nhấn OK khi ô trống | Nút OK bị vô hiệu hoá, không có gì xảy ra | ✅ `rejects a code that is not in the catalog` |
| TC-B07 | Sách đã hết bản trên kệ | Ở bước 1 | Nhập `9786040345678` → OK | Báo "…không còn bản nào trên kệ", không thêm vào phiếu | ✅ `refuses a book with no copies left…` |
| TC-B08 | Quét trùng một cuốn | Phiếu đã có Giải tích 1 | Nhập lại `9786040123456` → OK | Báo "Cuốn này đã có trong phiếu mượn của bạn", phiếu vẫn 1 cuốn | ✅ `refuses the same book twice` |
| TC-B09 | Vượt giới hạn 5 cuốn | Phiếu đã đủ 5 cuốn | Quét thêm cuốn thứ 6 | Nút mô phỏng quét bị vô hiệu; nhập tay báo "tối đa 5 cuốn"; phiếu vẫn 5 | ✅ `refuses a sixth book and disables the scanner…` |
| TC-B10 | Bỏ cuốn quét nhầm | Phiếu có 2 cuốn | Chạm nút ✕ trên một dòng | Cuốn đó biến mất, đếm giảm còn `1/5` | ✅ `lets a mis-scanned book be taken back off the slip` |
| TC-B11 | **Cuộn danh sách khi nhiều sách** | Phiếu có 5 cuốn | Cuộn danh sách phiếu mượn xuống | Thấy được cuốn cuối cùng; trang không bị tràn | ✅ script `shot-scan.mjs` (`scrolled to last book`) |
| TC-B12 | Bàn phím số | Ở bước 1 | Chạm `9`, `7`, rồi nút xoá | Ô hiện `97` rồi còn `9` | ✅ `types digits through the numeric keypad` |
| TC-B13 | Không cho sang bước 2 khi phiếu rỗng | Phiếu rỗng | Quan sát nút "Tiếp tục" | Nút bị vô hiệu hoá | ✅ `cannot move on with an empty slip` |

## B. Bước 2 — Quét thẻ & kiểm tra điều kiện

| ID | Mục tiêu | Tiền điều kiện | Các bước | Kết quả mong đợi | Tự động |
|---|---|---|---|---|---|
| TC-C01 | Thẻ hợp lệ | Phiếu có 1 cuốn | Nhập `20215012` → OK | Hiện tên, MSSV, "Thẻ thư viện hợp lệ"; hiện trước dòng "Bạn sắp mượn N cuốn, hạn trả …"; nút Xác nhận bật | ✅ `accepts a card in good standing and shows the due date…` |
| TC-C02 | Thẻ hết hạn | Phiếu có 1 cuốn | Nhập `20219999` → OK | "Thẻ chưa đủ điều kiện mượn" + "Thẻ thư viện đã hết hạn ngày …" + hướng dẫn gia hạn; nút Xác nhận tắt | ✅ `refuses an expired card and says how to fix it` |
| TC-C03 | Có sách quá hạn | Phiếu có 1 cuốn | Nhập `20218888` → OK | Báo số cuốn quá hạn **và nêu đích danh tên sách**; nút Xác nhận tắt | ✅ `refuses a card with overdue books and names them` |
| TC-C04 | Đã mượn đủ giới hạn | Phiếu có 1 cuốn | Nhập `20217777` → OK | Báo "Bạn đang mượn 5 cuốn, giới hạn là 5 cuốn cùng lúc"; nút Xác nhận tắt | ✅ `refuses a card that has hit the borrowing limit` |
| TC-C05 | Giỏ + sách đang mượn vượt giới hạn | Phiếu có 5 cuốn | Nhập `20215012` (đang mượn 1) → OK | Bị chặn vì 1 + 5 > 5, gợi ý bỏ bớt | ✅ `counts the cart against the books already on loan` |
| TC-C06 | Nhiều lỗi cùng lúc | Thẻ hết hạn + vượt giới hạn | Quét thẻ | Hiện **tất cả** lý do, không chỉ lý do đầu tiên | ✅ `reports every problem at once rather than one at a time` |
| TC-C07 | Sách đã trả không tính vào giới hạn | — | Kiểm tra thẻ có lịch sử đã trả | Bản ghi `returnedAt != null` không bị đếm | ✅ `does not count returned books against the limit` |
| TC-C08 | Mã thẻ không tồn tại | Phiếu có 1 cuốn | Nhập `11112222` → OK | Báo "Mã thẻ không hợp lệ…" | ✅ `explains an unknown card` |
| TC-C09 | Đổi sang thẻ khác | Đã quét một thẻ | Chạm "Dùng thẻ khác" | Quay về màn quét thẻ, ô nhập trống | ✅ script `shot-scan.mjs` |
| TC-C10 | Vào bước 2 khi phiếu rỗng | Phiếu rỗng | Mở `/kiosk/scan/step-2` | Tự chuyển về bước 1 | ✅ `sends the reader back to scanning if the cart emptied…` |

## C. Hoàn tất & phiếu mượn

| ID | Mục tiêu | Tiền điều kiện | Các bước | Kết quả mong đợi | Tự động |
|---|---|---|---|---|---|
| TC-D01 | Mượn thành công nhiều cuốn | Phiếu 2 cuốn, thẻ hợp lệ | Chạm "Xác nhận mượn 2 cuốn" | Màn "Mượn sách thành công!", phiếu ghi đúng người mượn và **cả 2 cuốn** | ✅ `scans two books, checks the card, and prints a slip for both` |
| TC-D02 | Ngày mượn và hạn trả | Đã mượn xong | Đọc phiếu | Ngày mượn = hôm nay, hạn trả = hôm nay + 14 ngày, định dạng `dd/mm/yyyy` | ✅ `dates the loan today and the return LOAN_DAYS later`, `formats dates…` |
| TC-D03 | Mã phiếu và người mượn | Đã mượn xong | Đọc phiếu | Có mã `#SLIP-…`, đúng tên và mã thẻ người mượn | ✅ `identifies the borrower` |
| TC-D04 | Đồng bộ sang điện thoại | Đã mượn xong | Quan sát cột phải | Có mã QR + chú thích "Quét để lưu phiếu vào app và được nhắc hạn trả" | ✅ `offers the phone hand-off as well as the paper slip` |
| TC-D05 | In lại phiếu | Đã mượn xong | Chạm "In lại phiếu mượn" | Hiện xác nhận "Đã gửi lệnh in…" | ✅ `confirms the reprint so the reader is not left tapping` |
| TC-D06 | Kết thúc phiên | Đã mượn xong | Chạm "Quay về trang chủ" | Về trang chủ, phiên bị xoá sạch (người sau không thấy phiếu cũ) | ✅ `clears the session on the way back to the home screen` |
| TC-D07 | Vào thẳng màn hoàn tất | Chưa mượn gì | Mở `/kiosk/borrow-complete` | Không hiện phiếu rỗng, tự chuyển hướng đi | ✅ `redirects away from the receipt when nothing was borrowed` |

## D. Hết phiên & điều hướng

| ID | Mục tiêu | Tiền điều kiện | Các bước | Kết quả mong đợi | Tự động |
|---|---|---|---|---|---|
| TC-E01 | Cảnh báo sắp hết phiên | Đang ở bước 2, đã quét thẻ | Không thao tác 65 giây | Hiện thanh cảnh báo "Bạn còn ở đây chứ?" kèm đếm ngược | ✅ `warns, then clears the session and leaves` |
| TC-E02 | Tự huỷ phiên | Tiếp TC-E01 | Không thao tác thêm 25 giây | Phiếu và thẻ bị xoá, quay về trang chủ | ✅ `warns, then clears the session and leaves` |
| TC-E03 | Thao tác làm mới bộ đếm | Đang ở bước 1 | Chạm màn hình trước khi hết giờ | Không hiện cảnh báo, phiếu còn nguyên | ✅ `does not interrupt a reader who is still working` |
| TC-E04 | **"Quay về" ở màn hướng dẫn** | Vào scan từ trang chi tiết sách, đã đi tới bước 1 rồi quay lại | Chạm "Quay về" | Về **trang chi tiết sách**, không nhảy tới bước 1 | ✅ `goes back to the book, not forward into step 1` |
| TC-E05 | "Quay về" khi vào thẳng | Mở `/kiosk/scan` trực tiếp | Chạm "Quay về" | Về trang chủ kiosk | ✅ `goes to the home screen when no book was picked first` |

## E. Trợ năng & bố cục

| ID | Mục tiêu | Các bước | Kết quả mong đợi | Tự động |
|---|---|---|---|---|
| TC-F01 | Không tràn màn hình 1280×900 | Đi hết 4 màn của luồng | Không màn nào cuộn ngang/dọc toàn trang | ✅ script `shot-scan.mjs` |
| TC-F02 | Nút chính luôn trong tầm nhìn | Đi hết 4 màn | Mọi nút CTA nằm trọn trong 900px | ✅ script `shot-scan.mjs` |
| TC-F03 | Chế độ trợ năng | Bật "Trợ năng" ở bước 1 với 3 cuốn | Chữ to 25%, tương phản cao, không tràn, nút vẫn thấy được | ✅ script `shot-scan.mjs` |
| TC-F04 | Thông báo cho trình đọc màn hình | Quét thêm một cuốn | Vùng `aria-live` đọc "Đã thêm … vào phiếu mượn" | ✅ `adds a book scanned by ISBN and announces it` |
| TC-F05 | Lỗi được đọc lên | Nhập mã sai | Thông báo lỗi có `role="alert"` | ✅ `explains an invalid code instead of failing silently` |

---

## Cách chạy

```bash
cd code

# Test tự động (toàn bộ, gồm 2 file dưới)
npm run test

# Chỉ luồng mượn sách
npx vitest run src/lib/borrow.test.ts src/kiosk/scan/ScanFlow.test.tsx

# Kiểm chứng bố cục + cuộn trên trình duyệt thật (cần `npm run dev` chạy sẵn)
node scripts/shot-scan.mjs
```

**Nguồn test tự động:**
- `src/lib/borrow.test.ts` — quy tắc nghiệp vụ thuần (quét, kiểm tra thẻ, sinh phiếu).
- `src/kiosk/scan/ScanFlow.test.tsx` — thao tác thật trên giao diện, xuyên suốt 4 màn.
- `scripts/shot-scan.mjs` — bố cục, cuộn và chế độ trợ năng trên Chromium thật; jsdom không dựng layout nên các trường hợp này bắt buộc phải kiểm ở đây.
