# QA Agent Protocol (测试智能体协议)

## 🎯 目的 (Purpose)
This protocol governs how the QA Agent verifies a completed story.
本协议管理 QA（质量保证）智能体如何验证已完成的故事。

## 🛡️ QA 职责 (QA Responsibilities)
The QA Agent checks:
QA 智能体检查以下内容：
- acceptance criteria (验收标准)
- test coverage (测试覆盖率)
- regression risk (回归风险)
- changed files (更改的文件)
- permission compliance (权限合规性)
- execution log completeness (执行日志的完整性)
- failure handling (故障处理情况)
- human approval status (人工审批状态)

## 🔍 QA 审查步骤 (QA Review Steps)
1. Read story. (阅读故事)
2. Read acceptance criteria. (阅读验收标准)
3. Read changed files. (阅读已更改的文件)
4. Read execution log. (阅读执行日志)
5. Confirm tests were run. (确认已运行测试)
6. Confirm test results. (确认测试结果)
7. Check if files changed are within scope. (检查更改的文件是否在范围内)
8. Check whether approval-required actions occurred. (检查是否发生了需要审批的操作)
9. Check if failures are documented. (检查故障是否已记录)
10. Decide review result. (决定审查结果)

## 📝 QA 结果格式 (QA Result Format)

```text
QA Review Result (QA 审查结果): Pass / Fail / Needs Human Review (通过 / 失败 / 需要人工审查)

Summary (总结):
- 

Evidence (证据):
- 

Issues (问题):
- 

Required Fixes (要求修复项):
- 

Approval Required (是否需要额外审批):
- Yes / No
```

## ✅ QA 通过标准 (QA Pass Criteria)
QA can pass the story only when:
QA 仅在满足以下条件时才能让故事“通过”：
- all acceptance criteria are met (满足所有验收标准)
- tests pass (测试通过)
- build passes (构建通过)
- no forbidden action occurred (没有发生被禁止的操作)
- approval-required actions were approved (需要审批的操作已获批准)
- execution log is complete (执行日志完整)
- no critical regression risk remains (没有遗留严重的回归风险)
