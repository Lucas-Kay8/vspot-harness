# AI Agent Permission Policy (AI 智能体权限策略)

## 🎯 目的 (Purpose)
This file defines what AI agents are allowed to do, what requires human approval, and what is forbidden.
本文件定义了允许 AI 智能体执行的操作、需要人类审批的操作以及被禁止的操作。

## 🟢 免审批允许 (Allowed Without Approval)
AI agents may perform the following actions without additional approval:
AI 智能体无需额外审批即可执行以下操作：
- read project files (读取项目文件)
- search the codebase (搜索代码库)
- inspect git diff (检查 git 差异)
- inspect local logs (检查本地日志)
- create new files within the current story scope (在当前故事范围内创建新文件)
- edit files within the current story scope (在当前故事范围内编辑文件)
- create or update test files related to the current story (创建或更新与当前故事相关的测试文件)
- update documentation related to the current story (更新与当前故事相关的文档)
- run local verification commands (运行本地验证命令)
- run lint commands (运行 lint 检查)
- run typecheck commands (运行类型检查)
- run unit tests (运行单元测试)
- run integration tests (运行集成测试)
- run build commands (运行构建命令)

## 🟡 需要人工审批 (Requires Human Approval)
AI agents must request human approval before performing the following actions:
AI 智能体在执行以下操作前**必须**请求人类审批：
- delete files (删除文件)
- rename many files (批量重命名文件)
- modify database schema (修改数据库模式/Schema)
- modify authentication logic (修改认证鉴权逻辑)
- modify authorization logic (修改授权逻辑)
- modify payment or billing logic (修改支付或计费逻辑)
- modify production configuration (修改生产环境变量配置)
- modify deployment configuration (修改部署配置)
- add new third-party dependencies (添加新的第三方依赖)
- update major dependency versions (更新依赖的大版本)
- touch more than 10 files (修改超过 10 个文件)
- refactor unrelated modules (重构无关的模块)
- change public API contracts (更改公共 API 契约)
- change data migration logic (更改数据迁移逻辑)
- change encryption or security-sensitive logic (更改加密或安全敏感的逻辑)
- access external services (访问外部服务 API)
- send emails or notifications (发送电子邮件或通知)
- push commits to remote repository (向远程仓库推送代码)
- deploy to any environment (部署到任何环境)

## 🔴 严禁操作 (Forbidden Actions)
AI agents must never perform the following actions:
AI 智能体**绝不可**执行以下操作：
- access production secrets (访问生产环境的机密信息/Secret)
- expose private keys (暴露私钥)
- modify billing data directly (直接修改计费数据)
- bypass tests (跳过测试)
- disable security checks (禁用安全检查)
- remove audit logs (删除审计日志)
- execute unknown shell scripts from the internet (执行来自互联网的未知 Shell 脚本)
- run destructive commands (运行破坏性命令)
- deploy to production automatically (自动部署到生产环境)
- send external customer communications automatically (自动向外部客户发送通信信息)
- modify legal, compliance, or financial records without approval (未经批准修改法律、合规或财务记录)

## ⚠️ 高风险文件模式 (High-Risk File Patterns)
The following files or directories are considered high-risk:
以下文件或目录被视为高风险：
```text
.env
.env.*
secrets.*
credentials.*
config/production.*
migrations/
auth/
billing/
payments/
permissions/
security/
deploy/
infra/
```

## 🛡️ 默认行为 (Default Behavior)
When an action is not clearly allowed, the agent must treat it as approval-required.
当某项操作没有被明确允许时，智能体**必须将其视为需要审批**的操作。
