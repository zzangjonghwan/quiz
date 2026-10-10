import { Flag, Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import { canReport, reportUrl } from '../report'
import type { SessionItem } from '../session'
import type { Card, KanjiInfo, WordInfo } from '../types'

/**
 * The "쪼개기 → 합치면 → 뜻 → 유래 → 기억 팁 → 덤" explanation card. `item` is the question as it was
 * asked, which the 문제 신고 form gets filled in with.
 */
export function Explanation({ card, item }: { card: Card; item?: SessionItem }) {
  const e = card.explanation
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
      {e.kanji && <KanjiHeader kanji={e.kanji} />}
      {e.word && <WordHeader word={e.word} />}
      {e.breakdown && e.breakdown.length > 0 && (
        <Section label={e.kanji ? '모양 쪼개기' : e.word ? '어원 쪼개기' : '쪼개기'}>
          <div className="flex flex-col divide-y divide-line">
            {e.breakdown.map((b, i) => (
              <div key={i} className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0">
                <span lang={e.kanji ? 'ja' : e.word ? 'en' : undefined} className="min-w-[2.5rem] shrink-0 text-lg font-bold">
                  {b.part}
                </span>
                {b.origin && <span className="shrink-0 text-sm text-fg-muted">{b.origin}</span>}
                <span className="ml-auto text-right text-[15px]">{b.meaning}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {e.literal && <Section label="합치면">{e.literal}</Section>}
      <Section label={e.kanji || e.word ? '뜻' : e.literal ? '실제 뜻' : '해설'}>{e.meaning}</Section>
      {e.origin && <Section label="유래">{e.origin}</Section>}
      {e.tip && (
        <div className="flex gap-3 rounded-xl bg-accent/10 p-4">
          <Lightbulb size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-[15px] leading-relaxed">{e.tip}</p>
        </div>
      )}
      {e.word?.sentence && (
        <Section label="예문">
          <p lang="en" className="font-medium">
            {e.word.sentence.en}
          </p>
          <p className="text-fg-muted">{e.word.sentence.ko}</p>
        </Section>
      )}
      {e.word?.related && e.word.related.length > 0 && (
        <Section label="같은 뿌리의 단어">
          <div className="flex flex-col gap-1.5">
            {e.word.related.map((w) => (
              <div key={w.word} className="flex items-baseline gap-2">
                <span lang="en" className="font-semibold">
                  {w.word}
                </span>
                <span className="ml-auto text-right text-[15px]">{w.meaning}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {e.kanji?.words && e.kanji.words.length > 0 && (
        <Section label="이 한자가 들어간 말">
          <div className="flex flex-col gap-1.5">
            {e.kanji.words.map((w) => (
              <div key={w.word} className="flex items-baseline gap-2">
                <span lang="ja" className="text-lg font-semibold">
                  {w.word}
                </span>
                <span lang="ja" className="text-sm text-fg-muted">
                  {w.reading}
                </span>
                <span className="ml-auto text-right text-[15px]">{w.meaning}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {e.bonus && <Section label="덤 지식">{e.bonus}</Section>}
      {(card.asOf || canReport) && (
        <div className="flex items-center gap-3 text-xs text-fg-subtle">
          {card.asOf && <span>기준 시점: {formatAsOf(card.asOf)}</span>}
          {canReport && (
            <a
              href={reportUrl(card, item)}
              target="_blank"
              rel="noopener noreferrer"
              className="-my-2 ml-auto flex items-center gap-1 py-2 active:text-fg-muted"
            >
              <Flag size={13} strokeWidth={2} />
              문제 신고
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/** The kanji itself, its Korean hanja name and its Japanese readings. */
function KanjiHeader({ kanji }: { kanji: KanjiInfo }) {
  return (
    <div className="flex items-center gap-4">
      <span lang="ja" className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-5xl leading-none">
        {kanji.char}
      </span>
      <div className="flex flex-col gap-1 text-[15px]">
        {kanji.ko && <span className="text-lg font-bold">{kanji.ko}</span>}
        {kanji.on && (
          <span>
            <span className="mr-2 text-xs font-semibold text-fg-subtle">음독</span>
            <span lang="ja">{kanji.on}</span>
          </span>
        )}
        {kanji.kun && (
          <span>
            <span className="mr-2 text-xs font-semibold text-fg-subtle">훈독</span>
            <span lang="ja">{kanji.kun}</span>
          </span>
        )}
      </div>
    </div>
  )
}

/** The English word (or word part) and its part of speech. */
function WordHeader({ word }: { word: WordInfo }) {
  return (
    <div className="flex items-baseline gap-3">
      <span lang="en" className="text-3xl font-bold break-all">
        {word.text}
      </span>
      {word.pos && <span className="shrink-0 text-sm text-fg-muted">{word.pos}</span>}
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-fg-subtle">{label}</span>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </div>
  )
}

function formatAsOf(asOf: string) {
  const [y, m] = asOf.split('-')
  return m ? `${y}년 ${Number(m)}월` : `${y}년`
}
