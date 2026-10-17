import { markPieces } from '../marks'

/** Text with its [marked] part under a 형광펜. */
export function Marked({ text }: { text: string }) {
  return (
    <>
      {markPieces(text).map((p, i) =>
        p.mark ? (
          <mark key={i} className="mark-hl">
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  )
}
