/**
 * CommandManager - 编辑器命令管理器
 *
 * 负责注册、执行和管理编辑器命令
 */

import type { CommandHandler, CommandStateQuery, CommandValueQuery } from '../types'

export interface CommandRegistration {
  handler: CommandHandler
  stateQuery?: CommandStateQuery
  valueQuery?: CommandValueQuery
}

/**
 * 命令管理器类
 */
export class CommandManager {
  private commands = new Map<string, CommandRegistration>()

  /**
   * 执行命令
   * @param name 命令名称
   * @param args 命令参数
   */
  execute(name: string, ...args: any[]): void {
    const registration = this.commands.get(name)
    if (!registration) {
      throw new Error(`Command not found: ${name}`)
    }
    registration.handler(...args)
  }

  /**
   * 注册命令
   * @param name 命令名称
   * @param handler 命令处理函数
   * @param stateQuery 命令状态查询函数（可选）
   * @param valueQuery 命令值查询函数（可选）
   */
  register(
    name: string,
    handler: CommandHandler,
    stateQuery?: CommandStateQuery,
    valueQuery?: CommandValueQuery
  ): void {
    this.commands.set(name, { handler, stateQuery, valueQuery })
  }

  /**
   * 注销命令
   * @param name 命令名称
   */
  unregister(name: string): void {
    this.commands.delete(name)
  }

  /**
   * 检查命令是否已注册
   * @param name 命令名称
   */
  has(name: string): boolean {
    return this.commands.has(name)
  }

  /**
   * 查询命令状态
   * @param name 命令名称
   * @returns 命令是否可用/激活
   */
  queryState(name: string, ...args: any[]): boolean {
    const registration = this.commands.get(name)
    if (!registration) {
      return false
    }
    return registration.stateQuery ? registration.stateQuery(...args) : true
  }

  /**
   * 查询命令值
   * @param name 命令名称
   * @returns 命令当前值
   */
  queryValue(name: string, ...args: any[]): string {
    const registration = this.commands.get(name)
    if (!registration || !registration.valueQuery) {
      return ''
    }
    return registration.valueQuery(...args)
  }

  /**
   * 获取所有已注册的命令名称
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys())
  }

  /**
   * 清空所有命令
   */
  clear(): void {
    this.commands.clear()
  }
}
