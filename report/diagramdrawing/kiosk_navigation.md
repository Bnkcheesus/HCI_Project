# Cấu trúc Điều hướng Giao diện Kiosk (Kiosk Navigation Structure)

> **Phân hệ:** Kiosk màn hình cảm ứng lớn (Large-touchscreen Kiosk)  
> **Tuyến đường cơ sở (Base Route):** `/kiosk/*`  
> **Sơ đồ HTML tương quan:** [`navigation_structure.html`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/report/diagramdrawing/navigation_structure.html)  
> **Thư mục wireframe gốc:** `figma/kiosk/`

---

## I. Tổng quan Kiến trúc Điều hướng Kiosk

Giao diện Kiosk được thiết kế tối ưu cho màn hình cảm ứng lớn đặt tại lối vào hoặc khu vực tra cứu thư viện. Kiến trúc gồm **1 Trang chủ trung tâm (Home Hub)** điều hướng tới **3 luồng chính**:

1. **Luồng Tra cứu & Chi tiết Sách** (Search & Book Detail Flow)
2. **Luồng Trợ lý AI Chatbot** (AI Assistant Recommendation Flow)
3. **Luồng Tự Mượn Sách 1-Chạm** (Self-Checkout Scan Flow)

---

## II. Sơ đồ Điều hướng Kiosk (Mermaid Diagram)

```mermaid
flowchart TD
    classDef root fill:#0F1117,stroke:#22D3EE,stroke-width:2px,color:#22D3EE,font-weight:bold;
    classDef page fill:#161B27,stroke:#22D3EE,stroke-width:1px,color:#F5F7FA;
    classDef modal fill:rgba(255,107,107,0.12),stroke:#FF6B6B,stroke-width:1px,color:#FF8E8E;

    HOME["🖥️ Trang chủ Kiosk<br/><code>/kiosk</code>"]:::root

    %% Branch 1
    SEARCH["🔍 Tìm kiếm Sách<br/><code>/kiosk/search</code>"]:::page
    FILTER["🎛️ Bộ lọc Nâng cao<br/>(Modal Filter)"]:::page
    RESULTS["📋 Kết quả Tìm kiếm<br/><code>/kiosk/search/results</code>"]:::page
    BOOK_INFO["📖 Chi tiết Sách & Sơ đồ Kệ<br/><code>/kiosk/books/:bookId</code>"]:::page

    %% Branch 2
    AI_CHAT["🤖 Trợ lý AI Chatbot<br/><code>/kiosk/ai-chat</code>"]:::page

    %% Branch 3
    SCAN_INST["⚡ Hướng dẫn Mượn sách<br/><code>/kiosk/scan</code>"]:::page
    SCAN_STEP1["📦 Bước 1: Quét mã sách<br/><code>/kiosk/scan/step-1</code>"]:::page
    SCAN_FAIL["✕ Lỗi quét sách<br/>(Fail Modal State)"]:::modal
    SCAN_STEP2["🪪 Bước 2: Quét thẻ SV<br/><code>/kiosk/scan/step-2</code>"]:::page
    COMPLETE["✅ Hoàn tất Mượn sách<br/><code>/kiosk/borrow-complete</code>"]:::page

    %% Connections
    HOME --> SEARCH
    HOME --> AI_CHAT
    HOME --> SCAN_INST

    SEARCH --> FILTER
    SEARCH --> RESULTS
    RESULTS --> BOOK_INFO
    AI_CHAT -- "Chọn sách gợi ý" --> BOOK_INFO
    BOOK_INFO -- "Nhấn Mượn ngay" --> SCAN_INST

    SCAN_INST --> SCAN_STEP1
    SCAN_STEP1 -- "Lỗi mã vạch" --> SCAN_FAIL
    SCAN_FAIL -- "Thử lại" --> SCAN_STEP1
    SCAN_STEP1 -- "Thành công" --> SCAN_STEP2
    SCAN_STEP2 --> COMPLETE
    COMPLETE -- "Quay về Trang chủ" --> HOME
```

---

## III. Chi tiết các Tuyến đường (Route Breakdown)

### 1. Trang chủ (`/kiosk`)
* **File Component:** [`HomePage.tsx`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/code/src/kiosk/HomePage.tsx)
* **Wireframe Figma:** `kiosk-home.png`
* **Mô tả:** Màn hình chờ chính hiển thị thông điệp chào mừng, các nút tác vụ nhanh (Quick Actions) điều hướng người dùng đến 3 luồng tính năng.

---

### 2. Luồng Tra cứu & Chi tiết Sách

| Tên Màn hình | Tuyến đường (Route) | File Wireframe | Chức năng chính |
|---|---|---|---|
| **SearchPage** | `/kiosk/search` | `kiosk-search.png` | Ô nhập từ khóa, tìm bằng giọng nói (`VoiceSearch`), gọi bộ lọc. |
| **Advanced Filter** | Modal Overlay | `kiosk-search-advanced-filter.png` | Lọc theo thể loại, năm xuất bản, ngôn ngữ, tình trạng sách (Còn/Hết). |
| **SearchResultsPage** | `/kiosk/search/results` | `kiosk-search-results.png` | Danh sách kết quả dạng lưới/danh sách, hiển thị mã Call Number & trạng thái. |
| **BookInfoPage** | `/kiosk/books/:bookId` | `kiosk-book-info.png` | Chi tiết sách, sơ đồ 2D kệ sách, mã QR đồng bộ điện thoại, in sơ đồ giấy. |

---

### 3. Luồng AI Chatbot Trợ lý

| Tên Màn hình | Tuyến đường (Route) | File Wireframe | Chức năng chính |
|---|---|---|---|
| **AiChatPage** | `/kiosk/ai-chat` | `kiosk-ai-chat.png` | Giao diện nhắn tin với Chatbot AI, hỗ trợ câu hỏi mẫu, gợi ý sách thông minh theo cảm xúc/chủ đề. Nhấp vào sách gợi ý sẽ điều hướng đến `BookInfoPage`. |

---

### 4. Luồng Quy trình Tự Mượn sách (Self-Checkout Scan)

| Tên Màn hình | Tuyến đường (Route) | File Wireframe | Chức năng chính |
|---|---|---|---|
| **ScanInstructionPage** | `/kiosk/scan` | `kiosk-book-scan-instruction.png` | Màn hình hướng dẫn vị trí đặt sách và thẻ sinh viên trước khi quét. |
| **ScanStep1Page** | `/kiosk/scan/step-1` | `kiosk-book-scan-step1.png` | Bước 1: Đưa gáy/mã vạch sách vào vùng quét cảm ứng (Barcode reader). |
| **ScanStep1Fail State** | Sub-state | `kiosk-book-scan-step1-fail.png` | Hiển thị thông báo khi mã vạch không đọc được hoặc sách bị lỗi dữ liệu. |
| **ScanStep2Page** | `/kiosk/scan/step-2` | `kiosk-book-scan-step2.png` | Bước 2: Quét thẻ sinh viên (RFID / Barcode) để xác thực người mượn. |
| **BorrowCompletePage** | `/kiosk/borrow-complete` | `kiosk-borrow-complete.png` | Hiển thị phiếu mượn thành công, thông tin hạn trả sách, tự động in phiếu mượn giấy và đếm ngược quay về Trang chủ. |

---

## IV. Tài nguyên Liên quan
* 🎨 **Bản vẽ Visual HTML:** [`navigation_structure.html`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/report/diagramdrawing/navigation_structure.html)
* 📱 **Tài liệu Navigation Mobile:** [`mobile_navigation.md`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/report/diagramdrawing/mobile_navigation.md)
