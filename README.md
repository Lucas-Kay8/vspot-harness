# BMad Harness Extension 

**(中文 / English)**

## 🌟 为什么存在这个项目？ (Why This Exists)

[BMad Method](https://github.com/bmad-app/bmad-method) 在帮助 AI 智能体规划软件开发（如需求文档、架构设计、史诗任务拆解等）方面表现出色。然而，**仅仅有规划是不够的。**

当 AI 智能体开始执行代码更改时，研发团队需要：
- 验证门禁 (Verification gates)
- 权限边界 (Permission boundaries)
- 工具使用策略 (Tool policies)
- 任务状态追踪 (Story state tracking)
- 故障归因机制 (Failure attribution)
- 执行日志 (Execution logs)
- 人工审批检查点 (Human approval checkpoints)

**BMad Harness Extension 补充了这一缺失的“执行治理层”。** 

一句话总结：
> BMad Method 负责规划与构建。BMad Harness 负责安全执行、验证结果，并留下可审计的追踪记录。

---

## 🌟 Why This Exists

The [BMad Method](https://github.com/bmad-app/bmad-method) is great at helping AI agents plan software development (e.g., PRDs, architecture, epics, stories). 
**But planning is not enough.**

When AI agents execute code changes, teams need:
- verification gates
- permission boundaries
- tool policies
- story state tracking
- failure attribution
- execution logs
- human approval checkpoints

**This project adds that missing execution governance layer.**

In short:
> BMad helps agents plan and build. BMad Harness helps agents execute safely, verify results, and leave auditable traces.

## 📦 如何使用 (How to Use)

本仓库提供了一系列 Markdown 模板和协议。要使用它们，只需将 `templates/` 目录下的 `.ai-harness/` 和 `commands/` 文件夹复制到你自己的项目根目录中。

*These templates act as rules and context for your AI coding agents (like Cursor, Windsurf, Claude Code, etc).*

This repository provides a set of Markdown templates and protocols. To use them, simply copy the `.ai-harness/` and `commands/` folders from the `templates/` directory into the root of your own project. 

*These templates act as rules and context for your AI coding agents (like Cursor, Windsurf, Claude Code, etc).*

## 📖 核心理念 (Core Philosophy)

AI 编程不应被视为一个“黑盒”对话。一个可用于生产环境的 AI 开发工作流应该是：
> Planned (已计划) → Scoped (范围明确) → Permission-aware (权限感知) → Tool-governed (工具治理) → State-tracked (状态追踪) → Verified (已验证) → Reviewed (已审查)

我们称之为 **VSPOT 模型** (Verification, State, Permission, Observability, Tool Governance)。

---

AI coding should not be treated as a black-box conversation. A production-ready AI development workflow should be:
> Planned → Scoped → Permission-aware → Tool-governed → State-tracked → Verified → Reviewed

We call this the **VSPOT Framework** (Verification, State, Permission, Observability, Tool Governance).

## 📄 许可证 (License)

MIT License. See [LICENSE](LICENSE) for details.
