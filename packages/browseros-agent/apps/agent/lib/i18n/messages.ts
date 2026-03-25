export type Locale = 'en' | 'zh-CN'

export type TranslateParams = Record<string, string | number>
export type TranslateFn = (key: string, params?: TranslateParams) => string

const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    'mode.chat.label': 'Chat',
    'mode.chat.title': 'Read-only page chat',
    'mode.agent.label': 'Agent',
    'mode.agent.title': 'Full browser automation',
    'mode.lobster.label': 'NovaClaw',
    'mode.lobster.title': 'High-agency browser operator',
    'mode.selector.title': 'Select mode',
    'mode.selector.description':
      'Switch between chat, agent, and NovaClaw based on the task',
    'novaclaw.header.exec': 'Exec',
    'novaclaw.header.plugins': 'Plugins',
    'novaclaw.model.current': 'Current chat model',
    'chat.empty.chatTitle': 'Chat with this page',
    'chat.empty.chatSubtitle':
      'Ask questions about the current page or any topic',
    'chat.empty.agentTitle': 'Agent at your service',
    'chat.empty.agentSubtitle': 'Let AI automate tasks and browse for you',
    'chat.empty.lobsterTitle': 'NovaClaw mode',
    'chat.empty.lobsterSubtitle':
      'Search, plan, execute, and finish complex browser tasks',
    'chat.input.transcribing': 'Transcribing...',
    'chat.input.chatPlaceholder': 'Ask about this page...',
    'chat.input.agentPlaceholder': 'What should I do?',
    'chat.input.lobsterPlaceholder':
      'Ask NovaClaw to search, plan, and do the work...',
    'chat.badge.chat': 'Chat',
    'chat.badge.agent': 'Agent',
    'chat.badge.lobster': 'NovaClaw',
    'chat.suggestion.chat.summarize.display': 'Summarize this page',
    'chat.suggestion.chat.summarize.prompt':
      'Read the current tab and summarize it in bullet points',
    'chat.suggestion.chat.topics.display':
      'What topics does this page talk about?',
    'chat.suggestion.chat.topics.prompt':
      'Read the current tab and briefly describe what it is about in 1-2 lines',
    'chat.suggestion.chat.comments.display': 'Extract comments from this page',
    'chat.suggestion.chat.comments.prompt':
      'Read the current tab and extract comments as bullet points',
    'chat.suggestion.agent.upvote.display': 'Read about our vision and upvote',
    'chat.suggestion.agent.upvote.prompt':
      'Go to https://dub.sh/browseros-launch in current tab. Find and click the upvote button',
    'chat.suggestion.agent.github.display': 'Support NovaPilotX on Github',
    'chat.suggestion.agent.github.prompt':
      'Go to http://git.new/browseros in current tab and star the repository',
    'chat.suggestion.agent.amazon.display':
      'Open amazon.com and order Sensodyne toothpaste',
    'chat.suggestion.agent.amazon.prompt':
      'Open amazon.com in current tab and add sensodyne toothpaste to cart',
    'chat.suggestion.lobster.compare.display':
      'Search, compare, and recommend',
    'chat.suggestion.lobster.compare.prompt':
      'Search the web for the best options, compare them, and give me a recommendation with reasoning.',
    'chat.suggestion.lobster.execute.display':
      'Research and execute the task',
    'chat.suggestion.lobster.execute.prompt':
      'Research what is needed, make a plan, use the browser to do the work, then summarize the result.',
    'chat.suggestion.lobster.tools.display':
      'Use NovaPilotX tools end-to-end',
    'chat.suggestion.lobster.tools.prompt':
      'Use NovaPilotX browser tools to search, gather evidence, and complete the task step by step.',
    'newtab.search.placeholder': 'Ask {product} or search {provider}...',
    'newtab.search.askProduct': 'Ask {product}:',
    'login.welcome': 'Welcome to {product}',
    'onboarding.welcome': 'Welcome to',
    'onboarding.footer': '{product} © {year} - {tagline}',
    'route.lobsterTitle': 'NovaClaw',
    'settings.back': 'Back',
    'settings.title': 'Settings',
    'settings.help': 'Help',
    'settings.section.providers': 'Provider Settings',
    'settings.section.other': 'Other',
    'settings.nav.ai': '{product} AI',
    'settings.nav.chatCouncil': 'Chat & Council Provider',
    'settings.nav.search': 'Search Provider',
    'settings.nav.customize': 'Customize {product}',
    'settings.nav.mcp': '{product} as MCP',
    'settings.nav.chatIntegrations': 'Chat Integrations',
    'settings.nav.novaclaw': 'NovaClaw',
    'settings.nav.workflows': 'Workflows',
    'settings.nav.docs': 'Docs',
    'settings.nav.features': 'Features',
    'settings.nav.revisitOnboarding': 'Revisit Onboarding',
    'sidebar.home': 'Home',
    'sidebar.connectApps': 'Connect Apps',
    'sidebar.scheduledTasks': 'Scheduled Tasks',
    'sidebar.skills': 'Skills',
    'sidebar.skillsMarketplace': 'Skills Marketplace',
    'sidebar.memory': 'Memory',
    'sidebar.soul': 'Soul',
    'sidebar.settings': 'Settings',
    'mcp.setupClient': 'Setup a client',
    'mcp.serverUrl': 'Server URL:',
    'mcp.loading': 'Loading...',
    'mcp.remoteAccess':
      "External access is enabled. To connect from another device, replace 127.0.0.1 with this machine's IP address.",
    'connectMcp.title': 'Connected Apps',
    'connectMcp.description':
      'Connect {product} assistant to apps to send email, schedule calendar events, write docs, and more',
    'skills.mySkills': 'My Skills',
    'skills.builtinSkills': '{product} Skills',
    'skills.viewSkill': 'View Skill',
    'skills.editSkill': 'Edit Skill',
    'skills.createSkill': 'Create Skill',
    'skills.managedByProduct':
      'This skill is managed by {product} and updated automatically.',
    'skills.editDescription':
      'Refine when the agent should use this skill and how it should execute it.',
    'skills.createDescription':
      'Define a reusable instruction set your agent can apply when a request matches.',
    'skills.name': 'Name',
    'skills.nameHint': 'Keep it short and recognizable in the skills list.',
    'skills.description': 'Description',
    'skills.descriptionHint':
      'This is the trigger summary the agent uses to pick the skill.',
    'skills.tip': 'Tip',
    'skills.tip.step1': 'List the ordered steps the agent should follow.',
    'skills.tip.step2':
      'Close with the output or formatting you expect back.',
    'skills.instructions': 'Instructions (Markdown)',
    'skills.savedLocally':
      'Saved locally and available to your agent immediately.',
    'skills.close': 'Close',
    'skills.marketplace.title': 'Skills Marketplace',
    'skills.marketplace.subtitle':
      'Explore remote skill catalogs and install more capabilities into your local {product} workspace.',
    'skills.marketplace.sectionTitle': 'Marketplace',
    'skills.marketplace.sectionSubtitle':
      'Browse featured catalogs, compare compatibility, and install skills into your local {product} workspace.',
    'skills.marketplace.results': 'Showing {shown} of {total} skills',
    'skills.marketplace.sources':
      'Sources include {product} Catalog, OpenAI Curated, and OpenClaw.',
    'skills.marketplace.compatibilityNote':
      'Compatibility tiers are metadata-based estimates, not full runtime guarantees.',
    'skills.marketplace.tiersLabel': 'Compatibility tiers',
    'skills.marketplace.tierGuide': 'High 80-100, Medium 60-79, Low 0-59',
    'skills.marketplace.searchPlaceholder': 'Search skills, IDs, or use cases',
    'skills.marketplace.filter.all': 'All',
    'skills.marketplace.filter.product': '{product}',
    'skills.marketplace.filter.openAI': 'OpenAI Curated',
    'skills.marketplace.filter.openClaw': 'OpenClaw',
    'skills.marketplace.filter.installedOnly': 'Installed Only',
    'skills.marketplace.filter.compatibleOnly': 'Compatible Only',
    'skills.marketplace.filter.favorites': 'Favorites',
    'skills.marketplace.filter.sortCompatibility': 'Sort: Compatibility',
    'skills.marketplace.filter.sortName': 'Sort: Name',
    'skills.marketplace.openClawInstallTitle': 'Install from OpenClaw slug',
    'skills.marketplace.openClawInstallDescription':
      'ClawHub is a registry and CLI ecosystem. If public listing is rate-limited, install a known skill directly by slug.',
    'skills.marketplace.openClawInstallPlaceholder':
      'Enter OpenClaw slug, for example google-drive',
    'skills.marketplace.openClawInstallAction': 'Install from OpenClaw',
    'skills.marketplace.empty':
      'No marketplace skills matched the current filters.',
    'skills.marketplace.badge.builtIn': 'Built-in',
    'skills.marketplace.badge.installed': 'Installed',
    'skills.marketplace.badge.favorite': 'Favorite',
    'skills.marketplace.badge.recent': 'Recent',
    'skills.marketplace.compatibilityBadge': '{tier} • {score}',
    'skills.marketplace.tier.high': 'High',
    'skills.marketplace.tier.medium': 'Medium',
    'skills.marketplace.tier.low': 'Low',
    'skills.marketplace.details': 'Details',
    'skills.marketplace.prev': 'Prev',
    'skills.marketplace.next': 'Next',
    'skills.marketplace.loadMore': 'Load More',
    'skills.marketplace.pageOf': 'Page {page} of {total}',
    'skills.marketplace.favoriteAction': 'Favorite',
    'skills.marketplace.unfavoriteAction': 'Unfavorite',
    'skills.marketplace.copySkillId': 'Copy Skill ID',
    'skills.marketplace.copyInstallCommand': 'Copy Install Command',
    'skills.marketplace.section.compatibility': 'Compatibility reasoning',
    'skills.marketplace.section.installCommand': 'Install command',
    'skills.marketplace.section.frontmatter': 'Frontmatter preview',
    'skills.marketplace.section.summary': 'SKILL.md summary',
    'skills.marketplace.section.outline': 'Section outline',
    'skills.marketplace.section.skillId': 'Skill ID',
    'skills.marketplace.section.safety':
      'Review unfamiliar skills before enabling them in production workflows. Marketplace installs copy the skill package into your local {product} skills directory.',
    'skills.marketplace.noSummary': 'No summary preview available.',
    'skills.marketplace.noOutline': 'No section headings detected.',
    'skills.marketplace.installSkill': 'Install Skill',
    'skills.marketplace.install': 'Install',
    'skills.marketplace.installing': 'Installing...',
    'skills.marketplace.toast.installed': 'Installed skill: {id}',
    'skills.marketplace.toast.installFailed': 'Failed to install skill',
    'skills.marketplace.reason.compatibilityOpenClaw':
      'Compatibility metadata mentions OpenClaw.',
    'skills.marketplace.reason.compatibilityAgentSkills':
      'Compatibility metadata mentions AgentSkills.',
    'skills.marketplace.reason.allowedTools': 'Declares allowed tools.',
    'skills.marketplace.reason.license': 'Declares license metadata.',
    'skills.marketplace.reason.browserWorkflow':
      'Instructions match browser-agent workflows.',
    'skills.marketplace.reason.runtimeRequirements':
      'Contains runtime or tooling requirements that may need adaptation.',
    'skills.marketplace.reason.firstPartyCatalog':
      'Published from the first-party {product} catalog.',
    'skills.marketplace.reason.clawHubSource':
      'Published from the OpenClaw ClawHub source.',
    'skills.marketplace.reason.clawHubRegistry':
      'Published through the official OpenClaw ClawHub registry.',
    'skills.marketplace.reason.clawHubStarter':
      'Recommended starter slug for ClawHub installation.',
    'skills.marketplace.reason.clawHubDownload':
      'Install path uses the official ClawHub registry download API.',
    'features.welcome': 'WELCOME',
    'features.heroTitle': 'Why Switch to {product}?',
    'features.heroSubtitle':
      'Watch our launch video to understand the vision of {product} and key features!',
    'features.heroVideoTitle': '{product} MCP Server Demonstration',
    'features.scroll': 'Scroll for Features',
    'features.sectionTitle': 'FEATURES',
    'features.exploreTitle': "Explore What's Possible",
    'features.exploreSubtitle':
      'Skim the highlights below, then click any card to see a focused walkthrough with video and deeper details.',
    'features.cardTip':
      'Tip: Click any card to open a focused walkthrough with video',
    'features.openDetails': 'Open details',
    'features.videoMins': 'Video: {duration} mins',
    'features.communityTitle':
      'Join our community and help us improve {product}!',
    'features.community.discord': 'Join Discord',
    'features.community.slack': 'Join Slack',
    'features.community.github': 'GitHub',
    'features.community.docs': 'Documentation',
    'features.community.feedback': 'To suggest features / provide feedback',
    'features.community.star': 'Star our repository',
    'features.community.learn': 'Learn more',
    'features.startUsing': 'Start Using {product}',
    'features.agent.tag': 'AI AGENT',
    'features.agent.title': 'Built-in AI Agent',
    'features.agent.description':
      'Describe any task and watch {product} execute it—clicking, typing, and navigating for you.',
    'features.agent.detail':
      'The {product} Agent turns your words into browser actions. Describe what you need in plain English—fill out this form, extract data from that page, navigate through these steps—and the agent handles the rest. It clicks buttons, types text, navigates between pages, and completes multi-step workflows automatically. Everything runs locally on your machine with your own API keys, so your data stays private.',
    'features.agent.highlight1':
      'Multi-tab execution — run agents in multiple tabs simultaneously',
    'features.agent.highlight2':
      'Smart navigation — automatically finds and interacts with page elements',
    'features.agent.highlight3':
      'Form filling — completes forms with intelligent context understanding',
    'features.agent.highlight4':
      'Data extraction — pulls structured data from any webpage',
    'features.agent.highlight5':
      'Auto-save sessions — pick up where you left off from the Assistant panel',
    'features.mcp.tag': 'MCP',
    'features.mcp.title': '{product} as MCP Server',
    'features.mcp.description':
      'Connect Claude Code, Gemini CLI, or any MCP client to control your browser with 31 tools.',
    'features.mcp.detail':
      '{product} includes a built-in MCP server that lets AI coding agents control your browser. Claude Code can open tabs, click elements, fill forms, take screenshots, and read page content—all through natural language commands. Unlike Chrome DevTools MCP which requires debug profiles and separate servers, {product} works out of the box. Just copy the URL from settings and connect.',
    'features.mcp.highlight1':
      'One-line setup — run `claude mcp add` with your server URL to connect',
    'features.mcp.highlight2':
      '31 browser tools — tabs, clicks, typing, screenshots, bookmarks, history',
    'features.mcp.highlight3':
      'Works everywhere — Claude Code, Gemini CLI, Codex, Claude Desktop',
    'features.mcp.highlight4':
      'Authenticated access — extract data from logged-in pages like LinkedIn',
    'features.workflows.tag': 'AUTOMATION',
    'features.workflows.title': 'Visual Workflows',
    'features.workflows.description':
      'Build reliable, repeatable automations with a visual graph builder.',
    'features.workflows.detail':
      'Workflows turn complex browser tasks into reliable, reusable automations. Instead of hoping the agent figures out the right steps each time, you define the exact sequence in a visual graph. Describe what you want in chat, and the workflow agent generates the graph. Add loops, conditionals, and parallel branches. Save workflows and run them on-demand whenever you need.',
    'features.workflows.highlight1':
      'Chat-to-graph — describe your automation and get a visual workflow',
    'features.workflows.highlight2':
      'Parallel execution — run multiple branches simultaneously',
    'features.workflows.highlight3':
      'Loops & conditionals — handle complex logic with flow control',
    'features.workflows.highlight4':
      'Save & reuse — run saved workflows on-demand, daily, or weekly',
    'features.cowork.tag': 'FILES',
    'features.cowork.title': 'Cowork',
    'features.cowork.description':
      'Give the agent access to local files. Research the web, then save reports to your computer.',
    'features.cowork.detail':
      'Cowork lets the agent read and write files on your computer. Select a folder and the agent can read documents, write reports, and run shell commands—all while browsing the web. Research a topic online and generate an HTML report. Scrape product data and save it as a spreadsheet. The agent is sandboxed to your selected folder and cannot access anything outside it.',
    'features.cowork.highlight1':
      'Read & write files — create reports, spreadsheets, and markdown documents',
    'features.cowork.highlight2':
      'Run shell commands — execute commands within your selected folder',
    'features.cowork.highlight3':
      'Browser + files — combine web research with local file operations',
    'features.cowork.highlight4':
      'Sandboxed security — agent can only access the folder you select',
    'features.split.tag': 'CORE',
    'features.split.title': 'Split-View Mode',
    'features.split.description':
      'Open ChatGPT, Claude, or Gemini alongside any webpage. Compare responses in the LLM Hub.',
    'features.split.detail':
      'Access AI chat on any webpage without switching tabs. Click the Chat button or press Alt+K to open a panel with Claude, ChatGPT, or Gemini right next to your current page. Copy page content, attach screenshots, and get answers in context. Open the LLM Hub (Cmd+Shift+U) to query multiple models simultaneously and compare their responses side-by-side.',
    'features.split.highlight1':
      'AI on any page — chat panel stays open as you browse',
    'features.split.highlight2':
      'LLM Hub — compare responses from Claude, ChatGPT, and Gemini at once',
    'features.split.highlight3':
      'Quick toggle — Alt+K opens chat, Alt+L switches providers',
    'features.split.highlight4':
      'Copy & screenshot — grab page content or capture screenshots for context',
    'features.coding.tag': 'DEV',
    'features.coding.title': 'Agentic Coding',
    'features.coding.description':
      'Claude Code tests your web app, reads console errors, and fixes your code in one loop.',
    'features.coding.detail':
      'The killer workflow for frontend developers. Claude Code connects to {product}, opens your localhost app, clicks through the UI, reads console errors and network failures, then goes back to your codebase to fix the bugs—all in one continuous loop. No more switching between terminal and browser. No more copy-pasting error messages. Just describe the issue and let the agent debug it end-to-end.',
    'features.coding.highlight1':
      'Test & fix loop — Claude navigates your app, finds bugs, and patches them',
    'features.coding.highlight2':
      'Console access — read browser console and network errors from your terminal',
    'features.coding.highlight3':
      'Screenshot debugging — Claude captures screenshots to understand visual issues',
    'features.coding.highlight4':
      'Rapid prototyping — build UIs faster with AI that sees your work',
  },
  'zh-CN': {
    'mode.chat.label': '聊天',
    'mode.chat.title': '只读页面聊天',
    'mode.agent.label': '代理',
    'mode.agent.title': '完整浏览器自动化',
    'mode.lobster.label': 'NovaClaw',
    'mode.lobster.title': '高自主浏览器执行模式',
    'mode.selector.title': '选择模式',
    'mode.selector.description': '根据任务类型切换聊天、代理或 NovaClaw 模式',
    'novaclaw.header.exec': '执行模型',
    'novaclaw.header.plugins': '插件',
    'novaclaw.model.current': '当前聊天模型',
    'chat.empty.chatTitle': '和当前页面聊天',
    'chat.empty.chatSubtitle': '针对当前页面或任意主题直接提问',
    'chat.empty.agentTitle': '代理已就绪',
    'chat.empty.agentSubtitle': '让 AI 自动浏览并执行任务',
    'chat.empty.lobsterTitle': 'NovaClaw 模式',
    'chat.empty.lobsterSubtitle': '搜索、规划、执行并完成复杂浏览器任务',
    'chat.input.transcribing': '正在转录...',
    'chat.input.chatPlaceholder': '问问这个页面...',
    'chat.input.agentPlaceholder': '你希望我做什么？',
    'chat.input.lobsterPlaceholder': '让 NovaClaw 去搜索、规划并完成任务...',
    'chat.badge.chat': '聊天',
    'chat.badge.agent': '代理',
    'chat.badge.lobster': 'NovaClaw',
    'chat.suggestion.chat.summarize.display': '总结这个页面',
    'chat.suggestion.chat.summarize.prompt':
      'Read the current tab and summarize it in bullet points',
    'chat.suggestion.chat.topics.display': '这个页面主要讲什么？',
    'chat.suggestion.chat.topics.prompt':
      'Read the current tab and briefly describe what it is about in 1-2 lines',
    'chat.suggestion.chat.comments.display': '提取页面评论',
    'chat.suggestion.chat.comments.prompt':
      'Read the current tab and extract comments as bullet points',
    'chat.suggestion.agent.upvote.display': '阅读我们的愿景并点赞',
    'chat.suggestion.agent.upvote.prompt':
      'Go to https://dub.sh/browseros-launch in current tab. Find and click the upvote button',
    'chat.suggestion.agent.github.display': '在 Github 支持 NovaPilotX',
    'chat.suggestion.agent.github.prompt':
      'Go to http://git.new/browseros in current tab and star the repository',
    'chat.suggestion.agent.amazon.display':
      '打开 amazon.com 并购买 Sensodyne 牙膏',
    'chat.suggestion.agent.amazon.prompt':
      'Open amazon.com in current tab and add sensodyne toothpaste to cart',
    'chat.suggestion.lobster.compare.display': '搜索、对比并给出推荐',
    'chat.suggestion.lobster.compare.prompt':
      'Search the web for the best options, compare them, and give me a recommendation with reasoning.',
    'chat.suggestion.lobster.execute.display': '研究并执行任务',
    'chat.suggestion.lobster.execute.prompt':
      'Research what is needed, make a plan, use the browser to do the work, then summarize the result.',
    'chat.suggestion.lobster.tools.display':
      '端到端使用 NovaPilotX 工具',
    'chat.suggestion.lobster.tools.prompt':
      'Use NovaPilotX browser tools to search, gather evidence, and complete the task step by step.',
    'newtab.search.placeholder': '向 {product} 提问，或搜索 {provider}...',
    'newtab.search.askProduct': '询问 {product}：',
    'login.welcome': '欢迎使用 {product}',
    'onboarding.welcome': '欢迎使用',
    'onboarding.footer': '{product} © {year} - {tagline}',
    'route.lobsterTitle': 'NovaClaw',
    'settings.back': '返回',
    'settings.title': '设置',
    'settings.help': '帮助',
    'settings.section.providers': '模型与提供商',
    'settings.section.other': '其他',
    'settings.nav.ai': '{product} AI',
    'settings.nav.chatCouncil': '聊天与 Council 模型',
    'settings.nav.search': '搜索提供商',
    'settings.nav.customize': '自定义 {product}',
    'settings.nav.mcp': '{product} 作为 MCP',
    'settings.nav.chatIntegrations': '聊天接入',
    'settings.nav.novaclaw': 'NovaClaw',
    'settings.nav.workflows': '工作流',
    'settings.nav.docs': '文档',
    'settings.nav.features': '功能介绍',
    'settings.nav.revisitOnboarding': '重新查看引导',
    'sidebar.home': '首页',
    'sidebar.connectApps': '连接应用',
    'sidebar.scheduledTasks': '定时任务',
    'sidebar.skills': 'Skills',
    'sidebar.skillsMarketplace': 'Skills 商城',
    'sidebar.memory': '记忆',
    'sidebar.soul': '灵魂',
    'sidebar.settings': '设置',
    'mcp.setupClient': '配置客户端',
    'mcp.serverUrl': '服务地址：',
    'mcp.loading': '加载中...',
    'mcp.remoteAccess':
      '已开启外部访问。如需从其他设备连接，请将 127.0.0.1 替换为本机 IP 地址。',
    'connectMcp.title': '已连接应用',
    'connectMcp.description':
      '将 {product} 助手连接到应用，用来发邮件、安排日历、写文档等',
    'skills.mySkills': '我的 Skills',
    'skills.builtinSkills': '{product} Skills',
    'skills.viewSkill': '查看 Skill',
    'skills.editSkill': '编辑 Skill',
    'skills.createSkill': '创建 Skill',
    'skills.managedByProduct':
      '这个 Skill 由 {product} 管理并自动更新。',
    'skills.editDescription':
      '完善这个 Skill 何时触发，以及代理应如何执行它。',
    'skills.createDescription':
      '定义一套可复用的指令，让代理在请求匹配时自动应用。',
    'skills.name': '名称',
    'skills.nameHint': '尽量简短，便于在 Skills 列表中识别。',
    'skills.description': '描述',
    'skills.descriptionHint': '这是代理选择该 Skill 时使用的触发摘要。',
    'skills.tip': '提示',
    'skills.tip.step1': '列出代理应该按顺序执行的步骤。',
    'skills.tip.step2': '最后说明你希望得到的输出或格式。',
    'skills.instructions': '说明（Markdown）',
    'skills.savedLocally': '已保存在本地，可立即被代理使用。',
    'skills.close': '关闭',
    'skills.marketplace.title': 'Skills 商城',
    'skills.marketplace.subtitle':
      '浏览远程 Skill 目录，把更多能力安装到你的本地 {product} 工作区。',
    'skills.marketplace.sectionTitle': '商城',
    'skills.marketplace.sectionSubtitle':
      '浏览精选目录、比较兼容性，并把 Skills 安装到你的本地 {product} 工作区。',
    'skills.marketplace.results': '当前显示 {shown} / {total} 个 Skill',
    'skills.marketplace.sources':
      '来源包括 {product} Catalog、OpenAI Curated 和 OpenClaw。',
    'skills.marketplace.compatibilityNote':
      '兼容等级基于元数据推断，不代表完整运行时保证。',
    'skills.marketplace.tiersLabel': '兼容等级',
    'skills.marketplace.tierGuide': '高 80-100，中 60-79，低 0-59',
    'skills.marketplace.searchPlaceholder': '搜索 Skill、ID 或用途',
    'skills.marketplace.filter.all': '全部',
    'skills.marketplace.filter.product': '{product}',
    'skills.marketplace.filter.openAI': 'OpenAI Curated',
    'skills.marketplace.filter.openClaw': 'OpenClaw',
    'skills.marketplace.filter.installedOnly': '仅已安装',
    'skills.marketplace.filter.compatibleOnly': '仅兼容',
    'skills.marketplace.filter.favorites': '收藏',
    'skills.marketplace.filter.sortCompatibility': '排序：兼容性',
    'skills.marketplace.filter.sortName': '排序：名称',
    'skills.marketplace.openClawInstallTitle': '按 OpenClaw slug 安装',
    'skills.marketplace.openClawInstallDescription':
      'ClawHub 是注册表和 CLI 生态。如果公开列表被限流，可以直接按已知 slug 安装。',
    'skills.marketplace.openClawInstallPlaceholder':
      '输入 OpenClaw slug，例如 google-drive',
    'skills.marketplace.openClawInstallAction': '从 OpenClaw 安装',
    'skills.marketplace.empty': '当前筛选条件下没有匹配的商城 Skill。',
    'skills.marketplace.badge.builtIn': '内置',
    'skills.marketplace.badge.installed': '已安装',
    'skills.marketplace.badge.favorite': '已收藏',
    'skills.marketplace.badge.recent': '最近查看',
    'skills.marketplace.compatibilityBadge': '{tier} · {score}',
    'skills.marketplace.tier.high': '高',
    'skills.marketplace.tier.medium': '中',
    'skills.marketplace.tier.low': '低',
    'skills.marketplace.details': '详情',
    'skills.marketplace.prev': '上一页',
    'skills.marketplace.next': '下一页',
    'skills.marketplace.loadMore': '加载更多',
    'skills.marketplace.pageOf': '第 {page} / {total} 页',
    'skills.marketplace.favoriteAction': '收藏',
    'skills.marketplace.unfavoriteAction': '取消收藏',
    'skills.marketplace.copySkillId': '复制 Skill ID',
    'skills.marketplace.copyInstallCommand': '复制安装命令',
    'skills.marketplace.section.compatibility': '兼容性说明',
    'skills.marketplace.section.installCommand': '安装命令',
    'skills.marketplace.section.frontmatter': 'Frontmatter 预览',
    'skills.marketplace.section.summary': 'SKILL.md 摘要',
    'skills.marketplace.section.outline': '章节结构',
    'skills.marketplace.section.skillId': 'Skill ID',
    'skills.marketplace.section.safety':
      '生产环境启用前请先审查不熟悉的 Skill。商城安装会把 Skill 包复制到你的本地 {product} skills 目录。',
    'skills.marketplace.noSummary': '暂无摘要预览。',
    'skills.marketplace.noOutline': '未检测到章节标题。',
    'skills.marketplace.installSkill': '安装 Skill',
    'skills.marketplace.install': '安装',
    'skills.marketplace.installing': '安装中...',
    'skills.marketplace.toast.installed': '已安装 Skill：{id}',
    'skills.marketplace.toast.installFailed': '安装 Skill 失败',
    'skills.marketplace.reason.compatibilityOpenClaw':
      '兼容性元数据里提到了 OpenClaw。',
    'skills.marketplace.reason.compatibilityAgentSkills':
      '兼容性元数据里提到了 AgentSkills。',
    'skills.marketplace.reason.allowedTools': '声明了 allowed-tools。',
    'skills.marketplace.reason.license': '声明了 license 元数据。',
    'skills.marketplace.reason.browserWorkflow':
      '说明内容与浏览器代理工作流匹配。',
    'skills.marketplace.reason.runtimeRequirements':
      '包含可能需要适配的运行时或工具依赖。',
    'skills.marketplace.reason.firstPartyCatalog':
      '来自第一方 {product} Catalog。',
    'skills.marketplace.reason.clawHubSource':
      '来自 OpenClaw ClawHub 来源。',
    'skills.marketplace.reason.clawHubRegistry':
      '通过官方 OpenClaw ClawHub 注册表发布。',
    'skills.marketplace.reason.clawHubStarter':
      '这是推荐的 ClawHub 起步 slug。',
    'skills.marketplace.reason.clawHubDownload':
      '安装路径使用了官方 ClawHub 下载 API。',
    'features.welcome': '欢迎',
    'features.heroTitle': '为什么切换到 {product}？',
    'features.heroSubtitle':
      '通过启动视频快速了解 {product} 的愿景和核心功能。',
    'features.heroVideoTitle': '{product} MCP Server 演示',
    'features.scroll': '向下滚动查看功能',
    'features.sectionTitle': '功能',
    'features.exploreTitle': '看看都能做到什么',
    'features.exploreSubtitle':
      '先快速浏览下面的亮点，点击任一卡片可打开更详细的讲解与视频。',
    'features.cardTip': '提示：点击卡片可查看带视频的详细说明',
    'features.openDetails': '查看详情',
    'features.videoMins': '视频：{duration} 分钟',
    'features.communityTitle': '加入社区，一起改进 {product}！',
    'features.community.discord': '加入 Discord',
    'features.community.slack': '加入 Slack',
    'features.community.github': 'GitHub',
    'features.community.docs': '文档',
    'features.community.feedback': '提交功能建议 / 反馈',
    'features.community.star': '给仓库点个 Star',
    'features.community.learn': '了解更多',
    'features.startUsing': '开始使用 {product}',
    'features.agent.tag': 'AI 代理',
    'features.agent.title': '内置 AI 代理',
    'features.agent.description':
      '只要描述任务，{product} 就会替你点击、输入并导航执行。',
    'features.agent.detail':
      '{product} Agent 会把你的自然语言转换成浏览器动作。你只需要用普通语言描述需求，比如填写表单、从页面提取数据、按步骤完成流程，代理会自动执行点击、输入、跨页面导航和多步骤工作流。所有能力都在本地运行，并使用你自己的 API Key，数据不会离开你的设备。',
    'features.agent.highlight1':
      '多标签执行：可以同时在多个标签页里运行代理',
    'features.agent.highlight2':
      '智能导航：自动识别并操作页面元素',
    'features.agent.highlight3':
      '表单填写：结合上下文智能完成表单',
    'features.agent.highlight4': '数据提取：从任意网页抓取结构化信息',
    'features.agent.highlight5':
      '会话自动保存：下次可从 Assistant 面板继续',
    'features.mcp.tag': 'MCP',
    'features.mcp.title': '{product} 作为 MCP Server',
    'features.mcp.description':
      '连接 Claude Code、Gemini CLI 或任意 MCP 客户端，用 31 个工具控制浏览器。',
    'features.mcp.detail':
      '{product} 内置 MCP Server，让 AI 编码代理直接控制浏览器。Claude Code 可以打开标签页、点击元素、填写表单、截图、读取页面内容，全部通过自然语言完成。不同于 Chrome DevTools MCP 需要调试 profile 和独立服务，{product} 开箱即用。你只要从设置里复制服务地址并连接即可。',
    'features.mcp.highlight1':
      '一行命令接入：运行 `claude mcp add` 并填入服务地址',
    'features.mcp.highlight2':
      '31 个浏览器工具：标签页、点击、输入、截图、书签、历史记录',
    'features.mcp.highlight3':
      '广泛兼容：Claude Code、Gemini CLI、Codex、Claude Desktop',
    'features.mcp.highlight4':
      '支持已登录页面：可从 LinkedIn 等已登录页面提取数据',
    'features.workflows.tag': '自动化',
    'features.workflows.title': '可视化工作流',
    'features.workflows.description':
      '用可视化图构建稳定、可复用的自动化流程。',
    'features.workflows.detail':
      '工作流能把复杂浏览器任务变成可靠、可复用的自动化流程。你不再需要每次都依赖代理临场发挥，而是通过可视化图明确定义步骤顺序。直接在聊天里描述需求，工作流代理会生成图结构，再继续加入循环、条件和并行分支。保存之后，你可以按需、按天或按周重复运行。',
    'features.workflows.highlight1':
      '聊天生成图：描述任务即可得到可视化工作流',
    'features.workflows.highlight2': '并行执行：多个分支可同时运行',
    'features.workflows.highlight3': '循环与条件：支持复杂控制流',
    'features.workflows.highlight4':
      '保存复用：可按需、每日或每周重复执行',
    'features.cowork.tag': '文件',
    'features.cowork.title': 'Cowork',
    'features.cowork.description':
      '让代理访问本地文件。一边研究网页，一边把结果保存到电脑。',
    'features.cowork.detail':
      'Cowork 允许代理读写你电脑上的文件。你选择一个目录后，代理就能在浏览网页的同时读取文档、写报告、执行 shell 命令。比如在线调研一个主题并生成 HTML 报告，或者抓取商品数据并保存成表格。代理被限制在你选择的目录内，无法访问目录外内容。',
    'features.cowork.highlight1':
      '读写文件：创建报告、表格和 Markdown 文档',
    'features.cowork.highlight2': '运行 shell：在选定目录内执行命令',
    'features.cowork.highlight3':
      '浏览器 + 文件：把网页调研和本地文件操作结合起来',
    'features.cowork.highlight4':
      '沙盒安全：代理只能访问你指定的目录',
    'features.split.tag': '核心',
    'features.split.title': '分屏模式',
    'features.split.description':
      '在任意网页旁边打开 ChatGPT、Claude 或 Gemini，并在 LLM Hub 里比较回答。',
    'features.split.detail':
      '无需切标签页即可在任意网页上使用 AI 聊天。点击 Chat 按钮或按 Alt+K，即可在当前网页旁边打开 Claude、ChatGPT 或 Gemini 面板。你可以复制页面内容、附加截图并结合上下文提问。打开 LLM Hub（Cmd+Shift+U）可同时询问多个模型并并排比较它们的回答。',
    'features.split.highlight1': '任意页面聊天：边浏览边保持聊天面板开启',
    'features.split.highlight2':
      'LLM Hub：同时比较 Claude、ChatGPT、Gemini 的回答',
    'features.split.highlight3':
      '快捷切换：Alt+K 打开聊天，Alt+L 切换模型',
    'features.split.highlight4':
      '复制与截图：快速带上页面内容或截图作为上下文',
    'features.coding.tag': '开发',
    'features.coding.title': 'Agentic Coding',
    'features.coding.description':
      'Claude Code 可以测试你的 Web 应用、读取控制台错误并回写修复代码。',
    'features.coding.detail':
      '这是前端开发者最有杀伤力的工作流。Claude Code 连接到 {product} 后，可以打开你的 localhost 应用，点击页面流程，读取控制台和网络错误，再回到代码库修复问题，形成一个连续闭环。你不再需要反复在终端和浏览器之间切换，也不必复制粘贴错误信息。只要描述问题，代理就会端到端调试。',
    'features.coding.highlight1':
      '测试并修复闭环：Claude 导航你的应用、发现 bug、并直接打补丁',
    'features.coding.highlight2':
      '控制台访问：直接从终端读取浏览器控制台和网络错误',
    'features.coding.highlight3':
      '截图调试：Claude 会截图来理解视觉问题',
    'features.coding.highlight4':
      '快速原型：让 AI 直接“看见”你的工作成果并协助构建',
  },
}

export function formatMessage(
  template: string,
  params?: TranslateParams,
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}

export function getMessage(
  locale: Locale,
  key: string,
  params?: TranslateParams,
): string {
  const template = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key
  return formatMessage(template, params)
}
