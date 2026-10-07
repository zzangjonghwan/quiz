// Asks GPT (OpenAI API) for 상식플러스 story drafts in the house style. Drafts land in
// .stories/drafts/<id>.json for a human/Claude fact-check pass before they go into content/stories.
//
//   node scripts/draft-stories.mjs            draft every topic that has no draft yet
//   node scripts/draft-stories.mjs <id> ...   (re)draft the given topics
//   node scripts/draft-stories.mjs --revise <id> ...
//                                              edit the current script in content/stories for
//                                              clarity, keeping its facts and length
//
// The key is read from OPENAI_API_KEY, .env.local or ../agent/.env and never written anywhere.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = join(ROOT, '.stories', 'drafts')
// gpt-5.5 wrote the first 18 stories; its 2판 drafts had too many vague or forced sentences.
const MODEL = 'gpt-6-astra'
const REASONING = 'high'

export const TOPICS = [
  { id: 'samguk-1', cat: 'samguk', topic: '삼국지 – 도원결의 (그리고 관우가 신이 되어 서울 동묘까지 오게 된 사연)' },
  { id: 'samguk-2', cat: 'samguk', topic: '삼국지 – 제갈량 (삼고초려, 천하삼분지계, 그가 존경받는 진짜 이유)' },
  { id: 'samguk-3', cat: 'samguk', topic: '삼국지 – 적벽대전 (소설과 역사의 차이, 이긴 쪽과 진 쪽의 기억)' },
  { id: 'myth-1', cat: 'myth', topic: '그리스 신화 – 프로메테우스와 판도라의 상자' },
  { id: 'myth-2', cat: 'myth', topic: '그리스 신화 – 트로이 전쟁 (황금 사과, 아킬레스건, 트로이 목마, 슐리만의 발굴)' },
  { id: 'myth-3', cat: 'myth', topic: '그리스 신화 – 오르페우스와 에우리디케 (뒤돌아보지 마라 금기, 이 이야기가 남긴 음악과 별자리)' },
  { id: 'tarot-1', cat: 'tarot', topic: '타로 – 타로 카드의 기원 (카드 게임에서 점술 도구가 되기까지, 트럼프와의 관계)' },
  ...[
    ['0번 바보부터 3번 여황제까지', '0 바보, 1 마법사, 2 여사제, 3 여황제'],
    ['4번 황제부터 7번 전차까지', '4 황제, 5 교황, 6 연인, 7 전차'],
    ['8번 힘부터 11번 정의까지', '8 힘, 9 은둔자, 10 운명의 수레바퀴, 11 정의 (덱에 따라 8번과 11번이 서로 바뀜)'],
    ['12번 매달린 사람부터 16번 탑까지', '12 매달린 사람, 13 죽음, 14 절제, 15 악마, 16 탑'],
    ['17번 별부터 21번 세계까지', '17 별, 18 달, 19 태양, 20 심판, 21 세계, 그리고 다시 0번으로 이어지는 순환'],
  ].map(([range, cards], i) => ({
    id: `tarot-num-${i + 1}`,
    cat: 'tarot',
    style: 2,
    title: `타로 숫자 이야기 ${'①②③④⑤'[i]} ${range}`,
    topic: `타로 메이저 아르카나 22장을 0번 바보가 세상을 여행하는 이야기로 풀어 주는 5부작 가운데 ${i + 1}편. 이번 편에서 다룰 카드: ${cards}. 카드마다 그림에 무엇이 그려져 있는지, 그 숫자 자리에 있는 이유, 뜻, 일상 예시를 하나씩 자연스럽게 이어서 설명해.${i === 0 ? ' 1편이니까 타로가 무엇인지, 메이저 아르카나가 무슨 뜻인지(큰 비밀이라는 뜻의 22장 핵심 카드), 왜 0번 바보의 여행으로 읽는지부터 쉽게 소개해.' : ''}`,
  })),
  { id: 'tarot-3', cat: 'tarot', topic: '타로 – 무서운 카드(13 죽음, 15 악마, 16 탑)의 진짜 뜻과 숫자 13이 불길해진 이유' },
  { id: 'tarot-4', cat: 'tarot', style: 2, topic: '타로 – 지금 남아 있는 가장 오래된 타로, 15세기 밀라노의 비스콘티 스포르차 덱에 얽힌 이야기 (밀라노 지배 가문을 위해 금박을 입혀 손으로 그린 카드, 여러 박물관과 도서관에 흩어져 있음, 남은 카드 가운데 악마와 탑 카드가 없다는 사실과 그에 대한 여러 추측). 단독 편이야. 시리즈 예고는 하지 마.' },
  { id: 'tarot-5', cat: 'tarot', style: 2, topic: '타로 – 세상에서 가장 유명한 타로 그림을 그리고도 오래 잊혔던 화가 파멜라 콜먼 스미스에 얽힌 이야기 (1909년 아서 에드워드 웨이트의 의뢰로 78장을 그림, 숫자 카드에도 장면을 그려 넣어 초보자가 읽기 쉬워진 이유, 적은 보수, 가난하게 세상을 떠남, 요즘 라이더 웨이트 스미스 덱이라고 이름을 함께 부르게 된 흐름). 단독 편이야. 시리즈 예고는 하지 마.' },
  { id: 'tarot-6', cat: 'tarot', style: 2, topic: '타로 – 타로를 처음 배우는 사람을 위한 카드 읽는 법 이야기 (하루 한 장 뽑기, 과거 현재 미래 세 장 펼치기, 1910년대에 웨이트가 소개해 유명해진 켈틱 크로스, 카드가 거꾸로 나온 역방향을 읽는 몇 가지 방식, 질문을 잘 세우는 법). 점을 맹신하라는 이야기가 아니라 생각을 정리하는 도구로 소개해. 단독 편이야. 시리즈 예고는 하지 마.' },
  ...[
    ['네 가지 무늬와 숫자 읽는 법', '마이너 아르카나 56장의 구조. 네 무늬 완드(불, 열정과 일), 컵(물, 감정과 관계), 소드(공기, 생각과 갈등), 펜타클(흙, 돈과 몸과 현실)과 각 무늬에 에이스부터 10까지 숫자 카드 40장, 궁정 카드 16장이 있다는 것. 숫자는 이야기의 단계, 무늬는 그 이야기가 벌어지는 무대라는 읽는 요령. 1편이니까 이 시리즈가 무엇을 공부하는지부터 소개해.'],
    ['에이스와 2', '에이스는 씨앗과 시작, 2는 선택과 균형과 만남. 무늬마다 에이스 카드와 2번 카드의 그림과 뜻을 하나씩 (예: 컵 2의 두 사람이 잔을 나누는 장면, 소드 2의 눈을 가린 여인). 메이저 아르카나 1번 마법사와 2번 여사제와 숫자가 겹친다는 연결도 짧게.'],
    ['3과 4', '3은 성장과 결과의 첫 모습, 4는 안정과 멈춤. 무늬마다 3번과 4번 카드의 그림과 뜻 (예: 소드 3의 칼 세 자루에 꿰뚫린 하트, 펜타클 4의 동전을 꽉 쥔 사람). 메이저 3번 여황제, 4번 황제와의 연결도 짧게.'],
    ['5와 6', '5는 흔들림과 갈등과 상실, 6은 회복과 조화와 주고받음. 무늬마다 5번과 6번 카드의 그림과 뜻 (예: 컵 5의 쓰러진 잔 세 개와 서 있는 잔 두 개, 펜타클 6의 저울을 든 사람). 5에서 6으로 넘어갈 때 분위기가 바뀌는 흐름을 강조해.'],
    ['7과 8', '7은 시험과 고민과 버티기, 8은 움직임과 집중과 반복. 무늬마다 7번과 8번 카드의 그림과 뜻 (예: 컵 7의 구름 위 여러 잔, 펜타클 8의 동전을 새기는 장인). 메이저 7번 전차, 8번 힘과의 연결도 짧게.'],
    ['9와 10', '9는 거의 다 온 자리, 10은 완성이자 다음 순환의 시작. 무늬마다 9번과 10번 카드의 그림과 뜻 (예: 컵 9의 만족한 사람, 소드 10의 바닥에 쓰러진 사람과 밝아 오는 하늘). 10 다음은 다시 에이스로 이어진다는 순환으로 숫자 공부를 정리해.'],
    ['궁정 카드 16장', '시종, 기사, 여왕, 왕이 무늬마다 하나씩 있다는 것. 시종은 배우는 사람과 소식, 기사는 행동과 움직임, 여왕은 안에서 다지는 성숙, 왕은 밖으로 이끄는 성숙. 실제 사람으로도, 내 안의 태도로도 읽을 수 있다는 요령. 무늬별 예시 몇 개만. 마지막 편이니까 마이너 아르카나 공부 전체를 정리해.'],
  ].map(([range, about], i) => ({
    id: `tarot-study-${i + 1}`,
    cat: 'tarot',
    style: 2,
    title: `타로 공부 ${'①②③④⑤⑥⑦'[i]} ${range}`,
    topic: `타로를 처음 배우는 사람을 위한 마이너 아르카나 공부 7부작 가운데 ${i + 1}편. 많이 쓰이는 라이더 웨이트 스미스 덱 기준. 이번 편 내용: ${about} 카드 이름을 줄줄이 나열하지 말고, 숫자의 뜻을 먼저 잡아 준 다음 대표 카드 그림으로 기억하게 해 줘.`,
  })),
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

/** House style v2 (radio host, beginner friendly, natural flow). Topics opt in with `style: 2`. */
const STYLE_V2 = `너는 오디오 채널 '상식플러스'의 진행자 겸 작가야. 밤에 라디오를 켜 둔 청취자에게 말을 건네듯 낭독용 원고를 써.

듣는 사람
- 이 주제를 처음 듣는 사람이야. 배경지식이 하나도 없다고 생각해. 낯선 용어는 처음 나올 때 쉬운 말로 한 번 풀어 줘.
- 귀로만 듣는 원고야. 한 문단에 핵심은 하나만. 이름이나 숫자를 줄줄이 나열하지 마.

흐름
- 새 내용을 갑자기 꺼내지 마. 앞 이야기에서 다음 이야기로 넘어가는 다리를 꼭 놓아 줘. 예: "그럼 이렇게 길을 나선 바보가 처음 만나는 사람은 누굴까요?"
- 기승전결. 처음엔 가볍게 말을 걸며 궁금증을 만들고, 중간엔 장면을 그려 주듯 하나씩 보여 주고, 끝에선 정리하고 일상에서 써먹을 한마디를 건네.
- 일상 예시는 설명이 정말 쉬워질 때만, 꼭 맞는 것 하나만 들어. 시험·연애·이직을 아무 데나 끼운 억지 비유는 금지.
- 추상적인 말 대신 눈에 그려지는 구체적인 말로 써. 모든 문장은 처음 듣는 사람이 한 번 듣고 바로 알아들어야 해.

말투
- 라디오 진행자처럼 편하고 다정하게, 해요체. "자,", "그쵸?", "한번 상상해 보세요", "재밌죠?"처럼 청취자에게 말을 거는 말을 자연스럽게 섞어.
- 교과서나 설명문 말투 금지. 같은 감탄사나 맞장구("그쵸", "재밌죠")를 반복하지 마. 문장은 짧게, 주어와 서술어가 맞게.

시리즈
- 여러 편으로 이어지는 시리즈의 한 편이면, 첫 문단에서 지난 편을 한두 문장으로 짚어 주고(1편이면 시리즈 소개), 마지막 문단에서 다음 편을 살짝 예고해. 마지막 편이면 시리즈 전체를 한 번 정리해.

길이와 낭독
- 정확히 7문단. 공백을 뺀 글자 수 합계 1,000~1,100자(읽으면 약 3분). 각 문단은 공백 제외 140자 이상.
- TTS가 읽을 원고야. 이모지, 괄호 설명, 각주, 영어 약어 금지. 숫자는 아라비아 숫자로. 따옴표는 ‘ ’ “ ”만.

정확성 (가장 중요)
- 확실한 사실만 써. 모르면 쓰지 마. 전설이나 설은 "~라는 이야기가 있어요"처럼 표시해.
- 저작권이 살아 있는 작품의 문장은 인용하지 마.

출력은 JSON 하나만: {"sub": "호기심을 끄는 한 줄 부제", "paragraphs": ["…", 7개]}`

/** Editing pass for an existing script: same facts and shape, clearer sentences. */
const REVISE = `너는 오디오 채널 '상식플러스'의 원고 편집자야. 라디오 진행자가 읽을 원고를 받아서, 처음 듣는 청취자가 한 번 듣고 바로 알아듣도록 고쳐.

고칠 것
- 뜻이 모호하거나 추상적인 문장. 예: "3에서 나타난 결과를 흩어지지 않게 붙잡으면 4가 돼요" 같은 말은 무엇이 어떻게 된다는 건지 구체적으로 바꿔.
- 억지 비유와 앞뒤가 안 맞는 예시. 시험·연애·이직·친구 예시를 아무 데나 끼운 곳은 빼거나, 설명이 정말 쉬워지는 꼭 맞는 예 하나로 바꿔.
- 문법이 어색한 문장, 주어와 서술어가 안 맞는 문장, 뜻 없는 군말("괜히요, 말이에요" 같은 것), 반복되는 맞장구.
- 문단과 문단 사이가 갑자기 넘어가는 곳에는 자연스러운 연결 문장.

지킬 것
- 사실, 고유명사, 숫자, 카드 그림 묘사는 바꾸지 마. 새로운 사실을 더하지 마.
- 정확히 7문단. 공백을 뺀 글자 수 합계 1,000~1,100자. 각 문단의 중심 내용과 순서는 그대로.
- 편한 해요체, 라디오 진행자 말투. 시리즈의 지난 편 요약과 다음 편 예고는 유지.
- TTS가 읽을 원고야. 이모지, 괄호, 영어 약어 금지. 숫자는 아라비아 숫자. 따옴표는 ‘ ’ “ ”만.

출력은 JSON 하나만: {"sub": "부제(괜찮으면 그대로)", "paragraphs": ["…", 7개]}`

function apiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  for (const file of [join(ROOT, '.env.local'), join(ROOT, '..', 'agent', '.env')]) {
    if (!existsSync(file)) continue
    const m = readFileSync(file, 'utf8').match(/^OPENAI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m)
    if (m) return m[1]
  }
  throw new Error('OPENAI_API_KEY를 찾지 못했어요')
}

async function ask(id, key, system, user) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: REASONING,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(600_000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${id}: ${data.error?.message ?? res.status}`)
  return JSON.parse(data.choices[0].message.content)
}

async function draft(t, key) {
  const story = await ask(t.id, key, t.style === 2 ? STYLE_V2 : STYLE, `주제: ${t.topic}`)
  const chars = story.paragraphs.join('').replace(/\s/g, '').length
  writeFileSync(join(OUT, `${t.id}.json`), JSON.stringify({ id: t.id, cat: t.cat, ...story, ...(t.title && { title: t.title }) }, null, 2))
  console.log(`${t.id}: ${t.title ?? story.title} (${story.paragraphs.length}문단, ${chars}자)`)
}

async function currentStories() {
  const dir = join(ROOT, 'content', 'stories')
  const all = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
    all.push(...(await import(pathToFileURL(join(dir, file)).href)).default)
  }
  return all
}

async function revise(story, key) {
  const user = `제목: ${story.title}\n부제: ${story.sub}\n\n` + story.paragraphs.map((p, i) => `[${i + 1}] ${p}`).join('\n\n')
  const out = await ask(story.id, key, REVISE, user)
  const chars = out.paragraphs.join('').replace(/\s/g, '').length
  writeFileSync(join(OUT, `${story.id}.json`), JSON.stringify({ id: story.id, cat: story.cat, title: story.title, ...out }, null, 2))
  console.log(`${story.id}: 고침 (${out.paragraphs.length}문단, ${chars}자)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(OUT, { recursive: true })
  const key = apiKey()
  const revising = process.argv[2] === '--revise'
  const ids = process.argv.slice(revising ? 3 : 2)
  const todo = revising
    ? (await currentStories()).filter((s) => ids.includes(s.id))
    : TOPICS.filter((t) => (ids.length ? ids.includes(t.id) : !existsSync(join(OUT, `${t.id}.json`))))
  for (let i = 0; i < todo.length; i += 6) {
    const results = await Promise.allSettled(todo.slice(i, i + 6).map((t) => (revising ? revise(t, key) : draft(t, key))))
    for (const r of results) if (r.status === 'rejected') console.error('✗', r.reason.message)
  }
}
