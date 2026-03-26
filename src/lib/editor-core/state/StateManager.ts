/**
 * StateManager - 编辑器状态管理器
 *
 * 负责管理编辑器的全局状态，支持状态订阅和通知
 */

import type { EditorState, StateUpdater, StateListener } from '../types'

/**
 * 默认状态
 */
export const DEFAULT_STATE: EditorState = {
  isEditing: false,
  readonly: false,
  selection: null,
  selectedImage: null,
  selectedFloatingImageId: null,
  activeTable: null,
  content: '',
  floatingImages: [],
  toolbarVisible: true,
  sidebarVisible: false
}

/**
 * 状态管理器类
 */
export class StateManager {
  private state: EditorState
  private listeners = new Set<StateListener>()
  private batchDepth = 0
  private batchedUpdates: Array<{ newState: EditorState; oldState: EditorState }> = []

  constructor(initialState: Partial<EditorState> = {}) {
    this.state = { ...DEFAULT_STATE, ...initialState }
  }

  /**
   * 获取当前状态的副本
   */
  getState(): EditorState {
    return { ...this.state }
  }

  /**
   * 更新状态
   * @param updater 状态更新函数或新状态
   */
  setState(updater: StateUpdater): void {
    const newState = typeof updater === 'function'
      ? (updater as (currentState: EditorState) => EditorState)(this.state)
      : updater

    const oldState = this.state
    this.state = { ...this.state, ...newState }

    // 如果在批处理中，暂存更新
    if (this.batchDepth > 0) {
      this.batchedUpdates.push({ newState: this.getState(), oldState: { ...oldState } })
      return
    }

    // 立即通知监听器
    this.notifyListeners(this.getState(), oldState)
  }

  /**
   * 部分更新状态
   * @param partial 要更新的状态部分
   */
  partialUpdate(partial: Partial<EditorState>): void {
    this.setState((current) => ({ ...current, ...partial }))
  }

  /**
   * 订阅状态变化
   * @param listener 状态监听器
   * @returns 取消订阅函数
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 开始批量更新
   * 在批量更新期间，状态变化不会立即触发监听器
   */
  beginBatch(): void {
    this.batchDepth++
  }

  /**
   * 结束批量更新并触发所有暂存的更新
   */
  endBatch(): void {
    this.batchDepth--
    if (this.batchDepth === 0 && this.batchedUpdates.length > 0) {
      const updates = [...this.batchedUpdates]
      this.batchedUpdates = []

      // 只触发最后一次更新
      if (updates.length > 0) {
        const lastUpdate = updates[updates.length - 1]
        this.notifyListeners(lastUpdate.newState, lastUpdate.oldState)
      }
    }
  }

  /**
   * 重置状态到初始值
   */
  reset(): void {
    const oldState = this.state
    this.state = { ...DEFAULT_STATE }
    this.notifyListeners(this.getState(), oldState)
  }

  /**
   * 获取监听器数量
   */
  getListenerCount(): number {
    return this.listeners.size
  }

  /**
   * 私有方法：通知所有监听器
   */
  private notifyListeners(newState: EditorState, oldState: EditorState): void {
    this.listeners.forEach(listener => {
      try {
        listener(newState, oldState)
      } catch (error) {
        console.error('Error in state listener:', error)
      }
    })
  }
}
