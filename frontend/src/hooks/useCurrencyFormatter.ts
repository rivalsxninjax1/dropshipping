import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { formatUsdAsNpr } from '../utils/currency'

export function useCurrencyFormatter() {
  const { i18n } = useTranslation()
  return useCallback((value: number | string) => formatUsdAsNpr(value, i18n.language), [i18n.language])
}
