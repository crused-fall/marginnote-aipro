# MarginNote 4 原生 AI 监督矩阵 v1

## 目的

这份矩阵不是为了证明“插件已经接管了原生 AI”，而是为了把我们已经确认的本机证据转成工程决策：

- 哪些原生能力应该直接复用其存在，不重复造轮子
- 哪些能力适合做模板治理、结果后处理或执行审计
- 哪些内部能力当前只能作为定位依据，不能声称可稳定直连

## 监督模式

- `augment_only`
  原生能力已经成熟，插件只做上下文补强、结果整理和审计，不重建主界面。
- `mirror_and_supervise`
  原生能力的模板或风格资产可被读取和整理，插件可做镜像、检查、生成建议。
- `supervise_outputs`
  不进入私有执行链，只处理执行之后产出的脑图/卡片结果。
- `plugin_executor_over_internal_tooling`
  即使原生内部也有类似工具，插件仍优先使用自己的公开 API 执行层。
- `avoid_direct_hook`
  已确认内部能力存在，但当前没有稳定公共入口，不应伪装成已接通。
- `defer_runtime_coupling`
  先只作为环境信号，不让插件执行策略依赖它。

## 当前矩阵

可通过下面命令重新生成当前机器上的文本矩阵：

```bash
npm run native-ai:matrix
```

也可输出 JSON：

```bash
npm run native-ai:matrix -- --json
```

基于当前本机证据，v1 决策如下：

1. Chat / Context QA
   `augment_only`
   原生已经有 Chat、文档问答、脑图问答、数据库搜索。插件不应重做聊天界面，而应补分支级上下文收集、整理后摘要和审计链路。

2. Study Modes
   `augment_only`
   Guide / Quiz / Explain 已是原生能力。插件更适合做“进入前整理分支、结束后整理结果”的外围工作流。

3. AI OCR Templates
   `mirror_and_supervise`
   OCR 模板和字段提示已经能从本地偏好里读到，适合先做模板镜像、lint、差异检查和建议生成，而不是私调 OCR 执行器。

4. AI Breakdown
   `supervise_outputs`
   Breakdown 是一条私有流水线。插件现阶段最稳的切入点是 Breakdown 结束后，对产出的分支做 regroup、overview、颜色和摘要整理。

5. Mind Map Style Learning
   `mirror_and_supervise`
   原生已经强调 branch template / few-shot 风格学习。插件可以把好分支转成更明确的结构摘要和风格参考，供自己的 planner 使用。

6. Internal Tool Engine
   `avoid_direct_hook`
   Prompt modules 已证实内部 tool-call 合同存在，但仍不能据此声称插件能稳定直连内部工具执行。

7. Hierarchy Mutation
   `plugin_executor_over_internal_tooling`
   原生内部有 move / merge / delete 等工具，但插件应继续优先使用我们自己的 helper-shell 执行层和 apply artifacts，确保可审计、可回放、可控。

8. Credits / MAX
   `defer_runtime_coupling`
   这些信号说明原生 AI 有配额和订阅边界，但当前不应把插件策略硬绑到私有额度状态。

## 这版“监督层”具体是什么

v1 的监督层是一个确定性策略模块，不是 UI，也不是私有调用桥：

- 代码位置：`bridge/native-ai-supervision.js`
- 输入：`scripts/inspect-native-ai.js` 的 inspection report
- 输出：可读文本矩阵或 JSON

这样做的价值是：

- 让“增强原生 AI”从一句方向变成可审查、可复跑的工程规则
- 先把高风险私有调用排除掉，再决定值得落地的增强点
- 给后续真正的 prompt/template supervision 或 result post-processing 留出清晰接口

配套的 `marginnote-cli ai boundaries` 命令会读取同一份本机证据，把可见 surface、受限 surface 和暂未证实 surface 重新排成 can / restricted / cannot 的边界视图，方便日常查看而不改变这份监督矩阵的语义。

## 下一步建议

从这个矩阵往下做，最稳的第一个落地点是：

1. OCR / prompt template 镜像与 lint
2. AI Breakdown 结果后处理
3. 分支整理结果的 prompt-ready style digest

这三条都不要求先打通私有 native AI runtime。

现在第 1 条已经有了第一版本地工具链：

```bash
npm run native-ai:templates
```

它会读取本机 AI OCR 模板配置，输出：

- 每个模板的字段镜像
- 模板类型粗分类（translation / summary / mermaid / review / custom）
- 基础 lint，例如：
  - 启用字段却没有 prompt
  - 没有启用 content 字段
  - 多个模板的 enabled prompt 指纹完全重复
  - prompt 提到深度分析但 deepMode 未开启

这条链路现在又补了第二层治理输出：

- prompt whitespace normalization suggestions
- same-kind template diffs
- explainable prompt-quality findings，例如 generic content prompt
- 面向下一步治理的 recommendation 列表

AI Breakdown 结果后处理也已经有了第一条离线入口：

```bash
npm run native-ai:breakdown-postprocess
```

当前它做的是：

- 明确把 payload 标记为 `origin = native_ai_breakdown`
- 让 planner 在 `notes` 里输出一条 `native_ai_breakdown_context`
- 复用现有 organizer 规则去产出 regroup / overview / color 等可见动作

为了避免误导，这条命令默认使用最新 `afterBranch` 快照做代理输入，而不是声称已经接通原生 Breakdown runtime。
如果之后我们拿到真实 Breakdown 分支快照，也可以通过 `-- --input /path/to/branch.json` 复用同一入口。
