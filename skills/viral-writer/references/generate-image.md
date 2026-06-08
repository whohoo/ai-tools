# 生成配图说明如下

- 并按照要求生成图片, `DASHSCOPE_API_KEY`变量与可用模型名称请从`.env`文件中获取。
- 生成图片后，需要把图片放到项目根目录的 `images/[YYYY-MM]/[标题]/` 目录下，并重命名为 `cover.png` 和 `body_1.png`, `body_2.png`, ..., `body_n.png`。
- [YYYY-MM], [标题] 分别替换为当前年月和文章标题，[标题] 中的特殊字符需要替换为下划线。
- viral-writer skill 配套了图片生成脚本，位于 `./scripts/` 目录：

**脚本1: image-generator.js** - 通用图片生成器

```bash
# 设置 API Key
export DASHSCOPE_API_KEY=your_api_key

# 基本用法
node ./scripts/image-generator.js \
  --prompt "一只可爱的猫咪" \
  --model wan2.7-image-pro \
  --size 2K \
  --output ./output
```

**脚本2: viral-writer-image.js** - Viral Writer 专用图片生成器

```bash
# 生成封面 + 多张正文配图
node ./scripts/viral-writer-image.js \
  --cover "温暖的家庭场景，父母和孩子坐在客厅" \
  --body "城市天际线日落" \
  --body "笔记本电脑和工作场景" \
  --output ./article-images
```

**支持的模型：**

- `wan2.7-image-pro` (推荐，支持4K高清、思考模式)
- `wan2.6-image` (图文混排)
- `qwen-image-2.0-pro` (擅长文本渲染)

**支持的尺寸：**

- `1K` = 1024x1024
- `2K` = 2048x2048
- `4K` = 4096x4096 (仅 wan2.7-image-pro)
- 自定义: `1024*768`, `1920*1080` 等, 需要以“*”连接，例如 "1024*768", 如果是在 zsh shell 中使用，需要用 quotes 将尺寸括起来，例如 "1024*768"

**环境变量：**

- `DASHSCOPE_API_KEY`: 阿里云百炼 API Key
- 获取方式：[https://help.aliyun.com/zh/model-studio/get-api-key](https://help.aliyun.com/zh/model-studio/get-api-key)
