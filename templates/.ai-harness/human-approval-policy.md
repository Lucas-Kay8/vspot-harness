# Human Approval Policy (人工审批策略)

## 🎯 目的 (Purpose)
This file defines when human approval is required.
本文件定义了何时需要人工审批。

## ⚠️ 需要审批的场景 (Approval Required For)
- security-sensitive changes (安全敏感更改)
- authentication changes (认证更改)
- authorization changes (授权更改)
- payment or billing changes (支付或计费更改)
- database schema changes (数据库模式更改)
- production configuration changes (生产配置更改)
- dependency installation (依赖安装)
- deployment (部署)
- external communication (外部通信)
- large refactors (大型重构)
- changes outside story scope (超出故事范围的更改)

## 📝 审批请求格式 (Approval Format)
The agent must request approval using this format:
智能体必须使用以下格式请求审批：

```text
Approval Required (需要审批)
--------------------------
Action (操作): 
Reason (原因): 
Risk (风险评估): 
Files affected (受影响的文件): 
Alternatives (替代方案): 
Recommended option (推荐选项): 
```

## 👩‍💻 审批结果 (Approval Result)
Human owner must respond with one of:
人类所有者必须以下列选项之一进行回应：
- **Approved (已批准)**
- **Rejected (已拒绝)**
- **Approved with changes (修改后批准)**
- **Need more information (需要更多信息)**

## 📚 审批日志记录 (Approval Logging)
All approvals must be recorded in:
所有审批必须记录在以下文件中：
`.ai-harness/execution-log.md`

## 🛑 默认规则 (Default Rule)
No response means no approval. 
**没有得到回应意味着没有获得批准。**
