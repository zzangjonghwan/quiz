import {
  Atom, BookOpen, Brain, Briefcase, Cpu, Earth, Gavel, Globe, HeartPulse, Landmark,
  Languages, Lightbulb, Mic, Newspaper, Palette, PawPrint, Quote, ScrollText, Sparkles, SpellCheck,
  Sun, Trophy, User, UtensilsCrossed, Home, type LucideIcon,
} from 'lucide-react'
import type { CategoryId, Difficulty } from './types'

export interface CategoryMeta {
  id: CategoryId
  name: string
  icon: LucideIcon
}

export interface CategoryGroup {
  name: string
  categories: CategoryMeta[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: '말과 글',
    categories: [
      { id: 'idiom', name: '사자성어', icon: ScrollText },
      { id: 'proverb', name: '속담·관용구', icon: Quote },
      { id: 'korean', name: '우리말·맞춤법', icon: SpellCheck },
      { id: 'slang', name: '신조어·유행어', icon: Sparkles },
      { id: 'loanword', name: '외래어·영어', icon: Languages },
    ],
  },
  {
    name: '사람과 역사',
    categories: [
      { id: 'figure', name: '위인', icon: User },
      { id: 'celeb', name: '연예인·가수', icon: Mic },
      { id: 'koreanhistory', name: '한국사', icon: Landmark },
      { id: 'worldhistory', name: '세계사', icon: Globe },
      { id: 'myth', name: '신화·종교', icon: Sun },
    ],
  },
  {
    name: '세상과 자연',
    categories: [
      { id: 'animal', name: '동물', icon: PawPrint },
      { id: 'science', name: '과학', icon: Atom },
      { id: 'geo', name: '지리·나라', icon: Earth },
    ],
  },
  {
    name: '생활',
    categories: [
      { id: 'life', name: '생활상식', icon: Home },
      { id: 'health', name: '건강·의학', icon: HeartPulse },
      { id: 'food', name: '음식·요리', icon: UtensilsCrossed },
      { id: 'law', name: '법률 상식', icon: Gavel },
      { id: 'economy', name: '경제·금융', icon: Briefcase },
    ],
  },
  {
    name: '문화',
    categories: [
      { id: 'book', name: '문학·책', icon: BookOpen },
      { id: 'media', name: '문화·예술', icon: Palette },
      { id: 'sports', name: '스포츠', icon: Trophy },
    ],
  },
  {
    name: '잡학',
    categories: [
      { id: 'trivia', name: '알쓸신잡', icon: Lightbulb },
      { id: 'news', name: '시사', icon: Newspaper },
      { id: 'tech', name: 'IT·기술', icon: Cpu },
    ],
  },
]

export const ALL_CATEGORIES: CategoryMeta[] = CATEGORY_GROUPS.flatMap((g) => g.categories)

export const CATEGORY_BY_ID = Object.fromEntries(ALL_CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryMeta
>

/** Icon for the "종합" (all categories) entry. */
export const MIXED_ICON = Brain

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
}
