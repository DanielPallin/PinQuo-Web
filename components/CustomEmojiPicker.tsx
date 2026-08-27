'use client'

import React from 'react'
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react'
import { useTheme } from 'next-themes'

interface CustomEmojiPickerProps {
  onEmojiClick: (emojiData: EmojiClickData, event: MouseEvent) => void;
}

export default function CustomEmojiPicker({ onEmojiClick }: CustomEmojiPickerProps) {
  const { resolvedTheme } = useTheme()

  return (
    <EmojiPicker
      theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
      onEmojiClick={onEmojiClick}
      
      // Mobile UI Fixes
      autoFocusSearch={false} 
      // searchDisabled={true} 
      width={320}
      height={350}
    />
  )
}