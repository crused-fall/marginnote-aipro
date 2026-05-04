# MarginNote 4 原生 AI 深入研究

更新时间：2026-04-16 04:17:19 BST

## 可重复检查命令

现在仓库里已经加入本地检查脚本：

```bash
npm run native-ai:inspect
```

可选 JSON 输出：

```bash
npm run native-ai:inspect -- --json
```

这条命令会重新采集本机安装包和容器中的直接证据，包括：

- `Info.plist` 中的版本 / Build / Bundle ID
- `PromptModules-*.json` 中的 tool-call 合同与工具列表
- `Localizable.strings` 与二进制中的 AI 功能痕迹
- 用户偏好里的 AI OCR / AI Breakdown 相关键
- `ChatMemories`、`AIBreakdownProgress`、`.MN4NotebookDatabase/MarginNotes.sqlite` 的存在性与状态

因此下面的研究结论不再只是“一次性人工翻包”，而是可以通过仓库内脚本在这台机器上重复验证。

## 研究目标

本文件用于回答三个问题：

1. 这台机器上的 MarginNote 4 是否真的具备完整原生 AI 能力，而不是只有营销文案。
2. 它当前已经能做哪些事，做不到哪些事。
3. 我们的插件应该补什么，而不是重复做一套更弱的 AI 聊天框。

## 本机已确认环境

- 应用：`/Applications/MarginNote 4.app`
- Bundle ID：`QReader.MarginStudy.easy`
- 版本：`4.3.2`
- Build：`32000`
- 本机偏好中已出现 AI 相关键：
  - `mindbooks_ai_service_region`
  - `mindbooks_ai_service_type1`
  - `mindbooks_aiocr_prompts1`
  - `mindbooks_use_ai_ocr`
  - `mindbooks_toolname = AI OCR`

这些不是网页资料，而是本机安装包、资源文件和容器内偏好设置中的直接证据。

## 结论先说

MarginNote 4 的原生 AI 已经不是“单轮问答”。

从本机资源看，它已经具备一个内部 agent 雏形，至少包括：

- Inline Chat / Chat with AI 对话界面
- 文档问答、脑图问答、数据库搜索
- AI OCR 与 AI 制卡模板
- AI Breakdown / AI 拆书
- Study Mode（Guide / Quiz / Explain）
- 系统提示词、预设模板、专用模板、提示词优化助手
- 工具调用与编辑确认机制
- 对话记忆与后台任务的持久化目录
- 积分 / 月度配额 / MAX 订阅门槛

所以我们后续插件的定位不该是“给 MarginNote 补一个普通 AI 按钮”，而应该是：

- 扩展其计划能力
- 强化其批量组织和分支整理能力
- 补足更稳定的预览、审计、回滚和自动化链路
- 在原生 AI 没有良好暴露的结构化操作上做增强

## 已证实的原生 AI 能力

### 1. 原生对话系统真实存在

本机 `Localizable.strings` 与二进制字符串中都能看到以下能力名：

- `Chat with AI`
- `AI Chat`
- `Inline Chat`
- `OpenChat`
- `StopChat`
- `OpenAgent`
- `StopAgent`
- `AddToChat`
- `loadInlineChatHistory`
- `InlineChatLastInput_Document`
- `InlineChatLastInput_MindMap`

这说明原生 AI 至少支持：

- 在文档上下文中发起对话
- 在脑图 / 卡片上下文中发起对话
- 保存聊天输入或历史状态
- 存在一个单独的 agent/open state，而不是只有一个简单菜单项

### 2. 它已经有“工具调用型 AI”

`PromptModules-zh-Hans.json` 里直接写出了工具调用规则，核心逻辑是：

- 先说明计划
- 显示确认按钮
- 用户确认后再执行工具
- 执行时不得增减工具列表

可用工具列表明确包含：

- 读取类：
  - `get_card_meta`
  - `get_card_content`
  - `get_page_content`
  - `get_studyset_structure`
  - `get_document_toc`
  - `search_in_database`
  - `fetch_url`
- 创建类：
  - `create_card`
  - `create_card_tree`
  - `create_summary_card`
- 修改类：
  - `set_card_meta`
  - `set_card_content`
  - `move_cards_in_hierarchy`
  - `merge_cards`
  - `duplicate_or_link_card`
- 删除类：
  - `delete_cards`
- 复习类：
  - `add_to_review`

这比“AI 帮你回答问题”强得多。它说明原生系统已经支持：

- 读取文档和卡片上下文
- 新建卡片与树形结构
- 修改卡片内容和元数据
- 做一定程度的层级移动与合并
- 删除与复习加入

换句话说，MarginNote 内部已经有一套 tool-call agent 机制，只是没有完整对外开放给插件。

### 3. 原生 AI 已覆盖多个工作模式

#### 文档问答

提示模块要求使用：

- `get_document_toc`
- `get_page_content`

并强制引用原文页码和摘录，禁止编造。

这说明原生文档问答不是纯记忆式聊天，而是检索式问答。

#### 脑图问答

提示模块要求使用：

- `get_studyset_structure`
- `get_card_meta`
- `get_card_content`

并从脑图结构或临近卡片里取证据。

这说明它支持面向学习集 / 脑图上下文的结构化检索问答。

#### 数据库搜索问答

提示模块显式使用：

- `search_in_database`

并约束 FTS 查询、rerank 和引用卡片原文。

这说明它不仅能看当前文档，还能搜索知识库。

### 4. Study Mode 不是文案，而是完整模式

二进制和英文资源里明确存在：

- `Guide Mode`
- `Quiz Mode`
- `Explain Mode`
- `Study_Mode_Guide_Default_Prompt`
- `Study_Mode_Quiz_Default_Prompt`
- `Study_Mode_Explain_Default_Prompt`

并且英文提示词里写了完整行为规范，例如：

- Guide：引导式教学，不直接给答案
- Quiz：自适应出题、按钮答题、根据表现切换题型
- Explain：深度解释概念

这说明 MarginNote 的 AI 对话并非只有一个统一人格，而是可切换教学模式。

### 5. AI OCR 已是多字段制卡系统

本机资源中已确认：

- `AI OCR Prompt`
- `AI OCR Prompts`
- `AI OCR Field Config`
- `AIOCR Field Title`
- `AIOCR Field Content`
- `AIOCR Field Cloze`
- `AIOCR Field Comment`
- `AIOCR Field Flashcard`

偏好设置里还保存了实际模板，例如：

- “翻译成英文”
- “翻译成中文”

这说明 AI OCR 已经不仅是 OCR，而是：

- 从图像/页面抽取内容
- 按字段写入标题、正文、评论、挖空、复习问题
- 支持自定义提示模板

此外资源里还明确写了：

- 在提示词中加入 `deep thinking / deep analysis / 深度思考`
- 会触发更强模型
- 更慢且消耗更多积分

这说明模型路由本身可能就受 prompt 关键词影响。

### 6. AI Breakdown 已经是“章节到脑图”的生成流水线

本机资源中可见：

- `AI Breakdown`
- `AI Breakdown Running`
- `AIBreakdownGeneratingStructure`
- `AIBreakdownParsingStructure`
- `AIBreakdownCreatingCards`
- `AIBreakdownCollectingNotes`
- `AIBreakdownOrganizing`
- `AIBreakdownCompletedWithCredits`

还可以确认：

- 单章节超过 1000 页受限
- 超过 100 页需要 MAX
- 支持后台任务与进度恢复
- 需要先加入学习集

这说明 AI Breakdown 并不是“生成一段总结”，而是一条结构化生产线：

- 采集文档内容
- 组织结构
- 创建卡片
- 组织脑图
- 记录进度和积分消耗

### 7. 原生 AI 已经在学习用户的脑图风格

资源中有一组很关键的文案：

- `Custom templates let AI learn from your mind map style`
- `Based on Few-shot learning`
- `Generate Template from Branch`

这说明原生系统已经具备一种轻量 few-shot 机制：

- 从现有脑图分支抽取模板
- 让 AI 在拆书时模仿既有结构、语言和思维方式

这对我们的插件方向非常重要，因为它说明：

- 原生产品也在往“可迁移工作流”方向走
- 用户已有的分支风格本身就是可复用资产

## 已证实的控制与安全机制

### 1. 编辑确认

资源中明确存在：

- `AI Function Call`
- `Confirm Function Call`
- `Function call confirmation enabled`
- `Function call confirmation disabled`
- `Accept Function Call`
- `Reject Function Call`
- `Accept All Function Calls`
- `Reject All Function Calls`
- `Function call has been reverted`

这说明原生 AI 在修改数据时已经具备：

- 执行前确认
- 单次或批量接受/拒绝
- 至少某种粒度上的撤销或回退提示

### 2. 配额与订阅门槛

本机可见：

- `AI Credits`
- `Monthly Quota`
- `Advanced Credits Balance`
- `AICreditLimit0`
- `AICreditLimit1`
- `MAX Version Required`
- `This feature requires MarginNote 4 MAX version to unlock`

同时在偏好设置中存在 token 计数：

- `mindbooks_tokenoutput0 = 92668`

二进制中也出现：

- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `credit`

这说明原生 AI 是按模型 / token / credits 记账的，不是无限制本地推理。

## 本机发现的持久化痕迹

### 明确存在的目录

在容器 `Data/Documents` 下发现：

- `ChatMemories`
- `AIBreakdownProgress`

这说明产品设计上已经为以下对象预留本地持久化位置：

- 对话记忆
- AI 拆书后台任务或进度

### 当前不可直接读到的内容

当前机器上：

- `ChatMemories` 为空目录
- `AIBreakdownProgress` 为空目录
- `.MN4NotebookDatabase/MarginNotes.sqlite` 是空文件
- 偏好里有 `mindbooks_privatedblocation = true`

工程含义是：

- 不能假设聊天历史一定能被稳定地从公开 sqlite 路径读取
- 真实数据可能在私有数据库位置、iCloud 同步层、或运行时内存结构中
- 用插件直接接管原生 AI 内部会话，大概率不可靠

## 能做什么 / 做不到什么

### 当前原生 AI 明确能做的

- 在文档、卡片、脑图上下文中对话
- 根据文档页内容做引用式问答
- 根据脑图 / 学习集结构做引用式问答
- 搜索知识库并基于结果回答
- 通过 AI OCR 创建结构化卡片字段
- 生成摘要、挖空、评论、复习问题
- 通过 AI Breakdown 从章节构建卡片和脑图
- 通过模板和 few-shot 方式模仿既有脑图风格
- 在修改前显示计划或确认
- 记录积分、配额、模型成本

### 当前我们还不能稳妥依赖它做到的

- 通过公开插件 API 直接调用其内部 tool-call 引擎
- 稳定访问原生 chat history 的底层数据结构
- 稳定复用原生 AI 的内部 session / agent 状态
- 证明所有内部工具都对插件开放
- 证明 `move_cards_in_hierarchy` 等内部能力在公开 addon API 中同等可写
- 证明所有 AI 生成动作都有可审计、可重放的外部接口

### 当前非常可能存在但不应盲目依赖的能力

- 真正的层级移动或合并
- 直接对脑图结构做重排
- 原生 agent 多步执行
- 自动化执行链路

原因不是它们不存在，而是目前证据来自提示模块和二进制字符串，尚未拿到稳定对外接口。

## 对我们插件路线的直接影响

## 1. 不要重做“又一个聊天框”

如果我们只是做：

- 选中内容
- 发给 LLM
- 返回一段话

那会明显弱于原生 AI。

我们真正应该补的是原生 AI 没有对外做好、或不够可靠的部分。

## 2. 插件应优先补“分支级 agent 工作流”

原生 AI 已经擅长：

- 问答
- 制卡
- 拆书
- 单轮工具计划

而我们当前项目更适合补：

- `整理当前选中分支`
- 分支级标题统一
- 标签归一化
- 老旧 agent 痕迹清理
- 弱分支 / 过载分支诊断
- 可预览的批量修改
- 带审计日志的安全执行

## 3. 插件价值应放在“更强治理”，不是“更强模型”

优先增强：

- 预览
- 作用范围控制
- 可跳过部分卡片
- 执行报告
- 变更前后 diff
- 可回放 / 可复查
- 多步计划的确定性

这比单纯换一个更强模型更符合当前产品缺口。

## 4. 插件可考虑成为“原生 AI 的监督层”

一个可行方向不是替代原生 AI，而是围绕它加一层：

- 更稳定的 branch collector
- 更严格的 planner
- 更可解释的 action list
- 更保守的 apply 层
- 更强的失败诊断

也就是把我们的插件定位成：

- branch organizer
- workflow supervisor
- audit layer
- reproducible executor

## 5. 后续值得研究的接口方向

后续可以继续沿四条线研究：

1. 是否存在可被插件间接触发的原生 chat / agent 命令入口
2. 是否存在可观察的原生 AI 请求 / 响应缓存
3. 原生 AI 编辑确认链路是否能被插件借鉴或复刻
4. 原生 few-shot 模板是否能与我们的分支整理 planner 结合

## 对当前项目的建议结论

对本项目，最合理的路线不是“复制 MarginNote 的 AI”，而是“把 MarginNote 已有 AI 变成更像真正 agent 的工作流”。

具体说：

- 原生 AI 负责生成、问答、拆书、局部编辑建议
- 我们的插件负责分支级采集、计划、预览、选择执行、清理历史痕迹、输出执行报告
- 如果未来能找到稳定入口，再考虑把原生 AI 作为一个可选后端，而不是当前阶段的前提

## 证据来源

本研究主要基于以下本机文件：

- `/Applications/MarginNote 4.app/Contents/Info.plist`
- `/Applications/MarginNote 4.app/Contents/Resources/PromptModules-zh-Hans.json`
- `/Applications/MarginNote 4.app/Contents/Resources/PromptModules-en.json`
- `/Applications/MarginNote 4.app/Contents/Resources/zh-Hans.lproj/Localizable.strings`
- `/Applications/MarginNote 4.app/Contents/Resources/en.lproj/Localizable.strings`
- `/Applications/MarginNote 4.app/Contents/MacOS/MarginNote 4`
- `/Users/cfall/Library/Containers/QReader.MarginStudy.easy/Data/Library/Preferences/QReader.MarginStudy.easy.plist`
- `/Users/cfall/Library/Containers/QReader.MarginStudy.easy/Data/Documents/ChatMemories`
- `/Users/cfall/Library/Containers/QReader.MarginStudy.easy/Data/Documents/AIBreakdownProgress`
- `/Users/cfall/Library/Containers/QReader.MarginStudy.easy/Data/Documents/.MN4NotebookDatabase/MarginNotes.sqlite`

## 最重要的一句话

MarginNote 4 原生 AI 已经像一个“内置但未完全开放的 agent 平台”。我们的插件最有价值的方向，是把它缺少的分支级组织能力、执行治理能力和可审计工作流补齐。
