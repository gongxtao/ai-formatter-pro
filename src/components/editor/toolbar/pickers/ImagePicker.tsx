/**
 * ImagePicker Component
 * Handles image upload and selection
 */

import React, { useState, useRef, type ComponentType, type SVGProps } from 'react'
import ToolbarButton from '../buttons/ToolbarButton'
import { IMAGE_MAX_SIZE_BYTES } from '../config/constants'
import { ImageIcon } from '../../icons'

export interface ImagePickerProps {
  /** Callback when an image is selected */
  onImageSelect: (imageUrl: string) => void
  /** Whether the picker is disabled */
  disabled?: boolean
  title?: string
  /** Custom icon component */
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}

/**
 * Note: This component requires onImageSelect to be provided.
 * If using in ButtonRenderer, ensure onImageSelect callback is passed.
 */

const ImagePicker: React.FC<ImagePickerProps> = ({ onImageSelect, disabled = false, title, icon: Icon }) => {
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

    // Check file size
    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      alert(`Image size must be less than ${IMAGE_MAX_SIZE_BYTES / (1024 * 1024)}MB`)
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
        title={isUploading ? "Uploading..." : (title || "Insert image")}
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className="min-w-[40px] px-2"
      >
        {isUploading ? (
          <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
        ) : (
          Icon ? <Icon /> : <ImageIcon />
        )}
      </ToolbarButton>
    </div>
  )
}

export default ImagePicker
