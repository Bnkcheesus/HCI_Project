# Kịch bản Người dùng — Nguyễn Minh Hoàng | LibAssist Kiosk

> Tổng hợp từ `personaver2.md` — Persona đại diện duy nhất

---

## I. Bối cảnh & Nhân vật (Context & Persona)

* **Nhân vật chính:** Nguyễn Minh Hoàng (22 tuổi, sinh viên năm cuối ngành Công nghệ Thông tin, đang làm đồ án tốt nghiệp kiêm Trưởng nhóm Học thuật Câu lạc bộ Sinh viên).
* **Nhiệm vụ (Task):** Hoàng có khoảng nghỉ 15 phút giữa hai ca học. Anh tranh thủ ghé thư viện để tìm và mượn cuốn sách tham khảo chuyên ngành *"Clean Architecture — A Craftsman's Guide to Software Structure"* phục vụ đồ án tốt nghiệp.
* **Mục tiêu:** Tra cứu tình trạng sách, xác định vị trí kệ, mượn sách tự động và theo dõi hạn trả trên điện thoại — hoàn tất trước khi vào ca học tiếp theo.

---

## II. Kịch bản 1: Thao tác trên Hệ thống Hiện tại (Existing System Scenario)

### 1. Diễn biến kịch bản

Vào lúc 9h45 sáng, sau khi kết thúc tiết lý thuyết, Hoàng nhanh chóng di chuyển đến thư viện. Anh chỉ có đúng 15 phút trước khi ca lab bắt đầu lúc 10h00.

1. **Tra cứu trên máy OPAC cũ — rào cản nhập liệu:**
   Hoàng đến máy tính tra cứu công cộng. Màn hình hiển thị giao diện xám tối, phông chữ nhỏ, tương phản kém. Mắt mỏi sau 3 tiết liên tiếp, anh phải ghé sát màn hình. Anh gõ *"clean architecture"* — hệ thống trả về lỗi "Không tìm thấy". Sau đó anh thử gõ lại đúng hoa thường *"Clean Architecture"* mới có kết quả. Hệ thống hiển thị mã phân loại `B2-07-05` và trạng thái *"Khả dụng: 1 cuốn"* — nhưng không có sơ đồ hay chỉ đường.

2. **Tự định vị kệ sách — mò mẫm thủ công:**
   Giao diện chỉ hiện mã `B2-07-05`. Hoàng phải nhìn lên tấm bảng sơ đồ chữ dán ở cột sảnh, đoán khu vực dãy B2. Anh đi sâu vào kho sách rộng, len lỏi qua hàng chục dãy kệ sát nhau, ngước đọc từng nhãn tem đầu kệ. Sau 8 phút di chuyển, anh mới tìm đúng dãy B2.

3. **Sự cố thông tin không cập nhật realtime:**
   Hoàng rà soát từng gáy sách trên ngăn B2-07 nhưng chỉ thấy khoảng trống. Cuốn sách không có trên kệ dù hệ thống báo còn. Một sinh viên khác đã lấy ra đọc tại bàn từ 20 phút trước nhưng hệ thống OPAC cũ chưa cập nhật. Hoàng đã lãng phí 10 phút đi bộ vô ích.

4. **Xếp hàng tại quầy thủ thư:**
   Hoàng quay lại quầy để hỏi đầu sách thay thế. Trước quầy có 5–6 sinh viên đang xếp hàng chờ thủ thư nhập liệu và đóng dấu thẻ thủ công. Đồng hồ chỉ 9h57. Hoàng biết mình không còn đủ thời gian — đành bỏ về tay không và trễ cả mục tiêu tra cứu tài liệu lẫn lịch học.

### 2. Các điểm đau phát lộ (Highlighted Problems)

- **Nhập liệu case-sensitive:** Phải gõ đúng chữ hoa/thường mới có kết quả — dễ bỏ lỡ tài liệu vì sai ký tự.
- **Thiếu bản đồ định vị trực quan:** Người dùng phải tự đoán và mò mẫm giữa kho sách rộng lớn.
- **Dữ liệu không cập nhật realtime:** Hệ thống báo còn sách nhưng thực tế trên kệ đã hết.
- **Ùn tắc quầy thủ thư:** Quy trình mượn phụ thuộc nhân viên, gây xếp hàng — người bận rộn không thể mượn kịp.
- **Rào cản giao diện:** Chữ nhỏ, tương phản kém gây mỏi mắt, chậm thao tác.

---

## III. Kịch bản 2: Tương tác trên Hệ thống LibAssist mới (New System Scenario)

### 1. Diễn biến kịch bản

Cũng vào lúc 9h45 sáng, Hoàng bước vào sảnh thư viện với cùng nhiệm vụ tìm cuốn *"Clean Architecture"*.

1. **Tiếp cận Kiosk AI — tìm kiếm linh hoạt:**
   Ngay tại sảnh chính, Hoàng đến trạm **Kiosk AI LibAssist**. Màn hình cảm ứng lớn, phông chữ to rõ, giao diện sáng hiện đại. Hoàng gõ *"clean arch"* — hệ thống **Fuzzy Search** tự động gợi ý *"Clean Architecture — Robert C. Martin"* ngay khi đang gõ. Anh chọn kết quả đúng chỉ sau 2 giây.
   *(Nếu mắt đang mỏi, Hoàng chỉ cần chạm nút **Trợ năng** ở góc màn hình để kích hoạt chế độ chữ lớn và tương phản cao tức thì.)*

2. **Kiểm tra khả dụng realtime & xem bản đồ chỉ đường:**
   Kiosk phản hồi ngay: sách đang có **02 cuốn** tại kệ **B2-07**. Đồng thời màn hình hiển thị **Bản đồ số** 2D trực quan, vẽ đường mũi tên từ vị trí Kiosk hiện tại dẫn thẳng đến dãy kệ B2-07.

3. **Chuyển bản đồ sang điện thoại qua QR:**
   Hoàng rút điện thoại, quét mã QR hiển thị trên Kiosk. Bản đồ chỉ đường được tải thẳng vào ứng dụng **LibAssist Mobile App**. Anh vừa đi vào kho sách vừa nhìn bản đồ trên điện thoại để định hướng.

4. **Lấy sách nhanh chóng tại kệ:**
   Nhờ bản đồ chính xác, Hoàng đi thẳng đến đúng dãy kệ B2-07 chỉ trong **dưới 1 phút**. Anh thấy ngay cuốn sách đang xếp sẵn trên kệ, lấy xuống.

5. **Tự mượn sách 1-chạm tại Kiosk:**
   Hoàng quay lại Kiosk tự phục vụ và thực hiện 2 bước đơn giản:
   - **Bước 1:** Đặt gáy sách lên vùng máy quét mã vạch của Kiosk.
   - **Bước 2:** Đưa thẻ sinh viên vào khe đọc thẻ cảm ứng.

   Màn hình xác nhận mượn thành công. Máy in nhả ra **Phiếu mượn**. Đồng thời hệ thống tự động đẩy thông tin phiếu mượn và **thông báo nhắc hạn trả** về ứng dụng LibAssist trên điện thoại của Hoàng.

Toàn bộ quy trình từ tra cứu đến mượn xong chỉ mất **chưa đầy 3 phút**. Hoàng cầm sách bước vào phòng lab đúng giờ, không bỏ lỡ bất kỳ tiết học nào.

### 2. Giá trị & Điểm mới trong tương tác (New Interaction Highlights)

- **Fuzzy Search thông minh:** Tìm được sách dù gõ thiếu dấu, viết tắt hoặc sai chính tả — không còn bị lỗi case-sensitive.
- **Bản đồ số + QR di động:** Định vị chính xác kệ sách ngay sau kết quả tìm kiếm và mang bản đồ đi theo trên smartphone.
- **Trạng thái khả dụng realtime:** Biết chính xác số lượng sách còn trên kệ trước khi di chuyển, tránh đi nhầm.
- **Tự mượn 1-chạm không xếp hàng:** Quét sách + thẻ sinh viên → xác nhận trong 2 bước, không cần nhân viên can thiệp.
- **Đồng bộ Kiosk ↔ Mobile App:** Tự động đồng bộ phiếu mượn và nhắc hạn trả về điện thoại.
- **Giao diện Trợ năng (Accessibility Mode):** Chữ lớn, tương phản cao, phản hồi âm thanh — hỗ trợ mọi đối tượng người dùng.

---

## IV. Bảng So sánh Hiệu quả Tương tác (Interaction Comparison Matrix)

| Tiêu chí | Hệ thống Hiện tại (OPAC cũ) | Hệ thống LibAssist mới |
| :--- | :--- | :--- |
| **Thời gian hoàn tất** | 15–20 phút (thường không kịp) | 2–3 phút (hoàn thành siêu tốc) |
| **Tìm kiếm tài liệu** | Case-sensitive, phải nhập chính xác tên/tác giả | Fuzzy Search — gợi ý tự động khi gõ |
| **Định vị kệ sách** | Tự đoán từ mã phân loại, mò mẫm thủ công | Bản đồ số chỉ đường + QR sang di động |
| **Trạng thái sách** | Không cập nhật realtime — đến kệ mới biết hết | Hiển thị số lượng còn trên kệ tức thì |
| **Quy trình mượn** | Xếp hàng chờ thủ thư nhập liệu thủ công | Tự quét mã sách & thẻ sinh viên 1-chạm |
| **Quản lý hạn trả** | Tự nhớ hoặc xem phiếu giấy | Tự động đồng bộ & nhắc trên Mobile App |
| **Giao diện** | Chữ nhỏ, tương phản kém, gây mỏi mắt | Màn hình lớn, có chế độ Trợ năng Accessibility |
