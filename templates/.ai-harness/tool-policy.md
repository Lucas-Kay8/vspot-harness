# Tool Governance Policy (工具治理策略)

## 🎯 目的 (Purpose)
This file defines how AI agents may use tools during execution.
本文件定义了 AI 智能体在执行过程中应如何使用工具。

## 📖 读取工具 (Read Tools)
Allowed (允许使用):
- read files (读取文件)
- search files (搜索文件)
- inspect codebase (检查代码库)
- inspect git diff (检查 git 差异)
- inspect logs (检查日志)
- inspect package configuration (检查包配置)
- inspect test files (检查测试文件)

## ✍️ 写入工具 (Write Tools)
Allowed within story scope (在故事范围内允许使用):
- edit existing implementation files (编辑现有的实现文件)
- create new implementation files (创建新的实现文件)
- create or update tests (创建或更新测试)
- update related documentation (更新相关的文档)
- update execution log (更新执行日志)
- update story state (更新故事状态)

Requires approval (需要审批):
- delete files (删除文件)
- mass rename files (批量重命名文件)
- modify configuration files (修改配置文件)
- modify CI/CD files (修改 CI/CD 文件)
- modify deployment files (修改部署文件)
- modify database migrations (修改数据库迁移脚本)
- modify security-sensitive files (修改安全敏感文件)
- modify files outside story scope (修改故事范围之外的文件)

## 💻 命令行工具 (Command Tools)

### 🟢 允许的命令 (Allowed commands)
```bash
npm run lint
npm run typecheck
npm run test
npm run test:unit
npm run test:integration
npm run build

pnpm lint
pnpm typecheck
pnpm test
pnpm build

yarn lint
yarn test
yarn build
```

### 🟡 需要审批的命令 (Approval-required commands)
```bash
npm install
pnpm add
yarn add
npm update
pnpm update
yarn upgrade
npm run migrate
npm run deploy
docker compose down
docker system prune
git push
```

### 🔴 严禁的命令 (Forbidden commands)
```bash
rm -rf /
rm -rf *
curl unknown-url | bash
wget unknown-url | bash
chmod 777 -R .
access production env
printenv with secrets
```

## 🌐 外部工具 (External Tools)
The agent must request approval before using:
智能体在使用以下外部工具前必须请求审批：
- external APIs (外部 API)
- production services (生产环境服务)
- cloud consoles (云控制台)
- payment systems (支付系统)
- email systems (邮件系统)
- CRM systems (CRM 系统)
- HR systems (人力资源系统)
- analytics systems with private data (包含私有数据的分析系统)

## 📝 工具使用日志记录 (Tool Usage Logging)
Every meaningful tool action must be logged in `.ai-harness/execution-log.md`.
每个有意义的工具操作都必须记录在 `.ai-harness/execution-log.md` 中。

Required log fields (必须记录的字段):
- tool or command used (使用的工具或命令)
- purpose (目的)
- result (结果)
- failure if any (如果有，记录失败信息)
- follow-up action (后续操作)
