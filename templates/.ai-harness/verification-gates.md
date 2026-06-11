# Verification Gates (验证关卡)

## Gate 1: Story Readiness (关卡 1：故事就绪检查)
Before implementation starts, confirm:
在开始编写代码之前，请确认：
- [ ] Story has clear acceptance criteria (故事有清晰的验收标准)
- [ ] Story has technical context (故事包含技术上下文)
- [ ] Story has bounded scope (故事范围有明确边界)
- [ ] Story has expected output (故事有预期的输出)
- [ ] Story has test requirements (故事定义了测试要求)
- [ ] Dependencies are identified (已识别依赖项)
- [ ] Risk level is assigned (已分配风险等级)
- [ ] Files likely to change are listed (已列出可能修改的文件列表)

## Gate 2: Permission Check (关卡 2：权限检查)
Before editing files, confirm:
在编辑文件之前，请确认：
- [ ] Files are within story scope (文件在故事允许的范围内)
- [ ] No forbidden files are touched (没有触碰被禁止访问的文件)
- [ ] No approval-required action is planned without approval (没有在未获批准的情况下计划需要审批的操作)
- [ ] No production secrets are accessed (没有访问生产环境机密)
- [ ] No external system is modified (没有修改外部系统)
- [ ] Risk level is acceptable (风险等级可接受)

## Gate 3: Implementation Check (关卡 3：代码实现检查)
After implementation, confirm:
代码实现完成后，请确认：
- [ ] Changed files match story scope (更改的文件与故事范围匹配)
- [ ] No unrelated refactor was performed (没有执行无关的重构)
- [ ] No forbidden file was touched (没有触碰被禁止访问的文件)
- [ ] No tests were removed to make implementation pass (没有为了让代码通过而删除测试)
- [ ] No security check was bypassed (没有绕过安全检查)
- [ ] Code follows existing project conventions (代码遵循现有的项目规范)

## Gate 4: Test Check (关卡 4：测试检查)
Before marking code complete, run required tests:
在将代码标记为“完成”之前，运行必要的测试：
- [ ] Unit tests pass (单元测试通过)
- [ ] Integration tests pass if applicable (如果适用，集成测试通过)
- [ ] E2E tests pass if applicable (如果适用，端到端测试通过)
- [ ] Lint passes (代码风格检查通过)
- [ ] Typecheck passes (类型检查通过)
- [ ] Build passes (构建通过)
- [ ] Regression risk is reviewed (已审查回归风险)

## Gate 5: Review Check (关卡 5：审查检查)
Before marking story done, confirm:
在将故事标记为“Done”之前，请确认：
- [ ] Acceptance criteria are met (满足验收标准)
- [ ] Test evidence is available (有可用的测试证据)
- [ ] Execution log is complete (执行日志已完整记录)
- [ ] Failure notes are documented (记录了故障说明)
- [ ] Human approval is completed if required (如果需要，人工审批已完成)
- [ ] Final summary is written (已编写最终总结)

## Done Definition (完成的定义)
A story can be marked as Done only when all required gates pass.
**一个故事只有在所有必需的关卡都通过后，才能被标记为“Done”。**
