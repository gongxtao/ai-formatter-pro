/**
 * PluginManager - 插件管理器
 *
 * 负责插件的注册、激活、停用和生命周期管理
 */

import type {
  Plugin,
  PluginInstance,
  PluginState,
  EditorAPI,
  CommandExtension,
  EventListenerExtension
} from './types'
import type { EventBus } from './EventBus'

export class PluginManager {
  private plugins = new Map<string, PluginInstance>()
  private api: EditorAPI
  private eventBus: EventBus
  private commandUnregisterFns = new Map<string, () => void>()

  constructor(api: EditorAPI, eventBus: EventBus) {
    this.api = api
    this.eventBus = eventBus
  }

  /**
   * 注册插件
   * @param plugin 插件对象
   * @param config 插件配置
   */
  async register<TConfig>(plugin: Plugin<TConfig>, config?: TConfig): Promise<void> {
    // 检查插件是否已注册
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`)
    }

    // 检查依赖
    await this.checkDependencies(plugin)

    // 创建插件实例
    const instance: PluginInstance = {
      plugin,
      config,
      state: 'registered'
    }

    this.plugins.set(plugin.name, instance)

    // 调用插件的 install 方法
    try {
      await plugin.install(this.api, config)
    } catch (error) {
      // 安装失败，清理并抛出错误
      this.plugins.delete(plugin.name)
      throw new Error(`Failed to install plugin "${plugin.name}": ${error}`)
    }

    // 注册扩展
    if (plugin.extends) {
      await this.registerExtensions(plugin, plugin.extends)
    }

    // 触发插件加载事件
    this.eventBus.emit('plugin-load', plugin)
  }

  /**
   * 注销插件
   * @param name 插件名称
   */
  async unregister(name: string): Promise<void> {
    const instance = this.plugins.get(name)
    if (!instance) {
      throw new Error(`Plugin not found: ${name}`)
    }

    // 如果插件是激活状态，先停用
    if (instance.state === 'active') {
      await this.deactivate(name)
    }

    // 调用插件的 uninstall 方法
    try {
      await instance.plugin.uninstall?.()
    } catch (error) {
      console.error(`Error uninstalling plugin "${name}":`, error)
    }

    // 注销扩展
    if (instance.plugin.extends) {
      await this.unregisterExtensions(instance.plugin)
    }

    // 移除插件
    this.plugins.delete(name)

    // 清理命令注销函数
    this.commandUnregisterFns.delete(name)

    // 触发插件卸载事件
    this.eventBus.emit('plugin-unload', instance.plugin)
  }

  /**
   * 激活插件
   * @param name 插件名称
   */
  async activate(name: string): Promise<void> {
    const instance = this.plugins.get(name)
    if (!instance) {
      throw new Error(`Plugin not found: ${name}`)
    }

    if (instance.state !== 'registered') {
      throw new Error(`Plugin is not in registered state: ${name}`)
    }

    // 调用插件的 activate 方法
    try {
      await instance.plugin.activate?.()
    } catch (error) {
      console.error(`Error activating plugin "${name}":`, error)
      throw error
    }

    instance.state = 'active'

    // 触发插件激活事件
    this.eventBus.emit('plugin-activate', instance.plugin)
  }

  /**
   * 停用插件
   * @param name 插件名称
   */
  async deactivate(name: string): Promise<void> {
    const instance = this.plugins.get(name)
    if (!instance) {
      throw new Error(`Plugin not found: ${name}`)
    }

    if (instance.state !== 'active') {
      throw new Error(`Plugin is not active: ${name}`)
    }

    // 调用插件的 deactivate 方法
    try {
      await instance.plugin.deactivate?.()
    } catch (error) {
      console.error(`Error deactivating plugin "${name}":`, error)
      throw error
    }

    instance.state = 'registered'

    // 触发插件停用事件
    this.eventBus.emit('plugin-deactivate', instance.plugin)
  }

  /**
   * 获取插件
   * @param name 插件名称
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).map((p) => p.plugin)
  }

  /**
   * 获取插件实例
   * @param name 插件名称
   */
  getPluginInstance(name: string): PluginInstance | undefined {
    return this.plugins.get(name)
  }

  /**
   * 检查插件是否已注册
   * @param name 插件名称
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * 检查插件是否已激活
   * @param name 插件名称
   */
  isPluginActive(name: string): boolean {
    return this.plugins.get(name)?.state === 'active'
  }

  /**
   * 获取插件状态
   * @param name 插件名称
   */
  getPluginState(name: string): PluginState | undefined {
    return this.plugins.get(name)?.state
  }

  /**
   * 获取所有插件名称
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys())
  }

  /**
   * 私有方法：检查依赖
   */
  private async checkDependencies(plugin: Plugin): Promise<void> {
    const { dependencies = [], peerDependencies = [] } = plugin

    // 检查必须的依赖
    for (const dep of dependencies) {
      if (!this.hasPlugin(dep)) {
        throw new Error(
          `Plugin "${plugin.name}" requires plugin "${dep}" to be installed first`
        )
      }
    }

    // 检查可选的依赖（只警告）
    for (const dep of peerDependencies) {
      if (!this.hasPlugin(dep)) {
        console.warn(
          `Plugin "${plugin.name}" recommends plugin "${dep}" to be installed`
        )
      }
    }
  }

  /**
   * 私有方法：注册扩展
   */
  private async registerExtensions(
    plugin: Plugin,
    extensions: any
  ): Promise<void> {
    const unregisterFns: Array<() => void> = []

    // 注册命令
    if (extensions.commands) {
      for (const [name, command] of Object.entries(extensions.commands)) {
        const cmd = command as CommandExtension
        this.api.commands.register(name, cmd.execute, cmd.queryState, cmd.queryValue)
        unregisterFns.push(() => this.api.commands.unregister(name))
      }
    }

    // 注册事件监听器
    if (extensions.eventListeners) {
      for (const listener of extensions.eventListeners) {
        const off = this.eventBus.on(listener.event, listener.handler)
        unregisterFns.push(off)
      }
    }

    // 存储注销函数
    if (unregisterFns.length > 0) {
      this.commandUnregisterFns.set(plugin.name, () => {
        unregisterFns.forEach(fn => fn())
      })
    }
  }

  /**
   * 私有方法：注销扩展
   */
  private async unregisterExtensions(plugin: Plugin): Promise<void> {
    const unregister = this.commandUnregisterFns.get(plugin.name)
    if (unregister) {
      unregister()
      this.commandUnregisterFns.delete(plugin.name)
    }

    // 注销事件监听器
    if (plugin.extends?.eventListeners) {
      for (const listener of plugin.extends.eventListeners) {
        this.eventBus.off(listener.event, listener.handler as any)
      }
    }
  }
}
