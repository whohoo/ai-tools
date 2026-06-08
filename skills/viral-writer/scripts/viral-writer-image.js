/**
 * Viral Writer 图片生成器
 * 
 * 专门服务于 viral-writer skill，根据文章内容生成配图
 * 
 * 使用方式：
 * 1. 设置环境变量: export DASHSCOPE_API_KEY=your_api_key
 * 2. 运行: node viral-writer-image.js --cover "封面图描述" [--body "正文配图1描述" "正文配图2描述"]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const DEFAULT_MODEL = 'wan2.7-image-pro';
const DEFAULT_SIZE = '2048*2048';
const API_BASE_URL = 'dashscope.aliyuncs.com';

// API Key
function getApiKey() {
  return process.env.DASHSCOPE_API_KEY;
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    cover: '',
    body: [],
    model: DEFAULT_MODEL,
    size: DEFAULT_SIZE,
    output: './output',
    watermark: false,
    thinkingMode: true
  };
  
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--cover' || args[i] === '-c') && args[i + 1]) {
      config.cover = args[i + 1];
      i++;
    } else if ((args[i] === '--body' || args[i] === '-b') && args[i + 1]) {
      config.body.push(args[i + 1]);
      i++;
    } else if ((args[i] === '--model' || args[i] === '-m') && args[i + 1]) {
      config.model = args[i + 1];
      i++;
    } else if ((args[i] === '--size' || args[i] === '-s') && args[i + 1]) {
      config.size = args[i + 1];
      i++;
    } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      config.output = args[i + 1];
      i++;
    } else if (args[i] === '--no-watermark') {
      config.watermark = false;
    } else if (args[i] === '--no-thinking') {
      config.thinkingMode = false;
    }
  }
  
  return config;
}

// 调用文生图 API
async function generateImage(prompt, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('请设置环境变量 DASHSCOPE_API_KEY');
  }
  
  const model = options.model || DEFAULT_MODEL;
  const size = options.size || DEFAULT_SIZE;
  const negativePrompt = options.negativePrompt || '低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲。';
  
  // 判断是同步还是异步模型
  const syncModels = ['qwen-image-2.0', 'qwen-image-2.0-pro', 'qwen-image-plus', 'qwen-image-max'];
  const isSync = syncModels.includes(model) || model.startsWith('qwen-image');
  
  const requestBody = {
    model: model,
    input: {
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }]
        }
      ]
    },
    parameters: {
      size: size,
      n: 1,
      watermark: options.watermark || false,
      negative_prompt: negativePrompt
    }
  };
  
  // 根据模型类型添加不同参数
  if (model.startsWith('wan2.7')) {
    requestBody.parameters.thinking_mode = options.thinkingMode !== false;
  } else if (!isSync) {
    requestBody.parameters.prompt_extend = true;
  }
  
  const requestBodyStr = JSON.stringify(requestBody);
  
  const requestOptions = {
    hostname: API_BASE_URL,
    path: isSync 
      ? '/api/v1/services/aigc/multimodal-generation/generation'
      : '/api/v1/services/aigc/image-generation/generation',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(requestBodyStr)
    }
  };
  
  if (!isSync) {
    requestOptions.headers['X-DashScope-Async'] = 'enable';
  }
  
  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.code) {
            reject(new Error(`API错误: ${result.code} - ${result.message}`));
            return;
          }
          
          if (isSync) {
            const imageUrl = result.output?.choices?.[0]?.message?.content?.[0]?.image;
            if (imageUrl) {
              resolve({ imageUrl, requestId: result.request_id, isSync: true });
            } else {
              reject(new Error('未获取到图片URL'));
            }
          } else {
            const taskId = result.output?.task_id;
            if (taskId) {
              resolve({ taskId, requestId: result.request_id, isSync: false });
            } else {
              reject(new Error('未获取到task_id'));
            }
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(requestBodyStr);
    req.end();
  });
}

// 查询异步任务状态
async function queryTask(taskId) {
  const apiKey = getApiKey();
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE_URL,
      path: `/api/v1/tasks/${taskId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const status = result.output?.task_status;
          const imageUrl = result.output?.choices?.[0]?.message?.content?.[0]?.image;
          resolve({ status, imageUrl, requestId: result.request_id });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// 等待异步任务完成
async function waitForTask(taskId, timeout = 120000, interval = 3000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await queryTask(taskId);
    
    if (result.status === 'SUCCEEDED') {
      return result;
    } else if (result.status === 'FAILED' || result.status === 'UNKNOWN') {
      throw new Error(`任务${result.status === 'FAILED' ? '失败' : '已过期'}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('等待任务超时');
}

// 下载图片
async function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// 生成单张图片
async function generateAndDownload(prompt, outputPath, options = {}) {
  console.log(`生成中: ${prompt.substring(0, 50)}...`);
  
  const result = await generateImage(prompt, options);
  
  let imageUrl;
  if (result.isSync) {
    imageUrl = result.imageUrl;
  } else {
    console.log(`  任务ID: ${result.taskId}`);
    console.log('  等待生成...');
    const taskResult = await waitForTask(result.taskId);
    imageUrl = taskResult.imageUrl;
  }
  
  if (!imageUrl) {
    throw new Error('未获取到图片URL');
  }
  
  await downloadImage(imageUrl, outputPath);
  console.log(`  已保存: ${outputPath}`);
  
  return outputPath;
}

// 主函数
async function main() {
  const config = parseArgs();
  
  if (!config.cover && config.body.length === 0) {
    console.log(`
Viral Writer 图片生成器

用法: node viral-writer-image.js [选项]

选项:
  --cover, -c         封面图描述 (必填其一)
  --body, -b          正文配图描述 (可多次使用)
  --model, -m        模型 (默认: ${DEFAULT_MODEL})
  --size, -s         尺寸 (默认: ${DEFAULT_SIZE}), 需要以“*”连接，例如 "1024*768", 如果是在 zsh shell 中使用，需要用 quotes 将尺寸括起来，例如 "1024*768"
  --output, -o       输出目录 (默认: ./output)
  --no-watermark     禁用水印
  --no-thinking      禁用思考模式

示例:
  # 生成封面图
  node viral-writer-image.js -c "温暖的家庭场景，父母和孩子坐在客厅"

  # 生成封面 + 多张正文配图
  node viral-writer-image.js \\
    -c "温暖的家庭场景" \\
    -b "城市天际线日落" \\
    -b "笔记本电脑和工作场景" \\
    -o ./article-images

环境变量:
  DASHSCOPE_API_KEY   阿里云百炼 API Key (必填)
`);
    process.exit(1);
  }
  
  if (!getApiKey()) {
    console.error('请设置环境变量 DASHSCOPE_API_KEY');
    console.error('获取 API Key: https://help.aliyun.com/zh/model-studio/get-api-key');
    process.exit(1);
  }
  
  // 确保输出目录存在
  if (!fs.existsSync(config.output)) {
    fs.mkdirSync(config.output, { recursive: true });
  }
  
  console.log(`\n模型: ${config.model} | 尺寸: ${config.size}\n`);
  
  const timestamp = Date.now();
  const results = [];
  
  // 生成封面图
  if (config.cover) {
    const coverPath = path.join(config.output, `cover_${timestamp}.png`);
    await generateAndDownload(config.cover, coverPath, config);
    results.push({ type: 'cover', path: coverPath });
  }
  
  // 生成正文配图
  for (let i = 0; i < config.body.length; i++) {
    const bodyPath = path.join(config.output, `body_${i + 1}_${timestamp}.png`);
    await generateAndDownload(config.body[i], bodyPath, config);
    results.push({ type: 'body', index: i + 1, path: bodyPath });
  }
  
  console.log('\n========== 生成完成 ==========');
  results.forEach(r => {
    console.log(`${r.type === 'cover' ? '封面' : '正文配图' + r.index}: ${r.path}`);
  });
  console.log('==============================\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('错误:', err.message);
    process.exit(1);
  });
}

module.exports = { generateImage, generateAndDownload };