'use client'

import React from 'react'
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react'

interface CustomEmojiPickerProps {
  onEmojiClick: (emojiData: EmojiClickData, event: MouseEvent) => void;
}

export default function CustomEmojiPicker({ onEmojiClick }: CustomEmojiPickerProps) {
  return (
    <EmojiPicker 
      theme={Theme.LIGHT} 
      onEmojiClick={onEmojiClick} 
      
      // Mobile UI Fixes
      autoFocusSearch={false} 
      // searchDisabled={true} 
      width={320}
      height={350}
    />
  )
}