import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import { minimatch } from 'minimatch';
import { adapterManager } from '../adapters/manager';

export type Decision = 'allow' | 'require_approval' | 'deny' | 'needs_review';

export interface DecisionResult {
  decision: Decision;
  ruleId?: string;
  reason: string;
  approver?: string;
}

export interface PathRule {
  id: string;
  match: string[];
  read?: Decision;
  write?: Decision;
  approver?: string;
}

export interface CommandRule {
  id: string;
  match: string[];
  decision: Decision;
  approver?: string;
  constraints?: {
    network?: boolean;
    environment?: string;
  };
}

export interface Policy {
  version: number;
  defaults?: {
    unknown_action?: Decision;
    unknown_external_system?: Decision;
  };
  scope?: {
    max_changed_files?: number;
    outside_scope?: Decision;
  };
  paths?: PathRule[];
  commands?: CommandRule[];
  gates?: {
    required?: string[];
  };
}

const DECISION_PRIORITY: Record<Decision, number> = {
  deny: 4,
  require_approval: 3,
  needs_review: 2,
  allow: 1
};

export class PolicyEngine {
  private policy: Policy;
  private ajv: Ajv;

  constructor(policyPath: string) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.policy = this.loadAndValidate(policyPath);
  }

  private loadAndValidate(policyPath: string): Policy {
    if (!fs.existsSync(policyPath)) {
      throw new Error(`策略文件不存在: ${policyPath}`);
    }

    let parsed: any;
    try {
      const content = fs.readFileSync(policyPath, 'utf8');
      parsed = yaml.load(content);
    } catch (err: any) {
      throw new Error(`无法解析 YAML 策略文件: ${err.message}`);
    }

    // 加载 schema
    const schemaPath = path.resolve(__dirname, '../../schemas/harness-policy.schema.json');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema 文件不存在，无法校验策略: ${schemaPath}`);
    }

    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);

    const validate = this.ajv.compile(schema);
    const valid = validate(parsed);

    if (!valid) {
      const errors = validate.errors
        ? validate.errors.map(e => `${e.instancePath} ${e.message}`).join(', ')
        : '未知 Schema 错误';
      throw new Error(`策略不符合 Schema 定义: ${errors}`);
    }

    return parsed as Policy;
  }

  public getPolicy(): Policy {
    return this.policy;
  }

  /**
   * 评估文件访问策略
   * 规则：如果多个规则匹配，取最严格的决策 (DENY > REQUIRE_APPROVAL > NEEDS_REVIEW > ALLOW)
   */
  public evaluateFileAccess(filePath: string, mode: 'read' | 'write'): DecisionResult {
    const defaultDecision = this.policy.defaults?.unknown_action || 'require_approval';
    
    // 标准化相对路径，避免 ./ 或绝对路径带来的匹配误差
    let targetPath = filePath;
    if (path.isAbsolute(filePath)) {
      // 尽可能转化为相对路径进行模式匹配，如果是外部路径则另外处理
      targetPath = path.relative(process.cwd(), filePath);
    }

    const matchedRules: { rule: PathRule; decision: Decision }[] = [];

    if (this.policy.paths) {
      for (const rule of this.policy.paths) {
        let isMatched = false;
        for (const pattern of rule.match) {
          if (minimatch(targetPath, pattern, { dot: true })) {
            isMatched = true;
            break;
          }
        }

        if (isMatched) {
          const ruleDecision = mode === 'read' ? rule.read : rule.write;
          if (ruleDecision) {
            matchedRules.push({ rule, decision: ruleDecision });
          }
        }
      }
    }

    if (matchedRules.length === 0) {
      return {
        decision: defaultDecision,
        reason: `没有匹配的路径规则，采用默认的未知操作策略: ${defaultDecision}`
      };
    }

    // 找到最严格的决策
    matchedRules.sort((a, b) => DECISION_PRIORITY[b.decision] - DECISION_PRIORITY[a.decision]);
    const worstCase = matchedRules[0];

    return {
      decision: worstCase.decision,
      ruleId: worstCase.rule.id,
      reason: `匹配路径规则 [${worstCase.rule.id}] (模式: ${worstCase.rule.match.join(', ')})`,
      approver: worstCase.rule.approver
    };
  }

  /**
   * 评估命令执行策略
   * 规则：如果多个规则匹配，取最严格的决策
   */
  public evaluateCommand(command: string): DecisionResult {
    const defaultDecision = this.policy.defaults?.unknown_action || 'require_approval';
    const trimmedCommand = command.trim();
    const matchedRules: { rule: CommandRule; decision: Decision }[] = [];

    if (this.policy.commands) {
      for (const rule of this.policy.commands) {
        let isMatched = false;
        for (const pattern of rule.match) {
          // 对整个命令字符串进行 glob 匹配
          if (minimatch(trimmedCommand, pattern, { dot: true, matchBase: true })) {
            isMatched = true;
            break;
          }
        }

        if (isMatched) {
          matchedRules.push({ rule, decision: rule.decision });
        }
      }
    }

    if (matchedRules.length === 0) {
      return {
        decision: defaultDecision,
        reason: `没有匹配的命令规则，采用默认的未知操作策略: ${defaultDecision}`
      };
    }

    // 按照决策优先级排序，优先选取严格程度最高的
    matchedRules.sort((a, b) => DECISION_PRIORITY[b.decision] - DECISION_PRIORITY[a.decision]);
    const worstCase = matchedRules[0];

    return {
      decision: worstCase.decision,
      ruleId: worstCase.rule.id,
      reason: `匹配命令规则 [${worstCase.rule.id}] (模式: ${worstCase.rule.match.join(', ')})`,
      approver: worstCase.rule.approver
    };
  }

  /**
   * 基于平台适配器评估工具/操作策略
   */
  public evaluatePlatformAction(
    platform: string,
    action: string,
    target: { file?: string; command?: string } = {}
  ): DecisionResult {
    // 翻译动作名称为标准 VSPOT 能力
    const stdCapability = adapterManager.translateAction(platform, action);

    switch (stdCapability) {
      case 'filesystem.read':
        if (!target.file) {
          return {
            decision: 'deny',
            reason: `平台动作映射到 filesystem.read，但缺少文件路径。`
          };
        }
        return this.evaluateFileAccess(target.file, 'read');

      case 'filesystem.write':
        if (!target.file) {
          return {
            decision: 'deny',
            reason: `平台动作映射到 filesystem.write，但缺少文件路径。`
          };
        }
        return this.evaluateFileAccess(target.file, 'write');

      case 'shell.execute':
        if (!target.command) {
          return {
            decision: 'deny',
            reason: `平台动作映射到 shell.execute，但缺少 Shell 命令参数。`
          };
        }
        return this.evaluateCommand(target.command);

      default:
        // 若没有映射到这三类标准执行动作（比如其它不产生副作用的动作），则返回默认的未知操作决策
        const defaultDecision = this.policy.defaults?.unknown_action || 'require_approval';
        return {
          decision: defaultDecision,
          reason: `未识别的平台操作 "${action}" (被译为: "${stdCapability}")，采用默认决策。`
        };
    }
  }
}
