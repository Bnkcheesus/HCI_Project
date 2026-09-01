# Sơ đồ Luồng Tra cứu & Mượn sách Hiện tại (Current Flowchart)

> **Nguồn dữ liệu:** [`currentflow.txt`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/report/currentflow/currentflow.txt)  
> **Giao diện HTML trực quan:** [`currentflow.html`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/report/currentflow/currentflow.html)

---

## I. Sơ đồ Flowchart Tổng quát (General User Flow)

```mermaid
flowchart TD
    classDef startEnd fill:#0F1117,stroke:#22D3EE,stroke-width:2px,color:#22D3EE,font-weight:bold;
    classDef action fill:#161B27,stroke:#22D3EE,stroke-width:1px,color:#F5F7FA;
    classDef decision fill:#1C2333,stroke:#FBBF24,stroke-width:2px,color:#FBBF24;
    classDef success fill:rgba(34,211,238,0.1),stroke:#22D3EE,stroke-width:1.5px,color:#F5F7FA;
    classDef failure fill:rgba(248,113,113,0.15),stroke:#F87171,stroke-width:1.5px,color:#F87171;

    START(["[Bắt đầu]"]):::startEnd
    
    STEP1["[Đến máy OPAC] ──► [Nhập chính xác Tên/Tác giả]"]:::action
    
    DECISION1{"Kết quả tra cứu OPAC?"}:::decision
    
    FAIL1["(Nếu gõ sai / không nhớ rõ)<br/><b>[Hệ thống báo 0 kết quả]</b><br/>➔ [Thất bại / Thử lại]"]:::failure
    
    SUCC1["[Tìm thấy sách & Ghi lại Mã số Call Number]"]:::success
    
    STEP2["[Đến xem Bảng sơ đồ tĩnh] ──► [Dò tìm vị trí khu vực]"]:::action
    
    STEP3["[Đi đến dãy kệ sách vật lý] ──► [Tìm kiếm gáy sách]"]:::action
    
    DECISION2{"Tình trạng thực tế trên kệ?"}:::decision
    
    FAIL2["(Nếu sách đã bị mượn / mất)<br/><b>[Không thấy sách trên kệ]</b><br/>➔ [Mất thời gian / Bỏ cuộc]"]:::failure
    
    SUCC2["[Lấy được sách trên kệ]"]:::success
    
    STEP4["[Đi đến quầy Thủ thư] ──► [Xếp hàng chờ đợi] ──► [Giao tiếp với thủ thư] ──► [Quét thẻ & Nhận sách]"]:::action
    
    FINISH(["[Hoàn tất]"]):::startEnd

    %% Các đường nối luồng
    START --> STEP1
    STEP1 --> DECISION1
    DECISION1 -- "Gõ sai / Không nhớ rõ" --> FAIL1
    DECISION1 -- "Nhập chính xác" --> SUCC1
    SUCC1 --> STEP2
    STEP2 --> STEP3
    STEP3 --> DECISION2
    DECISION2 -- "Sách đã mượn/mất" --> FAIL2
    DECISION2 -- "Sách có trên kệ" --> SUCC2
    SUCC2 --> STEP4
    STEP4 --> FINISH
```

---

## II. Các bước trong Luồng quy trình

1. **[Bắt đầu]** Người đọc có nhu cầu mượn tài liệu tại thư viện.
2. **[Đến máy OPAC] ──► [Nhập chính xác Tên/Tác giả]**
   * *Nhánh thành công:* Tìm thấy thông tin tài liệu & ghi lại mã Call Number.
   * *Nhánh thất bại:* Gõ sai hoặc không nhớ rõ tên ➔ Hệ thống báo 0 kết quả ➔ Thử lại nhiều lần hoặc thất bại.
3. **[Đến xem Bảng sơ đồ tĩnh] ──► [Dò tìm vị trí khu vực]** Dò tìm khu vực lưu trữ trên bảng sơ đồ in dán tường.
4. **[Đi đến dãy kệ sách vật lý] ──► [Tìm kiếm gáy sách]** Di chuyển đến khu vực kệ và đối chiếu gáy sách thủ công.
   * *Nhánh thành công:* Tìm thấy sách ➔ Lấy sách trên kệ.
   * *Nhánh thất bại:* Sách đã bị mượn/thất lạc thực tế ➔ Không thấy sách ➔ Mất thời gian / Bỏ cuộc.
5. **[Đi đến quầy Thủ thư] ──► [Xếp hàng chờ đợi] ──► [Giao tiếp với thủ thư] ──► [Quét thẻ & Nhận sách]**
6. **[Hoàn tất]** Hoàn thành quy trình mượn sách.

---

## III. Tài nguyên Đi kèm
* 📄 **File gốc:** [`currentflow.txt`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/report/currentflow/currentflow.txt)
* 🎨 **File HTML Flowchart:** [`currentflow.html`](file:///d:/KHTN_Nam_3/HK3_HCI/Project/HCI_Project/report/currentflow/currentflow.html)
