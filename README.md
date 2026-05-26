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

示例指令：
```
帮我展开「竞品分析」节点，生成 5 个子主题
把整个导图重新组织，让逻辑更清晰
给每个叶子节点补充一句简短说明
```

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
