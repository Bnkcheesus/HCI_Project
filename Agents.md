# AGENTS.md

> Mọi AI Agent (Cursor, Claude Code, GitHub Copilot Agent, OpenAI Codex, Roo Code, Windsurf...) đều phải tuân thủ các quy định trong tài liệu này.

---

# LibAssist

**Version:** 1.0

## 1. Tổng quan dự án

### Tên dự án

**LibAssist - Hệ thống hỗ trợ tìm kiếm và mượn sách thông minh**

### Mô tả

LibAssist là hệ thống hỗ trợ thư viện nhằm giúp người dùng:

- Tìm sách nhanh hơn.
- Được AI gợi ý sách phù hợp theo sở thích hoặc cảm xúc.
- Dễ dàng định vị sách trong thư viện.
- Tự thực hiện quy trình mượn sách thông qua Kiosk.
- Theo dõi lịch sử mượn sách trên ứng dụng.

Hệ thống hướng tới việc giảm tải công việc cho thủ thư đồng thời nâng cao trải nghiệm của người đọc.

---

## Đối tượng sử dụng

### Người đọc

- Sinh viên
- Giảng viên
- Người sử dụng thư viện

Có thể:

- Tìm kiếm sách
- Nhận gợi ý từ AI
- Xem vị trí sách
- Tự mượn sách
- Theo dõi lịch sử mượn

---

### Thủ thư

Có thể:

- Quản lý dữ liệu sách
- Theo dõi lượt mượn
- Kiểm soát tình trạng sách
- Hỗ trợ người dùng khi cần

---

## Mục tiêu

- Giảm thời gian tìm sách.
- Giảm tình trạng ùn tắc tại quầy thủ thư.
- Tăng trải nghiệm người dùng.
- Khuyến khích người đọc khám phá nhiều đầu sách hơn thông qua AI Recommendation.
- Chuẩn hóa quy trình mượn sách.

---

# 2. Chức năng chính

## Kiosk AI

- Chatbot gợi ý sách theo khảo sát.
- Tìm sách theo từ khóa.
- Hiển thị vị trí sách.
- Hiển thị bản đồ thư viện.
- In bản đồ.
- In danh sách sách.

---

## Hệ thống mượn sách

- Quét mã sách.
- Quét thẻ sinh viên.
- Tạo phiếu mượn.
- In phiếu mượn.
- Đồng bộ dữ liệu lên hệ thống.

---

## Mobile App

- Xem lịch sử mượn.
- Nhận thông báo.
- Xem phiếu mượn.
- Theo dõi hạn trả.

---

# 3. Tech Stack

## Frontend

- React
- TypeScript
- Vite

UI

- TailwindCSS
- shadcn/ui

Icon

- Lucide React

State Management

- TanStack Query
- Context API

---

## Backend

- Node.js
- ExpressJS

Authentication

- JWT

API

- RESTful API

---

## Database

- PostgreSQL

ORM

- Prisma

---

## AI

- OpenAI API

AI dùng cho:

- Chatbot
- Recommendation
- Phân tích câu trả lời khảo sát

---

## Mobile

- React Native

---

## Version Control

- Git
- GitHub

---

# 4. Kiến trúc dự án

Áp dụng mô hình:

- Client - Server
- REST API
- Modular Architecture

Nguyên tắc:

- Frontend không truy cập trực tiếp Database.
- Mọi thao tác đều thông qua Backend API.
- AI chỉ giao tiếp với Backend.

---

# 5. Quy tắc thiết kế UI

## Phong cách

Hiện đại

Dễ sử dụng

Thân thiện với mọi đối tượng người đọc

---

## Màu chủ đạo

Primary

```
#2563EB
```

(Xanh dương)

Secondary

```
#10B981
```

(Xanh lá)

Background

```
#F8FAFC
```

Card

```
#FFFFFF
```

Text

```
#1E293B
```

Warning

```
#F59E0B
```

Danger

```
#EF4444
```

---

## Font

Google Font

```
Inter
```

Fallback

```
sans-serif
```

---

## Border Radius

```
12px
```

---

## Shadow

Sử dụng nhẹ.

Không dùng shadow quá đậm.

---

## Spacing

Theo hệ thống 8pt.

Ví dụ

8

16

24

32

40

48

---

## Icon

Sử dụng Lucide.

Không sử dụng nhiều hơn một bộ icon trong cùng dự án.

---

## Button

Primary

- màu xanh

Secondary

- màu trắng
- viền xám

Danger

- màu đỏ

---

## Form

Input

- bo góc
- có label
- có placeholder

Luôn hiển thị validation.

---

## Responsive

Thiết kế Mobile First.

Hỗ trợ:

- Mobile
- Tablet
- Desktop
- Kiosk màn hình lớn

---

# 6. Coding Convention

## Ngôn ngữ

Toàn bộ source code:

- tiếng Anh

Bao gồm:

- tên biến
- tên function
- tên class
- tên component
- tên database
- tên API

---

## Comment

Comment bằng tiếng Việt nếu giải thích nghiệp vụ.

Comment bằng tiếng Anh nếu giải thích thuật toán.

---

## Đặt tên

Component

```
BookCard.tsx
```

Page

```
SearchPage.tsx
```

Hook

```
useBookSearch.ts
```

Service

```
book.service.ts
```

Controller

```
book.controller.ts
```

---

# 7. Quy tắc bắt buộc dành cho AI Agent

## AI Agent PHẢI

- Luôn đọc cấu trúc project trước khi tạo file mới.
- Tái sử dụng component nếu đã tồn tại.
- Tuân thủ coding style của project.
- Giữ code sạch, dễ đọc.
- Tách nhỏ component khi cần.
- Viết code có khả năng mở rộng.
- Viết code có type đầy đủ (TypeScript).
- Giải thích lý do nếu thay đổi kiến trúc.
- Kiểm tra lỗi compile trước khi kết thúc tác vụ.
- Cập nhật README nếu có thay đổi lớn.
- Viết commit message rõ ràng nếu được yêu cầu.

---

## AI Agent KHÔNG ĐƯỢC

Không tự ý:

- xóa file
- đổi tên file
- đổi cấu trúc thư mục
- đổi schema database
- đổi API
- sửa logic nghiệp vụ
- cài thêm package
- nâng version dependency
- thay đổi framework

nếu chưa có sự đồng ý của người dùng.

---

Không được:

- Hardcode dữ liệu nếu đã có API.
- Viết code trùng lặp.
- Tạo component dư thừa.
- Bỏ qua TypeScript error.
- Bỏ qua ESLint error.
- Bỏ qua cảnh báo quan trọng.
- Commit secret hoặc API Key.
- Lưu API Key trực tiếp trong source code.

---

Nếu thiếu thông tin nghiệp vụ:

AI phải hỏi lại thay vì tự suy đoán.

---

# 8. Workflow phát triển

## Bước 1

Đọc yêu cầu.

---

## Bước 2

Phân tích yêu cầu.

Xác định:

- chức năng
- phạm vi ảnh hưởng
- file cần sửa

---

## Bước 3

Đề xuất hướng thực hiện ngắn gọn trước khi chỉnh sửa nếu thay đổi ảnh hưởng nhiều thành phần.

---

## Bước 4

Thực hiện chỉnh sửa.

Ưu tiên:

- sửa file cũ
- tái sử dụng code

Hạn chế tạo file mới nếu không cần thiết.

---

## Bước 5

Kiểm tra

- TypeScript
- ESLint
- Build
- Runtime (nếu có thể)

---

## Bước 6

Báo cáo kết quả

Bao gồm:

- Đã sửa gì
- File đã chỉnh sửa
- Điểm cần lưu ý
- Việc cần làm tiếp theo (nếu có)

---

# 9. Nguyên tắc phát triển AI

AI Recommendation phải:

- Giải thích ngắn gọn lý do gợi ý sách.
- Không gợi ý ngẫu nhiên.
- Ưu tiên sách còn khả dụng trong thư viện.
- Có khả năng tìm kiếm theo từ khóa.
- Có khả năng phân tích câu trả lời khảo sát để cá nhân hóa kết quả.

---

# 10. Nguyên tắc Git

Branch

```
main
develop
feature/*
bugfix/*
hotfix/*
```

Commit

Theo chuẩn Conventional Commits

Ví dụ

```
feat: add AI recommendation feature

fix: resolve book search issue

refactor: optimize search service

docs: update project documentation
```

---

# 11. Tiêu chí hoàn thành (Definition of Done)

Một tính năng được xem là hoàn thành khi:

- Đúng yêu cầu nghiệp vụ.
- Không phát sinh lỗi build.
- Không có lỗi TypeScript.
- Không có lỗi ESLint.
- Giao diện responsive.
- Có xử lý trạng thái loading và error.
- Đã kiểm thử các luồng chính.
- Mã nguồn tuân thủ quy tắc của dự án.
- Không làm ảnh hưởng các chức năng hiện có.

---

# 12. Tầm nhìn dự án

LibAssist hướng đến việc xây dựng một hệ thống thư viện thông minh, là trợ lý hỗ trợ người đọc trong việc tìm kiếm, khám phá và mượn sách một cách nhanh chóng, trực quan và thuận tiện. Mục tiêu lâu dài là tạo ra trải nghiệm thư viện hiện đại, giảm tải cho thủ thư và góp phần thúc đẩy văn hóa đọc trong môi trường giáo dục.