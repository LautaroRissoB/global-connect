import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['es', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'es'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  const locale: Locale = raw === 'en' ? 'en' : 'es'

  const messages = locale === 'en'
    ? (await import('./messages/en.json')).default
    : (await import('./messages/es.json')).default

  return { locale, messages }
})
