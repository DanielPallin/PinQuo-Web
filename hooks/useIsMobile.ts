'use client'

import { useState, useEffect } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const isTouchScreen = window.matchMedia('(pointer: coarse)').matches
      const isSmallScreen = window.innerWidth < 1024
      
      setIsMobile(isTouchScreen || isSmallScreen)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return isMobile
}