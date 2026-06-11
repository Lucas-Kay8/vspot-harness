# Verification Gate Command (验证关卡指令)

## 🎯 目的 (Purpose)
This command checks whether a story can be marked as complete.
此命令用于检查故事是否可以标记为“完成”。

## 📥 必须提供的输入 (Required Inputs)
- current story (当前故事)
- acceptance criteria (验收标准)
- execution log (执行日志)
- changed files (已更改的文件)
- test results (测试结果)
- story state (故事状态)
- permission policy (权限策略)

## 📋 验证检查单 (Verification Checklist)
- [ ] Acceptance criteria are satisfied (满足验收标准)
- [ ] Required tests were run (运行了必需的测试)
- [ ] Tests passed (测试通过)
- [ ] Build passed (构建通过)
- [ ] Lint/typecheck passed (代码风格/类型检查通过)
- [ ] Changed files are within scope (更改的文件在故事范围内)
- [ ] No forbidden action occurred (没有发生被禁止的操作)
- [ ] Approval-required actions were approved (需要审批的操作已获得批准)
- [ ] Failures are documented (故障已记录)
- [ ] Execution log is complete (执行日志已完成)

## 📝 输出格式 (Output Format)
```text
Verification Result (验证结果): Pass / Fail / Needs Human Review (通过 / 失败 / 需要人工审查)

Passed (已通过的项目):
- 

Failed (失败的项目):
- 

Evidence (证据):
- 

Required Action (要求的后续操作):
- 
```
