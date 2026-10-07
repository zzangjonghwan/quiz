const KONGLISH = (k) => `한국에서 쓰는 '${k}'에 해당하는 자연스러운 영어 표현은?`
const eun = (w) => ((w.slice(-1).charCodeAt(0) - 0xac00) % 28 ? '은' : '는')
const ORIGIN = (w) => `'${w}'${eun(w)} 어느 나라 말에서 왔을까?`

export default {
  category: 'loanword',
  name: 'm5',
  label: '외래어',
  cards: [
    // ── 콩글리시 ──
    { q: KONGLISH('사이드 브레이크'), a: 'parking brake', w: ['side brake', 'hand stop', 'car lock'], d: 'h', m: '영국에서는 handbrake라고도 해요.', t: '주차할 때 쓰는 브레이크' },
    { q: KONGLISH('비닐하우스'), a: 'greenhouse', w: ['vinyl house', 'plastic home', 'farm tent'], d: 'n', m: '영어 vinyl house라고 하면 비닐로 지은 집처럼 들려요.', t: '초록 집' },
    { q: KONGLISH('퀵서비스(오토바이 배달)'), a: 'courier service', w: ['quick service', 'fast delivery man', 'speed service'], d: 'n', m: '영어 quick service는 \'빠른 서비스\'라는 일반적인 말이에요.', t: 'courier' },
    { q: KONGLISH('바바리(코트)'), a: 'trench coat', w: ['burberry', 'rain jacket', 'long coat'], d: 'n', m: '\'바바리\'는 이 코트를 유명하게 만든 영국 브랜드 이름에서 왔어요.', t: '참호 코트' },
    { q: KONGLISH('소프트아이스크림'), a: 'soft serve', w: ['soft ice cream cone', 'melting cream', 'ice soft'], d: 'h', m: '기계에서 바로 짜 주는 부드러운 아이스크림을 영어로 soft serve라고 해요.', t: '짜 주는 아이스크림' },
    { q: KONGLISH('생크림(빵이나 케이크 위 크림)'), a: 'whipped cream', w: ['raw cream', 'fresh milk', 'live cream'], d: 'n', m: '\'생크림\'은 일본식 표현에서 왔어요. 거품을 내지 않은 크림은 heavy cream이에요.', t: '휘핑' },
    { q: KONGLISH('스타킹(여성용 얇은 양말 바지)'), a: 'pantyhose', w: ['stocking pants', 'leg cover', 'thin socks'], d: 'h', m: '영어 stockings는 허벅지까지만 오는 긴 양말을 주로 말해요. 두꺼운 것은 tights예요.', t: '허리까지 오는 것' },
    { q: KONGLISH('나시(민소매 윗옷)'), a: 'tank top', w: ['no sleeve', 'nasi shirt', 'arm free'], d: 'n', m: '\'나시\'는 일본식 영어 \'노 슬리브\'에서 왔어요.', t: '민소매' },
    { q: KONGLISH('머그컵'), a: 'mug', w: ['mug cup', 'big cup glass', 'coffee bowl'], d: 'e', m: 'mug 자체에 손잡이 달린 큰 컵이라는 뜻이 있어서 cup을 붙이지 않아요.', t: '컵 빼기' },
    { q: KONGLISH('아이디(사이트에 접속하는 이름)'), a: 'username', w: ['ID name', 'my ID', 'login card'], d: 'n', m: '영어 ID는 주로 신분증을 떠올려요. 아이디와 비밀번호는 username and password예요.', t: '사용자 이름' },
    { q: KONGLISH('오버하다(지나치게 반응하다)'), a: 'overreact', w: ['over do', 'go over', 'over action'], d: 'n', m: '"너무 오버하지 마"는 "Don\'t overreact" 정도로 말해요.', t: 'over + react' },
    { q: KONGLISH('매직 스트레이트(머리 펴기)'), a: 'hair straightening', w: ['magic straight', 'straight perm', 'hair iron'], d: 'h', m: '매직은 원래 일본 미용 상품 이름에서 왔어요.', t: '곧게 펴기' },
    { q: KONGLISH('프리사이즈'), a: 'one size fits all', w: ['free size for all', 'all size for free', 'no size limit wear'], d: 'n', m: 'free size라고 하면 \'공짜 크기\'처럼 들려요.', t: '모두에게 맞는 한 크기' },
    { q: KONGLISH('콘도(휴양지 숙박 시설)'), a: 'resort', w: ['condo', 'vacation home', 'holiday building'], d: 'h', m: '영어 condo는 집집마다 주인이 따로 있는 아파트를 뜻해요.', t: 'condo = 분양 아파트' },

    // ── 어느 나라 말일까 ──
    { q: ORIGIN('뷔페'), a: '프랑스어', w: ['영어', '독일어', '이탈리아어'], d: 'n', m: '원래 \'찬장\'이나 \'음식을 차려 놓는 탁자\'를 뜻했어요.', t: 'buffet' },
    { q: ORIGIN('아틀리에'), a: '프랑스어', w: ['이탈리아어', '스페인어', '독일어'], d: 'n', m: '화가나 조각가의 작업실을 뜻해요.', t: 'atelier' },
    { q: ORIGIN('노이로제'), a: '독일어', w: ['영어', '그리스어', '프랑스어'], d: 'n', m: '독일어 Neurose에서 왔어요. 영어로는 neurosis예요.', t: 'Neurose' },
    { q: ORIGIN('호프(맥줏집)').replace('은 어느', '는 어느'), a: '독일어', w: ['영어', '네덜란드어', '체코어'], d: 'h', m: '\'뜰, 안마당\'을 뜻하는 독일어 Hof에서 왔어요. 맥주 원료 hop과는 다른 말이에요.', t: 'Hof' },
    { q: ORIGIN('부메랑'), a: '호주 원주민 언어', w: ['아프리카 스와힐리어', '마오리어', '하와이어'], d: 'h', m: '던지면 되돌아오는 사냥 도구예요. 캥거루도 호주 원주민 말에서 왔어요.', t: '되돌아오는 도구' },
    { q: ORIGIN('토마토'), a: '아즈텍의 나우아틀어', w: ['스페인어', '이탈리아어', '아랍어'], d: 'h', m: '멕시코 원주민 말 \'토마틀\'이 스페인어를 거쳐 퍼졌어요. 초콜릿, 아보카도도 같은 언어에서 왔어요.', t: '토마틀' },
    { q: ORIGIN('매머드'), a: '러시아어', w: ['영어', '그리스어', '몽골어'], d: 'h', m: '시베리아 얼음 속에서 많이 발견되어 러시아어 이름이 퍼졌어요.', t: '시베리아' },

    // ── 자주 쓰는 외래어 ──
    { a: '시그니처', d: 'n', b: 'signature=서명', m: '어떤 가게나 사람을 대표하는 고유한 특징이나 상품', t: '이 집 대표 메뉴' },
    { a: '셀럽', d: 'e', b: 'celeb=celebrity(유명인)', m: '대중에게 널리 알려진 유명인', t: '유명 인사' },
    { a: '인플루언서', d: 'e', b: 'influence=영향', m: 'SNS 등에서 많은 팔로워를 거느리며 다른 사람에게 큰 영향을 주는 사람', t: '영향력 있는 사람' },
    { a: '리스펙트', d: 'n', b: 'respect=존경', m: '상대를 존중하고 인정하는 마음', t: '"리스펙!"' },
    { a: '케미', d: 'e', b: 'chemistry=화학 반응', m: '사람 사이에 잘 어울려 생기는 좋은 분위기나 호흡', t: '찰떡 호흡' },
    { a: '바이브', d: 'n', b: 'vibe=분위기', m: '어떤 사람이나 장소에서 느껴지는 분위기나 기운', t: '느낌' },
    { a: '시크', d: 'n', b: 'chic=멋진', m: '꾸민 티 없이 세련되고 무심한 듯 멋있는 모습', t: '도도한 멋' },
    { a: '엣지', d: 'n', b: 'edge=날, 모서리', m: '다른 것과 구별되는 날카롭고 세련된 개성', t: '"엣지 있게"' },
    { a: '언박싱', d: 'e', b: 'unboxing=상자 열기', m: '새로 산 물건의 포장을 뜯으며 소개하는 것', t: '택배 개봉기' },
    { a: '하울', d: 'h', b: 'haul=끌어모은 것', m: '한꺼번에 많이 산 물건을 하나하나 보여 주는 영상', t: '쇼핑 자랑' },
    { a: '큐레이션', d: 'n', m: '많은 정보나 상품 가운데 알맞은 것을 골라 소개하는 것', t: '골라 주기' },
    { a: '굿즈', d: 'e', b: 'goods=상품', m: '연예인, 캐릭터, 작품 등과 관련해 만든 기념 상품', t: '팬 상품' },
    { a: '팝업 스토어', d: 'n', m: '짧은 기간만 열었다가 사라지는 임시 매장', t: '반짝 매장' },
    { a: '플래그십 스토어', d: 'h', b: 'flagship=기함(함대를 이끄는 배)', m: '브랜드의 개성과 상품을 가장 잘 보여 주려고 크게 꾸민 대표 매장', t: '대표 매장' },
    { a: '노키즈존', d: 'n', m: '어린이를 데려온 손님은 들어올 수 없게 한 가게', t: '아이 출입 금지' },
    { a: '루키', d: 'e', b: 'rookie=신참', m: '어떤 분야에 처음 들어온 신인', t: '신인' },
    { a: '베테랑', d: 'e', m: '어떤 분야에서 오랫동안 일해 기술과 경험이 많은 사람', t: '노련한 사람' },
    { a: '레퍼런스', d: 'n', b: 'reference=참고', m: '일을 할 때 참고로 삼는 자료나 사례', t: '참고 자료' },
    { a: '애티튜드', d: 'n', b: 'attitude=태도', m: '어떤 일이나 사람을 대하는 마음가짐과 태도', t: '태도' },
    { a: '컴플레인', d: 'e', b: 'complain=불평하다', m: '상품이나 서비스에 불만을 말하는 것', t: '불만 제기' },
    { a: '스폰서', d: 'e', m: '행사나 선수에게 돈을 대 주고 그 대가로 홍보 효과를 얻는 개인이나 기업', t: '후원자' },
    { a: '서포터즈', d: 'n', m: '팀이나 기업, 행사를 응원하고 홍보 활동을 돕는 사람들', t: '응원단' },
    { a: '에이전시', d: 'n', b: 'agency=대행사', m: '다른 사람이나 회사를 대신해 일을 맡아 처리하는 회사', t: '대행사' },
  ],
}
