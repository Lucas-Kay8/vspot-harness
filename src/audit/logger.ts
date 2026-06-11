import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface AuditEvent {
  ts: string;
  type: string;
  actor: string;
  hash?: string;
  previous_hash?: string;
  [key: string]: any;
}

/**
 * 根据上一条哈希与当前事件载荷（剔除自身的 hash/previous_hash 属性）计算级联哈希
 */
export function calculateEventHash(previousHash: string, event: AuditEvent): string {
  const { hash, previous_hash, ...payload } = event;
  // 对 payload 进行固定的 key 排序，以确保跨环境计算的确定性
  const orderedPayload: Record<string, any> = {};
  Object.keys(payload).sort().forEach(key => {
    orderedPayload[key] = payload[key];
  });
  
  const dataStr = previousHash + JSON.stringify(orderedPayload);
  return crypto.createHash('sha256').update(dataStr).digest('hex');
}

export class AuditLogger {
  private logFilePath: string;

  constructor(runDir: string) {
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    this.logFilePath = path.join(runDir, 'events.jsonl');
  }

  /**
   * 追加写入一条含 SHA256 级联哈希签名的事件记录
   */
  public logEvent(type: string, data: Record<string, any> = {}, actor: string = 'agent:dev'): void {
    const events = this.getEvents();
    let previousHash = '';
    if (events.length > 0) {
      previousHash = events[events.length - 1].hash || '';
    }

    const event: AuditEvent = {
      ts: new Date().toISOString(),
      type,
      actor,
      ...data
    };

    const hash = calculateEventHash(previousHash, event);
    event.previous_hash = previousHash;
    event.hash = hash;

    const line = JSON.stringify(event) + '\n';
    fs.appendFileSync(this.logFilePath, line, 'utf8');
  }

  /**
   * 获取所有事件
   */
  public getEvents(): AuditEvent[] {
    if (!fs.existsSync(this.logFilePath)) {
      return [];
    }

    const content = fs.readFileSync(this.logFilePath, 'utf8');
    return content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        try {
          return JSON.parse(line) as AuditEvent;
        } catch (err) {
          return {
            ts: new Date().toISOString(),
            type: 'corrupted',
            actor: 'system',
            raw: line
          };
        }
      });
  }

  /**
   * 验证审计事件日志的密码学完整性（防止 AI Agent 暗中删除或篡改日志）
   */
  public verifyIntegrity(): { valid: boolean; errorIndex?: number; message?: string } {
    const events = this.getEvents();
    if (events.length === 0) {
      return { valid: true };
    }

    let expectedPreviousHash = '';
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // 1. 检测是否包含 corrupted 标记
      if (event.type === 'corrupted') {
        return {
          valid: false,
          errorIndex: i,
          message: `日志在第 ${i} 行遭到破坏，无法解析 JSON 格式。`
        };
      }

      // 2. 校验 previous_hash 链条连续性
      if (event.previous_hash !== expectedPreviousHash) {
        return {
          valid: false,
          errorIndex: i,
          message: `日志哈希链条断裂：第 ${i} 行 previous_hash (${event.previous_hash}) 与前一行计算值 (${expectedPreviousHash}) 不匹配。`
        };
      }

      // 3. 校验本行 SHA256 哈希值
      const calculatedHash = calculateEventHash(expectedPreviousHash, event);
      if (event.hash !== calculatedHash) {
        return {
          valid: false,
          errorIndex: i,
          message: `日志行内容已被修改：第 ${i} 行载荷计算哈希值 (${calculatedHash}) 与记录哈希值 (${event.hash}) 不符。`
        };
      }

      expectedPreviousHash = event.hash;
    }

    return { valid: true };
  }
}
