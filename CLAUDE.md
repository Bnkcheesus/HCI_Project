# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan dự án

Đây là repo tài liệu thiết kế UX cho **LibAssist** — một hệ thống thư viện thông minh (Kiosk AI + ứng dụng di động) hỗ trợ tìm sách, gợi ý sách bằng AI, định vị sách trong thư viện và tự phục vụ mượn sách. Repo hiện **chưa có code** — `code/` và `wireframe-prototype/` đang là thư mục rỗng, dành sẵn cho phần cài đặt và bản dựng prototype sau này. Không có build/lint/test — đừng tự bịa ra các lệnh này.

Toàn bộ công việc hiện tại là chạy một **pipeline sinh tài liệu UX tuần tự** bằng các skill trong `.claude/skills/`, mỗi bước đọc output của bước trước và ghi kết quả vào thư mục `output/` riêng của từng giai đoạn.

## Pipeline và các skill (`.claude/skills/`)

Mỗi skill là một `.claude/skills/<tên-skill>/SKILL.md` chuẩn Claude Code (có frontmatter `name`/`description` để tự kích hoạt), quy định rõ input, output, rule và (khi có) template canvas HTML cần tuân theo. Thứ tự phụ thuộc:

1. **User discovery** (dữ liệu thô, không qua skill) — [user-discovery/output/user-discovery.md](user-discovery/output/user-discovery.md): các persona nghiên cứu thô (goals, tasks, pain points, wishes, touch points, quotes, demographics).
2. **Persona** — skill [persona-generator](.claude/skills/persona-generator/SKILL.md). Đọc user discovery, hợp nhất nhiều user thành **một** persona đại diện (có ghi chú nguồn gốc từng đặc điểm để dễ truy vết), ghi ra `persona/output/persona.md` và dựng canvas trực quan `persona/output/persona.html`.
3. **Value proposition** — skill [value-proposition-generator](.claude/skills/value-proposition-generator/SKILL.md). Chỉ đọc `persona/output/persona.md`, ánh xạ Customer Jobs/Pains/Gains của persona sang Products & Services/Pain Relievers/Gain Creators tương ứng (không được để mục nào "mồ côi", không thiết kế giải pháp cụ thể), ghi ra `valueproposition/output/value-proposition.md` và canvas `valueproposition/output/value-proposition.html` theo đúng bố cục Value Proposition Canvas kiểu Osterwalder.
4. **Scenario** — skill [scenario-generator](.claude/skills/scenario-generator/SKILL.md). Đọc **cả** `persona/output/persona.md` **và** `valueproposition/output/value-proposition.md`, dựng hai kịch bản cùng một tác vụ của persona: kịch bản trên hệ thống hiện tại (khắc họa đúng pain point của persona) và kịch bản trên hệ thống LibAssist mới (mỗi chi tiết "giải quyết ra sao" phải trace ngược về đúng pain reliever/gain creator/product trong value proposition, không tự bịa tính năng), cộng bảng so sánh. Ghi ra `scenario/output/scenario.md`. Không có canvas HTML cho bước này.

## Quy ước ngôn ngữ

Toàn bộ tài liệu và nội dung do các skill sinh ra đều bằng **tiếng Việt**, theo đúng rule "Answer in Vietnamese" trong từng SKILL.md.
