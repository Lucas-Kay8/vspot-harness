# Core Philosophy: The VSPOT Framework
*(核心理念：VSPOT 框架)*

AI coding should not be treated as a black-box conversation. 
AI 编程不应被视为一个“黑盒”对话。

A production-ready AI development workflow should be:
一个可用于生产环境的 AI 开发工作流应该是：

> Planned → Scoped → Permission-aware → Tool-governed → State-tracked → Verified → Reviewed
> 已计划 → 范围明确 → 权限感知 → 工具治理 → 状态追踪 → 已验证 → 已审查

BMad Harness Extension introduces five execution governance layers, forming the **VSPOT** framework:
BMad Harness Extension 引入了五个执行治理层，构成了 **VSPOT** 框架：

## 1. V - Verification (验证)
AI completion is not accepted by simple statement ("I have finished the task"). Completion must be verified by objective gates.
AI 的“完成”不能仅仅通过它自己的一句声明（“我已经完成了任务”）来接受。任务完成必须通过客观的关卡来验证。
- Tests passed (测试通过)
- Build passed (构建通过)
- Lint passed (代码风格检查通过)
- Acceptance criteria met (满足验收标准)
- Scope respected (未超出修改范围)

## 2. S - State (状态)
AI agents need explicit state. Without state tracking, agents may repeat work, skip steps, lose context, claim completion too early, or fail to recover from errors.
AI 智能体需要显式的状态。如果没有状态追踪，智能体可能会重复工作、跳过步骤、丢失上下文、过早宣布完成，或者无法从错误中恢复。
- `story-state.json` maintains the explicit progress.
- `story-state.json` 维护着明确的进度。

## 3. P - Permission (权限)
AI agents must operate within clear boundaries. 
AI 智能体必须在清晰的边界内运行。
- Some actions are safe (e.g., reading files).
  某些操作是安全的（如读取文件）。
- Some require human approval (e.g., modifying auth logic).
  某些操作需要人工审批（如修改鉴权逻辑）。
- Some are forbidden (e.g., executing unknown scripts).
  某些操作是被禁止的（如执行未知脚本）。

## 4. O - Observability (可观测性)
Every meaningful agent action should leave a trace for human review and auditing.
智能体的每个有意义的操作都应该留下痕迹，以供人类审查和审计。
- Input documents used (使用的输入文档)
- Files changed (更改的文件)
- Tools & commands run (运行的工具和命令)
- Failures encountered & fixed (遇到的故障及修复方案)

## 5. T - Tool Governance (工具治理)
AI agents should not use tools freely without policy.
AI 智能体不应在没有策略限制的情况下随意使用工具。
- Allowed read/write tools (允许的读/写工具)
- Allowed commands (允许的命令)
- Approval-required commands (需要审批的命令)
- Forbidden commands (禁止的命令)
