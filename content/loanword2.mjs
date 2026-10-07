const KONGLISH = (k) => `한국에서 쓰는 '${k}'에 해당하는 자연스러운 영어 표현은?`

export default {
  category: 'loanword',
  name: 'm2',
  label: '외래어',
  cards: [
    // ── 외래어 뜻: 쉬움 ──
    { a: '콘셉트', d: 'e', m: '작품이나 기획 전체를 꿰뚫는 주된 생각이나 방향', t: '"이번 앨범 콘셉트는 레트로야"' },
    { a: '브리핑', d: 'e', m: '요점을 간추려 짧게 보고하거나 설명하는 것', t: '아침 회의 5분 브리핑' },
    { a: '인센티브', d: 'e', m: '성과에 따라 덧붙여 주는 보상', t: '성과급 = 인센티브' },
    { a: '리스크', d: 'e', m: '손해를 보거나 일이 잘못될 위험', t: '하이 리스크 하이 리턴' },
    { a: '데드라인', d: 'e', m: '넘어서는 안 되는 마감 시한', t: '원래는 포로수용소에서 넘으면 사살되는 선이었다는 설이 있어요' },
    { a: '브레인스토밍', d: 'e', b: 'brain=뇌 / storming=폭풍처럼 몰아침', m: '비판 없이 자유롭게 아이디어를 마구 쏟아 내는 회의 방식', t: '아무 말 대잔치 회의' },
    { a: '롤 모델', d: 'e', b: 'role=역할 / model=본보기', m: '닮고 싶어 본받는 사람', t: '"제 롤 모델은 손흥민 선수예요"' },
    { a: '클라이맥스', d: 'e', m: '이야기나 사건에서 긴장과 흥미가 가장 높아지는 절정', t: '영화 후반부 최종 결전' },
    { a: '레트로', d: 'e', b: 'retro=retrospective(회고)', m: '지난 시대의 유행이나 감성을 다시 즐기는 복고풍', t: '필름 카메라, LP판 열풍' },
    { a: '노하우', d: 'e', b: 'know=알다 / how=어떻게', m: '어떤 일을 잘하는 데 필요한 요령이나 기술', t: '자취 10년 차의 살림 요령' },
    { a: '프라이버시', d: 'e', m: '남에게 간섭받지 않을 개인의 사생활', t: '남의 폰 보지 않기' },
    { a: '스테디셀러', d: 'e', b: 'steady=꾸준한 / seller=잘 팔리는 것', m: '오랜 기간 꾸준히 잘 팔리는 책이나 상품', t: '반짝 인기 = 베스트셀러, 꾸준한 인기 = 스테디셀러' },

    // ── 외래어 뜻: 보통 ──
    { a: '아이덴티티', d: 'n', m: '어떤 존재가 다른 것과 구별되는 본질적인 특성, 곧 정체성', t: '브랜드 아이덴티티' },
    { a: '어젠다', d: 'n', m: '회의에서 다룰 안건, 또는 사회가 함께 논의할 의제', t: '정상 회담의 핵심 어젠다' },
    { a: '벤치마킹', d: 'n', b: 'benchmark=측량의 기준점', m: '뛰어난 대상을 기준으로 삼아 장점을 배우고 따라 하는 것', t: '잘나가는 경쟁사 분석' },
    { a: '아웃소싱', d: 'n', b: 'out=밖 / sourcing=조달', m: '회사 업무 일부를 바깥 전문 업체에 맡기는 것', t: '청소·경비를 용역 회사에' },
    { a: '모티브', d: 'n', m: '창작이나 행동을 일으키는 동기나 바탕이 되는 소재', t: '실화를 모티브로 한 영화' },
    { a: '시뮬레이션', d: 'n', m: '실제와 비슷한 상황을 만들어 미리 실험하거나 연습해 보는 것', t: '비행 시뮬레이터' },
    { a: '프로토타입', d: 'n', b: 'proto=최초의 / type=형태', m: '본격적으로 만들기 전에 시험 삼아 만든 원형', t: '시제품, 베타 버전' },
    { a: '인프라', d: 'n', b: 'infra=아래 / structure=구조', m: '도로·통신·전기처럼 생활과 산업의 바탕이 되는 시설', t: '교통 인프라가 좋은 동네' },
    { a: '미니멀리즘', d: 'n', m: '꼭 필요한 것만 남기고 최대한 단순하게 하려는 경향', t: '물건 비우기, 단순한 디자인' },
    { a: '앰배서더', d: 'n', m: '기업이나 브랜드를 대표해 알리는 홍보 대사', t: '명품 브랜드 앰배서더가 된 아이돌' },
    { a: '콤플렉스', d: 'n', m: '스스로 남보다 못하다고 느끼는 마음, 곧 열등감', t: '키 콤플렉스', syn: ['트라우마'] },
    { a: '트라우마', d: 'n', m: '큰 충격을 겪은 뒤 마음에 오래 남는 상처', t: '물에 빠진 뒤 수영장을 못 감' },
    { a: '헤드헌터', d: 'n', b: 'head=사람(인재) / hunter=사냥꾼', m: '기업에 필요한 인재를 찾아 연결해 주는 사람', t: '경력직 이직 제안 전화' },
    { a: '큐레이터', d: 'n', m: '미술관이나 박물관에서 전시를 기획하고 작품을 관리하는 사람', t: '요즘은 \'콘텐츠 큐레이션\'처럼 골라 추천하는 뜻으로도 써요' },

    // ── 외래어 뜻: 어려움 ──
    { a: '패러독스', d: 'h', m: '겉으로는 모순 같지만 그 속에 진리가 담긴 말, 곧 역설', t: '"급할수록 돌아가라"' },
    { a: '알레고리', d: 'h', m: '어떤 대상을 다른 이야기에 빗대어 뜻을 전하는 표현 방식', t: '「동물 농장」 = 독재 정치의 알레고리' },
    { a: '메타포', d: 'h', m: '\'~같이\' 없이 한 대상을 다른 것에 바로 빗대는 은유', t: '"내 마음은 호수요"' },
    { a: '아포리즘', d: 'h', m: '깊은 진리나 교훈을 짧고 날카롭게 표현한 글귀', t: '"아는 것이 힘이다"' },
    { a: '레거시', d: 'h', m: '과거로부터 물려받은 유산, 또는 오래되어 바꾸기 어려운 낡은 시스템', t: '레거시 미디어 = 신문·방송' },
    { a: '엠바고', d: 'h', m: '정해진 시각까지 기사 보도를 미루기로 하는 약속', o: '원래는 배가 항구에 드나드는 것을 막는 \'선박 억류\'를 뜻하는 스페인어예요.', t: '발표 시각 전 보도 금지' },
    { a: '오프더레코드', d: 'h', b: 'off=벗어나 / the record=기록', m: '기록하거나 보도하지 않는다는 조건으로 하는 발언', t: '"이건 비보도로 하는 말인데요"' },
    { a: '아카이브', d: 'h', m: '자료나 기록을 체계적으로 모아 보관하는 곳, 또는 그 기록', t: '방송국 영상 자료실' },

    // ── 콩글리시 ──
    { q: KONGLISH('백미러'), a: 'rearview mirror', w: ['back mirror', 'rear glass', 'behind mirror'], d: 'e', m: '운전석에서 뒤를 보는 거울은 rearview mirror예요. 옆 거울은 side mirror 또는 wing mirror라고 해요.', t: 'rear(뒤) + view(보기)' },
    { q: KONGLISH('선팅(자동차 창문)'), a: 'window tinting', w: ['sunting', 'sun coating', 'sun cutting'], d: 'n', m: '창문에 색을 입히는 건 tint(색조)를 써서 window tinting이라고 해요.', t: 'tint = 엷은 색' },
    { q: KONGLISH('본드(접착제)'), a: 'glue', w: ['bond', 'stick paste', 'fix liquid'], d: 'e', m: "'본드'는 접착제 상표에서 굳어진 말이에요. 영어로는 보통 glue나 adhesive라고 해요.", t: '딱풀 = glue stick' },
    { q: KONGLISH('A/S(애프터서비스)'), a: 'warranty repair', w: ['A/S', 'after service', 'back service'], d: 'n', m: '영어권에서는 보증 기간 수리를 warranty repair, 고객 응대를 customer service라고 해요.', t: '"Is it under warranty?"' },
    { q: KONGLISH('파마'), a: 'perm', w: ['pama', 'hair wave', 'curl making'], d: 'e', m: "'파마'는 permanent wave를 일본식으로 줄인 말이에요. 영어로는 perm이에요.", t: 'permanent(오래가는) wave(웨이브)' },
    { q: KONGLISH('린스'), a: 'conditioner', w: ['rinse', 'hair rinse', 'hair soap'], d: 'e', m: 'rinse는 \'헹구다\'라는 동사예요. 샴푸 뒤에 쓰는 제품은 conditioner예요.', t: '샴푸 → 컨디셔너' },
    { q: KONGLISH('믹서(갈아 주는 기계)'), a: 'blender', w: ['mixer', 'juicer machine', 'grinder cup'], d: 'n', m: '과일을 가는 기계는 blender예요. 영어 mixer는 반죽을 섞는 거품기 달린 기계를 주로 가리켜요.', t: '스무디는 blender로' },
    { q: KONGLISH('전자레인지'), a: 'microwave', w: ['electric range', 'micro range', 'range oven'], d: 'e', m: '전자레인지는 microwave oven, 줄여서 microwave라고 해요. 영어 range는 가스레인지 같은 조리대를 뜻해요.', t: '"Can I microwave this?"' },
    { q: KONGLISH('프림(커피에 넣는 가루)'), a: 'creamer', w: ['prim', 'milk powder', 'cream sugar'], d: 'n', m: "'프림'은 일본 상표 이름에서 온 말이에요. 영어로는 creamer예요.", t: '크림 넣는 것 = creamer' },
    { q: KONGLISH('빵꾸(타이어)'), a: 'flat tire', w: ['punk', 'tire punk', 'broken wheel'], d: 'n', m: "'빵꾸'는 puncture(구멍)를 일본식으로 줄인 말이에요. 타이어 바람이 빠진 건 flat tire라고 해요.", t: 'flat = 납작한' },
    { q: KONGLISH('사인펜'), a: 'felt-tip pen', w: ['sign pen', 'signature pen', 'name pen'], d: 'h', m: '펜촉이 섬유로 된 펜은 felt-tip pen이에요. \'사인펜\'은 일본 상표 이름에서 굳어진 말이에요.', t: 'felt(펠트) 펜촉' },
    { q: KONGLISH('노트(공책)'), a: 'notebook', w: ['note', 'writing book', 'study paper'], d: 'e', m: '영어 note는 \'메모\'라는 뜻이에요. 공책은 notebook이라고 해요.', t: 'note = 쪽지, notebook = 공책' },
    { q: KONGLISH('런닝머신'), a: 'treadmill', w: ['running machine', 'run machine', 'walking belt'], d: 'e', m: '헬스장의 달리기 기계는 treadmill이에요. tread(밟다) + mill(방아)에서 왔어요.', t: '원래 죄수들이 밟던 방아 바퀴' },
    { q: KONGLISH('아르바이트'), a: 'part-time job', w: ['arbeit', 'alba job', 'mini work'], d: 'e', m: "'아르바이트'는 독일어 Arbeit(일, 노동)에서 왔어요. 영어로는 part-time job이에요.", t: '알바 = part-time job' },
  ],
}
