## I. Tổng quan & Phương pháp Tổng hợp (Synthesis Overview)

### 1. Phương pháp hợp nhất dữ liệu
Dựa trên quy trình 5 bước của `persona/plan.md`, dữ liệu từ 5 đối tượng người dùng (Minh Anh - SV năm 1, Hoàng Nam - SV bận rộn, Cô Lan - Giảng viên, Đức Minh - Nghiên cứu sinh trợ năng, Minh Tuấn - SV làm đồ án) được phân tích và suy luận để tạo nên một **Hồ sơ Persona Hợp nhất**. 

Persona này kết hợp hài hòa các đặc điểm cốt lõi:
- **Từ Minh Anh & Hoàng Nam:** Nhu cầu mượn sách tự phục vụ nhanh chóng, tiết kiệm thời gian, không muốn xếp hàng quầy thủ thư.
- **Từ Cô Lan & Minh Tuấn:** Nhu cầu tra cứu tài liệu chuyên ngành sâu, kiểm tra độ khả dụng realtime và định vị chính xác vị trí kệ sách.
- **Từ Đức Minh:** Yêu cầu về giao diện rõ ràng, dễ tương tác và hỗ trợ các tính năng trợ năng (chữ lớn, phản hồi trực quan/âm thanh).

### 2. Bảng ma trận hợp nhất đặc trưng 5 người dùng vào 1 Persona

| Nguồn đối tượng (User Discovery) | Đóng góp đặc trưng vào Persona Hợp nhất |
| :--- | :--- |
| **Minh Anh** (SV năm nhất) | Nhu cầu hướng dẫn định vị vị trí kệ sách trực quan và nhận gợi ý sách theo môn học/sở thích. |
| **Hoàng Nam** (SV bận rộn) | Nhu cầu tự phục vụ cực nhanh trong giờ nghỉ giữa tiết, in phiếu mượn và đồng bộ hạn trả về Mobile App. |
| **Cô Lan** (Giảng viên) | Nhu cầu tra cứu từ khóa/chuyên mục chuyên sâu, thông tin số lượng sách khả dụng chính xác. |
| **Đức Minh** (NCS trợ năng) | Nhu cầu giao diện Kiosk rõ ràng, có chế độ trợ năng (chữ lớn, tương phản cao, phản hồi thao tác). |
| **Minh Tuấn** (SV năm cuối) | Nhu cầu tìm nhanh sách chuyên đề đồ án, đi thẳng tới kệ và thực hiện quy trình mượn tự động. |

---

## II. Hồ sơ User Persona Hợp nhất (Unified Primary Persona)

---

### Persona Đại diện Duy nhất: Nguyễn Minh Hoàng

* **Tên:** Nguyễn Minh Hoàng
* **Thông tin nhân khẩu học:** 
  - **Tuổi:** 22 tuổi.
  - **Vai trò:** Sinh viên năm cuối chuyên ngành Công nghệ Thông tin, đang làm đồ án tốt nghiệp kiêm Trưởng nhóm Học thuật Câu lạc bộ Sinh viên.
  - **Bối cảnh sử dụng:** Thường xuyên đến thư viện với lịch trình dày đặc giữa các ca học và giờ làm đồ án. Vừa cần tra cứu tài liệu đại cương/chuyên ngành nhanh chóng, vừa cần chuẩn bị danh mục tài liệu để chia sẻ cho các bạn sinh viên khóa dưới.

* **Trích dẫn đại diện:** 
  > *“Tôi cần tìm và mượn đúng tài liệu chuyên ngành thật nhanh giữa các ca học, biết rõ vị trí kệ sách để đi thẳng tới lấy mà không cần phải xếp hàng chờ đợi quầy thủ thư.”*

* **Mục tiêu (Goals):**
  - **Tìm kiếm chính xác & nhanh chóng:** Tìm đúng giáo trình, sách tham khảo chuyên ngành hoặc sách giải trí mà không mất thời gian tra cứu thủ công.
  - **Định vị không gian rõ ràng:** Xác định chính xác vị trí kệ sách trong thư viện rộng lớn để lấy sách ngay lập tức.
  - **Tự phục vụ tối ưu thời gian:** Tự thực hiện toàn bộ quy trình quét mượn sách tại Kiosk trong 1-2 phút, tránh việc xếp hàng chờ quầy thủ thư.
  - **Quản lý lịch mượn hiệu quả:** Theo dõi chính xác thời hạn trả sách và lịch sử mượn thông qua ứng dụng di độngLibAssist.

* **Nhiệm vụ (Tasks):**
  - Ghé thư viện giữa các tiết học hoặc giờ giải lao ngắn để tra cứu sách phục vụ đồ án tốt nghiệp và bài giảng tham khảo.
  - Kiểm tra số lượng khả dụng của đầu sách (xem còn trên kệ hay đã có người mượn).
  - Tương tác với Kiosk AI: Nhập từ khóa chuyên sâu hoặc chọn khảo sát nhu cầu để nhận gợi ý sách.
  - Đặt sách và thẻ sinh viên lên máy quét tự động tại Kiosk để mượn sách, nhận phiếu mượn in và kiểm tra thông báo trên điện thoại.
  - Định vị vị trí kệ sách thông qua bản đồ hiển thị trên Kiosk hoặc quét mã QR xem bản đồ trên ứng dụng di động.

* **Điểm đau (Pain Points):**
  - **Áp lực thời gian:** Thời gian rảnh giữa các ca học rất ngắn, cảm thấy mệt mỏi và phiền phức khi phải xếp hàng chờ đợi thủ thư làm thủ tục thủ công.
  - **Khó khăn định vị:** Kho sách thư viện quá lớn, sơ đồ kệ phân loại phức tạp khiến việc đi tìm từng kệ mất nhiều thời gian.
  - **Thông tin không cập nhật:** Đã tốn công tìm đến tận kệ nhưng phát hiện sách đã được người khác mượn từ trước do hệ thống cũ không cập nhật thời gian thực.
  - **Rào cản giao diện:** Giao diện tra cứu truyền thống có phông chữ nhỏ, độ tương phản kém và quá nhiều thông tin rối mắt, gây khó khăn khi thao tác nhanh hoặc khi mắt mỏi sau nhiều giờ đọc sách.

* **Mong muốn (Wishes):**
  - **Hệ thống tìm kiếm thông minh:** Kiosk hỗ trợ tìm kiếm bằng từ khóa linh hoạt hoặc gợi ý từ Chatbot AI theo chủ đề/cảm xúc.
  - **Bản đồ sơ đồ kệ sách trực quan:** Bản đồ số hiển thị vị trí kệ rõ ràng, cho phép quét mã QR chuyển bản đồ sang điện thoại cá nhân hoặc in bản đồ giấy cầm tay.
  - **Quy trình tự mượn 1-chạm:** Máy quét mã sách và thẻ sinh viên hoạt động nhạy bén, tự động in phiếu mượn và đồng bộ dữ liệu mượn/hạn trả về ứng dụng di động.
  - **Giao diện thân thiện & Trợ năng:** Giao diện Kiosk hiển thị trực quan, hỗ trợ tùy chỉnh chữ lớn, tương phản cao và có phản hồi âm thanh/thao tác rõ ràng.

* **Điểm chạm (Touch Points):**
  - **Máy Kiosk AI tại sảnh thư viện:** Màn hình cảm ứng lớn, tích hợp Chatbot AI gợi ý, công cụ tìm kiếm từ khóa và Chế độ Trợ năng (Accessibility).
  - **Hệ thống phần cứng Kiosk:** Máy quét mã vạch sách, máy đọc thẻ sinh viên và máy in phiếu mượn/bản đồ tự động.
  - **Ứng dụng di động LibAssist (Mobile App):** Quét mã QR nhận bản đồ chỉ đường, xem danh sách phiếu mượn, theo dõi lịch sử mượn và nhận thông báo nhắc hạn trả sách.

* **Tag (Thẻ phân loại):**
  `#SinhVienNamCuoi` `#NghiênCứuChuyênNgành` `#TựPhụcVụNhanh` `#ĐịnhVịKệSách` `#TốiƯuThờiGian` `#GiaoDiệnTrợNăng` `#LibAssistKiosk`

---

## III. Phân tích sự nhất quán & Tác động thiết kế (Design Implications)

### 1. Phân tích tính nhất quán nội tại (Internal Consistency Analysis)
- **Mục tiêu ↔ Nhiệm vụ:** Mục tiêu mượn sách nhanh và tự phục vụ hoàn toàn khớp với nhiệm vụ quét thẻ/sách tại Kiosk và xem thông báo hạn trả trên ứng dụng di động.
- **Điểm đau ↔ Mong muốn:** Điểm đau về việc ngại xếp hàng, khó tìm kệ và giao diện khó đọc được giải quyết triệt để bởi mong muốn có quy trình tự mượn 1-chạm, bản đồ sơ đồ kệ trực quan và giao diện hỗ trợ trợ năng chữ lớn.
- **Điểm chạm ↔ Luồng trải nghiệm:** Các điểm chạm (Kiosk AI, Máy quét, Máy in phiếu, Mobile App) kết nối liền mạch từ lúc người dùng bước vào sảnh thư viện đến khi cầm sách rời đi.

### 2. Định hướng ứng dụng vào Thiết kế Hệ thống LibAssist
1. **Giao diện Kiosk AI (Kiosk UI):**
   - Thiết kế chuẩn Mobile-First / Kiosk màn hình lớn: Chữ to, nút bấm rõ ràng (Radius 12px, khoảng cách chuẩn 8pt), màu sắc hài hòa (Primary `#2563EB`, Secondary `#10B981`).
   - Cung cấp 2 luồng tra cứu: Tìm kiếm từ khóa nhanh (cho tài liệu chuyên ngành) và Chatbot gợi ý theo nhu cầu/khảo sát.
   - Tích hợp nút chuyển đổi chế độ Trợ năng (Chữ phóng to, độ tương phản cao, âm thanh phản hồi).
2. **Module Bản đồ & Chỉ đường (Map & Navigation Module):**
   - Hiển thị vị trí kệ sách chính xác kèm đường đi từ vị trí Kiosk.
   - Cho phép khởi tạo mã QR để người dùng quét bằng Mobile App hoặc bấm in bản đồ ra giấy.
3. **Module Tự mượn & Đồng bộ (Self-Checkout & Sync Module):**
   - Đơn giản hóa quy trình mượn: Quét mã sách → Quét thẻ sinh viên → Xác nhận mượn → In phiếu mượn.
   - Tự động đẩy dữ liệu phiếu mượn và lịch hạn trả lên Backend API để hiển thị trên ứng dụng di động LibAssist.
