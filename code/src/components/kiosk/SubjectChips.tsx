import { popularSubjects } from '@/mocks'

/**
 * One-tap subject shortcuts — Job 1 / Gain Creator 5 (tìm theo chủ đề chuyên sâu).
 * Lets the persona skip typing entirely when they only know the field, not the title —
 * the fastest possible path for someone with minutes between classes.
 */

interface SubjectChipsProps {
  onSelect: (subject: string) => void
}

export function SubjectChips({ onSelect }: SubjectChipsProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2
        className="font-heading font-bold uppercase tracking-[0.18em] text-muted-foreground"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        Duyệt nhanh theo chủ đề
      </h2>

      <ul className="flex flex-wrap gap-3">
        {popularSubjects.map((subject) => (
          <li key={subject}>
            <button
              type="button"
              onClick={() => onSelect(subject)}
              data-kiosk-surface
              className="min-h-[var(--touch-min)] rounded-full border border-[var(--rule)] bg-card px-6 font-medium text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              style={{ fontSize: 'var(--text-body)' }}
            >
              {subject}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
