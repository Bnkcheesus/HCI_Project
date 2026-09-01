# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan dự án

Đây là repo thiết kế UX + cài đặt cho **LibAssist** — một hệ thống thư viện thông minh (Kiosk AI + ứng dụng di động) hỗ trợ tìm sách, gợi ý sách bằng AI, định vị sách trong thư viện và tự phục vụ mượn sách.

Pipeline sinh tài liệu UX (persona → value proposition → scenario) đã chạy xong, và skill [code-generator](.claude/skills/code-generator/SKILL.md) đã dựng ứng dụng thật trong `code/` từ đó.

**Trạng thái hiện tại**: cả 13 route đã cài đặt đầy đủ — 9 màn kiosk (`code/src/kiosk/`) và 4 màn mobile (`code/src/mobile/`) — có test, đã qua nhiều vòng chỉnh sửa UI/UX thật dựa trên ảnh chụp trình duyệt. Không còn màn nào là stub.

**Đã có backend và database thật.** `code/server/` là REST API (Fastify + Kysely) chạy được trên **cả PostgreSQL lẫn SQL Server** từ một bộ query duy nhất — đổi `DB_DIALECT` là đổi database. Frontend không còn đọc `src/mocks/` lúc chạy: mọi màn lấy dữ liệu qua `src/api/queries.ts` (TanStack Query). `src/mocks/` đổi vai thành **nguồn seed cho DB** và **fixture cho test**.

Lệnh chạy thật trong `code/` — dùng chúng, đừng bịa lệnh khác:
`npm run dev` (API + Vite), `npm run build`, `npm run lint`, `npm run test` (frontend),
`npm run test:server` (API + DB, cần database), `npm run db:migrate/db:seed/db:reset`.
Chi tiết database ở [code/docs/database.md](code/docs/database.md), kế hoạch và tiến độ ở
[code/docs/ke-hoach-backend-database.md](code/docs/ke-hoach-backend-database.md).

Hai bề mặt nối với nhau bằng **cú bắt tay QR**, và nó chạy được đầu-cuối: mã QR trên mọi trang sách của kiosk mã hoá `/mobile/location?book=<id>`, còn `code/src/lib/qrHandoff.ts` giải mã URL đó (hoặc mã ISBN gõ tay, hoặc mã phiếu) thành đường dẫn cần mở. Sửa một bên mà quên bên kia là làm hỏng một lời hứa bên kia đang hiển thị trên màn hình.

Từ khi có backend, cú bắt tay này mới **thật sự chạy được giữa hai thiết bị khác nhau** — trước đây phiếu mượn nằm trong `localStorage` của trình duyệt kiosk nên điện thoại thật quét kiosk thật không tìm thấy gì. `node scripts/check-handoff.mjs` kiểm điều đó bằng hai browser context tách biệt.

## Pipeline và các skill (`.claude/skills/`)

Mỗi skill là một `.claude/skills/<tên-skill>/SKILL.md` chuẩn Claude Code (có frontmatter `name`/`description` để tự kích hoạt), quy định rõ input, output, rule và (khi có) template canvas HTML cần tuân theo. Thứ tự phụ thuộc:

1. **User discovery** (dữ liệu thô, không qua skill) — [user-discovery/output/user-discovery.md](user-discovery/output/user-discovery.md): các persona nghiên cứu thô (goals, tasks, pain points, wishes, touch points, quotes, demographics).
2. **Persona** — skill [persona-generator](.claude/skills/persona-generator/SKILL.md). Đọc user discovery, hợp nhất nhiều user thành **một** persona đại diện (có ghi chú nguồn gốc từng đặc điểm để dễ truy vết), ghi ra `persona/output/persona.md` và dựng canvas trực quan `persona/output/persona.html`.
3. **Value proposition** — skill [value-proposition-generator](.claude/skills/value-proposition-generator/SKILL.md). Chỉ đọc `persona/output/persona.md`, ánh xạ Customer Jobs/Pains/Gains của persona sang Products & Services/Pain Relievers/Gain Creators tương ứng (không được để mục nào "mồ côi", không thiết kế giải pháp cụ thể), ghi ra `value-proposition/output/value-proposition.md` và canvas `value-proposition/output/value-proposition.html` theo đúng bố cục Value Proposition Canvas kiểu Osterwalder.
4. **Scenario** — skill [scenario-generator](.claude/skills/scenario-generator/SKILL.md). Đọc **cả** `persona/output/persona.md` **và** `value-proposition/output/value-proposition.md`, dựng hai kịch bản cùng một tác vụ của persona: kịch bản trên hệ thống hiện tại (khắc họa đúng pain point của persona) và kịch bản trên hệ thống LibAssist mới (mỗi chi tiết "giải quyết ra sao" phải trace ngược về đúng pain reliever/gain creator/product trong value proposition, không tự bịa tính năng), cộng bảng so sánh. Ghi ra `scenario/output/scenario.md`. Không có canvas HTML cho bước này.
5. **Code** — skill [code-generator](.claude/skills/code-generator/SKILL.md). Đọc cả 3 output UX phía trên (làm nguồn phạm vi tính năng — mọi màn hình/luồng phải trace ngược về một Product/Service, Pain Reliever hoặc Gain Creator) cộng với prototype Figma dev-mode làm nguồn hình ảnh (layout, màu, spacing, typography). Cài đặt và tiếp tục phát triển ứng dụng React + TypeScript + Vite + Tailwind + shadcn/ui trong `code/`, gồm hai luồng route `/kiosk/*` và `/mobile/*` (cả hai đã xong) dùng chung component/design token, cộng với backend Fastify + Kysely trong `code/server/`.

3 skill UX ở trên hiếm khi cần chạy lại — chỉ khi user chủ động yêu cầu cập nhật persona/value-proposition/scenario. Phần lớn công việc thường ngày trong repo này rơi vào bước 5: sửa lỗi, thêm màn, tinh chỉnh UI trong `code/`.

## Quy ước ngôn ngữ

Toàn bộ tài liệu do 3 skill UX (persona/value-proposition/scenario) sinh ra đều bằng **tiếng Việt**, theo đúng rule "Answer in Vietnamese" trong từng SKILL.md. Riêng skill `code-generator`: nội dung hiển thị cho người dùng (label, nút, thông báo) vẫn bằng tiếng Việt, còn tên biến/hàm, comment và commit message trong code thì bằng tiếng Anh theo quy ước lập trình thông thường — đây là nơi duy nhất trong repo hai ngôn ngữ cùng tồn tại có chủ đích. Bản thân file CLAUDE.md này và trao đổi với người dùng trong repo cũng bằng tiếng Việt.

## Làm việc trong `code/`

Khi công việc là sửa/thêm tính năng trong ứng dụng (không phải chạy lại pipeline UX), đọc kỹ [code-generator SKILL.md](.claude/skills/code-generator/SKILL.md) trước — nó có bảng route/màn hình, quy tắc truy vết về value proposition, kiến trúc token CSS, và một danh sách "Gotchas" dài chứa mọi cạm bẫy đã gặp thật trong dự án (đừng lặp lại). Luôn kiểm chứng bằng trình duyệt thật (script Playwright trong `code/scripts/`) trước khi báo hoàn thành — jsdom không dựng layout, không phân giải biến CSS, không đo tương phản.

Ba script là cửa gác chính: `node scripts/check-chrome.mjs` cho kiosk, `node scripts/check-mobile.mjs` cho mobile, và `node scripts/check-handoff.mjs` cho ba lời hứa mà backend tồn tại để giữ (trừ tồn kho thật, phiếu qua được thiết bị khác, giới hạn mượn do server quyết). Cả ba cần `npm run dev` đang chạy và database đã seed. **Chạy xong phải mở ảnh chụp ra xem** — gần như mọi lỗi bố cục trong dự án này đều lọt qua script rồi mới lộ ra trong ảnh. Bảng màu có công cụ đo riêng: `node scripts/check-palette.mjs` kiểm mọi cặp màu components thực sự vẽ ra, theo ngưỡng WCAG AA cho chữ thường (4.5:1) — persona thị lực kém, không dùng ngưỡng chữ lớn.
