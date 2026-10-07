// Asks GPT (OpenAI API) for 상식플러스 story drafts in the house style. Drafts land in
// .stories/drafts/<id>.json for a human/Claude fact-check pass before they go into content/stories.
//
//   node scripts/draft-stories.mjs            draft every topic that has no draft yet
//   node scripts/draft-stories.mjs <id> ...   (re)draft the given topics
//
// The key is read from OPENAI_API_KEY, .env.local or ../agent/.env and never written anywhere.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = join(ROOT, '.stories', 'drafts')
const MODEL = 'gpt-5.5'

export const TOPICS = [
  { id: 'samguk-1', cat: 'samguk', topic: '삼국지 – 도원결의 (그리고 관우가 신이 되어 서울 동묘까지 오게 된 사연)' },
  { id: 'samguk-2', cat: 'samguk', topic: '삼국지 – 제갈량 (삼고초려, 천하삼분지계, 그가 존경받는 진짜 이유)' },
  { id: 'samguk-3', cat: 'samguk', topic: '삼국지 – 적벽대전 (소설과 역사의 차이, 이긴 쪽과 진 쪽의 기억)' },
  { id: 'myth-1', cat: 'myth', topic: '그리스 신화 – 프로메테우스와 판도라의 상자' },
  { id: 'myth-2', cat: 'myth', topic: '그리스 신화 – 트로이 전쟁 (황금 사과, 아킬레스건, 트로이 목마, 슐리만의 발굴)' },
  { id: 'myth-3', cat: 'myth', topic: '그리스 신화 – 오르페우스와 에우리디케 (뒤돌아보지 마라 금기, 이 이야기가 남긴 음악과 별자리)' },
  { id: 'tarot-1', cat: 'tarot', topic: '타로 – 타로 카드의 기원 (카드 게임에서 점술 도구가 되기까지, 트럼프와의 관계)' },
  { id: 'tarot-2', cat: 'tarot', topic: '타로 – 메이저 아르카나 0번 바보부터 21번 세계까지, 각 숫자 카드의 의미와 바보의 여정' },
  { id: 'tarot-3', cat: 'tarot', topic: '타로 – 무서운 카드(13 죽음, 15 악마, 16 탑)의 진짜 뜻과 숫자 13이 불길해진 이유' },
  { id: 'art-1', cat: 'art', topic: '예술 – 모나리자 (1911년 도난 사건과 세계에서 가장 유명한 그림이 된 이유)' },
  { id: 'art-2', cat: 'art', topic: '예술 – 빈센트 반 고흐 (귀 사건, 생전에 팔린 그림, 동생 테오와 요한나)' },
  { id: 'art-3', cat: 'art', topic: '예술 – 베토벤 (청력 상실, 운명 교향곡 일화의 진위, 9번 교향곡 초연)' },
  { id: 'history-1', cat: 'history', topic: '역사 – 훈민정음 해례본 (한글 창제 원리와 간송 전형필이 해례본을 지킨 이야기)' },
  { id: 'history-2', cat: 'history', topic: '역사 – 명량 해전 (열두 척의 배, 울돌목, 이순신)' },
  { id: 'history-3', cat: 'history', topic: '역사 – 흑사병 (격리를 뜻하는 쿼런틴의 유래, 흑사병이 바꾼 유럽)' },
  { id: 'wisdom-1', cat: 'wisdom', topic: '평생 교양 – 잘못 알려진 명언의 진짜 출처 (마리 앙투아네트, 갈릴레이, 셜록 홈스, 스피노자 사과나무 등)' },
  { id: 'wisdom-2', cat: 'wisdom', topic: '평생 교양 – 파레토 법칙(80 대 20)과 롱테일, 일개미 이야기' },
  { id: 'wisdom-3', cat: 'wisdom', topic: '평생 교양 – 생각의 함정 세 가지 (더닝 크루거 효과와 레몬즙 은행 강도, 확증 편향, 매몰 비용의 오류)' },
]

const STYLE = `너는 20대가 즐겨 듣는 교양 오디오 채널 '상식플러스'의 작가야. 주제 하나로 낭독용 원고를 써.

형식
- '○○에 얽힌 이야기'처럼 써. 동화책처럼 줄거리를 처음부터 읽어 주지 마. 그 주제에 얽힌 뒷이야기, 의외의 사실, 흔한 오해와 진실, 이름의 유래, 지금 우리 생활과의 연결을 엮어.
- 기승전결, 두괄식. 첫 문단에서 의외의 사실이나 질문을 던져 듣는 사람이 "왜?" 하고 궁금하게 만들어. 중간에 반전을 하나 넣어. 마지막 문단에서 첫 질문에 답하고, 친구에게 써먹을 만한 한마디로 끝내.

말투
- 편한 해요체 대화체. 딱딱한 존댓말이나 설명문 말투는 금지. 라디오 진행자가 친구에게 이야기하듯.
- 이런 리듬을 자주 써: "~는 왜 그랬는지 궁금하시죠? 바로 ~가 ~해서 ~된 거예요. 재밌죠!", "놀랍죠?", "여기서 반전!", "이게 끝이 아니에요."
- 문장은 짧게. 한 문장에 정보 하나.

길이와 낭독
- 정확히 7문단. 공백을 뺀 글자 수 합계 1,000~1,100자(읽으면 약 3분). 짧게 쓰지 마. 각 문단은 공백 제외 140자 이상.
- TTS가 읽을 원고야. 이모지, 괄호 설명, 각주, 영어 약어 남발 금지. 숫자는 읽기 쉽게. 따옴표는 ‘ ’ “ ”만.

정확성 (가장 중요)
- 확실한 사실만 써. 연도·숫자·인용은 정확해야 해. 모르면 쓰지 마.
- 전설이나 설은 반드시 "~라는 이야기가 있어요", "~라는 설이 있어요"라고 표시해.
- 저작권이 살아 있는 작품의 문장은 인용하지 마.

출력은 JSON 하나만: {"title": "…에 얽힌 이야기", "sub": "호기심을 끄는 한 줄 부제", "paragraphs": ["…", 7개]}`

function apiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  for (const file of [join(ROOT, '.env.local'), join(ROOT, '..', 'agent', '.env')]) {
    if (!existsSync(file)) continue
    const m = readFileSync(file, 'utf8').match(/^OPENAI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m)
    if (m) return m[1]
  }
  throw new Error('OPENAI_API_KEY를 찾지 못했어요')
}

async function draft(t, key) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: STYLE },
        { role: 'user', content: `주제: ${t.topic}` },
      ],
    }),
    signal: AbortSignal.timeout(300_000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${t.id}: ${data.error?.message ?? res.status}`)
  const story = JSON.parse(data.choices[0].message.content)
  const chars = story.paragraphs.join('').replace(/\s/g, '').length
  writeFileSync(join(OUT, `${t.id}.json`), JSON.stringify({ id: t.id, cat: t.cat, ...story }, null, 2))
  console.log(`${t.id}: ${story.title} (${story.paragraphs.length}문단, ${chars}자)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(OUT, { recursive: true })
  const key = apiKey()
  const ids = process.argv.slice(2)
  const todo = TOPICS.filter((t) => (ids.length ? ids.includes(t.id) : !existsSync(join(OUT, `${t.id}.json`))))
  for (let i = 0; i < todo.length; i += 6) {
    const results = await Promise.allSettled(todo.slice(i, i + 6).map((t) => draft(t, key)))
    for (const r of results) if (r.status === 'rejected') console.error('✗', r.reason.message)
  }
}
