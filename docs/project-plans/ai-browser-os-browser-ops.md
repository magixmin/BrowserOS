# AI Browser OS + IP 调度 + 多账号管理项目规划

## 1. 项目目标

把现有 `NovaPilotX / BrowserOS` 从“AI 可操作浏览器”升级为“面向多账号运营的 Browser Ops 平台”，具备以下核心能力：

1. 一个账号 = 一个独立环境（账号资料、Cookie、指纹、代理策略）。
2. AI 根据平台、任务类型、风险等级自动选择最合适的 IP。
3. 支持用户自带 IP、内置代理池、试用代理池三类来源。
4. 把 TikTok / Amazon / Walmart 等平台操作沉淀为可复用 Skill / Task。
5. 后续逐步接入真正的 Chromium profile 隔离、代理 provider adapter、风控评分与自动执行。

## 2. 当前代码基线

这次规划基于仓库当前结构，不做脱离现状的空想设计：

- 浏览器壳层：`packages/browseros/`
- Agent UI：`packages/browseros-agent/apps/agent/`
- 本地控制服务：`packages/browseros-agent/apps/server/`
- 浏览器控制抽象：`packages/browseros-agent/apps/server/src/browser/`
- 工作流能力：`packages/browseros-agent/apps/agent/lib/workflows/`
- 当前设置入口：`packages/browseros-agent/apps/agent/entrypoints/app/`

当前与本项目最相关的事实：

1. 现有 agent 端已经有完整的设置页、工作流、存储体系，可以直接承载 Browser Ops 管理台。
2. `apps/server/src/browser/backends/controller.ts` 已经预留了窗口注册消息，但注释明确写着 `multi-profile deferred`，说明多环境/多窗口隔离还没真正完成。
3. `apps/server/src/browser/browser.ts` 已有成熟的浏览器控制抽象，可作为后续 Skill 执行层和自动任务执行层的基础。
4. 现阶段最合理的切入点不是直接硬改 Chromium，而是先把“数据模型 + 调度策略 + UI + 执行接口”打通。

## 3. 目标架构

```text
[ Browser Ops UI ]
        ↓
[ Profile Manager ]
        ↓
[ IP Scheduler ]
        ↓
[ Proxy Adapters ]
        ↓
[ Browser Runtime / Controller ]
        ↓
[ Skills / Task Executor ]
        ↓
[ TikTok / Amazon / Walmart ]
```

### 模块职责

#### 3.1 Profile Manager

负责账号环境隔离与持久化：

- Profile 元数据
- 指纹模板
- Cookie Vault / session partition
- 平台标签与国家地区
- 手动代理绑定或自动代理策略

#### 3.2 IP Scheduler

负责按平台和任务自动选路：

- 平台偏好：TikTok 偏住宅/移动，Amazon 偏 ISP/住宅
- 任务偏好：发布型任务用粘性会话，抓取型任务偏轮换
- 国家偏好：IP / 时区 / 语言一致
- 质量偏好：成功率高、封禁率低、延迟合理

#### 3.3 Proxy Adapters

统一接入三类代理来源：

- 用户自带 IP
- 第三方 provider（Bright Data / Decodo / Webshare）
- 免费或试用代理池

#### 3.4 Browser Runtime

负责真正把调度结果落到浏览器实例：

- Chromium profile / storage partition
- session 级代理注入
- 指纹对齐
- 窗口/标签页归属

#### 3.5 Skill / Task Executor

把业务动作抽象为 Skill：

- TikTok 发视频
- Amazon Listing 巡检
- Walmart 价格抓取
- 登录、上传、采集、下单等步骤编排

## 4. 分阶段 roadmap

### Phase 0: 基础骨架

目标：先把 Browser Ops 变成产品内的一等公民。

交付：

- Browser Ops 项目规划文档
- Profile / Proxy / Task 数据模型
- 本地存储结构
- 设置页管理入口
- AI 路由预览器（只做策略决策，不直接改 Chromium）

验收标准：

- 能在 UI 中看到 Profile、代理池、任务模板
- 能新增/删除基础对象
- 能基于 Profile + Task 看到 AI 推荐的代理与指纹对齐建议

### Phase 1: Provider Adapter + 路由服务化

目标：让调度器不只是静态规则，而是可接真实代理源。

交付：

- Bright Data / Decodo / Webshare adapter 骨架
- 统一代理凭据模型
- IP 健康检查与评分结构
- 本地服务 API：预览路由、申请路由、释放路由、查看活动分配
- Provider route resolution：把代理条目解析成标准化拨号模板

验收标准：

- 每次执行任务前都能请求一条可用代理路由
- 可区分 sticky / rotating session
- 能记录可用率、封禁率、延迟

### Phase 2: 真正的 Profile 隔离

目标：实现“一个账号 = 一个独立环境（指纹 + IP + Cookie）”。

交付：

- Window / profile ownership 模型
- Chromium profile 映射规则
- session partition 生命周期管理
- Cookie Vault 与导入导出
- runtime session spec：把 profile + route + window 变成可执行运行时规格
- controller ownership registry：window -> controller client
- runtime diagnostics：检测 window / ownership / binding / spec 漂移
- runtime assets：落盘 profile 目录、cookie vault、spec JSON
- managed window flow：为 allocation 打开专用窗口并自动绑定
- managed window launch chain：先恢复 Vault，再首跳导航
- managed browser context：managed window 运行在独立 browserContextId 中
- browser context diagnostics：检测 live contexts 与 runtime specs 漂移
- runtime reconcile：清理 orphan contexts，重建缺失 contexts
- launch bundle：生成接近真实 Chromium 启动参数的配置包
- local launcher service：支持 prepare / launch / stop 执行记录
- launch execution persistence：本地落盘 launcher 执行历史
- launch diagnostics/reconcile：检测并收敛 stale/orphan launch executions
- instance registry：把 execution、端口、PID、健康状态绑定成实例记录
- instance lifecycle controls：refresh / reconcile / restart / cleanup
- instance operations panel：支持 refresh-all、restart、hard cleanup
- instance control panel：支持 refresh-all、restart、hard cleanup、诊断

验收标准：

- 不同 Profile 的 Cookie、登录状态、存储空间互不污染
- 一个窗口/任务可以明确绑定到某个 Profile
- Profile 切换不会误用前一个账号的网络环境

### Phase 3: 指纹一致性与风控基线

目标：把“能跑”升级到“尽量稳定”。

交付：

- 国家 -> 时区 / 语言 / locale 对齐规则
- WebGL / Canvas / Font 策略位
- 人类行为参数模板
- 风险告警与阻断策略

验收标准：

- 若 IP 与指纹不一致，系统给出明确告警或阻断
- 发布、登录、抓取三类任务有不同的默认行为参数
- 任务执行前有风险评分

### Phase 4: Skill 执行层

目标：把平台操作能力变成可复用业务能力。

交付：

- `post_tiktok_video`
- `inspect_amazon_listing`
- `scrape_walmart_prices`
- Skill registry 与平台参数模板

验收标准：

- 用户能用自然语言触发平台任务
- 任务会自动绑定合适的 Profile 和 Proxy Route
- 失败后能重试或切换路线

### Phase 5: 观测与运营能力

目标：支持长时间运行和多账号运营。

交付：

- IP 评分面板
- 账号风险面板
- 任务成功率与失败归因
- 速率限制、冷却和熔断

验收标准：

- 能回答“哪个账号安全”“哪个代理池稳定”“为什么失败”
- 可设置冷却、停用、人工复核

## 5. MVP 定义

本项目的 MVP 不是“一次性做完所有反检测能力”，而是：

1. 有 Browser Ops 管理页。
2. 有 Profile / Proxy / Task 的统一数据结构。
3. 有 AI IP 调度器基础规则。
4. 能为任务输出“应使用哪个代理、哪种会话策略、应如何对齐指纹”。
5. 为后续 Chromium 隔离和真实 Provider 接入预留清晰接口。

## 6. 关键难点

### 6.1 IP 与指纹一致性

必须做国家维度的一致性约束：

- IP 国家
- 时区
- 语言
- locale

否则任务成功率和账号存活率都会很差。

### 6.2 多 Profile 运行时归属

当前 controller 层尚未真正处理多 profile 的窗口归属，所以后续必须补齐：

- 哪个窗口属于哪个 Profile
- 哪个任务使用哪个 session
- 哪个 controller client 正在服务哪个环境

### 6.3 代理质量问题

代理来源再多，没有质量评分也没意义。必须记录：

- success_rate
- ban_rate
- latency_ms
- last_checked_at

### 6.4 平台差异

不同平台的默认路由策略不同：

- TikTok：更强调住宅/移动、严格行为模板
- Amazon：更强调 ISP/住宅、粘性会话
- Walmart：更偏价格采集与巡检任务

## 7. 建议的数据模型

### Profile

```json
{
  "id": "profile_tiktok_us_01",
  "platform": "tiktok",
  "marketCountry": "US",
  "proxyMode": "auto",
  "sessionPartition": "persist:profile_tiktok_us_01",
  "fingerprint": {
    "timezone": "America/New_York",
    "language": "en-US"
  }
}
```

### Proxy

```json
{
  "id": "proxy_managed_us_resi_01",
  "sourceType": "managed",
  "providerName": "Bright Data",
  "ipType": "residential",
  "sessionMode": "sticky",
  "countries": ["US"],
  "health": {
    "successRate": 0.96,
    "banRate": 0.02,
    "latencyMs": 420
  }
}
```

### Task

```json
{
  "id": "task_tiktok_post_video",
  "platform": "tiktok",
  "taskType": "publishing",
  "requiredIpTypes": ["residential", "mobile"],
  "preferredSessionMode": "sticky"
}
```

## 8. 仓库内文件落点建议

### 本轮已落或建议落点

- `docs/project-plans/ai-browser-os-browser-ops.md`
- `packages/browseros-agent/apps/agent/lib/browser-ops/`
- `packages/browseros-agent/apps/agent/entrypoints/app/browser-ops/`

### 后续阶段预计落点

- `packages/browseros-agent/apps/server/src/api/routes/browser-ops.ts`
- `packages/browseros-agent/apps/server/src/api/services/browser-ops/`
- `packages/browseros-agent/apps/server/src/browser/` 下的 profile runtime 扩展
- `packages/browseros-agent/apps/controller-ext/` 中的窗口归属与 session 控制

## 9. 本轮实施清单

- [x] 编写完整项目规划文档
- [x] 新增 Browser Ops 数据模型
- [x] 新增本地存储与默认种子数据
- [x] 新增 AI 路由决策器（MVP）
- [x] 新增设置页入口和管理 UI
- [x] 新增 Browser Ops server 路由服务骨架
- [x] 新增 provider catalog / adapter skeleton
- [x] 新增 route allocation / release 生命周期骨架
- [x] 新增 provider route resolution 与 BYO endpoint 解析
- [x] 新增健康评分与风险分层
- [x] 新增 runtime binding：allocation -> active window/tab 归属骨架
- [x] 新增 runtime session spec：sessionPartition / cookieVault / 指纹 / 风险级别
- [x] 新增 controller window ownership registry
- [x] 新增 runtime diagnostics 视图与接口
- [x] 新增 runtime assets 持久化与文件落盘
- [x] 新增 open managed window 流程
- [ ] 接入真实 proxy provider adapter 凭据与联网拨号
- [ ] 接入 Chromium profile / session 隔离
- [ ] 接入 Skill 执行与自动化任务落地

## 10. 下一步建议

下一轮优先顺序建议如下：

1. 把代理提供商接入点服务化，形成统一路由申请接口。
2. 把 controller 窗口归属能力补起来，真正支持多 Profile 运行。
3. 为 TikTok / Amazon 各落一个最小 Skill，并打通路由器输出。
4. 再进入指纹强化与风控体系。
