## I. Bối cảnh & Nhân vật (Context & Persona)

* **Nhân vật chính:** Nguyễn Minh Hoàng (22 tuổi, Sinh viên năm cuối ngành Công nghệ Thông tin, đang làm đồ án tốt nghiệp).
* **Nhiệm vụ (Task):** Hoàng có khoảng nghỉ 15 phút giữa hai ca học. Anh tranh thủ ghé thư viện trường để tìm và mượn cuốn sách tham khảo chuyên ngành *"Kiến trúc Hệ thống Phân tán"* phục vụ đồ án tốt nghiệp.
* **Mục tiêu:** Tra cứu tình trạng sách, xác định vị trí kệ, mượn sách mang về và theo dõi hạn trả để không bị trễ tiết học tiếp theo.

---

## II. Kịch bản 1: Thao tác trên Hệ thống Truyền thống (Existing System Scenario)

### 1. Diễn biến Kịch bản
Vào lúc 9h45 sáng, sau khi kết thúc tiết học lý thuyết, Hoàng nhanh chóng di chuyển đến thư viện trường. Anh chỉ có khoảng 15 phút trước khi ca học phòng lab bắt đầu lúc 10h00.

1. **Thao tác tra cứu trên máy OPAC cũ:** 
   Hoàng tiến đến máy tính tra cứu công cộng (hệ thống OPAC truyền thống). Màn hình hiển thị giao diện tra cứu cũ với phông chữ nhỏ, tông màu xám tối có độ tương phản kém. Mắt Hoàng vốn mệt mỏi sau 3 tiết học liên tục nên phải ghé sát màn hình để đọc. Anh gõ từ khóa *"Kiến trúc Hệ thống Phân tán"*. Hệ thống mất vài giây tải dữ liệu và trả về kết quả kèm dòng mã phân loại Dewey: `A3-04-12` và ghi trạng thái *"Khả dụng: 1 cuốn"*.
   
2. **Khó khăn trong việc định vị vị trí sách:** 
   Giao diện máy tính cũ chỉ hiển thị mã ký hiệu `A3-04-12` mà không có bất kỳ bản đồ hay sơ đồ chỉ đường nào. Hoàng phải tự nhớ lại hoặc nhìn lên bảng sơ đồ chữ dán ở cột tường sảnh chính để đoán khu vực dãy kệ A3.

3. **Di chuyển tìm kiếm thủ công trong kho sách:** 
   Hoàng đi sâu vào khu vực kho sách rộng lớn gồm hàng chục dãy kệ xếp sát nhau. Anh phải di chuyển qua từng dãy kệ, ngước mắt đọc từng nhãn tem dán ở đầu kệ để tìm dãy A3. Sau 7 phút mò mẫm đi qua các lối đi hẹp, anh mới tìm thấy dãy kệ A3.

4. **Sự cố thông tin không chính xác realtime:** 
   Hoàng rà soát từng gáy sách trên ngăn A3-04 nhưng chỉ thấy một khoảng trống. Cuốn sách anh cần không có trên kệ. Hóa ra một sinh viên khác đã lấy cuốn sách này ra bàn ngồi đọc từ 15 phút trước, nhưng hệ thống OPAC cũ không cập nhật trạng thái khả dụng theo thời gian thực. Hoàng đã lãng phí gần 10 phút di chuyển vô ích.

5. **Ùn tắc tại quầy thủ thư:** 
   Hoàng vội vàng quay trở lại quầy phục vụ của thủ thư để hỏi thông tin hoặc mượn đầu sách thay thế. Tuy nhiên, trước quầy đang có một hàng dài 6-7 sinh viên chờ đợi thủ thư làm thủ tục mượn/trả thủ công bằng cách nhập máy tính và đóng dấu thẻ. Đồng hồ đã chỉ 9h58 sáng. Hoàng nhận ra nếu tiếp tục xếp hàng thì chắc chắn sẽ trễ giờ học ca sau.

### 2. Các điểm đau phát lộ (Highlighted Problems of Existing System)
- **Áp lực thời gian & Quá tải quầy thủ thư:** Quy trình mượn phụ thuộc vào thủ thư gây ùn tắc, khiến người bận rộn không thể mượn sách trong giờ giải lao.
- **Thiếu bản đồ định vị trực quan:** Người dùng phải tự đoán và mò mẫm giữa kho sách rộng lớn, tốn nhiều thời gian di chuyển.
- **Dữ liệu không cập nhật Realtime:** Hệ thống cũ hiển thị còn sách nhưng thực tế trên kệ đã hết, gây lãng phí công sức người đọc.
- **Rào cản thị giác giao diện:** Màn hình OPAC cũ chữ nhỏ, tương phản kém gây mỏi mắt và chậm thao tác.

---

## III. Kịch bản 2: Tương tác trên Hệ thống LibAssist (New System Scenario)

### 1. Diễn biến Kịch bản
Cũng vào lúc 9h45 sáng, Hoàng bước vào sảnh thư viện với cùng nhiệm vụ tìm cuốn sách *"Kiến trúc Hệ thống Phân tán"*.

1. **Tiếp cận và Tương tác tại Kiosk AI:** 
   Ngay tại sảnh chính, Hoàng tiến đến trạm **Kiosk AI LibAssist**. Màn hình cảm ứng lớn hiển thị giao diện hiện đại với màu sắc hài hòa (Primary xanh `#2563EB`), phông chữ to rõ ràng. Hoàng bấm chọn thanh tìm kiếm và gõ từ khóa *"Kiến trúc Hệ thống Phân tán"*. 
   *(Nếu mắt đang mỏi, Hoàng chỉ cần chạm vào nút **Trợ năng (Accessibility)** trên góc màn hình để lập tức kích hoạt chế độ chữ phóng to và độ tương phản cao).*

2. **Kiểm tra thông tin khả dụng Realtime & Chỉ đường Trực quan:** 
   Ngay lập tức, Kiosk phản hồi kết quả: Sách đang có sẵn **02 cuốn** tại kệ **A3-04**. Đồng thời, trên màn hình Kiosk hiển thị sơ đồ **Bản đồ chỉ đường số** 2D/3D trực quan, vẽ đường mũi tên nét đứt dẫn trực tiếp từ vị trí Kiosk hiện tại đến dãy kệ A3-04.

3. **Chuyển tiếp Bản đồ chỉ đường sang Di động (Mobile App Sync):** 
   Trên màn hình Kiosk xuất hiện một mã QR. Hoàng rút điện thoại cá nhân, mở ứng dụng **LibAssist Mobile App** và đưa lên quét mã QR. Ngay lập tức, toàn bộ sơ đồ bản đồ chỉ đường được tải thẳng vào ứng dụng trên điện thoại của Hoàng. Anh vừa đi vào kho sách vừa nhìn bản đồ trên smartphone để định hướng.

4. **Lấy sách nhanh chóng tại kệ:** 
   Nhờ có bản đồ chỉ đường chính xác trên điện thoại, Hoàng đi thẳng một mạch đến đúng dãy kệ A3-04 chỉ trong 1 phút. Anh thấy đúng cuốn sách đang xếp sẵn trên ngăn kệ và lấy xuống.

5. **Quy trình Tự mượn sách 1-chạm tự động tại Kiosk:** 
   Hoàng cầm cuốn sách trở lại trạm Kiosk tự phục vụ. Anh thực hiện quy trình tự mượn sách đơn giản:
   - **Bước 1:** Đặt gáy sách chứa mã vạch lên vùng máy quét của Kiosk.
   - **Bước 2:** Đưa thẻ sinh viên vào khe đọc thẻ cảm ứng.
   - **Bước 3:** Màn hình hiển thị xác nhận mượn thành công. Máy in tự động nhả ra **Phiếu mượn in giấy**.
   - **Bước 4:** Đồng thời, hệ thống tự động đẩy thông tin phiếu mượn và thiết lập thông báo **Nhắc nhở hạn trả sách** về ứng dụng LibAssist Mobile App trên điện thoại của Hoàng.

Toàn bộ quy trình từ lúc tra cứu, lấy sách đến khi hoàn tất mượn sách chỉ mất **chưa đầy 3 phút**. Hoàng cầm cuốn sách vui vẻ di chuyển sang phòng lab ca học tiếp theo hoàn toàn đúng giờ.

### 2. Giá trị và Điểm mới trong Tương tác (New Interaction Highlights)
- **Tự phục vụ 1-chạm siêu tốc:** Loại bỏ hoàn toàn việc xếp hàng quầy thủ thư, cho phép mượn sách tự động chỉ trong vài giây.
- **Bản đồ chỉ đường số & Quét mã QR di động:** Giúp định vị chính xác vị trí kệ sách và mang bản đồ chỉ đường theo trên di động.
- **Trạng thái khả dụng Realtime:** Đảm bảo chính xác số lượng sách sẵn có trên kệ trước khi di chuyển.
- **Đồng bộ đa nền tảng (Kiosk ↔ Mobile App):** Tự động đồng bộ phiếu mượn và thông báo nhắc hạn trả trên điện thoại cá nhân.
- **Giao diện Trợ năng (Accessibility Mode):** Hỗ trợ tối đa thị giác cho người dùng với tùy chọn chữ lớn và tương phản cao.

---

## IV. Bảng So sánh Hiệu quả Tương tác (Interaction Comparison Matrix)

| Tiêu chí đối sánh | Hệ thống Truyền thống (Existing System) | Hệ thống LibAssist mới (New System) |
| :--- | :--- | :--- |
| **Thời gian hoàn tất** | 15 - 20 phút (thậm chí trễ giờ, không mượn được) | 2 - 3 phút (hoàn thành siêu tốc) |
| **Quy trình mượn sách** | Xếp hàng thủ công, chờ thủ thư nhập liệu và đóng dấu | Tự quét mã sách & thẻ sinh viên 1-chạm tại Kiosk |
| **Định vị vị trí kệ sách** | Tự nhìn mã phân loại, đoán khu vực và mò mẫm thủ công | Bản đồ số chỉ đường trực quan trên Kiosk và quét QR xem trên di động |
| **Cập nhật dữ liệu** | Dữ liệu cũ, không phản ánh chính xác tình trạng thực tế | Cập nhật số lượng sách khả dụng theo thời gian thực (Realtime) |
| **Quản lý hạn trả sách** | Cần tự nhớ hoặc xem dấu mực in trên phiếu giấy | Tự động đồng bộ phiếu mượn & gửi thông báo nhắc lịch về Mobile App |
| **Hỗ trợ giao diện/Thị giác** | Chữ nhỏ, phông cũ, tương phản kém gây mỏi mắt | Giao diện Kiosk lớn, màu sắc chuẩn mực, có chế độ Trợ năng Accessibility |
