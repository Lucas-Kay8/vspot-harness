export interface CapabilityMapping {
  platform: string;
  capabilities: Record<string, string>;
}

const BUILTIN_ADAPTERS: Record<string, Record<string, string>> = {
  'claude-code': {
    'view_file': 'filesystem.read',
    'edit_file': 'filesystem.write',
    'write_file': 'filesystem.write',
    'apply_patch': 'filesystem.write',
    'execute_command': 'shell.execute',
    'grep': 'filesystem.read',
    'glob': 'filesystem.read'
  },
  'cursor': {
    'read_file': 'filesystem.read',
    'write_file': 'filesystem.write',
    'edit_file': 'filesystem.write',
    'apply_patch': 'filesystem.write',
    'run_command': 'shell.execute'
  }
};

export class PlatformAdapterManager {
  private adapters: Record<string, Record<string, string>>;

  constructor() {
    this.adapters = { ...BUILTIN_ADAPTERS };
  }

  /**
   * 将具体的平台工具名翻译成 VSPOT 标准抽象能力名称
   */
  public translateAction(platform: string, rawAction: string): string {
    const p = platform.toLowerCase().trim();
    const adapter = this.adapters[p];
    if (!adapter) {
      return rawAction;
    }
    return adapter[rawAction] || rawAction;
  }

  /**
   * 支持通过 JSON 配置自定义加载平台映射规则
   */
  public loadCustomAdapter(platform: string, mapping: Record<string, string>): void {
    const p = platform.toLowerCase().trim();
    this.adapters[p] = {
      ...(this.adapters[p] || {}),
      ...mapping
    };
  }
}
export const adapterManager = new PlatformAdapterManager();
