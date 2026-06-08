# AGENTS.md

## Repository Overview

AI tools collection: skills, MCP servers, and related utilities. Currently early-stage with one skill (`viral-writer`). More will be added over time.

## Structure

- `skills/` — Each skill lives in its own subdirectory with a `SKILL.md` entrypoint
- `skills/viral-writer/` — Content creation tool for Chinese social media (WeChat, Xiaohongshu, Douyin)

## Key Conventions

- Skills must have a `SKILL.md` file in their root directory
- Reference files go in `references/`, examples in `examples/`, scripts in `scripts/`
- `references/about-me.md` is gitignored (personal data)
- Articles output to `articles/[YYYY-MM]/` with Chinese filenames
- Images output to `images/[YYYY-MM]/[标题]/` as `cover.png` and `body_1.png`, `body_2.png`, ...

## Environment Setup

Image generation scripts require:
```bash
export DASHSCOPE_API_KEY=your_api_key
```
API key source: https://help.aliyun.com/zh/model-studio/get-api-key

## Script Usage

From `skills/viral-writer/scripts/`:

```bash
# General image generation
node image-generator.js --prompt "描述" --model wan2.7-image-pro --size 2K

# Viral Writer specific (cover + body images)
node viral-writer-image.js --cover "封面描述" --body "正文配图描述"
```

Default model: `wan2.7-image-pro`. Default size: `2048*2048`.

## zsh Note

In zsh, use quotes around size arguments containing `*`:
```bash
node image-generator.js --size "1024*768"
```
