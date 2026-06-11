# Dev Agent Execution Protocol (开发智能体执行协议)

## 🎯 目的 (Purpose)
This protocol governs how the Dev Agent executes a story.
本协议管理开发智能体（Dev Agent）如何执行一个用户故事。

## 🚦 实现前 (Before Implementation)
The Dev Agent must:
开发智能体必须：
1. Read PRD. (阅读产品需求文档)
2. Read Architecture. (阅读架构文档)
3. Read current Story. (阅读当前用户故事)
4. Read `.ai-harness/harness-manifest.md`. (阅读治理清单)
5. Read `.ai-harness/permissions.md`. (阅读权限策略)
6. Read `.ai-harness/tool-policy.md`. (阅读工具策略)
7. Read `.ai-harness/verification-gates.md`. (阅读验证关卡)
8. Confirm story scope. (确认故事范围)
9. Identify likely files to change. (识别可能更改的文件)
10. Identify required tests. (识别需要的测试)
11. Update `.ai-harness/story-state.json`. (更新故事状态记录)

## 💻 实现中 (During Implementation)
The Dev Agent must:
开发智能体必须：
1. Change only files inside story scope. (仅更改故事范围内的文件)
2. Avoid unrelated refactors. (避免无关的重构)
3. Follow existing code conventions. (遵循现有的代码规范)
4. Add or update relevant tests. (添加或更新相关的测试)
5. Update story state after major steps. (在主要步骤完成后更新故事状态)
6. Log meaningful actions. (记录有意义的操作)
7. Stop if permission boundary is reached. (如果触碰到权限边界，立即停止)
8. Stop if required context is missing. (如果缺少必要的上下文，立即停止)
9. Stop if forbidden action is required. (如果需要执行被禁止的操作，立即停止)

## 🏁 实现后 (After Implementation)
The Dev Agent must:
开发智能体必须：
1. Run required verification commands. (运行必需的验证命令)
2. Fix failed tests if within scope. (如果失败的测试在范围内，则进行修复)
3. Document failures. (记录故障)
4. Update execution log. (更新执行日志)
5. Update story state. (更新故事状态)
6. Produce final verification summary. (生成最终验证总结)
7. Mark story as Done only if all gates pass. (仅当所有关卡都通过时，才将故事标记为“完成”)

## 🛑 停止条件 (Stop Conditions)
The Dev Agent must stop when:
开发智能体必须在以下情况停止执行：
- action requires human approval (操作需要人工审批)
- story scope is unclear (故事范围不清晰)
- required context is missing (缺少必要的上下文)
- tests fail for reasons outside scope (测试因范围外的原因失败)
- forbidden file must be changed (必须更改被禁止的文件)
- production secret is required (需要使用生产环境机密)
- destructive command seems necessary (看似需要执行破坏性命令)
