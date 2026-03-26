/**
 * EventBus - 事件总线
 *
 * 实现发布-订阅模式的事件系统
 */

type EventHandler = (...args: any[]) => void

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()
  private onceListeners = new Map<string, Set<EventHandler>>()

  /**
   * 订阅事件
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 取消订阅函数
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    // 返回取消订阅函数
    return () => this.off(event, handler)
  }

  /**
   * 订阅一次性事件
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 取消订阅函数
   */
  once(event: string, handler: EventHandler): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set())
    }

    const wrappedHandler: EventHandler = (...args) => {
      handler(...args)
      // 执行后自动移除
      this.onceListeners.get(event)?.delete(wrappedHandler)
    }

    this.onceListeners.get(event)!.add(wrappedHandler)

    // 返回取消订阅函数
    return () => this.onceListeners.get(event)?.delete(wrappedHandler)
  }

  /**
   * 取消订阅
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 事件参数
   */
  emit(event: string, ...args: any[]): void {
    // 触发普通监听器
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(...args)
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error)
      }
    })

    // 触发一次性监听器
    this.onceListeners.get(event)?.forEach(handler => {
      try {
        handler(...args)
      } catch (error) {
        console.error(`Error in once listener for "${event}":`, error)
      }
    })
  }

  /**
   * 批量触发事件
   * @param events 事件数组
   */
  emitBatch(events: Array<{ event: string; args: any[] }>): void {
    events.forEach(({ event, args }) => {
      this.emit(event, ...args)
    })
  }

  /**
   * 移除某个事件的所有监听器
   * @param event 事件名称
   */
  removeAllListeners(event: string): void {
    this.listeners.delete(event)
    this.onceListeners.delete(event)
  }

  /**
   * 清空所有事件监听器
   */
  clear(): void {
    this.listeners.clear()
    this.onceListeners.clear()
  }

  /**
   * 获取某个事件的监听器数量
   * @param event 事件名称
   */
  listenerCount(event: string): number {
    const regular = this.listeners.get(event)?.size || 0
    const once = this.onceListeners.get(event)?.size || 0
    return regular + once
  }

  /**
   * 获取所有事件名称
   */
  getEventNames(): string[] {
    const regularEvents = Array.from(this.listeners.keys())
    const onceEvents = Array.from(this.onceListeners.keys())
    return Array.from(new Set([...regularEvents, ...onceEvents]))
  }
}
