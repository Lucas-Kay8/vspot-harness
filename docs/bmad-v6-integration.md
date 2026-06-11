# BMad Method v6.8+ Integration Guide (BMad Method 整合指南)

The **VSPOT Harness** is designed to seamlessly integrate with the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD). 
**VSPOT Harness** 旨在与 [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD) (v6.8 及以上版本) 无缝集成。

While BMad Method solves "how AI plans software development", this Harness Extension solves "how AI safely executes the code".
如果说 BMad Method 解决了“AI 如何规划软件开发”，那么这个 VSPOT 治理框架则解决了“AI 如何安全地执行代码”。

## The Integrated Workflow (整合后的工作流)

Here is how the planning (BMad Method) flows into execution (Harness):
以下是“规划（BMad Method）”如何流向“执行（Harness）”的过程：

### Phase 1: Planning (BMad Method) / 阶段 1：规划
1. **Idea (想法)**
2. **PRD (产品需求文档)**
3. **Architecture (架构设计)**
4. **Epics (史诗任务)**
5. **Stories (用户故事)** 

### Phase 2: Execution (Harness Extension) / 阶段 2：执行
When an AI agent picks up a **Story** from Phase 1, it enters the Harness:
当 AI 智能体领取阶段 1 中的一个**用户故事**时，它进入治理框架：

6. **Story Readiness Check (故事就绪检查):** Agent uses `vspotharness check`.
7. **Permission Check (权限检查):** Agent evaluates intended actions against `policy.yaml`.
8. **Dev Execution (开发执行):** Agent follows `commands/dev-agent-protocol.md`.
   - Logs actions via CLI, stored in `events.jsonl`.
   - Updates story state via unified state engine.
9. **Verification Gates (验证关卡):** Agent checks results using `vspotharness verify`.
10. **QA & Review (质量保证与审查):** Agent follows `commands/qa-agent-protocol.md`.
11. **Done (完成):** Story is moved to Done state.

## Agent Role Mapping (智能体角色映射)

| BMad Method Role | Harness Extension Responsibility |
| :--- | :--- |
| **PM Agent (Aria)** | Defines Stories and Acceptance Criteria. (定义用户故事和验收标准) |
| **Architect Agent (Archie)** | Provides Technical Context and Boundaries. (提供技术上下文和边界) |
| **Scrum Master (Scout)** | Orchestrates execution sequence and triggers Harness rules. (协调执行顺序并触发治理规则) |
| **Dev Agent (Devon)** | *Operates entirely inside the Harness.* Follows policies, logs execution, updates state. (*完全在治理框架内运行*。遵循策略，记录执行，更新状态。) |
| **QA Agent (Quinn)** | Runs verification gates, checks execution logs. (运行验证关卡，检查执行日志。) |
| **Human Owner (You)** | Reviews high-risk permission requests and final verification. (审查高风险的权限请求和最终验证。) |
