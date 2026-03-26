import React, { useState, useRef } from 'react'
import ToolbarButton from './ToolbarButton'
import { ImageIcon } from '../icons'

interface ImagePickerProps {
  onImageSelect: (imageUrl: string) => void
  disabled?: boolean
}

const ImagePicker: React.FC<ImagePickerProps> = ({ onImageSelect, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Convert to base64 data URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        onImageSelect(dataUrl)
        setIsUploading(false)
      }
      reader.onerror = () => {
        alert('Failed to read file')
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      alert('Failed to process image')
      setIsUploading(false)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleButtonClick = () => {
    if (isUploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <ToolbarButton
        title={isUploading ? "Uploading..." : "Insert image"}
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className="min-w-[40px] px-2"
      >
        {isUploading ? (
          <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
        ) : (
          <ImageIcon />
        )}
      </ToolbarButton>
    </div>
  )
}

export default ImagePicker
