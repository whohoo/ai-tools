/**
 * 阿里云百炼文生图 - Node.js SDK
 * 
 * 支持模型：
 * - wan2.7-image-pro (推荐, 支持4K/2K/1K, 组图, 思考模式, 颜色主题)
 * - wan2.6-image (图文混排)
 * - qwen-image-2.0-pro (擅长文本渲染)
 * - qwen-image-plus / qwen-image-max (固定尺寸)
 * 
 * 使用方式：
 * node image-generator.js --prompt "描述" [--model model_name] [--size 2048*2048] [--output ./output]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置
const DEFAULT_MODEL = 'wan2.7-image-pro';
const DEFAULT_SIZE = '2048*2048';
const API_BASE_URL = 'dashscope.aliyuncs.com';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    prompt: '',
    model: DEFAULT_MODEL,
    size: DEFAULT_SIZE,
    n: 1,
    output: './output',
    negativePrompt: '',
    watermark: false,
    thinkingMode: true,
    promptExtend: true
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) {
      config.prompt = args[i + 1];
      i++;
    } else if (args[i] === '--model' && args[i + 1]) {
      config.model = args[i + 1];
      i++;
    } else if (args[i] === '--size' && args[i + 1]) {
      config.size = args[i + 1];
      i++;
    } else if (args[i] === '--n' && args[i + 1]) {
      config.n = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      config.output = args[i + 1];
      i++;
    } else if (args[i] === '--negative-prompt' && args[i + 1]) {
      config.negativePrompt = args[i + 1];
      i++;
    } else if (args[i] === '--no-watermark') {
      config.watermark = false;
    } else if (args[i] === '--no-thinking') {
      config.thinkingMode = false;
    } else if (args[i] === '--no-prompt-extend') {
      config.promptExtend = false;
    }
  }
  
  return config;
}

// 使用 HTTP 直接调用 API
async function generateImage(config) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('请设置环境变量 DASHSCOPE_API_KEY');
  }

  // 判断是同步还是异步模型
  const syncModels = ['qwen-image-2.0', 'qwen-image-2.0-pro', 'qwen-image-plus', 'qwen-image-max'];
  const isSync = syncModels.includes(config.model) || config.model.startsWith('qwen-image');
  
  const requestBody = {
    model: config.model,
    input: {
      messages: [
        {
          role: 'user',
          content: [{ text: config.prompt }]
        }
      ]
    },
    parameters: {
      size: config.size,
      n: config.n,
      watermark: config.watermark,
      negative_prompt: config.negativePrompt || undefined
    }
  };
  
  // 根据模型类型添加不同参数
  if (config.model.startsWith('wan2.7')) {
    requestBody.parameters.thinking_mode = config.thinkingMode;
  } else if (!isSync) {
    requestBody.parameters.prompt_extend = config.promptExtend;
  }
  
  const requestBodyStr = JSON.stringify(requestBody);
  
  const options = {
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
    options.headers['X-DashScope-Async'] = 'enable';
  }
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
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
            // 同步返回，直接获取图片
            const imageUrl = result.output?.choices?.[0]?.message?.content?.[0]?.image;
            if (imageUrl) {
              resolve({ imageUrl, requestId: result.request_id, isSync: true });
            } else {
              reject(new Error('未获取到图片URL'));
            }
          } else {
            // 异步返回，返回task_id
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
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('请设置环境变量 DASHSCOPE_API_KEY');
  }
  
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
          
          if (result.code) {
            reject(new Error(`API错误: ${result.code} - ${result.message}`));
            return;
          }
          
          const status = result.output?.task_status;
          const imageUrl = result.output?.choices?.[0]?.message?.content?.[0]?.image;
          
          resolve({
            status,
            imageUrl,
            requestId: result.request_id
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
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

// 等待异步任务完成
async function waitForTask(taskId, timeout = 120000, interval = 3000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await queryTask(taskId);
    
    if (result.status === 'SUCCEEDED') {
      return result;
    } else if (result.status === 'FAILED') {
      throw new Error('图片生成任务失败');
    } else if (result.status === 'UNKNOWN') {
      throw new Error('任务已过期');
    }
    
    console.log(`任务进行中... 状态: ${result.status}`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('等待任务超时');
}

// 主函数
async function main() {
  const config = parseArgs();
  
  if (!config.prompt || config.p) {
    console.log(`
用法: node image-generator.js --prompt "图片描述" [选项]

选项:
  --prompt, -p         图片描述 (必填)
  --model, -m         模型名称 (默认: ${DEFAULT_MODEL})
                      可选: wan2.7-image-pro, wan2.6-image, qwen-image-2.0-pro, qwen-image-plus
  --size, -s          输出尺寸 (默认: ${DEFAULT_SIZE})
                      可选: 1K, 2K, 4K, 或自定义如 1024*1024
  --n                 生成数量 (默认: 1)
  --output, -o        输出目录 (默认: ./output)
  --negative-prompt   反向提示词
  --no-watermark      禁用水印
  --no-thinking       禁用思考模式 (仅wan2.7)
  --no-prompt-extend  禁用提示词扩展

示例:
  node image-generator.js --prompt "一只可爱的猫咪" --model wan2.7-image-pro --size 2K
  node image-generator.js -p "都市夜景" -o ./images -n 4

环境变量:
  DASHSCOPE_API_KEY   阿里云百炼 API Key (必填)
`);
    process.exit(1);
  }
  
// 检查 API Key
  if (!process.env.DASHSCOPE_API_KEY) {
    console.error('请设置环境变量 DASHSCOPE_API_KEY');
    console.error('获取 API Key: https://help.aliyun.com/zh/model-studio/get-api-key');
    process.exit(1);
  }
  
  // 确保输出目录存在
  if (!fs.existsSync(config.output)) {
    fs.mkdirSync(config.output, { recursive: true });
  }
  
  console.log(`使用模型: ${config.model}`);
  console.log(`尺寸: ${config.size}`);
  console.log(`生成数量: ${config.n}`);
  console.log('正在生成图片...');
  
  try {
    const result = await generateImage(config);
    
    let imageUrls = [];
    
    if (result.isSync) {
      // 同步模式，直接获取图片
      imageUrls = [result.imageUrl];
    } else {
      // 异步模式，等待任务完成
      console.log(`任务ID: ${result.taskId}`);
      console.log('等待图片生成...');
      
      const taskResult = await waitForTask(result.taskId);
      
      if (taskResult.imageUrl) {
        imageUrls = [taskResult.imageUrl];
      }
    }
    
    // 下载图片
    console.log('下载图片中...');
    const timestamp = Date.now();
    const outputFiles = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const ext = path.extname(new URL(imageUrls[i]).pathname) || '.png';
      const outputPath = path.join(config.output, `image_${timestamp}${i > 0 ? '_' + i : ''}${ext}`);
      await downloadImage(imageUrls[i], outputPath);
      outputFiles.push(outputPath);
      console.log(`图片已保存: ${outputPath}`);
    }
    
    console.log('完成!');
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 导出模块接口
module.exports = {
  generateImage,
  queryTask,
  waitForTask,
  downloadImage
};

// 如果直接运行
if (require.main === module) {
  main();
}