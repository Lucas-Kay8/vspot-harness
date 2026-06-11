import * as fs from 'fs';
import * as path from 'path';

export interface AuditEvent {
  ts: string;
  type: string;
  actor: string;
  [key: string]: any;
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
   * 追加写入一条结构化事件
   */
  public logEvent(type: string, data: Record<string, any> = {}, actor: string = 'agent:dev'): void {
    const event: AuditEvent = {
      ts: new Date().toISOString(),
      type,
      actor,
      ...data
    };

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
          // 若解析失败则返回一个破坏的事件，或者忽略
          return {
            ts: new Date().toISOString(),
            type: 'corrupted',
            actor: 'system',
            raw: line
          };
        }
      });
  }
}
