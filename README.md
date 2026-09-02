# LibAssist

Đồ án môn **Tương tác người – máy (HCI)**, ĐH Khoa học Tự nhiên TP.HCM.

**LibAssist** là một hệ thống thư viện thông minh gồm **Kiosk AI** đặt tại thư viện và một
**ứng dụng di động đồng hành**, giải quyết ba điểm nghẽn mà khảo sát thực tế ghi nhận ở quy
trình tra cứu – định vị – mượn sách hiện tại: tìm kiếm đòi hỏi gõ chính xác, không biết đường
đến kệ sách, và không biết sách còn hay đã hết trước khi đi tới nơi.

Repo này chứa **cả hai phần** của đồ án: quy trình nghiên cứu UX (từ khảo sát người dùng đến
persona, value proposition, kịch bản) và **ứng dụng thật** được dựng ra từ quy trình đó, có
backend + database chạy được, không phải bản mô phỏng tĩnh.

## Bắt đầu từ đâu

| Muốn làm gì | Đi tới |
|---|---|
| **Chạy thử ứng dụng** | [code/README.md](code/README.md) — lệnh chạy thật, không có lệnh nào khác |
| **Cài đặt chi tiết trên Mac (PostgreSQL) hoặc Windows (SQL Server)** | [code/huong-dan-cai-dat.md](code/huong-dan-cai-dat.md) |
| **Đọc persona, value proposition, kịch bản dùng để thiết kế** | mục [Quy trình UX](#quy-trình-ux-→-sản-phẩm) bên dưới |
| **Hiểu kiến trúc code, quy tắc, và các cạm bẫy đã gặp khi phát triển** | [CLAUDE.md](CLAUDE.md) |

## Quy trình UX → sản phẩm

Bốn bước sinh ra phạm vi tính năng của sản phẩm, theo đúng thứ tự phụ thuộc — bước sau chỉ được
dùng dữ liệu từ bước trước, không được tự bịa thêm:

1. **[user-discovery/output/](user-discovery/output/)** — dữ liệu khảo sát thật (Google Form,
   8 sinh viên trả lời) về mức độ dùng hệ thống OPAC hiện tại, khó khăn khi định vị sách, và
   rào cản trong quy trình mượn.
2. **[persona/output/persona.md](persona/output/persona.md)** — một persona đại diện tổng hợp
   từ khảo sát trên, kèm canvas trực quan
   [persona.html](persona/output/persona.html).
3. **[value-proposition/output/value-proposition.md](value-proposition/output/value-proposition.md)**
   — ánh xạ từng pain/gain của persona sang pain reliever/gain creator cụ thể, theo đúng khung
   Value Proposition Canvas (Osterwalder). Canvas trực quan:
   [value-proposition.html](value-proposition/output/value-proposition.html).
4. **[scenario/output/scenario.md](scenario/output/scenario.md)** — kịch bản đối chiếu cùng một
   tác vụ của persona trên hệ thống hiện tại và trên LibAssist, mỗi chi tiết "giải quyết ra sao"
   trace ngược được về đúng pain reliever/gain creator ở bước 3.

Ba tài liệu ở bước 2–4 được sinh (và có thể sinh lại) bằng skill Claude Code tương ứng trong
[.claude/skills/](.claude/skills/) — xem [CLAUDE.md](CLAUDE.md#pipeline-và-các-skill-claudeskills)
để biết quy tắc và thứ tự chạy lại.

**[figma/](figma/)** là ảnh chụp prototype dev-mode dùng làm nguồn hình ảnh (layout, màu,
spacing) khi dựng giao diện — không phải nguồn phạm vi tính năng, chỉ là nguồn hình.

**[report/](report/)** chứa sơ đồ luồng hệ thống hiện tại
([currentflow/](report/currentflow/)), sơ đồ điều hướng của sản phẩm
([diagramdrawing/](report/diagramdrawing/)), và dữ liệu kiểm thử người dùng theo tác vụ
(usability test: thời gian hoàn thành, số lỗi, tỉ lệ thành công theo từng task).

## Ứng dụng — [code/](code/)

React + TypeScript + Vite + Tailwind + shadcn/ui cho hai bề mặt `/kiosk/*` và `/mobile/*` dùng
chung component và design token, nối với nhau bằng **cú bắt tay QR**: mã QR trên mọi trang sách
của kiosk mở đúng màn định vị kệ trên điện thoại. Backend là REST API thật (Fastify + Kysely)
chạy được trên **cả PostgreSQL lẫn SQL Server** từ một bộ query duy nhất.

Toàn bộ 13 màn sản phẩm (9 kiosk + 4 mobile) đã cài đặt đầy đủ, có test, đã qua nhiều vòng
chỉnh sửa UI/UX dựa trên ảnh chụp trình duyệt thật. Chi tiết đầy đủ — lệnh chạy, cấu trúc
thư mục, trạng thái từng màn — nằm trong [code/README.md](code/README.md), không lặp lại ở
đây để tránh hai nguồn sự thật cho cùng một thông tin.

## Ngôn ngữ

Tài liệu UX (persona, value proposition, kịch bản) và trao đổi trong repo này bằng **tiếng
Việt**. Trong `code/`, nội dung hiển thị cho người dùng vẫn tiếng Việt, còn tên biến/hàm/comment
trong code bằng tiếng Anh theo quy ước lập trình thông thường.
