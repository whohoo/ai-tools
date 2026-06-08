# Skills 目录

本目录存放所有可用的 AI 技能。每个技能是一个独立的子目录，包含 `SKILL.md` 作为入口文件。

## 安装技能

使用 `npx skills` 命令安装技能到当前项目：

```bash
# 安装 viral-writer（自媒体内容创作）
npx skills add whohoo/ai-tools viral-writer

# 安装 humanizer-zh（中文内容润色，去除 AI 味）
npx skills add op7418/humanizer-zh
```

> `viral-writer` 依赖 `humanizer-zh` 来润色文章内容，去除 AI 痕迹，使文章更自然。请确保两个技能都已安装。

## 当前技能

### viral-writer - 自媒体内容创作

`viral-writer` 是一个专业的内容策划与创作引擎，服务于自媒体从业者。帮助用户将主题或素材转化为适配特定平台、能够打动读者的完整内容。

**支持平台：**

- 微信公众号
- 小红书
- 抖音文案

**核心功能：**

- 基于 11 个内容洞见维度进行深度创作（核心观点、说服策略、情绪触发、金句、情感曲线等）
- 自动生成 5 个标题方案供选择
- 提供封面图和正文配图的生成指导
- 生成摘要
- 输出格式化的 Markdown 文章

**创建 `about-me.md` 文件：**

技能会读取 `skills/viral-writer/references/about-me.md` 来了解作者的背景信息和擅长领域。该文件已被 gitignore，不会提交到仓库。

创建该文件可帮助技能更精准地匹配你的写作风格和领域专长：

```bash
# 文件路径
skills/viral-writer/references/about-me.md

# 建议包含内容
- 你的职业背景
- 擅长的领域/话题
- 写作风格偏好
- 目标受众特征
```

**图片生成支持：**

脚本支持 **阿里云百炼 (DashScope)** 平台的文生图能力。

支持的模型：

| 模型 | 特点 |
|------|------|
| `wan2.7-image-pro` | 推荐，支持 4K 高清、思考模式 |
| `wan2.6-image` | 图文混排 |
| `qwen-image-2.0-pro` | 擅长文本渲染 |
| `qwen-image-plus` | 固定尺寸 |
| `qwen-image-max` | 固定尺寸 |

**使用图片生成前，需要配置环境变量：**

```bash
# 方式一：直接设置环境变量
export DASHSCOPE_API_KEY=your_api_key

# 方式二：在 .env 文件中定义（脚本会读取）
# .env 文件内容：
DASHSCOPE_API_KEY=your_api_key
```

API Key 获取地址：[https://help.aliyun.com/zh/model-studio/get-api-key](https://help.aliyun.com/zh/model-studio/get-api-key)

**快速开始：**

```bash
# 进入技能目录
cd skills/viral-writer/scripts

# 生成图片
node image-generator.js --prompt "描述" --model wan2.7-image-pro --size 2K

# 生成封面 + 正文配图
node viral-writer-image.js --cover "封面描述" --body "正文配图描述"
```

> 注意：在 zsh 中使用 `*` 连接的尺寸参数时，需要用引号括起来，例如 `"1024*768"`。

### humanizer-zh - 中文内容润色

`humanizer-zh` 用于将 AI 生成的中文内容进行润色，去除 AI 痕迹，使文本更自然、更像人类写作。

**安装：**

```bash
npx skills add op7418/humanizer-zh
```

**用途：**

`viral-writer` 在创作流程的最后一步会调用此技能对文章进行人性化处理，确保输出内容读起来自然流畅。

详细信息：https://github.com/op7418/humanizer-zh
