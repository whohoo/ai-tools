# update-opencode-volcengine

因为火山引擎（Doubao）只支持 code plan 或 agent plan 安装到 opencode, 现本脚本是根据已知的火山引擎（Doubao）AI 模型, 添加到 opencode 里, 此方式使用的是 api 计费方式, 非 plan 方式.

将火山引擎（Doubao）模型配置写入 OpenCode 配置文件（`opencode.json` / `opencode.jsonc`），无需安装，一行命令即用即走。

## 用法

```bash
curl -fsSL https://raw.githubusercontent.com/whohoo/ai-tools/main/scripts/update-opencode-volcengine.js | node
```

按提示选择安装目标：

1. `~/.config/opencode/opencode.jsonc` — 全局配置
2. `./.opencode/opencode.jsonc` — 当前目录配置

## 作用

- 从 GitHub 拉取最新的火山引擎模型配置
- 若目标文件不存在则新建
- 若已存在则合并 `volcengine-api.models`，保留用户自定义的其他配置
