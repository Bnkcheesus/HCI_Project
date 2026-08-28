# Ảnh thiết kế Figma — 4 màn hình mobile

Chèn ảnh chụp 4 frame vào thư mục này, đặt tên theo node id:

| File | Frame trong Figma | Node id | Route |
|---|---|---|---|
| `mobile-home-39-286.png` | Phone-home-screen | 39:286 | `/mobile` |
| `mobile-qr-41-598.png` | Phone-QR | 41:598 | `/mobile/qr` |
| `mobile-location-41-630.png` | Phone-Location | 41:630 | `/mobile/location` |
| `mobile-phieu-muon-49-122.png` | Phone-PhieuMuon | 49:122 | `/mobile/phieu-muon` |

Bỏ qua bản trùng `Phone-PhieuMuon` ở node 53:50 và 53:85.

## Vì sao là ảnh chứ không phải gọi API

Figma REST API trả 429 (rate limit) liên tục. Nhưng ảnh là đủ: hệ design token
(`code/src/index.css`, `code/src/styles/tokens.css`) đã chốt và **cố tình khác Figma** —
bảng màu đã thay hoàn toàn sau nhiều vòng chỉnh. Thứ cần lấy từ thiết kế bây giờ là
**bố cục và thành phần có những gì**; màu, chữ, bo góc lấy từ token.

Chụp cả frame, đủ từ trên xuống dưới. Nếu màn có nhiều trạng thái (rỗng/có dữ liệu/lỗi),
chụp thêm và đặt hậu tố, ví dụ `mobile-qr-41-598-empty.png`.
