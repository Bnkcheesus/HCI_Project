# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan dự án

Đây là repo thiết kế UX + cài đặt cho **LibAssist** — một hệ thống thư viện thông minh (Kiosk AI + ứng dụng di động) hỗ trợ tìm sách, gợi ý sách bằng AI, định vị sách trong thư viện và tự phục vụ mượn sách. Tính đến hiện tại, `code/` và `wireframe-prototype/` vẫn là thư mục rỗng — chưa có lần chạy nào của skill cài đặt — nhưng skill [code-generator](.claude/skills/code-generator/SKILL.md) đã sẵn sàng để dựng code thật trong `code/`, dựa trên prototype Figma (dev mode) làm nguồn hình ảnh và các output UX bên dưới làm nguồn phạm vi tính năng. Không có build/lint/test cho tới khi skill đó chạy — đừng tự bịa ra các lệnh này trước đó.

Toàn bộ công việc hiện tại là chạy một **pipeline tuần tự** bằng các skill trong `.claude/skills/`: 3 bước đầu sinh tài liệu UX, bước cuối sinh code — mỗi bước đọc output của (các) bước trước và ghi kết quả vào thư mục `output/` (hoặc `code/`) riêng của từng giai đoạn.

## Pipeline và các skill (`.claude/skills/`)

Mỗi skill là một `.claude/skills/<tên-skill>/SKILL.md` chuẩn Claude Code (có frontmatter `name`/`description` để tự kích hoạt), quy định rõ input, output, rule và (khi có) template canvas HTML cần tuân theo. Thứ tự phụ thuộc:

1. **User discovery** (dữ liệu thô, không qua skill) — [user-discovery/output/user-discovery.md](user-discovery/output/user-discovery.md): các persona nghiên cứu thô (goals, tasks, pain points, wishes, touch points, quotes, demographics).
2. **Persona** — skill [persona-generator](.claude/skills/persona-generator/SKILL.md). Đọc user discovery, hợp nhất nhiều user thành **một** persona đại diện (có ghi chú nguồn gốc từng đặc điểm để dễ truy vết), ghi ra `persona/output/persona.md` và dựng canvas trực quan `persona/output/persona.html`.
3. **Value proposition** — skill [value-proposition-generator](.claude/skills/value-proposition-generator/SKILL.md). Chỉ đọc `persona/output/persona.md`, ánh xạ Customer Jobs/Pains/Gains của persona sang Products & Services/Pain Relievers/Gain Creators tương ứng (không được để mục nào "mồ côi", không thiết kế giải pháp cụ thể), ghi ra `value-proposition/output/value-proposition.md` và canvas `value-proposition/output/value-proposition.html` theo đúng bố cục Value Proposition Canvas kiểu Osterwalder.
4. **Scenario** — skill [scenario-generator](.claude/skills/scenario-generator/SKILL.md). Đọc **cả** `persona/output/persona.md` **và** `value-proposition/output/value-proposition.md`, dựng hai kịch bản cùng một tác vụ của persona: kịch bản trên hệ thống hiện tại (khắc họa đúng pain point của persona) và kịch bản trên hệ thống LibAssist mới (mỗi chi tiết "giải quyết ra sao" phải trace ngược về đúng pain reliever/gain creator/product trong value proposition, không tự bịa tính năng), cộng bảng so sánh. Ghi ra `scenario/output/scenario.md`. Không có canvas HTML cho bước này.
5. **Code** — skill [code-generator](.claude/skills/code-generator/SKILL.md). Đọc cả 3 output UX phía trên (làm nguồn phạm vi tính năng — mọi màn hình/luồng phải trace ngược về một Product/Service, Pain Reliever hoặc Gain Creator) cộng với prototype Figma dev-mode làm nguồn hình ảnh (layout, màu, spacing, typography). Dựng ứng dụng React + TypeScript + Vite + Tailwind + shadcn/ui (đã chốt stack trong SKILL.md) trong `code/`, gồm hai luồng route `/kiosk/*` và `/mobile/*` dùng chung component/design token, dữ liệu mock cho tới khi có backend thật.

## Quy ước ngôn ngữ

Toàn bộ tài liệu do 3 skill UX (persona/value-proposition/scenario) sinh ra đều bằng **tiếng Việt**, theo đúng rule "Answer in Vietnamese" trong từng SKILL.md. Riêng skill `code-generator`: nội dung hiển thị cho người dùng (label, nút, thông báo) vẫn bằng tiếng Việt, còn tên biến/hàm, comment và commit message trong code thì bằng tiếng Anh theo quy ước lập trình thông thường — đây là nơi duy nhất trong repo hai ngôn ngữ cùng tồn tại có chủ đích.
