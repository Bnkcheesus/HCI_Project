# Kế hoạch

## I. Tổng quan dự án

* **Tên dự án**: LibAssist - Hệ thống hỗ trợ tìm sách và mượn sách thông minh.
* **Mục tiêu**: Hỗ trợ người đọc tìm sách hiệu quả thông qua gợi ý, định vị không gian sách chính xác và giảm thiểu tình trạng xếp hàng, quá tải nghiệp vụ cho thủ thư.
* **Đối tượng sử dụng**: Sinh viên, người đọc ở mọi độ tuổi và thủ thư tại thư viện.

## II. Phân công vai trò

* **Trần Dương Hải Thượng**: Quản lý nhóm (Project Manager) và Soạn tài liệu (Documenter).
* **Trần Nguyễn Song Chi**: Thiết kế giao diện (Designer) và Kiểm định/kiểm thử (Tester).
* **Nguyễn Tấn Huy Khôi**: Phát triển và cài đặt hệ thống (Developer).

## III. Tài nguyên & Công cụ

* **Thiết bị & Phần cứng**: Máy tính, màn hình cảm ứng mô phỏng máy Kiosk, máy quét mã và điện thoại thông minh (để chạy ứng dụng quét mã QR).
* **Công cụ thiết kế (Wireframe/Mockup)**: Lựa chọn Figma.com để phác thảo layout và thiết kế tương tác giữa các màn hình (UIs) cho cả Kiosk và điện thoại.
* **Công cụ hỗ trợ lập trình (AI)**: Cài đặt OpenCode kết hợp với các mô hình như OpenCode Zen hoặc Claude Opus để hỗ trợ viết, tái cấu trúc và debug code.
* **Dữ liệu dự kiến**: Tập dữ liệu thông tin tóm tắt của sách, bản đồ thư viện để hiển thị vị trí.
* **Kinh phí**: Tối ưu chi phí thực hiện đồ án bằng cách sử dụng các gói miễn phí (Free/GitHub Education).

## IV. Phương pháp & Quy trình nghiệp vụ chính

* **Quy trình tìm sách**: Người dùng tương tác với Chatbot (qua khảo sát cảm xúc hoặc từ khóa) trên Kiosk để nhận gợi ý sách.
* **Quy trình định vị**: Máy Kiosk khởi tạo mã QR; người dùng sử dụng ứng dụng di động để quét và truy cập bản đồ vị trí sách, hoặc có thể chọn in bản đồ giấy trực tiếp tại Kiosk.
* **Quy trình mượn sách**: Người dùng tự quét mã sách và thẻ mượn tại Kiosk để tạo phiếu mượn tự động, xem lại lịch sử mượn trên ứng dụng điện thoại mà không cần thủ thư.
