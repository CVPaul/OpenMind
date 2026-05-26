# OpenMind

> 轻量级 AI 思维导图工具 · Lightweight AI Mind Map

**[在线使用 →](https://cvpaul.github.io/OpenMind)**

![License](https://img.shields.io/badge/license-MIT-blue)
![PWA](https://img.shields.io/badge/PWA-ready-brightgreen)
![No Backend](https://img.shields.io/badge/backend-none-lightgrey)

---

## 特性

- **零安装** — 单个 `index.html`，浏览器直接打开
- **可安装** — PWA 支持，Chrome/Edge 一键安装到桌面，离线可用
- **AI 驱动** — 内置 Claude / OpenAI 对话助手，自然语言修改导图
- **键盘优先** — Tab / Enter / Space / 方向键全键盘操作
- **三种布局** — 水平 · 垂直 · 放射状，一键切换
- **数据自由** — 导入/导出 JSON · SVG · PNG，本地存储不上云

## 快速开始

### 方式一：在线使用
访问 [https://cvpaul.github.io/OpenMind](https://cvpaul.github.io/OpenMind)，点击浏览器地址栏右侧「安装」图标即可装到桌面。

### 方式二：本地运行
```bash
git clone https://github.com/CVPaul/OpenMind.git
cd OpenMind
npx serve .
# 浏览器打开 http://localhost:3000
```

### 方式三：直接下载
下载 [index.html](https://github.com/CVPaul/OpenMind/raw/main/index.html) 单文件，用浏览器打开即用（PWA 功能需 HTTP 服务器）。

---

## 键盘快捷键

| 按键 | 操作 |
|------|------|
| `Tab` | 新增子节点 |
| `Enter` | 新增兄弟节点 |
| `F2` / 双击 | 编辑节点 |
| `Delete` | 删除节点（含子树）|
| `Space` | 折叠 / 展开 |
| `↑ ↓ ← →` | 节点间导航 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+F` | 适应屏幕 |
| 滚轮 | 缩放画布 |
| 拖拽空白 | 平移画布 |

---

## AI 助手

右侧面板点击「设置」，填入 API Key（存本地，不上传）：

- **Claude**：在 [console.anthropic.com](https://console.anthropic.com) 获取，默认使用 `claude-sonnet-4-6`
- **OpenAI**：在 [platform.openai.com](https://platform.openai.com) 获取，默认使用 `gpt-4o`

### 示例：30 秒生成一份商业计划导图

```
把这段话变成思维导图：
我想做一个面向设计师的 SaaS 工具，核心功能是 AI 自动生成 UI 组件，
目标用户是独立开发者和小团队，计划先做 Web 版再出 VS Code 插件，
商业模式是订阅制，定价 $9/$29 两档。
```

> AI 直接生成结构化导图，根节点「设计师 SaaS」，展开产品、用户、商业模式三条主线。

---

### 示例：一句话重构杂乱的导图

```
这个导图太平了，帮我按「问题 → 方案 → 验证」的框架重新组织
```

> 原来散乱的 20 个节点，被重新归入三条主线，逻辑立刻清晰。

---

### 示例：读论文 / 读书时边看边建图

```
我刚读完《思考，快与慢》第一章，帮我建一张导图：
系统1 是快速、自动、情绪化的思维；
系统2 是慢速、理性、费力的思维；
两者的典型冲突场景包括：光环效应、锚定效应、可得性偏差。
```

> 3 秒出图，读书笔记变成可折叠、可扩展的知识树。

---

### 示例：产品会议纪要 → 行动导图

```
把这段会议纪要变成导图，按「已决定 / 待讨论 / 行动项」分组：
决定 Q3 不做 App，专注 Web。待讨论：定价要不要降到 $9。
行动项：@李明 下周出原型，@王芳 联系3个目标用户做访谈。
```

> 会议结束时导图也建好了，行动项和负责人一目了然。

---

## 项目结构

```
OpenMind/
├── index.html        # 单文件应用（内联所有逻辑）
├── manifest.json     # PWA 描述
├── sw.js             # Service Worker（离线缓存）
├── icons/            # 应用图标
└── src/              # 模块源码
    ├── model.js      # 数据模型（节点/边 CRUD）
    ├── layout.js     # Walker 布局算法
    ├── render.js     # SVG 渲染引擎
    ├── editor.js     # 编辑交互 + 撤销栈
    ├── persist.js    # 本地存储 + 导入导出
    └── agent.js      # AI API 集成
```

---

## Roadmap

- [ ] 多文件管理（文件树）
- [ ] 节点颜色 / 图标自定义
- [ ] Markdown 导入 / 导出
- [ ] 协作编辑（基于 CRDT）
- [ ] Tauri 桌面原生版（Windows / macOS / Linux）
- [ ] 移动端适配

---

## 贡献

欢迎 PR 和 Issue。

```bash
git clone https://github.com/CVPaul/OpenMind.git
cd OpenMind
# 直接编辑 src/ 下各模块，用 npx serve . 预览
```

---

## License

MIT © [CVPaul](https://github.com/CVPaul)
