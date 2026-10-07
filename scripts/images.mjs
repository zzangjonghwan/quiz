// Generates image questions: copies/draws the images into public/images and writes the
// matching card files (geo.flags.json, geo.shapes.json, science.stars.json, law.signs.json,
// life.laundry.json). Run with `npm run images` after editing the data below; the output is
// committed, so normal builds don't need to run this.
import { geoArea, geoCentroid, geoMercator, geoPath } from 'd3-geo'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url))
const IMAGES = join(PUBLIC, 'images')

function writeCards(file, category, cards) {
  const body = { category, version: 1, cards }
  writeFileSync(join(PUBLIC, 'data', file), JSON.stringify(body, null, 2) + '\n')
  console.log(`${file}: ${cards.length}장`)
}

function writeSvg(dir, name, inner, viewBox = '0 0 200 200') {
  mkdirSync(join(IMAGES, dir), { recursive: true })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>\n`
  writeFileSync(join(IMAGES, dir, `${name}.svg`), svg)
  return `images/${dir}/${name}.svg`
}

const pad = (n) => String(n).padStart(3, '0')

// ─── 국기 (flag-icons, MIT) ──────────────────────────────────────────────────────────

const FLAGS = [
  { code: 'kr', name: '대한민국', aliases: ['한국', '남한'], d: 'easy', wrong: ['일본', '대만', '몽골'],
    meaning: '흰 바탕 가운데 빨강·파랑의 태극 문양과 네 모서리의 건곤감리 4괘로 이루어진 태극기예요.',
    breakdown: [['건', '☰', '하늘'], ['곤', '☷', '땅'], ['감', '☵', '물'], ['리', '☲', '불']],
    tip: '건곤감리 = 하늘, 땅, 물, 불', bonus: '흰 바탕은 밝음과 순수, 평화를 사랑하는 마음을 나타내요.' },
  { code: 'jp', name: '일본', d: 'easy', wrong: ['방글라데시', '팔라우', '대한민국'],
    meaning: "흰 바탕에 붉은 원 하나, '히노마루(태양의 원)'라고 불러요.",
    tip: '해 뜨는 나라(日本) = 해 하나', bonus: '방글라데시 국기는 초록 바탕에 붉은 원이라 모양이 비슷해요.' },
  { code: 'us', name: '미국', aliases: ['미합중국'], d: 'easy', wrong: ['라이베리아', '말레이시아', '영국'],
    meaning: '별 50개는 50개 주, 빨강·흰색 줄 13개는 처음 독립한 13개 주를 뜻해요.',
    tip: '별 = 지금의 주, 줄 = 처음의 13개 주', bonus: '라이베리아 국기는 별이 하나뿐인 성조기 모양이에요.' },
  { code: 'cn', name: '중국', d: 'easy', wrong: ['베트남', '몽골', '대만'],
    meaning: "붉은 바탕에 노란 별 다섯 개라 '오성홍기'예요. 큰 별은 공산당, 작은 별 넷은 노동자·농민·소자산 계급·민족 자본가를 뜻해요.",
    tip: '오성홍기 = 다섯(五) 별(星) 붉은(紅) 깃발(旗)' },
  { code: 'ca', name: '캐나다', d: 'easy', wrong: ['페루', '오스트리아', '레바논'],
    meaning: "가운데 빨간 단풍잎이 있어 '메이플 리프 플래그'라고 불러요. 1965년부터 썼어요.",
    tip: '단풍잎 = 메이플 시럽의 나라', bonus: '페루 국기도 빨강·흰색·빨강 세로 줄이지만 단풍잎이 없어요.' },
  { code: 'gb', name: '영국', d: 'easy', wrong: ['호주', '뉴질랜드', '노르웨이'],
    meaning: "잉글랜드(성 조지), 스코틀랜드(성 앤드루), 아일랜드(성 패트릭)의 십자를 겹친 '유니언 잭'이에요.",
    tip: '십자 세 개를 겹친 깃발', bonus: '웨일스는 국기에 들어가 있지 않아요. 호주와 뉴질랜드 국기 왼쪽 위에도 유니언 잭이 있어요.' },
  { code: 'fr', name: '프랑스', d: 'easy', wrong: ['이탈리아', '네덜란드', '러시아'],
    meaning: '파랑·흰색·빨강의 세로 삼색기로, 흔히 자유·평등·박애를 뜻한다고 설명해요.',
    tip: '세로 파·흰·빨 = 프랑스, 가로 빨·흰·파 = 네덜란드', bonus: '파랑과 빨강은 파리의 상징색, 흰색은 왕실의 색에서 왔다는 설명도 있어요.' },
  { code: 'de', name: '독일', d: 'normal', wrong: ['벨기에', '리투아니아', '콜롬비아'],
    meaning: '검정·빨강·금색의 가로 삼색기예요. 19세기 독일 통일 운동 때 쓰인 색에서 왔어요.',
    tip: '가로 검·빨·금 = 독일, 세로 검·노·빨 = 벨기에' },
  { code: 'it', name: '이탈리아', d: 'normal', wrong: ['멕시코', '아일랜드', '헝가리'],
    meaning: '초록·흰색·빨강의 세로 삼색기예요. 프랑스 삼색기의 영향을 받았어요.',
    tip: '피자 마르게리타 색(바질·모차렐라·토마토)으로 기억', bonus: '멕시코 국기는 가운데 독수리 문장이 있고, 아일랜드 국기는 초록·흰색·주황이에요.' },
  { code: 'br', name: '브라질', d: 'normal', wrong: ['포르투갈', '콜롬비아', '아르헨티나'],
    meaning: "초록 바탕에 노란 마름모, 가운데 별이 뜬 파란 하늘이 있어요. 띠에는 포르투갈어로 'ORDEM E PROGRESSO(질서와 진보)'라고 적혀 있어요.",
    tip: '초록 + 노란 마름모 + 파란 지구본', bonus: '별 27개는 26개 주와 연방구를 나타내고, 1889년 공화국이 선포된 날 리우데자네이루의 밤하늘을 그렸어요.' },
  { code: 'ch', name: '스위스', d: 'normal', wrong: ['덴마크', '조지아', '오스트리아'],
    meaning: '빨간 바탕에 흰 십자가 있어요. 국기가 정사각형인 나라는 스위스와 바티칸뿐이에요.',
    tip: '정사각형 + 흰 십자 = 스위스', bonus: '국제 적십자의 표지는 스위스 국기의 색을 뒤집어 만들었어요.' },
  { code: 'in', name: '인도', d: 'normal', wrong: ['니제르', '아일랜드', '코트디부아르'],
    meaning: "주황·흰색·초록의 가로 줄 가운데 남색 바퀴 '아쇼카 차크라'가 있어요. 바퀴살은 24개예요.",
    tip: '가운데 바퀴 = 인도', bonus: '니제르 국기도 주황·흰색·초록이지만 가운데에 주황색 원이 있어요.' },
  { code: 'au', name: '호주', aliases: ['오스트레일리아'], d: 'normal', wrong: ['뉴질랜드', '영국', '피지'],
    meaning: '왼쪽 위에 유니언 잭, 그 아래 큰 칠각별(연방의 별), 오른쪽에 남십자성이 있어요.',
    tip: '흰 별 = 호주, 빨간 별 4개 = 뉴질랜드', bonus: '칠각별의 꼭짓점 7개는 6개 주와 준주들을 뜻해요.' },
  { code: 'tr', name: '튀르키예', aliases: ['터키'], d: 'normal', wrong: ['튀니지', '파키스탄', '아제르바이잔'],
    meaning: '빨간 바탕에 흰 초승달과 별이 있어요.',
    tip: '빨간 바탕 + 초승달과 별 = 튀르키예', bonus: '튀니지 국기도 비슷하지만 초승달과 별이 흰 원 안에 들어 있어요.' },
  { code: 'mx', name: '멕시코', d: 'normal', wrong: ['이탈리아', '이란', '아일랜드'],
    meaning: '초록·흰색·빨강 세로 줄 가운데, 선인장 위에서 뱀을 문 독수리가 그려져 있어요.',
    origin: "아즈텍 사람들이 '독수리가 선인장 위에서 뱀을 먹는 곳에 도시를 세우라'는 계시를 받고 테노치티틀란(지금의 멕시코시티)을 세웠다는 전설에서 왔어요.",
    tip: '이탈리아 국기 + 독수리 = 멕시코' },
  { code: 'vn', name: '베트남', d: 'normal', wrong: ['중국', '모로코', '소말리아'],
    meaning: "붉은 바탕에 노란 별 하나가 있어 '금성홍기'라고 불러요.",
    tip: '별 하나 = 베트남, 별 다섯 = 중국', bonus: '모로코 국기는 붉은 바탕에 초록 별 테두리가 있어요.' },
  { code: 'il', name: '이스라엘', d: 'normal', wrong: ['그리스', '핀란드', '우루과이'],
    meaning: "흰 바탕에 파란 줄 두 개, 가운데 '다윗의 별'이 있어요.",
    tip: '파란 육각별 = 이스라엘', bonus: '파란 줄은 유대교 기도 숄(탈리트)의 줄무늬를 본떴어요.' },
  { code: 'np', name: '네팔', d: 'hard', wrong: ['부탄', '스리랑카', '방글라데시'],
    meaning: '직사각형이 아닌 국기는 세계에서 네팔뿐이에요. 삼각형 두 개를 위아래로 겹친 모양에 달과 해가 그려져 있어요.',
    tip: '삼각형 두 개 = 네팔', bonus: '두 삼각형은 히말라야산맥, 또는 힌두교와 불교를 뜻한다고 해요.' },
  { code: 'bt', name: '부탄', d: 'hard', wrong: ['네팔', '스리랑카', '몽골'],
    meaning: "노랑과 주황으로 대각선으로 나뉜 바탕 위에 하얀 용 '드룩'이 있어요.",
    tip: '용이 그려진 국기 = 부탄', bonus: "부탄 사람들은 자기 나라를 '드룩 율(용의 나라)'이라고 불러요." },
  { code: 'cy', name: '키프로스', d: 'hard', wrong: ['몰타', '코소보', '그리스'],
    meaning: '흰 바탕에 구리색으로 섬의 모양을 그리고, 그 아래 평화를 뜻하는 올리브 가지 두 개를 넣었어요.',
    tip: '국기에 섬 지도 = 키프로스', bonus: '구리색을 쓴 건 구리(copper)라는 말의 어원이 키프로스와 관련 있어서예요. 나라 모양을 국기에 넣은 곳은 키프로스와 코소보뿐이에요.' },
  { code: 'mz', name: '모잠비크', d: 'hard', wrong: ['짐바브웨', '앙골라', '케냐'],
    meaning: '국기에 소총(AK-47)이 그려진 나라예요. 소총, 괭이, 책이 각각 국방, 농업, 교육을 뜻해요.',
    tip: '소총 + 괭이 + 책 = 모잠비크' },
  { code: 'lb', name: '레바논', d: 'hard', wrong: ['캐나다', '오스트리아', '라트비아'],
    meaning: "빨강·흰색·빨강 가로 줄 가운데 초록색 '레바논 삼나무(백향목)'가 있어요.",
    tip: '나무가 그려진 국기 = 레바논', bonus: '레바논 삼나무는 성경에도 자주 나오는 귀한 나무로, 고대 페니키아인이 배를 만들 때 썼어요.' },
  { code: 'pt', name: '포르투갈', d: 'hard', wrong: ['스페인', '브라질', '모로코'],
    meaning: "초록과 빨강 바탕의 경계에 노란 '혼천의(천체 관측 기구)'와 방패가 있어요. 대항해 시대의 바다 탐험을 상징해요.",
    tip: '초록·빨강 + 혼천의 = 포르투갈' },
  { code: 'dk', name: '덴마크', d: 'hard', wrong: ['스위스', '노르웨이', '스웨덴'],
    meaning: "빨간 바탕에 흰 십자가 왼쪽으로 치우친 '단네브로'예요. 지금까지 쓰이는 국기 중 가장 오래된 것으로 꼽혀요.",
    tip: '빨강 + 흰 십자(왼쪽 치우침) = 덴마크', bonus: '노르웨이, 스웨덴, 핀란드, 아이슬란드 국기도 같은 북유럽 십자 모양이에요.' },
  { code: 'kz', name: '카자흐스탄', d: 'hard', wrong: ['우즈베키스탄', '키르기스스탄', '팔라우'],
    meaning: '하늘색 바탕에 금색 태양과 그 아래 날개를 편 초원 독수리, 왼쪽에 전통 무늬가 있어요.',
    tip: '하늘색 + 금색 태양과 독수리 = 카자흐스탄' },
  { code: 'sa', name: '사우디아라비아', aliases: ['사우디'], d: 'hard', wrong: ['파키스탄', '이란', '아랍에미리트'],
    meaning: '초록 바탕에 이슬람 신앙 고백 문구(샤하다)와 칼이 그려져 있어요.',
    tip: '초록 + 아랍어 문구 + 칼 = 사우디아라비아', bonus: '신성한 문구가 있어서 조기(반기)로 달지 않아요.' },
  { code: 'ar', name: '아르헨티나', d: 'hard', wrong: ['우루과이', '엘살바도르', '니카라과'],
    meaning: "하늘색·흰색·하늘색 가로 줄 가운데 얼굴이 있는 '5월의 태양'이 있어요.",
    tip: '하늘색 줄 + 얼굴 있는 태양 = 아르헨티나', bonus: '5월의 태양은 1810년 5월 혁명과 잉카의 태양신에서 비롯됐어요.' },
]

function flagCards() {
  mkdirSync(join(IMAGES, 'flags'), { recursive: true })
  return FLAGS.map((f, i) => {
    copyFileSync(require.resolve(`flag-icons/flags/4x3/${f.code}.svg`), join(IMAGES, 'flags', `${f.code}.svg`))
    return {
      id: `geo-f${pad(i + 1)}`,
      difficulty: f.d,
      answer: f.name,
      ...(f.aliases && { aliases: f.aliases }),
      questions: [{ mode: 'mcq', prompt: '이 국기는 어느 나라의 국기일까?', choices: [f.name, ...f.wrong] }],
      explanation: {
        ...(f.breakdown && { breakdown: f.breakdown.map(([part, origin, meaning]) => ({ part, origin, meaning })) }),
        meaning: f.meaning,
        ...(f.origin && { origin: f.origin }),
        tip: f.tip,
        ...(f.bonus && { bonus: f.bonus }),
      },
      image: { src: `images/flags/${f.code}.svg`, alt: '국기', credit: 'flag-icons', background: 'light' },
    }
  })
}

// ─── 나라 모양 (Natural Earth via world-atlas) ─────────────────────────────────────

const SHAPES = [
  { en: 'Italy', name: '이탈리아', d: 'easy', wrong: ['그리스', '스페인', '크로아티아'],
    meaning: '지중해로 길게 뻗은 반도가 장화처럼 생겼어요. 장화 앞코 쪽 바다 건너 큰 섬이 시칠리아예요.', tip: '장화 = 이탈리아' },
  { en: 'Japan', name: '일본', d: 'easy', wrong: ['필리핀', '영국', '뉴질랜드'],
    meaning: '홋카이도, 혼슈, 시코쿠, 규슈 네 개의 큰 섬이 활처럼 이어져 있어요.', tip: '활 모양으로 휜 섬 4개', bonus: '작은 섬까지 합치면 1만 개가 넘는 섬으로 이루어져 있어요.' },
  { en: 'Australia', name: '호주', aliases: ['오스트레일리아'], d: 'easy', wrong: ['뉴질랜드', '인도네시아', '마다가스카르'],
    meaning: '대륙 하나가 통째로 한 나라예요. 아래쪽의 섬은 태즈메이니아예요.', tip: '대륙 = 나라 = 호주' },
  { en: 'South Korea', name: '대한민국', aliases: ['한국', '남한'], d: 'easy', wrong: ['북한', '대만', '일본'],
    meaning: '한반도의 남쪽으로, 아래의 큰 섬이 제주도예요. 서해안과 남해안은 섬이 많고 해안선이 복잡한 리아스식 해안이에요.', tip: '토끼(또는 호랑이)의 아래쪽 + 제주도' },
  { en: 'Chile', name: '칠레', d: 'normal', wrong: ['아르헨티나', '페루', '노르웨이'],
    meaning: '남북으로 약 4,300km나 되지만 동서 폭은 평균 약 180km밖에 안 되는, 세계에서 가장 길쭉한 나라예요.', tip: '젓가락처럼 가늘고 긴 나라 = 칠레', bonus: '북쪽 끝에는 세계에서 가장 건조한 아타카마 사막, 남쪽 끝에는 빙하가 있어요.' },
  { en: 'United Kingdom', name: '영국', d: 'normal', wrong: ['아일랜드', '아이슬란드', '덴마크'],
    meaning: '큰 섬 그레이트브리튼과 옆 아일랜드섬의 북쪽 일부(북아일랜드)로 이루어져 있어요.', tip: '큰 섬 + 옆 섬의 귀퉁이 = 영국' },
  { en: 'India', name: '인도', d: 'normal', wrong: ['파키스탄', '방글라데시', '미얀마'],
    meaning: '남쪽으로 뾰족하게 뻗은 역삼각형 반도가 특징이에요. 아래쪽 바다가 인도양이에요.', tip: '아래로 뾰족한 역삼각형 = 인도' },
  { en: 'Egypt', name: '이집트', d: 'normal', wrong: ['리비아', '수단', '사우디아라비아'],
    meaning: '서쪽(리비아)과 남쪽(수단) 국경이 자로 그은 듯한 직선이에요. 오른쪽 위에 삼각형으로 튀어나온 곳이 시나이반도예요.', tip: '네모난 나라 + 시나이반도 꼬리 = 이집트', bonus: '직선 국경은 식민지 시대에 위도와 경도를 기준으로 그어서 생겼어요.' },
  { en: 'Vietnam', name: '베트남', d: 'normal', wrong: ['라오스', '태국', '칠레'],
    meaning: '인도차이나반도 동쪽 해안을 따라 S자로 길게 휘어진 모양이에요.', tip: 'S자 해안선 = 베트남' },
  { en: 'Norway', name: '노르웨이', d: 'hard', wrong: ['스웨덴', '핀란드', '칠레'],
    meaning: '스칸디나비아반도 서쪽을 따라 길게 뻗어 있고, 빙하가 깎아 만든 피오르 때문에 해안선이 매우 들쭉날쭉해요.', tip: '들쭉날쭉한 피오르 해안 = 노르웨이' },
  { en: 'Madagascar', name: '마다가스카르', d: 'hard', wrong: ['스리랑카', '쿠바', '뉴질랜드'],
    meaning: '아프리카 동남쪽 인도양에 있는 세계에서 네 번째로 큰 섬나라예요.', tip: '아프리카 옆 길쭉한 큰 섬', bonus: '여우원숭이처럼 이 섬에만 사는 고유종이 아주 많아요.' },
  { en: 'Cuba', name: '쿠바', d: 'hard', wrong: ['자메이카', '아이티', '필리핀'],
    meaning: '카리브해에 동서로 길쭉하게 누운 섬나라로, 미국 플로리다 바로 남쪽에 있어요.', tip: '카리브해의 길쭉한 악어 모양 섬' },
  { en: 'Sri Lanka', name: '스리랑카', d: 'hard', wrong: ['마다가스카르', '대만', '키프로스'],
    meaning: "인도 남쪽 바다에 있는 섬나라로, 모양 때문에 '인도양의 눈물'이라고 불려요.", tip: '눈물방울 모양 섬 = 스리랑카', bonus: '홍차 실론티의 실론(Ceylon)이 스리랑카의 옛 이름이에요.' },
  { en: 'Mongolia', name: '몽골', d: 'hard', wrong: ['카자흐스탄', '우즈베키스탄', '아프가니스탄'],
    meaning: '러시아와 중국 사이에 끼인, 바다가 없는 내륙국이에요. 동서로 넓적한 모양이에요.', tip: '러시아와 중국 사이 넓적한 나라', bonus: '카자흐스탄에 이어 세계에서 두 번째로 큰 내륙국이에요.' },
  { en: 'Iceland', name: '아이슬란드', d: 'hard', wrong: ['아일랜드', '덴마크', '핀란드'],
    meaning: '북대서양의 화산섬 나라로, 유라시아판과 북아메리카판이 갈라지는 곳 위에 있어요.', tip: '얼음(ice)의 나라지만 화산과 온천의 나라', bonus: '이름과 달리 바로 옆 그린란드(초록 땅)가 훨씬 더 얼음으로 덮여 있어요.' },
]

/** Keeps the main landmass and nearby large islands; drops far-flung territories. */
function mainland(f) {
  if (f.geometry.type !== 'MultiPolygon') return f
  const polys = f.geometry.coordinates.map((coordinates) => {
    const g = { type: 'Polygon', coordinates }
    return { coordinates, area: geoArea(g), centroid: geoCentroid(g), g }
  })
  const largest = polys.reduce((a, b) => (b.area > a.area ? b : a))
  const [[x0, y0], [x1, y1]] = geoPath().bounds(largest.g)
  const reach = Math.max(10, Math.hypot(x1 - x0, y1 - y0) * 0.5)
  const kept = polys.filter(
    (p) =>
      p.area >= largest.area * 0.003 &&
      Math.hypot(p.centroid[0] - largest.centroid[0], p.centroid[1] - largest.centroid[1]) <= reach,
  )
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: kept.map((p) => p.coordinates) } }
}

function shapeCards() {
  const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf-8'))
  const countries = feature(topo, topo.objects.countries).features
  return SHAPES.map((s, i) => {
    const f = countries.find((c) => c.properties.name === s.en)
    if (!f) throw new Error(`world-atlas에 없음: ${s.en}`)
    const land = mainland(f)
    const projection = geoMercator().fitExtent([[14, 14], [186, 186]], land)
    const d = geoPath(projection)(land)
    const slug = s.en.toLowerCase().replace(/\s+/g, '-')
    const src = writeSvg(
      'shapes',
      slug,
      `<rect width="200" height="200" rx="16" fill="#161618"/><path d="${d}" fill="#c6f432" stroke="#c6f432" stroke-width="0.6" stroke-linejoin="round"/>`,
    )
    return {
      id: `geo-s${pad(i + 1)}`,
      difficulty: s.d,
      answer: s.name,
      ...(s.aliases && { aliases: s.aliases }),
      questions: [{ mode: 'mcq', prompt: '이 모양의 나라는 어디일까?', choices: [s.name, ...s.wrong] }],
      explanation: { meaning: s.meaning, tip: s.tip, ...(s.bonus && { bonus: s.bonus }) },
      image: { src, alt: '나라의 모양', credit: 'natural-earth', background: 'none' },
    }
  })
}

// ─── 별자리 (자체 제작, 모양을 단순화) ──────────────────────────────────────────────

/** stars: [x, y, size, color?]; lines: pairs of star indexes. */
const CONSTELLATIONS = [
  { slug: 'big-dipper', name: '북두칠성', d: 'easy', wrong: ['카시오페이아자리', '오리온자리', '작은곰자리'],
    stars: [[150, 62, 5], [152, 100, 5], [112, 106, 4], [104, 76, 3.5], [74, 70, 5], [48, 62, 5], [18, 80, 5]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    meaning: '국자 모양의 일곱 별로, 큰곰자리의 엉덩이와 꼬리 부분이에요. 1년 내내 북쪽 하늘에서 볼 수 있어요.',
    tip: '국자 끝 두 별 사이 거리를 5배 늘리면 북극성', bonus: '북(北)쪽 하늘의 말(斗, 국자 모양 그릇) 모양 일곱(七) 별(星)이라는 뜻이에요.' },
  { slug: 'orion', name: '오리온자리', d: 'easy', wrong: ['전갈자리', '쌍둥이자리', '큰개자리'],
    stars: [[55, 45, 6, '#ffb070'], [140, 55, 4.5], [80, 108, 4.5], [100, 100, 4.5], [120, 92, 4.5], [65, 162, 4.5], [148, 152, 6, '#bcd4ff']],
    lines: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
    meaning: '가운데 나란히 선 세 별(오리온의 허리띠)이 특징인 겨울 대표 별자리예요. 왼쪽 위 붉은 별이 베텔게우스, 오른쪽 아래 푸른 별이 리겔이에요.',
    tip: '나란히 선 별 3개 = 오리온의 허리띠', bonus: '그리스 신화에서 오리온은 전갈에 찔려 죽어, 전갈자리가 뜨면 오리온자리는 지는 것처럼 서로 반대 계절에 보여요.' },
  { slug: 'cassiopeia', name: '카시오페이아자리', d: 'normal', wrong: ['북두칠성', '백조자리', '페르세우스자리'],
    stars: [[20, 75, 5], [62, 118, 5], [100, 88, 5], [140, 122, 4.5], [182, 80, 5]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
    meaning: "다섯 별이 알파벳 W(또는 M) 모양을 이루는 별자리예요. 북극성을 사이에 두고 북두칠성 반대편에 있어요.",
    tip: 'W 모양 = 카시오페이아', bonus: '그리스 신화 속 에티오피아의 왕비로, 자기 딸이 바다 요정보다 아름답다고 자랑하다 벌을 받았어요.' },
  { slug: 'scorpius', name: '전갈자리', d: 'normal', wrong: ['오리온자리', '사자자리', '궁수자리'],
    stars: [[150, 28, 4], [160, 48, 4], [152, 70, 4], [122, 60, 3.5], [100, 78, 6, '#ff8a5c'], [90, 98, 3.5], [84, 122, 4], [88, 146, 4], [102, 166, 4], [126, 174, 4], [146, 166, 4.5], [154, 148, 4]],
    lines: [[0, 3], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]],
    meaning: '여름철 남쪽 하늘에 S자로 휘어진 꼬리와 독침을 가진 별자리예요. 심장 자리의 붉은 별이 안타레스예요.',
    tip: 'S자 꼬리 + 붉은 심장(안타레스) = 전갈', bonus: '안타레스는 \'화성(아레스)의 경쟁자\'라는 뜻으로, 화성처럼 붉어서 붙은 이름이에요.' },
  { slug: 'cygnus', name: '백조자리', d: 'hard', wrong: ['남십자자리', '독수리자리', '거문고자리'],
    stars: [[100, 24, 6], [100, 88, 4.5], [100, 176, 4.5], [38, 74, 4], [162, 104, 4], [70, 82, 3], [132, 96, 3]],
    lines: [[0, 1], [1, 2], [3, 5], [5, 1], [1, 6], [6, 4]],
    meaning: "날개를 편 백조 모양으로, 커다란 십자가처럼 보여 '북십자성'이라고도 불러요. 꼬리의 밝은 별이 데네브예요.",
    tip: '북쪽 하늘의 큰 십자가 = 백조자리', bonus: '데네브, 거문고자리의 베가(직녀성), 독수리자리의 알타이르(견우성)를 이으면 \'여름의 대삼각형\'이 돼요.' },
  { slug: 'crux', name: '남십자자리', d: 'hard', wrong: ['백조자리', '카시오페이아자리', '큰곰자리'],
    stars: [[100, 30, 5.5, '#ffb070'], [95, 170, 6], [45, 96, 5.5], [152, 86, 4.5], [126, 130, 3]],
    lines: [[0, 1], [2, 3]],
    meaning: '남반구 하늘에서 보이는 작은 십자 모양 별자리로, 옛날 뱃사람들이 남쪽 방향을 찾는 데 썼어요.',
    tip: '남반구의 길잡이 십자가', bonus: '88개 별자리 중 가장 작아요. 호주, 뉴질랜드, 브라질 등의 국기에도 그려져 있어요.' },
]

function starCards() {
  return CONSTELLATIONS.map((c, i) => {
    const lines = c.lines
      .map(([a, b]) => `<line x1="${c.stars[a][0]}" y1="${c.stars[a][1]}" x2="${c.stars[b][0]}" y2="${c.stars[b][1]}"/>`)
      .join('')
    const stars = c.stars.map(([x, y, r, color]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color ?? '#ffffff'}"/>`).join('')
    const src = writeSvg(
      'stars',
      c.slug,
      `<rect width="200" height="200" rx="16" fill="#0d1424"/><g stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.6">${lines}</g>${stars}`,
    )
    return {
      id: `science-c${pad(i + 1)}`,
      difficulty: c.d,
      answer: c.name,
      questions: [{ mode: 'mcq', prompt: '이 별자리의 이름은? (모양을 단순화한 그림)', choices: [c.name, ...c.wrong] }],
      explanation: { meaning: c.meaning, tip: c.tip, ...(c.bonus && { bonus: c.bonus }) },
      image: { src, alt: '별자리 그림', credit: 'original', background: 'none' },
    }
  })
}

// ─── 교통 안전 표지 (자체 제작) ─────────────────────────────────────────────────────

const RED = '#d62828'
const BLUE = '#1f5fd1'
const YELLOW = '#f6c400'
const ringSign = (inner) =>
  `<circle cx="100" cy="100" r="86" fill="#fff" stroke="${RED}" stroke-width="16"/>${inner}`
const slash = `<line x1="44" y1="44" x2="156" y2="156" stroke="${RED}" stroke-width="14"/>`
const blueSign = (inner) => `<circle cx="100" cy="100" r="92" fill="${BLUE}"/>${inner}`
const warnSign = (inner) =>
  `<path d="M100 16 L190 172 H10 Z" fill="${YELLOW}" stroke="${RED}" stroke-width="12" stroke-linejoin="round"/>${inner}`

const SIGN_SYSTEM = '빨간 원 = 규제(금지·제한), 파란 원 = 지시(이렇게 하라), 노란 삼각형 = 주의(위험 경고)'

const SIGNS = [
  { slug: 'speed-limit-50', d: 'easy',
    svg: ringSign('<text x="100" y="126" font-family="Arial, sans-serif" font-size="76" font-weight="700" text-anchor="middle">50</text>'),
    choices: ['최고 속도 시속 50km 제한', '최저 속도 시속 50km 유지', '50m 앞 공사 중', '50번 국도'],
    meaning: '빨간 테두리 원 안의 숫자는 그 속도를 넘으면 안 된다는 최고 속도 제한 표지예요.' },
  { slug: 'no-u-turn', d: 'normal',
    svg: ringSign(`<path d="M126 150 V88 A28 28 0 0 0 70 88 V118" fill="none" stroke="#111" stroke-width="14"/><path d="M50 112 H90 L70 146 Z" fill="#111"/>${slash}`),
    choices: ['유턴 금지', '유턴 가능', '회전 교차로', '좌회전 금지'],
    meaning: '유턴 화살표에 빨간 사선이 그어져 있어 유턴을 하면 안 된다는 규제 표지예요.' },
  { slug: 'no-left-turn', d: 'normal',
    svg: ringSign(`<path d="M124 152 V98 H78" fill="none" stroke="#111" stroke-width="14"/><path d="M82 74 V122 L46 98 Z" fill="#111"/>${slash}`),
    choices: ['좌회전 금지', '우회전 금지', '좌회전만 가능', '진입 금지'],
    meaning: '왼쪽으로 꺾인 화살표에 빨간 사선이 있어 좌회전을 하면 안 된다는 뜻이에요.' },
  { slug: 'turn-right', d: 'easy',
    svg: blueSign(`<path d="M80 160 V100 H122" fill="none" stroke="#fff" stroke-width="16"/><path d="M118 72 V128 L156 100 Z" fill="#fff"/>`),
    choices: ['우회전만 가능', '우회전 금지', '우로 굽은 도로', '오른쪽 차로 없어짐'],
    meaning: '파란 원에 흰 화살표가 있는 지시 표지로, 화살표 방향(우회전)으로 가라는 뜻이에요.' },
  { slug: 'go-straight', d: 'easy',
    svg: blueSign(`<path d="M100 164 V80" fill="none" stroke="#fff" stroke-width="18"/><path d="M68 86 H132 L100 40 Z" fill="#fff"/>`),
    choices: ['직진만 가능', '일방통행 도로', '직진 금지', '앞에 오르막길'],
    meaning: '파란 원에 위쪽 화살표가 있는 지시 표지로, 직진만 하라는 뜻이에요.',
    bonus: '일방통행 표지는 파란 직사각형 안에 화살표와 \'일방통행\' 글자가 있어 모양이 달라요.' },
  { slug: 'traffic-signal-ahead', d: 'normal',
    svg: warnSign('<rect x="82" y="70" width="36" height="88" rx="8" fill="#111"/><circle cx="100" cy="86" r="10" fill="#e53935"/><circle cx="100" cy="114" r="10" fill="#fbc02d"/><circle cx="100" cy="142" r="10" fill="#43a047"/>'),
    choices: ['앞에 신호등이 있음', '신호 위반 단속 중', '신호등 고장', '철길 건널목'],
    meaning: '노란 삼각형 주의 표지로, 앞에 신호기(신호등)가 있으니 주의하라는 뜻이에요.' },
  { slug: 'right-curve', d: 'normal',
    svg: warnSign('<path d="M84 160 V120 Q84 92 112 92" fill="none" stroke="#111" stroke-width="13"/><path d="M108 70 V114 L140 92 Z" fill="#111"/>'),
    choices: ['우로 굽은 도로', '우회전하라', '오른쪽 우회도로', '오른쪽 차로 합류'],
    meaning: '노란 삼각형 주의 표지로, 앞길이 오른쪽으로 굽어 있으니 속도를 줄이라는 뜻이에요.' },
]

function signCards() {
  return SIGNS.map((s, i) => ({
    id: `law-g${pad(i + 1)}`,
    difficulty: s.d,
    questions: [{ mode: 'mcq', prompt: '이 교통 안전 표지의 뜻은?', choices: s.choices }],
    explanation: { meaning: s.meaning, tip: SIGN_SYSTEM, ...(s.bonus && { bonus: s.bonus }) },
    image: { src: writeSvg('signs', s.slug, s.svg), alt: '교통 안전 표지', credit: 'original', background: 'none' },
  }))
}

// ─── 세탁 기호 (자체 제작, ISO 3758 기준) ─────────────────────────────────────────

const stroke = 'fill="none" stroke="#111" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"'
const tub = `<path d="M28 76 L44 160 H156 L172 76" ${stroke}/><path d="M28 76 q17.5 -18 36 0 t36 0 t36 0 t36 0" ${stroke}/>`
const cross = `<path d="M34 34 L166 166 M166 34 L34 166" ${stroke}/>`
const iron = `<path d="M30 150 L58 96 H150 Q170 120 170 150 Z" ${stroke}/><path d="M86 96 L92 70 H150 V96" ${stroke}/>`
const CARE_SYSTEM = '대야 = 물세탁, 삼각형 = 표백, 다리미 = 다림질, 원 = 드라이클리닝, 네모 = 건조'
const CARE_NOTE = '국제 표준(ISO) 세탁 기호 기준이에요. 국내 옷에는 비슷한 그림에 한글이 함께 적힌 KS 기호도 쓰여요.'

const LAUNDRY = [
  { slug: 'hand-wash', d: 'easy',
    svg: `${tub}<path d="M82 148 V112 Q82 104 90 104 H118 Q126 104 126 112 V148 M90 104 V86 M100 104 V82 M110 104 V84 M120 106 V92 M82 124 L70 110" ${stroke}/>`,
    choices: ['손세탁만 가능', '세탁기 사용 가능', '물세탁 금지', '세탁 후 손으로 다림질'],
    meaning: '대야에 손이 들어간 그림은 세탁기 대신 손으로 살살 빨라는 뜻이에요.' },
  { slug: 'no-wash', d: 'easy',
    svg: `${tub}${cross}`,
    choices: ['물세탁 금지', '손세탁만 가능', '찬물 세탁', '표백 금지'],
    meaning: '대야에 X 표시는 물로 빨면 안 된다는 뜻이에요. 보통 드라이클리닝을 해야 해요.' },
  { slug: 'wash-30', d: 'normal',
    svg: `${tub}<text x="100" y="146" font-family="Arial, sans-serif" font-size="46" font-weight="700" text-anchor="middle">30</text>`,
    choices: ['물 온도 30°C 이하로 세탁', '30분 이내로 세탁', '30°C 이상으로 세탁', '30회 이상 헹굼'],
    meaning: '대야 안의 숫자는 세탁할 수 있는 최고 물 온도예요. 30이면 30°C를 넘지 않게 빨아야 해요.' },
  { slug: 'no-bleach', d: 'normal',
    svg: `<path d="M100 34 L172 160 H28 Z" ${stroke}/>${cross}`,
    choices: ['표백제 사용 금지', '산소계 표백제만 가능', '다림질 금지', '건조기 사용 금지'],
    meaning: '삼각형은 표백을 뜻하고, X가 있으면 어떤 표백제도 쓰면 안 된다는 뜻이에요.',
    bonus: '삼각형 안에 사선 두 줄이 있으면 산소계(염소 없는) 표백제만 쓸 수 있다는 뜻이에요.' },
  { slug: 'no-iron', d: 'normal',
    svg: `${iron}${cross}`,
    choices: ['다림질 금지', '저온 다림질', '스팀 다림질만 가능', '드라이클리닝 금지'],
    meaning: '다리미 그림에 X가 있으면 다림질하면 안 된다는 뜻이에요.' },
  { slug: 'iron-low', d: 'hard',
    svg: `${iron}<circle cx="110" cy="128" r="8" fill="#111"/>`,
    choices: ['낮은 온도(약 110°C)로 다림질', '중간 온도(약 150°C)로 다림질', '높은 온도(약 200°C)로 다림질', '다림질 금지'],
    meaning: '다리미 안의 점 개수가 온도예요. 점 1개는 약 110°C, 2개는 약 150°C, 3개는 약 200°C까지 가능해요.',
    bonus: '점 하나짜리 옷은 스팀 없이 다리는 게 안전한 경우가 많아요.' },
  { slug: 'dry-clean', d: 'normal',
    svg: `<circle cx="100" cy="100" r="66" ${stroke}/><text x="100" y="124" font-family="Arial, sans-serif" font-size="64" font-weight="700" text-anchor="middle">P</text>`,
    choices: ['드라이클리닝 가능', '물세탁만 가능', '건조기 사용 가능', '표백 가능'],
    meaning: '원은 세탁소에서 하는 드라이클리닝을 뜻하고, 안의 글자(P, F)는 세탁소가 쓸 용제의 종류예요.' },
  { slug: 'no-tumble-dry', d: 'hard',
    svg: `<rect x="34" y="34" width="132" height="132" ${stroke}/><circle cx="100" cy="100" r="46" ${stroke}/>${cross}`,
    choices: ['건조기(텀블 건조) 사용 금지', '그늘에서 말리기', '드라이클리닝 금지', '뉘어서 말리기'],
    meaning: '네모는 건조, 네모 안의 원은 건조기(텀블 건조)예요. X가 있으면 건조기에 넣으면 안 돼요.',
    bonus: '건조기 열에 줄어들기 쉬운 니트, 울, 기능성 옷에 많이 붙어 있어요.' },
]

function laundryCards() {
  return LAUNDRY.map((l, i) => ({
    id: `life-w${pad(i + 1)}`,
    difficulty: l.d,
    questions: [{ mode: 'mcq', prompt: '옷 라벨의 이 세탁 기호의 뜻은?', choices: l.choices }],
    explanation: { meaning: l.meaning, tip: CARE_SYSTEM, bonus: l.bonus ?? CARE_NOTE },
    image: {
      src: writeSvg('laundry', l.slug, `<rect width="200" height="200" fill="#fff"/>${l.svg}`),
      alt: '세탁 기호',
      credit: 'original',
      background: 'light',
    },
  }))
}

writeCards('geo.flags.json', 'geo', flagCards())
writeCards('geo.shapes.json', 'geo', shapeCards())
writeCards('science.stars.json', 'science', starCards())
writeCards('law.signs.json', 'law', signCards())
writeCards('life.laundry.json', 'life', laundryCards())
