// 접미사: 단어 끝에 붙어 품사와 뜻을 바꾸는 조각
export default {
  cards: [
    { r: '-able', d: 'e', m: '~할 수 있는', from: '라틴어 -abilis', ex: 'portable · readable · reliable', t: '에이블(able)은 할 수 있다. 끝에 붙으면 형용사가 돼요. -ible도 같은 뜻(visible).' },
    { r: '-less', d: 'e', m: '~이 없는', from: '고대 영어 leas', ex: 'careless · endless · homeless', t: '와이어리스(wireless)는 선이 없는 것.' },
    { r: '-ful', d: 'e', m: '~이 가득한', from: '영어 full', ex: 'careful · useful · powerful', t: 'full(가득 찬)에서 l 하나가 빠진 모양.' },
    { r: '-ize', d: 'n', m: '~으로 만들다', from: '그리스어 -izein', ex: 'realize · modernize · organize', t: '명사·형용사 끝에 붙어 동사를 만들어요. 영국식은 -ise.', syn: ['-ify', 'en-'] },
    { r: '-ify', d: 'n', m: '~하게 하다', from: '라틴어 -ificare', ex: 'simplify · clarify · justify', t: '심플(simple)하게 하다 → simplify.', syn: ['-ize', 'en-'] },
    { r: '-ive', d: 'n', m: '~한 성질의', from: '라틴어 -ivus', ex: 'active · creative · expensive', t: '액티브(active)는 활동하는 성질의.' },
    { r: '-ous', d: 'n', m: '~이 많은', from: '라틴어 -osus', ex: 'famous · dangerous · various', t: '페이머스(famous)는 명성(fame)이 많은.', syn: ['-ful'] },
    { r: '-ment', d: 'n', m: '~하는 일(명사)', from: '라틴어 -mentum', ex: 'movement · agreement · government', t: '동사 끝에 붙어 명사를 만들어요. move → movement.', syn: ['-tion'] },
    { r: '-tion', d: 'e', m: '~하기, ~한 것(명사)', from: '라틴어 -tio', ex: 'action · education · invention', t: '동사를 명사로 바꾸는 가장 흔한 꼬리. -sion도 같아요.', syn: ['-ment'] },
    { r: '-ist', d: 'e', m: '~하는 사람', from: '그리스어 -istes', ex: 'artist · scientist · tourist', t: '피아니스트는 피아노 치는 사람.', syn: ['-er'] },
    { r: '-er', d: 'e', m: '~하는 사람·것', from: '고대 영어 -ere', ex: 'teacher · driver · printer', t: '드라이버(driver)는 운전하는 사람이자 나사를 돌리는 도구.', syn: ['-ist'] },
    { r: '-ity', d: 'n', m: '~한 성질(명사)', from: '라틴어 -itas', ex: 'reality · ability · security', t: '형용사를 명사로 바꿔요. real → reality.' },
    { r: '-logy', d: 'n', m: '~학, 학문', from: '그리스어 -logia', ex: 'biology · psychology · technology', t: '바이올로지(biology)는 생명(bio)을 다루는 학문.' },
    { r: '-cracy', d: 'h', m: '~의 지배, 정치', from: '그리스어 kratos(힘)', ex: 'democracy · bureaucracy · autocracy', t: '데모크라시(democracy)는 민중(demos)의 지배, 민주주의.' },
    { r: '-phobia', d: 'h', m: '~을 두려워함', from: '그리스어 phobos', ex: 'claustrophobia · acrophobia · xenophobia', t: '포비아(phobia)는 공포증.' },
    { r: '-ward', d: 'n', m: '~쪽으로', from: '고대 영어 -weard', ex: 'forward · backward · toward', t: '포워드(forward)는 앞쪽으로.', syn: ['ad-'] },
    { r: '-en', d: 'n', m: '~하게 되다·만들다', from: '고대 영어 -nian', ex: 'widen · strengthen · shorten', t: '형용사 끝에 붙어 동사가 돼요. wide → widen(넓히다).', syn: ['-ize', '-ify', 'en-'] },
  ],
}
