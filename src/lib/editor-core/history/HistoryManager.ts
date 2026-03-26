/**
 * HistoryManager - 编辑器历史管理器
 *
 * 重新设计以匹配原始 useHistory 的语义：
 * - past: 历史状态数组（不包含当前状态）
 * - present: 当前状态
 * - future: 重做状态数组
 */

import type { EditorState } from '../types'

/**
 * 历史项
 */
interface HistoryItem {
  state: EditorState
  timestamp: number
}

/**
 * 历史管理器类
 */
export class HistoryManager {
  private past: HistoryItem[] = []
  private present: HistoryItem | null = null
  private future: HistoryItem[] = []
  private maxSize: number
  private enabled: boolean = true

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  /**
   * 初始化当前状态
   * @param state 初始状态
   */
  initialize(state: EditorState): void {
    const stateCopy: EditorState = JSON.parse(JSON.stringify(state))
    this.present = {
      state: stateCopy,
      timestamp: Date.now()
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): EditorState | null {
    return this.present ? JSON.parse(JSON.stringify(this.present.state)) : null
  }

  /**
   * 保存新状态到历史
   * @param state 新状态
   */
  push(state: EditorState): void {
    if (!this.enabled) return

    // 如果还没有 present，直接初始化
    if (!this.present) {
      this.initialize(state)
      return
    }

    // 深拷贝状态
    const stateCopy: EditorState = JSON.parse(JSON.stringify(state))

    // 将当前 present 移入 past
    this.past.push(this.present)

    // 设置新的 present
    this.present = {
      state: stateCopy,
      timestamp: Date.now()
    }

    // 清空 future
    this.future = []

    // 限制历史大小
    if (this.past.length > this.maxSize) {
      this.past.shift() // 移除最旧的
    }
  }

  /**
   * 撤销
   * @returns 撤销后的状态，如果没有可撤销的历史则返回 null
   */
  undo(): EditorState | null {
    if (!this.enabled || this.past.length === 0 || !this.present) {
      return null
    }

    // 将当前 present 移入 future
    this.future.unshift(this.present)

    // 从 past 中取出上一个作为新的 present
    const previous = this.past.pop()!

    this.present = previous

    return JSON.parse(JSON.stringify(this.present.state))
  }

  /**
   * 重做
   * @returns 重做后的状态，如果没有可重做的历史则返回 null
   */
  redo(): EditorState | null {
    if (!this.enabled || this.future.length === 0 || !this.present) {
      return null
    }

    // 将当前 present 移入 past
    this.past.push(this.present)

    // 从 future 中取出下一个作为新的 present
    const next = this.future.shift()!

    this.present = next

    // 限制历史大小
    if (this.past.length > this.maxSize) {
      this.past.shift()
    }

    return JSON.parse(JSON.stringify(this.present.state))
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.enabled && this.past.length > 0
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.enabled && this.future.length > 0
  }

  /**
   * 清空所有历史
   */
  clear(): void {
    this.past = []
    this.present = null
    this.future = []
  }

  /**
   * 重置到指定状态
   * @param state 新的初始状态
   */
  reset(state: EditorState): void {
    this.clear()
    this.initialize(state)
  }

  /**
   * 设置历史最大大小
   * @param size 最大历史条数
   */
  setMaxSize(size: number): void {
    this.maxSize = size

    // 如果 past 超过新的大小，截断
    while (this.past.length > size) {
      this.past.shift()
    }
  }

  /**
   * 启用/禁用历史记录
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * 检查历史记录是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 获取历史统计信息
   */
  getStats() {
    return {
      past: this.past.length,
      future: this.future.length,
      maxSize: this.maxSize,
      enabled: this.enabled,
      hasPresent: this.present !== null
    }
  }
}
