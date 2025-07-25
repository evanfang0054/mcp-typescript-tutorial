# 🧪 TypeScript MCP测试与开发完整教程

## 📋 目录

- [环境搭建](#环境搭建)
- [项目结构详解](#项目结构详解)
- [测试方法一：MCP Inspector](#测试方法一mcp-inspector)
- [测试方法二：自定义测试客户端](#测试方法二自定义测试客户端)
- [测试方法三：Claude Desktop集成](#测试方法三claude-desktop集成)
- [调试技巧](#调试技巧)
- [常见问题解决](#常见问题解决)

## 🏗️ 环境搭建

### 1. 安装必要工具

```bash
# 安装MCP Inspector（官方调试工具）
npm install -g @modelcontextprotocol/inspector

# 安装TypeScript运行环境
npm install -g tsx typescript

# 安装项目依赖
npm install @modelcontextprotocol/sdk zod
```

### 2. 创建测试环境

```bash
# 创建项目目录
mkdir mcp-testing-env
cd mcp-testing-env

# 初始化项目
npm init -y
npm install @modelcontextprotocol/sdk zod @types/node typescript tsx
```

## 📁 项目结构详解

```
mcp-testing-env/
├── src/
│   ├── server.ts           # 主服务器
│   ├── server-with-tools.ts # 带工具的服务器
│   ├── server-with-resources.ts # 带资源的服务器
│   └── server-with-prompts.ts # 带提示的服务器
├── tests/
│   ├── inspector-test.js   # Inspector测试配置
│   ├── client-test.ts      # 自定义客户端测试
│   └── integration-test.ts # 集成测试
├── examples/
│   ├── simple-calculator.ts # 简单计算器
│   └── file-manager.ts     # 文件管理器
├── package.json
└── claude-desktop-config.json
```

## 🔍 测试方法一：MCP Inspector

### 1. 安装Inspector

```bash
npm install -g @modelcontextprotocol/inspector
```

### 2. 创建测试服务器

创建 `src/test-server.ts`：

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 创建服务器
const server = new Server(
  {
    name: "test-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// 注册工具
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "hello",
      description: "Say hello to someone",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "hello") {
    const { name } = request.params.arguments as { name: string };
    return {
      content: [
        {
          type: "text",
          text: `Hello, ${name}!`
        }
      ]
    };
  }
  throw new Error("Unknown tool");
});

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3. 编译并运行测试

```bash
# 编译TypeScript
npx tsx src/test-server.ts

# 在另一个终端运行Inspector
mcp-inspector

# 或者指定服务器
mcp-inspector --command "npx tsx" --args "src/test-server.ts"
```

### 4. 使用Inspector界面

1. 打开浏览器访问 `http://localhost:6274`
2. 点击"Connect"连接服务器
3. 在"Tools"标签页测试工具
4. 查看实时日志和响应

## 🧪 测试方法二：自定义测试客户端

### 1. 创建测试客户端

创建 `tests/client-test.ts`：

```typescript
#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class MCPTestClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    this.client = new Client({
      name: "test-client",
      version: "1.0.0"
    });

    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", "src/test-server.ts"]
    });
  }

  async connect() {
    console.log("🔄 连接到MCP服务器...");
    await this.client.connect(this.transport);
    console.log("✅ 连接成功！\n");
  }

  async testTools() {
    console.log("🔧 测试工具...");
    const tools = await this.client.listTools();
    console.log(`找到 ${tools.tools.length} 个工具`);

    for (const tool of tools.tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }

    // 测试hello工具
    try {
      const result = await this.client.callTool({
        name: "hello",
        arguments: { name: "前端小白" }
      });
      console.log("测试结果:", result.content[0].text);
    } catch (error) {
      console.error("测试失败:", error);
    }
  }

  async testResources() {
    console.log("📚 测试资源...");
    try {
      const resources = await this.client.listResources();
      console.log(`找到 ${resources.resources.length} 个资源`);

      for (const resource of resources.resources) {
        console.log(`  - ${resource.name}: ${resource.description}`);
      }
    } catch (error) {
      console.log("无资源或测试失败");
    }
  }

  async testPrompts() {
    console.log("🎯 测试提示...");
    try {
      const prompts = await this.client.listPrompts();
      console.log(`找到 ${prompts.prompts.length} 个提示`);

      for (const prompt of prompts.prompts) {
        console.log(`  - ${prompt.name}: ${prompt.description}`);
      }
    } catch (error) {
      console.log("无提示或测试失败");
    }
  }

  async disconnect() {
    await this.client.close();
    console.log("👋 已断开连接");
  }

  async runAllTests() {
    try {
      await this.connect();
      await this.testTools();
      await this.testResources();
      await this.testPrompts();
    } catch (error) {
      console.error("❌ 测试失败:", error);
    } finally {
      await this.disconnect();
    }
  }
}

// 运行测试
if (require.main === module) {
  const client = new MCPTestClient();
  client.runAllTests().catch(console.error);
}
```

### 2. 运行测试客户端

```bash
# 运行测试
npx tsx tests/client-test.ts
```

## 🖥️ 测试方法三：Claude Desktop集成

### 1. 创建配置文件

创建 `claude-desktop-config.json`：

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": ["tsx", "/绝对路径/src/calculator-server.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    "fileManager": {
      "command": "npx",
      "args": ["tsx", "/绝对路径/src/file-manager.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 2. 配置Claude Desktop

**Windows:**
复制配置文件到 `%APPDATA%\Claude\claude_desktop_config.json`

**macOS:**
复制配置文件到 `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux:**
复制配置文件到 `~/.config/Claude/claude_desktop_config.json`

### 3. 重启Claude Desktop

重启后，在对话中可以使用：
```
请使用计算器工具计算 15 + 27
```

## 🔧 调试技巧

### 1. 日志调试

在服务器中添加详细日志：

```typescript
// 添加日志中间件
server.setRequestHandler("tools/call", async (request) => {
  console.error(`[${new Date().toISOString()}] 调用工具: ${request.params.name}`);
  console.error(`参数: ${JSON.stringify(request.params.arguments, null, 2)}`);
  
  try {
    const result = await handleToolCall(request.params);
    console.error(`结果: ${JSON.stringify(result, null, 2)}`);
    return result;
  } catch (error) {
    console.error(`错误: ${error}`);
    throw error;
  }
});
```

### 2. 错误处理

```typescript
// 统一错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});
```

### 3. 断点调试

使用VS Code调试配置：

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

## 🐛 常见问题解决

### 1. 连接失败

**问题**: 服务器无法连接
**解决**:
```bash
# 检查端口占用
lsof -i :6274

# 检查防火墙
sudo ufw status

# 检查权限
chmod +x src/server.ts
```

### 2. TypeScript编译错误

**问题**: 类型不匹配
**解决**:
```bash
# 更新TypeScript
cd mcp-testing-env
npm update typescript @types/node

# 检查tsconfig.json
cat tsconfig.json
```

### 3. 权限问题

**问题**: 文件访问权限
**解决**:
```bash
# 检查文件权限
ls -la src/

# 修改权限
chmod 755 src/
chmod 644 src/*.ts
```

### 4. 依赖问题

**问题**: 依赖安装失败
**解决**:
```bash
# 清理缓存
npm cache clean --force

# 重新安装
rm -rf node_modules package-lock.json
npm install

# 检查Node.js版本
node --version
# 需要Node.js 18+
```

## 🎯 实战测试案例

### 1. 创建完整计算器测试

```typescript
// tests/calculator-test.ts
import { spawn } from 'child_process';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testCalculator() {
  console.log("🧮 测试计算器服务器...");
  
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/calculator-server.ts"]
  });

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);

  // 测试加法
  const addResult = await client.callTool({
    name: "add",
    arguments: { a: 15, b: 27 }
  });
  console.log("加法测试:", addResult.content[0].text);

  // 测试除法
  const divideResult = await client.callTool({
    name: "divide",
    arguments: { a: 100, b: 4 }
  });
  console.log("除法测试:", divideResult.content[0].text);

  await client.close();
}

testCalculator().catch(console.error);
```

### 2. 运行完整测试套件

创建 `package.json` 脚本：

```json
{
  "scripts": {
    "test:inspector": "mcp-inspector --command 'npx tsx' --args 'src/calculator-server.ts'",
    "test:client": "npx tsx tests/client-test.ts",
    "test:calculator": "npx tsx tests/calculator-test.ts",
    "test:all": "npm run test:client && npm run test:calculator"
  }
}
```

运行测试：
```bash
npm run test:all
```

## 📊 性能测试

### 1. 压力测试

```typescript
// tests/load-test.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function loadTest() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/calculator-server.ts"]
  });

  const client = new Client({ name: "load-test", version: "1.0.0" });
  await client.connect(transport);

  const start = Date.now();
  const promises = [];

  // 并发测试
  for (let i = 0; i < 100; i++) {
    promises.push(
      client.callTool({
        name: "add",
        arguments: { a: Math.random() * 100, b: Math.random() * 100 }
      })
    );
  }

  await Promise.all(promises);
  const end = Date.now();

  console.log(`100次请求耗时: ${end - start}ms`);
  console.log(`平均响应时间: ${(end - start) / 100}ms`);

  await client.close();
}

loadTest().catch(console.error);
```

## 🎉 成功验证

当你完成所有测试后，应该能看到：

1. ✅ Inspector界面正常显示工具列表
2. ✅ 自定义客户端测试通过
3. ✅ Claude Desktop能正常使用你的MCP工具
4. ✅ 所有API调用返回正确结果
5. ✅ 错误处理正常工作

恭喜！你现在是一个MCP测试专家了！🎊