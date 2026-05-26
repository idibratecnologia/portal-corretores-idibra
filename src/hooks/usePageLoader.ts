import { useState, useEffect } from 'react'

export function usePageLoader(delay = 500) {
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), delay)
    return () => clearTimeout(t)
  }, [delay])
  return isLoading
}
