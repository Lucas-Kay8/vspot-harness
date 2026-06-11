# Permission Check Command (权限检查指令)

## 🎯 目的 (Purpose)
This command checks whether planned agent actions are allowed.
此命令用于检查智能体计划执行的操作是否被允许。

## 📥 输入 (Input)
The agent must provide:
智能体必须提供：
- planned action (计划执行的操作)
- files affected (受影响的文件)
- commands needed (需要运行的命令)
- external systems involved (涉及的外部系统)
- expected risk level (预期的风险级别)

## ⚖️ 决策规则 (Decision Rules)
Return one of (返回以下结果之一):

```text
Allowed (允许)
Approval Required (需要审批)
Forbidden (禁止)
Need More Information (需要更多信息)
```

## 📝 输出格式 (Output Format)
```text
Permission Result (权限检查结果):

Action (操作):
Files (涉及文件):
Commands (涉及命令):
Risk (风险评估):

Decision (决定): [Allowed / Approval Required / Forbidden / Need More Information]
Reason (原因):
Required Approval (谁需要审批，如果需要的话): 
```
