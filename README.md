# 🚀 TypeScript MCP开发完整教程

这是专为前端小白设计的TypeScript MCP开发教程，从零开始教你开发MCP服务器。

## 📋 目录

- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [核心概念](#核心概念)
- [开发指南](#开发指南)
- [调试技巧](#调试技巧)
- [部署方法](#部署方法)
- [常见问题](#常见问题)

## 🚀 快速开始

### 1. 环境准备

确保已安装：
- Node.js 18.x 或更高版本
- npm 包管理器

### 2. 安装依赖

```bash
npm install
```

### 3. 编译项目

```bash
npm run build
```

### 4. 选择传输模式

#### STDIO 模式（传统方式）
```bash
# 运行计算器服务器
npm run calculator

# 运行文件管理器服务器
npm run file-manager
```

#### HTTP 模式（支持浏览器访问）
```bash
# 运行计算器 HTTP 服务器（端口3001）
npm run calculator-http

# 运行文件管理器 HTTP 服务器（端口3002）
npm run file-manager-http

# 或使用统一版本自定义端口
TRANSPORT=http PORT=3003 npm run calculator-unified
```

### 5. 测试服务器

#### STDIO 模式测试
```bash
npm test
```

#### HTTP 模式测试
```bash
# 打开浏览器访问测试页面
# 方式1：直接打开文件
open public/index.html

# 方式2：使用本地服务器
npx serve public
# 然后访问 http://localhost:8080

# 方式3：使用curl测试
# 测试计算器服务器
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "test-client", "version": "1.0.0" }
    }
  }'
```

## 📁 项目结构

```
mcp-tutorial/
├── src/
│   ├── calculator-server.ts        # 计算器MCP服务器 (STDIO)
│   ├── calculator-server-fixed.ts  # 修复版计算器服务器
│   ├── calculator-server-unified.ts # 统一传输模式计算器服务器
│   ├── file-manager.ts            # 文件管理器MCP服务器 (STDIO)
│   ├── file-manager-unified.ts    # 统一传输模式文件管理器服务器
│   └── test-client.ts             # 客户端测试工具
├── public/
│   └── index.html                 # 浏览器测试页面
├── dist/                          # 编译后的JavaScript文件
├── package.json
├── tsconfig.json
├── HTTP_SERVER_GUIDE.md          # HTTP模式详细指南
└── README.md
```

## 🎯 核心概念

### MCP是什么？

MCP (Model Context Protocol) 是一个开放协议，用于标准化AI应用与大语言模型的连接方式。它就像一个"USB-C接口"，让AI模型可以安全地连接到各种数据源和工具。

### 三大核心组件详解

#### 1. Tools (工具) - registerTool
**作用**: 注册可执行的操作，让LLM能够调用具体功能
**特征**: 
- ✅ 可以执行计算、API调用、文件操作等
- ✅ 可以有副作用（修改数据、调用外部服务）
- ✅ 接受结构化参数，返回结构化结果

**代码示例**:
```typescript
server.registerTool(
  "calculate-bmi",
  {
    title: "BMI计算器",              // 显示名称
    description: "计算身体质量指数",    // 描述
    inputSchema: {                   // 参数验证
      weightKg: z.number(),
      heightM: z.number()
    }
  },
  async ({ weightKg, heightM }) => ({
    content: [{
      type: "text",
      text: String(weightKg / (heightM * heightM))
    }]
  })
);
```

#### 2. Resources (资源) - registerResource vs ResourceTemplate

**静态资源 (registerResource)**:
- **作用**: 暴露只读数据给LLM，类似HTTP的GET请求
- **特征**: 无副作用、只读操作、固定URI
- **示例**: 圆周率常数、配置文件

**动态资源 (ResourceTemplate)**:
- **作用**: 暴露带参数的动态资源，根据参数生成不同内容
- **特征**: URI模板化、支持路径参数、仍然只读
- **示例**: 根据用户ID获取信息、参数化文档

**代码对比**:
```typescript
// 静态资源 - 固定URI
server.registerResource(
  "pi",
  "math://pi",
  {
    title: "圆周率",
    description: "数学常数π的精确值"
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: `π = ${Math.PI}`
    }]
  })
);

// 动态资源 - 模板URI
server.registerResource(
  "formula",
  new ResourceTemplate("math://formula/{name}"),
  {
    title: "数学公式",
    description: "获取各种数学公式"
  },
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: getFormulaByName(name)
    }]
  })
);
```

#### 3. Prompts (提示) - registerPrompt
**作用**: 创建可重用的提示模板，帮助LLM生成特定格式的对话
**特征**: 
- 生成对话消息结构
- 支持参数化模板
- 用于标准化AI交互模式

**代码示例**:
```typescript
server.registerPrompt(
  "math-tutor",
  {
    title: "数学导师",
    description: "一个友好的数学辅导员",
    argsSchema: {
      topic: z.string().describe("数学主题"),
      difficulty: z.enum(["easy", "medium", "hard"]).describe("难度等级")
    }
  },
  ({ topic, difficulty }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `你是一个数学导师，请用${difficulty}难度解释${topic}`
      }
    }]
  })
);
```

### 📊 方法选择指南

| 场景需求 | 推荐方法 | 示例 |
|---------|----------|------|
| 执行具体计算/操作 | registerTool | add, subtract, calculate |
| 提供固定数据 | registerResource | π值、配置文件 |
| 提供参数化数据 | ResourceTemplate | 公式库、用户信息 |
| 创建AI助手模板 | registerPrompt | 数学导师、代码审查 |

### 🔍 快速决策树
```
需要做什么？
├── 执行某种操作？
│   └── 使用 registerTool
├── 提供数据？
│   ├── 数据固定不变？
│   │   └── 使用 registerResource
│   └── 数据需要参数？
│       └── 使用 ResourceTemplate
└── 创建AI对话模板？
    └── 使用 registerPrompt
```

## 🔧 开发指南

### 选择传输模式

#### STDIO 传输模式
适用于：命令行工具、本地集成
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### HTTP 传输模式
适用于：Web应用、浏览器客户端、远程访问
```typescript
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
const server = new McpServer({ name: "my-server", version: "1.0.0" });

// 配置CORS支持浏览器访问
app.use(cors({
  origin: ['http://localhost:3000'],
  exposedHeaders: ['Mcp-Session-Id']
}));

// 启动HTTP服务器
app.listen(3001);
```

### 统一服务器架构

推荐使用统一服务器，通过环境变量切换传输模式：

```typescript
// src/calculator-server-unified.ts
const transportType = process.env.TRANSPORT || 'stdio';

if (transportType === 'http') {
  await startHttpServer();
} else {
  await startStdioServer();
}
```

### 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `TRANSPORT` | `stdio` | 传输方式：`stdio` 或 `http` |
| `PORT` | `3001` | HTTP服务器端口 |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | 允许的CORS源 |
| `NODE_ENV` | `development` | 环境模式 |

### 创建简单的MCP服务器

### 注册不同类型的组件（新API）

> **注意**：从2025年开始，MCP推荐使用新的`registerXxx` API，旧的`tool/resource/prompt`方法已弃用。

#### 工具 (Tools) - registerTool
```typescript
// 推荐使用 registerTool
server.registerTool(
  "add",
  {
    title: "加法工具",
    description: "执行两个数字的加法运算",
    inputSchema: {
      a: z.number().describe("第一个数字"),
      b: z.number().describe("第二个数字")
    }
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${a} + ${b} = ${a + b}` }]
  })
);
```

#### 资源 (Resources) - registerResource
```typescript
// 静态资源 - registerResource
server.registerResource(
  "config",
  "config://app",
  {
    title: "应用配置",
    description: "应用配置信息",
    mimeType: "text/plain"
  },
  async (uri) => ({
    contents: [{ uri: uri.href, text: "配置内容" }]
  })
);

// 动态资源 - registerResource + ResourceTemplate
server.registerResource(
  "user",
  new ResourceTemplate("user://{id}", { list: undefined }),
  {
    title: "用户信息",
    description: "获取用户详细信息"
  },
  async (uri, { id }) => ({
    contents: [{ uri: uri.href, text: `用户${id}的信息` }]
  })
);
```

#### 提示 (Prompts) - registerPrompt
```typescript
server.registerPrompt(
  "code-review",
  {
    title: "代码审查",
    description: "帮助审查代码质量",
    argsSchema: {
      code: z.string().describe("需要审查的代码")
    }
  },
  ({ code }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `请审查以下代码并提供改进建议：\n\n${code}`
      }
    }]
  })
);
```

### ⚠️ API版本对比

| 功能类型 | 旧API (已弃用) | 新API (推荐) |
|----------|----------------|--------------|
| 工具注册 | `server.tool()` | `server.registerTool()` |
| 资源注册 | `server.resource()` | `server.registerResource()` |
| 提示注册 | `server.prompt()` | `server.registerPrompt()` |

**新API优势**：
- 更清晰的命名规范
- 更好的类型支持
- 更丰富的元数据配置
- 更好的错误处理

## 🐛 调试技巧

### 1. 浏览器调试（HTTP模式）

启动HTTP服务器后，使用浏览器测试：
```bash
# 启动计算器HTTP服务器
npm run calculator-http

# 打开浏览器测试页面
open public/index.html
# 或使用本地服务器
npx serve public
# 访问 http://localhost:8080
```

### 2. 使用MCP Inspector调试

安装MCP Inspector：
```bash
npm install -g @modelcontextprotocol/inspector
```

运行Inspector：
```bash
# STDIO 模式
mcp-inspector

# HTTP 模式
mcp-inspector --transport http --url http://localhost:3001/mcp
```

### 3. 日志调试

在代码中添加日志：
```typescript
console.error("服务器启动中...");
console.error("工具调用: ", toolName, args);
```

### 4. 使用 curl 测试 HTTP 模式

```bash
# 测试连接
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }'

# 测试工具调用
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": {"a": 5, "b": 3}
    }
  }'
```

### 5. 手动测试

使用我们提供的测试客户端：
```bash
# STDIO 模式
node dist/test-client.js

# HTTP 模式
# 使用浏览器测试页面或 curl 命令
```

## 📦 部署方法

### 1. 本地运行

#### 开发模式
```bash
# STDIO 模式开发
npm run dev

# HTTP 模式开发
TRANSPORT=http npm run calculator-unified
```

#### 生产模式
```bash
# STDIO 模式
npm run build
npm run calculator

# HTTP 模式
npm run build
npm run calculator-http

# 自定义端口和CORS
npm run build
TRANSPORT=http PORT=3001 ALLOWED_ORIGINS=https://yourdomain.com npm run calculator-unified
```

### 2. HTTP服务器部署

#### 基础部署
```bash
# 启动计算器HTTP服务器
npm run build
npm run calculator-http

# 启动文件管理器HTTP服务器
npm run build
npm run file-manager-http
```

#### 生产环境配置
```bash
# 安全模式部署
NODE_ENV=production \
TRANSPORT=http \
PORT=3001 \
ALLOWED_ORIGINS=https://yourdomain.com \
ALLOWED_HOSTS=yourdomain.com \
npm run calculator-unified
```

### 3. Docker部署

#### 🐳 使用Docker Compose（推荐方式）

项目已配置了完整的Docker Compose环境，支持多种运行模式：

##### 构建所有镜像
```bash
# 构建所有服务镜像
docker-compose build

# 或只构建特定服务
docker-compose build calculator-server
docker-compose build file-manager-server
```

##### 启动服务
```bash
# 启动计算器服务器（端口3001）
docker-compose up calculator-server

# 启动文件管理器服务器（端口3002）
docker-compose up file-manager-server

# 同时启动所有服务
docker-compose up

# 后台运行
docker-compose up -d
```

##### 开发环境
```bash
# 启动开发环境（支持热重载）
docker-compose up dev

# 进入开发容器调试
docker-compose exec dev sh
```

##### STDIO模式调试
```bash
# 启动计算器STDIO模式容器
docker-compose up calculator-stdio

# 进入容器进行STDIO调试
docker exec -it mcp-calculator-stdio sh
```

#### 🛠️ 手动Docker构建与运行

##### 构建镜像
```bash
# 构建基础镜像
docker build -t mcp-typescript-tutorial .

# 构建并指定标签
docker build -t mcp-typescript-tutorial:latest -t mcp-typescript-tutorial:v1.0 .
```

##### 运行容器
```bash
# 运行计算器服务器（HTTP模式）
docker run -p 3001:3001 \
  -e SERVICE=calculator \
  -e TRANSPORT=http \
  -e PORT=3001 \
  -e ALLOWED_ORIGINS="http://localhost:3000" \
  mcp-typescript-tutorial

# 运行文件管理器服务器（HTTP模式）
docker run -p 3002:3002 \
  -e SERVICE=file-manager \
  -e TRANSPORT=http \
  -e PORT=3002 \
  -v $(pwd)/data:/app/data \
  mcp-typescript-tutorial

# 运行STDIO模式（交互式）
docker run -it --rm \
  -e TRANSPORT=stdio \
  mcp-typescript-tutorial
```

##### 生产环境部署
```bash
# 生产环境运行（带安全配置）
docker run -d --name mcp-prod \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e TRANSPORT=http \
  -e PORT=3001 \
  -e ALLOWED_ORIGINS="https://yourdomain.com" \
  --restart unless-stopped \
  mcp-typescript-tutorial
```

#### 📋 Docker Compose服务说明

| 服务名称 | 端口 | 描述 | 使用场景 |
|---------|------|------|----------|
| `calculator-server` | 3001 | 计算器HTTP服务器 | 生产环境 |
| `file-manager-server` | 3002 | 文件管理器HTTP服务器 | 生产环境 |
| `calculator-stdio` | - | 计算器STDIO服务器 | 调试/集成 |
| `dev` | 3003 | 开发环境 | 开发调试 |
| `nginx` | 80/443 | 反向代理 | 生产环境负载均衡 |

#### 🔧 Docker常用命令

```bash
# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f calculator-server
docker-compose logs -f file-manager-server

# 停止服务
docker-compose down

# 停止并删除容器和镜像
docker-compose down --rmi all --volumes

# 进入运行中的容器
docker-compose exec calculator-server sh
docker-compose exec file-manager-server sh

# 清理无用镜像
docker image prune -f
```

#### 📊 性能优化配置

##### 资源限制
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  calculator-server:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

##### 健康检查
```bash
# 检查服务健康状态
docker-compose ps

# 手动健康检查
curl -f http://localhost:3001/mcp
curl -f http://localhost:3002/mcp
```

### 4. 使用npx运行

#### STDIO 模式
```bash
npx tsx src/calculator-server.ts
```

#### HTTP 模式
```bash
# 直接运行统一版本
TRANSPORT=http npx tsx src/calculator-server-unified.ts

# 带参数运行
TRANSPORT=http PORT=3001 npx tsx src/calculator-server-unified.ts
```

## 🐳 Docker部署常见问题

### Docker相关配置说明

#### 环境变量详解
| 变量名 | 默认值 | 说明 | 示例 |
|--------|--------|------|------|
| `SERVICE` | - | 指定服务类型 | `calculator`, `file-manager` |
| `TRANSPORT` | `stdio` | 传输模式 | `stdio`, `http` |
| `PORT` | `3001` | HTTP端口 | `3001`, `3002` |
| `NODE_ENV` | `production` | 运行环境 | `development`, `production` |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS白名单 | `https://yourdomain.com` |

#### 数据持久化
```bash
# 文件管理器需要挂载数据目录
docker-compose up file-manager-server
# 会自动挂载 ./data 目录到容器内 /app/data
```

#### 网络配置
```bash
# 创建自定义网络（用于容器间通信）
docker network create mcp-network

# 在自定义网络中运行
docker run -d --name mcp-calculator \
  --network mcp-network \
  -p 3001:3001 \
  mcp-typescript-tutorial
```

#### 日志管理
```bash
# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f calculator-server

# 导出日志到文件
docker-compose logs > mcp-logs.txt
```

#### 健康监控
```bash
# 检查服务状态
watch -n 5 'curl -f http://localhost:3001/mcp && echo "Calculator OK" || echo "Calculator DOWN"'

# 使用docker health check
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"
```

#### 安全最佳实践
```bash
# 使用非root用户运行（已在Dockerfile中配置）
USER mcp

# 限制容器权限
docker run --read-only --tmpfs /tmp --tmpfs /app/logs mcp-typescript-tutorial

# 使用安全扫描
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/tmp aquasec/trivy image mcp-typescript-tutorial
```

## 🎯 实战案例

### 案例1：天气查询服务器

```typescript
server.tool("get_weather", {
  description: "查询天气信息",
  parameters: { city: z.string() }
}, async ({ city }) => {
  const weather = await fetchWeather(city);
  return {
    content: [{ type: "text", text: weather }]
  };
});
```

### 案例2：数据库查询服务器

```typescript
server.tool("query_db", {
  description: "执行SQL查询",
  parameters: { sql: z.string() }
}, async ({ sql }) => {
  const results = await executeQuery(sql);
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify(results, null, 2) 
    }]
  };
});
```

## ❓ 常见问题

### 传输模式选择

#### Q: 什么时候使用 STDIO 模式？
A: STDIO 模式适用于：
- 命令行工具
- 本地集成
- 桌面应用
- 需要高性能的场景

#### Q: 什么时候使用 HTTP 模式？
A: HTTP 模式适用于：
- 浏览器客户端
- Web应用
- 远程访问
- 微服务架构
- 需要跨平台访问的场景

### 配置问题

#### Q: 如何处理 CORS 错误？
A: 设置正确的 `ALLOWED_ORIGINS` 环境变量：
```bash
# 开发环境
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# 生产环境
ALLOWED_ORIGINS="https://yourdomain.com"
```

#### Q: 服务器连接失败怎么办？
A: 检查：
1. 端口是否被占用：`lsof -i :3001`
2. 依赖是否正确安装：`npm install`
3. TypeScript是否编译成功：`npm run build`
4. 防火墙设置
5. CORS配置是否正确

#### Q: 如何处理HTTP模式下的会话错误？
A: 确保：
1. 每次请求都包含正确的 `Mcp-Session-Id` 头
2. 会话ID在有效期内（默认24小时）
3. 服务器没有重启导致会话丢失

### 开发问题

#### Q: 如何添加新的工具？
A: 按照以下步骤：
1. 在统一服务器文件中使用 `server.registerTool()` 注册
2. 定义清晰的参数schema
3. 实现异步处理函数
4. 返回标准格式的结果
5. 测试STDIO和HTTP两种模式

#### Q: 如何调试工具调用？
A: 使用以下方法：
- 浏览器测试页面：`public/index.html`
- curl命令测试（见调试技巧部分）
- MCP Inspector工具
- 查看服务器控制台日志

### 部署问题

#### Q: 如何在生产环境部署HTTP模式？
A: 推荐配置：
```bash
NODE_ENV=production \
TRANSPORT=http \
PORT=3001 \
ALLOWED_ORIGINS=https://yourdomain.com \
ALLOWED_HOSTS=yourdomain.com \
npm run calculator-unified
```

#### Q: 如何处理端口冲突？
A: 使用不同的端口：
```bash
# 计算器服务器
PORT=3001 npm run calculator-http

# 文件管理器服务器
PORT=3002 npm run file-manager-http
```

## 📚 新增功能汇总

### 🌐 Streamable HTTP 支持
- ✅ 支持浏览器访问的HTTP传输
- ✅ 完整的CORS配置
- ✅ 会话管理和自动清理
- ✅ 统一服务器架构（STDIO/HTTP切换）

### 🔧 新增脚本
- `npm run calculator-http` - 启动计算器HTTP服务器
- `npm run file-manager-http` - 启动文件管理器HTTP服务器
- `npm run calculator-unified` - 启动计算器统一服务器
- `npm run file-manager-unified` - 启动文件管理器统一服务器

### 🧪 测试工具
- `HTTP_SERVER_GUIDE.md` - HTTP模式详细指南

### 🎯 浏览器集成示例
```javascript
// 浏览器客户端示例
const client = new SimpleMCPClient('http://localhost:3001/mcp');
await client.connect();
const result = await client.callTool('add', {a: 5, b: 3});
```

## 🔗 相关资源

- [MCP官方文档](https://modelcontextprotocol.io/)
- [TypeScript SDK文档](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [Streamable HTTP规范](https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/transports/)

## 📞 获取帮助

如果遇到问题：
1. 检查本README的调试技巧
2. 查看 `HTTP_SERVER_GUIDE.md` 详细指南
3. 使用浏览器测试页面：`public/index.html`
4. 查看控制台日志
5. 提交Issue到项目仓库

---

🎉 **恭喜！** 现在你已经掌握了TypeScript MCP开发的全部技能，包括STDIO和HTTP两种传输模式！开始构建你自己的AI工具吧！