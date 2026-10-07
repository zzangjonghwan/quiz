// Every image in the app points at one of these entries (CardImage.credit).
// Licenses that require attribution are satisfied by the 설정 > 이미지 출처 screen.
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
}
