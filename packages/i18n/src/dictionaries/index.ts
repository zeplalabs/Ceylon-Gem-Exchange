import type { Locale } from '../locale'
import { en, type Dictionary } from './en'
import { si } from './si'
import { ta } from './ta'

export const dictionaries: Record<Locale, Dictionary> = { en, si, ta }

export { en, si, ta }
export type { Dictionary } from './en'
