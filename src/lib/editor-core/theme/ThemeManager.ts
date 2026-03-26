/**
 * ThemeManager - 主题管理器
 *
 * 基于 Tailwind CSS 的主题系统，支持暗色模式
 */

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  border: string
  text: string
  textSecondary: string
}

export interface Theme {
  name: string
  mode: 'light' | 'dark'
  colors: ThemeColors
}

export interface ThemeConfig {
  colors?: Partial<ThemeColors>
}

/**
 * 默认主题配置
 */
const DEFAULT_COLORS: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  background: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  text: '#111827',
  textSecondary: '#6b7280'
}

const DARK_COLORS: ThemeColors = {
  primary: '#60a5fa',
  secondary: '#9ca3af',
  background: '#111827',
  surface: '#1f2937',
  border: '#374151',
  text: '#f9fafb',
  textSecondary: '#9ca3af'
}

/**
 * 预定义主题
 */
export const BUILTIN_THEMES: Record<string, Theme> = {
  light: {
    name: 'light',
    mode: 'light',
    colors: DEFAULT_COLORS
  },
  dark: {
    name: 'dark',
    mode: 'dark',
    colors: DARK_COLORS
  }
}

export class ThemeManager {
  private themes = new Map<string, Theme>()
  private currentTheme: Theme
  private listeners = new Set<(theme: Theme) => void>()

  constructor(initialTheme: Theme = BUILTIN_THEMES.light) {
    this.themes.set(initialTheme.name, initialTheme)
    this.currentTheme = initialTheme

    // 注册内置主题
    this.registerTheme(BUILTIN_THEMES.light)
    this.registerTheme(BUILTIN_THEMES.dark)
  }

  /**
   * 设置主题
   * @param theme 主题对象或主题名称
   */
  setTheme(theme: Theme | string): void {
    const themeObj = typeof theme === 'string'
      ? this.themes.get(theme)
      : theme

    if (!themeObj) {
      throw new Error(`Theme not found: ${theme}`)
    }

    const oldTheme = this.currentTheme
    this.currentTheme = themeObj

    this.applyTheme(themeObj)

    // 通知监听器
    if (oldTheme.name !== themeObj.name) {
      this.notifyListeners()
    }
  }

  /**
   * 获取当前主题
   */
  getTheme(): Theme {
    return this.currentTheme
  }

  /**
   * 获取当前主题名称
   */
  getThemeName(): string {
    return this.currentTheme.name
  }

  /**
   * 获取当前模式
   */
  getMode(): 'light' | 'dark' {
    return this.currentTheme.mode
  }

  /**
   * 注册主题
   * @param theme 主题对象
   */
  registerTheme(theme: Theme): void {
    this.themes.set(theme.name, theme)
  }

  /**
   * 注销主题
   * @param name 主题名称
   */
  unregisterTheme(name: string): void {
    // 不允许注销内置主题
    if (name === 'light' || name === 'dark') {
      throw new Error(`Cannot unregister built-in theme: ${name}`)
    }

    // 如果是当前主题，先切换到 light
    if (this.currentTheme.name === name) {
      this.setTheme('light')
    }

    this.themes.delete(name)
  }

  /**
   * 获取所有主题
   */
  getAllThemes(): Theme[] {
    return Array.from(this.themes.values())
  }

  /**
   * 获取主题列表（按模式分组）
   */
  getThemesByMode(): { light: Theme[]; dark: Theme[] } {
    const themes = this.getAllThemes()
    return {
      light: themes.filter(t => t.mode === 'light'),
      dark: themes.filter(t => t.mode === 'dark')
    }
  }

  /**
   * 切换暗色模式
   */
  toggleDarkMode(): void {
    const newMode = this.currentTheme.mode === 'light' ? 'dark' : 'light'
    this.setTheme(newMode)
  }

  /**
   * 监听主题变化
   * @param listener 监听器
   * @returns 取消订阅函数
   */
  onChange(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 获取 Tailwind className
   * 用于在组件上应用主题类
   */
  getThemeClass(): string {
    return this.currentTheme.mode === 'dark' ? 'dark' : ''
  }

  /**
   * 获取 CSS 变量（可选，用于自定义样式）
   */
  getCSSVariables(): Record<string, string> {
    const colors = this.currentTheme.colors
    return {
      '--editor-primary': colors.primary,
      '--editor-secondary': colors.secondary,
      '--editor-background': colors.background,
      '--editor-surface': colors.surface,
      '--editor-border': colors.border,
      '--editor-text': colors.text,
      '--editor-text-secondary': colors.textSecondary
    }
  }

  /**
   * 私有方法：应用主题到 DOM
   */
  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // 设置 dark 类
    if (theme.mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // 设置 data-theme 属性
    root.setAttribute('data-theme', theme.name)

    // 可选：设置 CSS 变量
    const cssVars = this.getCSSVariables()
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value)
    }
  }

  /**
   * 私有方法：通知监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentTheme)
      } catch (error) {
        console.error('Error in theme listener:', error)
      }
    })
  }
}
