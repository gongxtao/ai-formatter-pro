/**
 * ConfigManager - 配置管理器
 *
 * 负责管理编辑器的配置，支持配置验证和动态更新
 */

import type {
  EditorConfig,
  ValidationResult,
  ConfigListener
} from './types'

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: EditorConfig = {
  locale: 'zh-CN',
  readonly: false,
  spellcheck: true,

  content: {
    initialContent: '',
    placeholder: '请输入内容...',
    sanitize: true,
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style']
    }
  },

  toolbar: {
    position: 'top',
    rows: []
  },

  shortcuts: [
    { key: 'Ctrl+b', command: 'bold' },
    { key: 'Ctrl+i', command: 'italic' },
    { key: 'Ctrl+u', command: 'underline' },
    { key: 'Ctrl+z', command: 'undo' },
    { key: 'Ctrl+y', command: 'redo' },
    { key: 'Ctrl+Shift+z', command: 'redo' }
  ],

  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxWidth: 800,
    maxHeight: 600,
    defaultWidth: 300,
    defaultHeight: 200,
    resizeHandles: 'all'
  },

  table: {
    maxSize: { rows: 20, cols: 20 },
    defaultSize: { rows: 3, cols: 3 },
    resizeEnabled: true,
    mergeEnabled: true,
    splitEnabled: true
  },

  floatingImage: {
    enabled: true,
    defaultWidth: 200,
    defaultHeight: 150,
    minSize: 50,
    maxSize: 800
  },

  history: {
    maxSize: 100,
    debounceDelay: 300
  },

  theme: {
    mode: 'light',
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      background: '#ffffff',
      surface: '#f9fafb',
      border: '#e5e7eb',
      text: '#111827',
      textSecondary: '#6b7280'
    }
  }
}

export class ConfigManager {
  private config: EditorConfig
  private listeners = new Map<keyof EditorConfig, Set<ConfigListener>>()
  private validators = new Map<keyof EditorConfig, (value: any) => ValidationResult>()

  constructor(initialConfig: EditorConfig = {}) {
    this.config = this.mergeWithDefaults(initialConfig)
    this.setupDefaultValidators()
  }

  /**
   * 获取配置值
   * @param key 配置键
   */
  get<K extends keyof EditorConfig>(key: K): EditorConfig[K] {
    return this.config[key]
  }

  /**
   * 获取所有配置
   */
  getAll(): EditorConfig {
    return { ...this.config }
  }

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<K extends keyof EditorConfig>(key: K, value: EditorConfig[K]): void {
    // 验证配置
    const validator = this.validators.get(key)
    if (validator) {
      const result = validator(value)
      if (!result.valid) {
        throw new Error(`Invalid config for "${key}": ${result.errors.join(', ')}`)
      }
    }

    const oldValue = this.config[key]
    this.config[key] = value

    // 通知监听器
    this.notifyListeners(key, value, oldValue)
  }

  /**
   * 合并配置
   * @param config 要合并的配置
   */
  merge(config: Partial<EditorConfig>): void {
    const merged = this.deepMerge(this.config, config)

    // 验证合并后的配置
    const validation = this.validate(merged)
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`)
    }

    // 找出变化的键
    const changes: Array<{ key: keyof EditorConfig; newValue: any; oldValue: any }> = []
    for (const key of Object.keys(config) as Array<keyof EditorConfig>) {
      if (config[key] !== undefined) {
        changes.push({
          key,
          newValue: merged[key],
          oldValue: this.config[key]
        })
      }
    }

    this.config = merged

    // 通知监听器
    changes.forEach(({ key, newValue, oldValue }) => {
      this.notifyListeners(key, newValue, oldValue)
    })
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    const oldConfig = { ...this.config }
    this.config = { ...DEFAULT_CONFIG }

    // 通知所有监听器
    for (const key in oldConfig) {
      const typedKey = key as keyof EditorConfig
      this.notifyListeners(typedKey, this.config[typedKey], oldConfig[typedKey])
    }
  }

  /**
   * 重置特定配置项
   * @param key 配置键
   */
  resetKey<K extends keyof EditorConfig>(key: K): void {
    const defaultValue = DEFAULT_CONFIG[key]
    this.set(key, defaultValue)
  }

  /**
   * 验证配置
   * @param config 要验证的配置
   */
  validate(config: Partial<EditorConfig>): ValidationResult {
    const errors: string[] = []

    for (const key in config) {
      const validator = this.validators.get(key as keyof EditorConfig)
      if (validator) {
        const result = validator((config as any)[key])
        if (!result.valid) {
          errors.push(...result.errors)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 订阅配置变化
   * @param key 配置键
   * @param listener 监听器
   * @returns 取消订阅函数
   */
  subscribe<K extends keyof EditorConfig>(
    key: K,
    listener: ConfigListener<K>
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener as ConfigListener)

    return () => {
      this.listeners.get(key)?.delete(listener as ConfigListener)
    }
  }

  /**
   * 私有方法：与默认配置合并
   */
  private mergeWithDefaults(config: EditorConfig): EditorConfig {
    return this.deepMerge(DEFAULT_CONFIG, config) as EditorConfig
  }

  /**
   * 私有方法：深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
      if (source[key] === undefined) continue

      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key])
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  /**
   * 私有方法：设置默认验证器
   */
  private setupDefaultValidators(): void {
    // 图片配置验证
    this.validators.set('image', (value: any) => {
      const errors: string[] = []

      if (value.maxSize !== undefined && (value.maxSize <= 0 || value.maxSize > 50 * 1024 * 1024)) {
        errors.push('image.maxSize must be between 1 and 50MB')
      }

      if (value.maxWidth !== undefined && (value.maxWidth <= 0 || value.maxWidth > 4000)) {
        errors.push('image.maxWidth must be between 1 and 4000px')
      }

      return { valid: errors.length === 0, errors }
    })

    // 表格配置验证
    this.validators.set('table', (value: any) => {
      const errors: string[] = []

      if (value.maxSize !== undefined) {
        if (value.maxSize.rows <= 0 || value.maxSize.rows > 100) {
          errors.push('table.maxSize.rows must be between 1 and 100')
        }
        if (value.maxSize.cols <= 0 || value.maxSize.cols > 100) {
          errors.push('table.maxSize.cols must be between 1 and 100')
        }
      }

      return { valid: errors.length === 0, errors }
    })

    // 历史配置验证
    this.validators.set('history', (value: any) => {
      const errors: string[] = []

      if (value.maxSize !== undefined && (value.maxSize < 1 || value.maxSize > 1000)) {
        errors.push('history.maxSize must be between 1 and 1000')
      }

      return { valid: errors.length === 0, errors }
    })
  }

  /**
   * 私有方法：通知监听器
   */
  private notifyListeners<K extends keyof EditorConfig>(
    key: K,
    newValue: EditorConfig[K],
    oldValue: EditorConfig[K]
  ): void {
    this.listeners.get(key)?.forEach(listener => {
      try {
        listener(key, newValue, oldValue)
      } catch (error) {
        console.error(`Error in config listener for "${key}":`, error)
      }
    })
  }
}
