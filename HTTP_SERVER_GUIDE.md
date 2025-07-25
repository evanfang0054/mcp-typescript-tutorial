# 🌐 MCP Streamable HTTP 服务器指南

本指南将帮助您使用基于浏览器的 MCP 客户端访问您的 MCP 服务器，支持 Streamable HTTP 传输协议。

## 🚀 快速开始

### 1. 安装依赖

首先确保安装了所有必要的依赖：

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 启动 HTTP 服务器

#### 计算器服务器 (端口 3001)
```bash
# 启动计算器 HTTP 服务器
npm run calculator-http

# 或使用统一版本
TRANSPORT=http npm run calculator-unified

# 自定义端口
TRANSPORT=http PORT=3001 npm run calculator-unified
```

#### 文件管理器服务器 (端口 3002)
```bash
# 启动文件管理器 HTTP 服务器
npm run file-manager-http

# 或使用统一版本
TRANSPORT=http PORT=3002 npm run file-manager-unified
```

### 4. 打开浏览器测试

启动服务器后，打开浏览器访问：
```
file:///path/to/your/project/public/index.html
```

或者使用简单的 HTTP 服务器：
```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js
npx serve public

# 然后访问 http://localhost:8080
```

## 🔧 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `TRANSPORT` | `stdio` | 传输方式：`stdio` 或 `http` |
| `PORT` | `3001` (计算器) / `3002` (文件管理器) | HTTP 服务器端口 |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | 允许的 CORS 源 |
| `ALLOWED_HOSTS` | `127.0.0.1,localhost` | 允许的 DNS 主机 |
| `NODE_ENV` | `development` | 环境模式 |

### 示例配置

```bash
# 生产环境配置
NODE_ENV=production \
TRANSPORT=http \
PORT=3001 \
ALLOWED_ORIGINS=https://yourdomain.com \
npm run calculator-unified

# 多源 CORS 配置
TRANSPORT=http \
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000 \
npm run file-manager-unified
```

## 🧪 测试工具

### 使用浏览器测试

1. 打开 `public/index.html`
2. 点击"连接"按钮测试服务器
3. 使用提供的界面测试工具调用

### 使用 curl 测试

#### 测试连接
```bash
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
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }'

# 测试文件管理器服务器
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }'
```

#### 测试工具调用
```bash
# 测试加法
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

# 测试列出目录
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_directory",
      "arguments": {"directory_path": "."}
    }
  }'
```

## 🏗️ 集成到现有项目

### 作为库使用

您可以将这些服务器作为库集成到其他项目中：

```typescript
import { createCalculatorServer } from './src/calculator-server-unified.js';

// 创建服务器实例
const server = createCalculatorServer();

// 连接到 STDIO 传输
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 自定义 Express 应用

```typescript
import express from 'express';
import { createCalculatorServer } from './src/calculator-server-unified.js';

const app = express();
const server = createCalculatorServer();

// 添加自定义路由
app.get('/custom-endpoint', (req, res) => {
    res.json({ message: '自定义端点' });
});

// 启动服务器
app.listen(3001);
```

## 🔍 故障排除

### 常见问题

1. **CORS 错误**
   - 确保设置了正确的 `ALLOWED_ORIGINS`
   - 检查浏览器控制台的网络错误

2. **端口占用**
   - 使用 `lsof -i :3001` 检查端口使用情况
   - 修改 `PORT` 环境变量使用其他端口

3. **会话错误**
   - 确保每次请求都包含正确的 `Mcp-Session-Id`
   - 检查服务器日志获取详细信息

### 调试模式

```bash
# 启用详细日志
DEBUG=* TRANSPORT=http npm run calculator-unified

# 检查健康状态
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## 📚 支持的 API

### 计算器服务器
- **工具**: `add`, `subtract`, `multiply`, `divide`, `calculate`
- **资源**: `pi`, `math://formula/{name}`
- **提示**: `math-tutor`

### 文件管理器服务器
- **工具**: `read_file`, `write_file`, `list_directory`, `create_directory`, `delete_path`, `file_info`
- **资源**: `project_overview`, `file://content/{path}`
- **提示**: `file_analyzer`

## 🎯 下一步

1. **安全性增强**: 添加认证和授权
2. **负载均衡**: 支持多实例部署
3. **监控**: 集成 Prometheus 指标
4. **WebSocket**: 支持实时双向通信
5. **Docker**: 容器化部署

## 📖 相关资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [TypeScript SDK 文档](https://github.com/modelcontextprotocol/typescript-sdk)
- [Streamable HTTP 规范](https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/transports/#streamable-http)