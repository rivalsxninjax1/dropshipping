import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      resolvedLanguage: 'en',
      language: 'en',
      changeLanguage: () => Promise.resolve(),
    },
  }),
  Trans: ({ children }: any) => children,
}))
