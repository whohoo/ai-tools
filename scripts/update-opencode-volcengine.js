#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const https = require("https");

const GITHUB_REPO = "whohoo/ai-tools";
const GITHUB_BRANCH = "main";
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/config/opencode-volcengine.jsonc`;
const CDN_RAW_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@${GITHUB_BRANCH}/config/opencode-volcengine.jsonc`;
const LOCAL_CONFIG_PATH = path.resolve(__dirname, "../config/opencode-volcengine.jsonc");

function expandHome(filePath) {
  if (!filePath) return filePath;
  if (filePath === "~") return os.homedir();
  if (filePath.startsWith("~/") || filePath.startsWith("~\\")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function fetchRemoteConfig(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(
              new Error(
                `服务器返回状态码 ${res.statusCode}，无法获取配置文件。`,
              ),
            );
          }
        });
      })
      .on("error", (err) => {
        reject(
          new Error(
            `无法连接 GitHub: ${err.message}。请检查网络连接。`,
          ),
        );
      });
  });
}

function stripJsonComments(text) {
  let result = "";
  let inString = false;
  let escaped = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inSingleLineComment) {
      if (char === "\n") {
        inSingleLineComment = false;
        result += char;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (char === "*" && next === "/") {
        inMultiLineComment = false;
        i += 1;
      }
      continue;
    }

    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
      continue;
    }

    if (!inString && char === "/" && next === "/") {
      inSingleLineComment = true;
      i += 1;
      continue;
    }

    if (!inString && char === "/" && next === "*") {
      inMultiLineComment = true;
      i += 1;
      continue;
    }

    result += char;
    escaped = char === "\\" && !escaped;
  }

  return result;
}

function parseJsonc(text, sourceName) {
  try {
    return JSON.parse(stripJsonComments(text));
  } catch (error) {
    throw new Error(
      `Failed to parse JSON/JSONC from ${sourceName}: ${error.message}`,
    );
  }
}

function safeStringify(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function getModelNames(models) {
  return Object.values(models || {}).map((m) => m.name);
}

function mergeModels(sourceModels, targetModels) {
  const result = Object.assign({}, targetModels || {});
  for (const key of Object.keys(sourceModels || {})) {
    result[key] = sourceModels[key];
  }
  return result;
}

function deepMerge(source, target) {
  if (Array.isArray(source) || Array.isArray(target)) {
    return source;
  }
  if (
    source &&
    typeof source === "object" &&
    target &&
    typeof target === "object"
  ) {
    const merged = Object.assign({}, target);
    for (const key of Object.keys(source)) {
      if (
        key === "models" &&
        typeof source[key] === "object" &&
        typeof target[key] === "object"
      ) {
        merged[key] = mergeModels(source[key], target[key]);
      } else if (
        source[key] &&
        typeof source[key] === "object" &&
        target[key] &&
        typeof target[key] === "object"
      ) {
        merged[key] = deepMerge(source[key], target[key]);
      } else {
        merged[key] = source[key];
      }
    }
    return merged;
  }
  return source;
}

const DEST_CHOICES = [
  {
    name: path.join(os.homedir(), ".config", "opencode", "opencode.jsonc"),
    dir: path.join(os.homedir(), ".config", "opencode"),
  },
  {
    name: path.resolve(process.cwd(), ".opencode", "opencode.jsonc"),
    dir: path.resolve(process.cwd(), ".opencode"),
  },
];

function chooseDestination() {
  return new Promise((resolve, reject) => {
    console.log("请选择安装目标目录:");
    console.log("  1) ~/.config/opencode/opencode.jsonc");
    console.log("  2) ./ .opencode/opencode.jsonc (当前目录)");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("输入 1 或 2 后按回车: ", (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === "1") return resolve(DEST_CHOICES[0]);
      if (trimmed === "2") return resolve(DEST_CHOICES[1]);
      reject(new Error("请选择 1 或 2。"));
    });
  });
}

function parseArgv() {
  const args = { local: false, dest: null };
  for (const a of process.argv.slice(2)) {
    if (a === "--local") args.local = true;
    else if (a === "1" || a === "2") args.dest = parseInt(a, 10);
  }
  return args;
}

async function run() {
  const args = parseArgv();

  let sourceRaw, sourceName;
  if (args.local) {
    sourceName = LOCAL_CONFIG_PATH;
    if (!fs.existsSync(sourceName)) {
      console.error(`本地配置文件不存在: ${sourceName}`);
      process.exit(1);
    }
    sourceRaw = fs.readFileSync(sourceName, "utf8");
    console.log(`从本地读取配置: ${sourceName}`);
  } else {
    sourceName = "远程配置";
    try {
      console.log("正在从 GitHub 获取最新配置...");
      sourceRaw = await fetchRemoteConfig(GITHUB_RAW_URL);
    } catch {
      console.log("GitHub 直连失败，尝试 CDN 加速...");
      try {
        sourceRaw = await fetchRemoteConfig(CDN_RAW_URL);
      } catch (error) {
        console.error(`获取配置失败: ${error.message}`);
        process.exit(1);
      }
    }
  }

  const sourceConfig = parseJsonc(sourceRaw, sourceName);
  if (!sourceConfig || typeof sourceConfig !== "object") {
    console.error("源配置文件解析失败，结果不是对象。");
    process.exit(1);
  }

  let destination;
  if (args.dest) {
    destination = DEST_CHOICES[args.dest - 1];
    console.log(`安装目标: ${destination.name}`);
  } else if (process.stdin.isTTY) {
    try {
      destination = await chooseDestination();
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  } else {
    destination = DEST_CHOICES[0];
    console.log(`使用默认安装目标: ${destination.name}`);
  }

  const targetJsoncPath = destination.name;
  const targetJsonPath = path.join(
    path.dirname(targetJsoncPath),
    "opencode.json",
  );
  const targetDir = destination.dir;

  let existingPath = null;
  if (fs.existsSync(targetJsoncPath)) {
    existingPath = targetJsoncPath;
  } else if (fs.existsSync(targetJsonPath)) {
    existingPath = targetJsonPath;
  }

  if (!existingPath) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetJsoncPath, sourceRaw, "utf8");
    const names = getModelNames(sourceConfig.provider?.["volcengine-api"]?.models);
    console.log(`已复制源配置到 ${targetJsoncPath}`);
    console.log(`新增模型: ${names.join(", ")}`);
    return;
  }

  const targetRaw = fs.readFileSync(existingPath, "utf8");
  const targetConfig = parseJsonc(targetRaw, existingPath);
  if (!targetConfig || typeof targetConfig !== "object") {
    console.error(`目标配置文件解析失败: ${existingPath}`);
    process.exit(1);
  }

  const sourceVolc = sourceConfig.provider?.["volcengine-api"];
  if (!sourceVolc || typeof sourceVolc !== "object") {
    console.error("源配置文件内缺少 provider.volcengine-api 属性。");
    process.exit(1);
  }

  const targetProvider = targetConfig.provider || {};
  if (!targetProvider["volcengine-api"]) {
    const updated = Object.assign({}, targetConfig, {
      provider: Object.assign({}, targetProvider, {
        "volcengine-api": sourceVolc,
      }),
    });
    fs.writeFileSync(existingPath, safeStringify(updated), "utf8");
    const names = getModelNames(sourceVolc.models);
    console.log(
      `目标配置中不存在 provider.volcengine-api，已将该属性写入 ${existingPath}`,
    );
    console.log(`新增模型: ${names.join(", ")}`);
    return;
  }

  const targetVolc = targetProvider["volcengine-api"];
  const sourceModels = sourceVolc.models || {};
  const targetModels = targetVolc.models || {};
  const mergedModels = Object.assign({}, targetModels, sourceModels);

  const updatedVolc = Object.assign({}, targetVolc, { models: mergedModels });
  const updatedConfig = Object.assign({}, targetConfig, {
    provider: Object.assign({}, targetProvider, {
      "volcengine-api": updatedVolc,
    }),
  });
  fs.writeFileSync(existingPath, safeStringify(updatedConfig), "utf8");
  const newModelKeys = Object.keys(sourceModels).filter(
    (key) => !targetModels[key],
  );
  const newNames = newModelKeys.map((k) => sourceModels[k].name);
  console.log(
    `目标配置中的 volcengine-api.models 已合并更新到 ${existingPath}`,
  );
  if (newNames.length > 0) {
    console.log(`新增模型: ${newNames.join(", ")}`);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
