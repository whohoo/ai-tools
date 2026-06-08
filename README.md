# AI Tools

AI 工具集，包含 skills、MCP 服务器及相关实用工具。

## 项目结构

```shell
.
├── AGENTS.md          # AI 代理工作指引
├── skills/            # 技能目录
│   ├── README.md      # 技能列表说明
│   └── viral-writer/  # 自媒体内容创作技能
└── .gitignore
```

## 当前包含的 Skills

### viral-writer

自媒体内容创作工具，帮助创作者写出高质量的文章。

| 功能 | 说明 |
|------|------|
| 支持平台 | 微信公众号、小红书、抖音文案 |
| 内容创作 | 基于 11 个内容洞见维度深度创作 |
| 标题生成 | 提供 5 个标题方案供选择 |
| 图片生成 | 封面图 + 正文配图生成指导 |
| 摘要生成 | 自动生成文章摘要 |

详细使用说明请查看 [skills/viral-writer/SKILL.md](skills/viral-writer/SKILL.md)

## 快速开始

### 前置条件

- Node.js
- 阿里云百炼 API Key（图片生成功能需要）

### 环境配置

如果需要使用图片生成功能，配置 API Key：

```bash
# 方式一：设置环境变量
export DASHSCOPE_API_KEY=your_api_key

# 方式二：在项目根目录创建 .env 文件
echo "DASHSCOPE_API_KEY=your_api_key" > .env
```

获取 API Key: [https://help.aliyun.com/zh/model-studio/get-api-key](https://help.aliyun.com/zh/model-studio/get-api-key)

### 使用图片生成

```bash
cd skills/viral-writer/scripts

# 通用图片生成
node image-generator.js --prompt "描述" --model wan2.7-image-pro --size 2K

# Viral Writer 专用（封面 + 正文配图）
node viral-writer-image.js --cover "封面描述" --body "正文配图描述"
```

> zsh 用户注意：尺寸参数中的 `*` 需要用引号括起来，例如 `"1024*768"`

## 输出规范

- 文章输出路径：`articles/[YYYY-MM]/[主题简称].md`
- 图片输出路径：`images/[YYYY-MM]/[标题]/cover.png`、`body_1.png`、`body_2.png` ...

## 后续规划

- 更多 AI skills
- MCP 服务器
- 其他 AI 实用工具
