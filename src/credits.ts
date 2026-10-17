// Every image in the app points at one of these entries (CardImage.credit); recorded sound
// clips are listed here too. Attribution is satisfied by the 설정 > 이미지·소리 출처 screen.
export interface Credit {
  title: string
  usedFor: string
  author: string
  license: string
  url?: string
}

export const CREDITS: Record<string, Credit> = {
  'flag-icons': {
    title: 'flag-icons',
    usedFor: '국기 이미지',
    author: 'Panayiotis Lipiridis 외',
    license: 'MIT License',
    url: 'https://github.com/lipis/flag-icons',
  },
  'natural-earth': {
    title: 'Natural Earth (world-atlas)',
    usedFor: '나라 모양 실루엣',
    author: 'Natural Earth / Mike Bostock',
    license: '퍼블릭 도메인 (Natural Earth), ISC License (world-atlas)',
    url: 'https://www.naturalearthdata.com',
  },
  original: {
    title: '상식한입 자체 제작',
    usedFor: '별자리, 교통 안전 표지, 세탁 기호 그림',
    author: '상식한입',
    license: '자체 제작 (실제 표지·기호를 단순화해 다시 그림)',
  },
  elevenlabs: {
    title: 'ElevenLabs',
    usedFor: '정답(뽁), 오답(뿌뿌), 결과(트럼펫) 효과음',
    author: 'ElevenLabs Sound Effects로 생성',
    license: 'ElevenLabs 이용 약관 (출처 표기)',
    url: 'https://elevenlabs.io',
  },
  'fish-audio': {
    title: 'Built with Fish Audio',
    usedFor: '상식플러스 이야기 음성 (모아)',
    author: 'Fish Audio S2 Pro로 음성 생성',
    // The license asks for this exact notice wherever its outputs are distributed.
    license:
      'Fish Audio Research License (비상업적 이용). This model is licensed under the Fish Audio Research License, Copyright © 39 AI, INC. All Rights Reserved.',
    url: 'https://fish.audio',
  },
  voicevox: {
    title: 'VOICEVOX:冥鳴ひまり',
    usedFor: '일본어 단어 팩 발음',
    author: 'VOICEVOX(무료 음성 합성 소프트웨어)의 冥鳴ひまり(메이메이 히마리) 음성으로 생성',
    license: 'VOICEVOX 이용 약관, 冥鳴ひまり 이용 규약 (출처 표기 시 상업·비상업 이용 가능)',
    url: 'https://voicevox.hiroshiba.jp',
  },
  'gemini-tts': {
    title: 'Google Gemini TTS',
    usedFor: '모아 목소리의 바탕이 된 음성 샘플',
    author: 'Google Gemini 음성 생성(Leda 음성)으로 제작',
    license: 'Google Gemini API 이용 약관',
  },
}
