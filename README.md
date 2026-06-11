# VSPOT Harness

**(中文 / English)**

> Policy-driven execution governance for AI coding agents.
> 面向 AI 编程智能体的策略驱动执行治理工具。

VSPOT Harness verifies scope, permissions, evidence, approvals, and audit records before an AI-assisted change can be marked complete.

Compatible with **BMad Method v6.8+**. Independent community project; not affiliated with or endorsed by BMad Code, LLC. BMad and BMad Method are trademarks of BMad Code, LLC.

---

## 🌟 为什么存在这个项目？ (Why This Exists)

[BMad Method](https://github.com/bmad-code-org/BMAD-METHOD) 在帮助 AI 智能体规划软件开发方面表现出色。然而，**仅仅有规划是不够的。**

当 AI 智能体开始执行代码更改时，研发团队需要：
- 验证门禁 (Verification gates)
- 权限边界 (Permission boundaries)
- 工具使用策略 (Tool policies)
- 任务状态追踪 (Story state tracking)
- 故障归因机制 (Failure attribution)
- 执行日志 (Execution logs)
- 人工审批检查点 (Human approval checkpoints)

**VSPOT Harness 补充了这一缺失的“执行治理层”。**

一句话总结：
> BMad Method 负责规划与构建。VSPOT Harness 提供可验证的执行治理门禁，结合平台权限和 CI，阻止不合规变更进入主分支。

---

## 🌟 Why This Exists

The [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD) is great at helping AI agents plan software development.
**But planning is not enough.**

When AI agents execute code changes, teams need:
- verification gates
- permission boundaries
- tool policies
- story state tracking
- failure attribution
- execution logs
- human approval checkpoints

**VSPOT Harness adds that missing execution governance layer.**

In short:
> BMad helps agents plan and build. VSPOT Harness provides verifiable execution gates that, when paired with platform permissions and CI, prevent non-compliant changes from entering the main branch.

## 📖 核心理念 (Core Philosophy)

AI 编程不应被视为一个“黑盒”对话。一个可用于生产环境的 AI 开发工作流应该是：
> Planned (已计划) → Scoped (范围明确) → Permission-aware (权限感知) → Tool-governed (工具治理) → State-tracked (状态追踪) → Verified (已验证) → Reviewed (已审查)

我们称之为 **VSPOT 模型** (Verification, State, Permission, Observability, Tool Governance)。详细架构请参考 [docs/philosophy.md](docs/philosophy.md)。

## ⚠️ 实验性声明 (Experimental / Alpha)

本工具目前处于 MVP 架构演进阶段（正从纯文本规则迁移至基于 Schema 的机器可读策略引擎）。当前处于 Alpha 阶段，API 和配置格式可能随时变化。

## 📄 许可证 (License)

MIT License. See [LICENSE](LICENSE) for details.
