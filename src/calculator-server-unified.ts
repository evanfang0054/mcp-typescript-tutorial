#!/usr/bin/env node

/**
 * TypeScript MCP计算器服务器 - 统一版本
 * 支持STDIO和Streamable HTTP传输的统一服务器
 * 
 * 使用方式：
 * 1. STDIO模式（默认）：npm run calculator
 * 2. HTTP模式：TRANSPORT=http npm run calculator-http
 * 3. 指定端口：TRANSPORT=http PORT=3001 npm run calculator-http
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";

// 创建MCP服务器逻辑
function createCalculatorServer() {
  const server = new McpServer({
    name: "calculator-server-unified",
    version: "1.0.0"
  });

  // 1. 注册加法工具
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
    async ({ a, b }: { a: number; b: number }) => ({
      content: [
        {
          type: "text",
          text: `${a} + ${b} = ${a + b}`
        }
      ]
    })
  );

  // 2. 注册减法工具
  server.registerTool(
    "subtract",
    {
      title: "减法工具",
      description: "执行两个数字的减法运算",
      inputSchema: {
        a: z.number().describe("被减数"),
        b: z.number().describe("减数")
      }
    },
    async ({ a, b }: { a: number; b: number }) => ({
      content: [
        {
          type: "text",
          text: `${a} - ${b} = ${a - b}`
        }
      ]
    })
  );

  // 3. 注册乘法工具
  server.registerTool(
    "multiply",
    {
      title: "乘法工具",
      description: "执行两个数字的乘法运算",
      inputSchema: {
        a: z.number().describe("第一个因数"),
        b: z.number().describe("第二个因数")
      }
    },
    async ({ a, b }: { a: number; b: number }) => ({
      content: [
        {
          type: "text",
          text: `${a} × ${b} = ${a * b}`
        }
      ]
    })
  );

  // 4. 注册除法工具
  server.registerTool(
    "divide",
    {
      title: "除法工具",
      description: "执行两个数字的除法运算",
      inputSchema: {
        a: z.number().describe("被除数"),
        b: z.number().describe("除数")
      }
    },
    async ({ a, b }: { a: number; b: number }) => {
      if (b === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 错误：除数不能为0"
            }
          ],
          isError: true
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: `${a} ÷ ${b} = ${a / b}`
          }
        ]
      };
    }
  );

  // 5. 注册高级计算工具
  server.registerTool(
    "calculate",
    {
      title: "高级计算器",
      description: "支持多种运算：加、减、乘、除、幂运算、开方",
      inputSchema: {
        operation: z.enum(["add", "subtract", "multiply", "divide", "power", "sqrt"]).describe("运算类型"),
        a: z.number().describe("第一个数字"),
        b: z.number().optional().describe("第二个数字（开方不需要）")
      }
    },
    async ({ operation, a, b }: { operation: string; a: number; b?: number }) => {
      let result: number;
      let operationText: string;

      switch (operation) {
        case "add":
          result = a + (b || 0);
          operationText = `${a} + ${b || 0}`;
          break;
        case "subtract":
          result = a - (b || 0);
          operationText = `${a} - ${b || 0}`;
          break;
        case "multiply":
          result = a * (b || 1);
          operationText = `${a} × ${b || 1}`;
          break;
        case "divide":
          if (b === undefined || b === 0) {
            return {
              content: [{ type: "text", text: "❌ 错误：除法需要第二个数字且不能为0" }],
              isError: true
            };
          }
          result = a / b;
          operationText = `${a} ÷ ${b}`;
          break;
        case "power":
          result = Math.pow(a, b || 2);
          operationText = `${a}^${b || 2}`;
          break;
        case "sqrt":
          if (a < 0) {
            return {
              content: [{ type: "text", text: "❌ 错误：不能对负数开平方" }],
              isError: true
            };
          }
          result = Math.sqrt(a);
          operationText = `√${a}`;
          break;
        default:
          return {
            content: [{ type: "text", text: "❌ 未知的运算类型" }],
            isError: true
          };
      }

      return {
        content: [
          {
            type: "text",
            text: `${operationText} = ${result}`
          }
        ]
      };
    }
  );

  // 6. 注册资源 - 数学常数
  server.registerResource(
    "pi",
    "math://pi",
    {
      title: "圆周率",
      description: "数学常数π的精确值",
      mimeType: "text/plain"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: `π = ${Math.PI}\n这是一个数学常数，表示圆的周长与直径的比值。`
        }
      ]
    })
  );

  // 7. 注册动态资源 - 数学公式
  server.registerResource(
    "formula",
    new ResourceTemplate("math://formula/{name}", { list: undefined }),
    {
      title: "数学公式",
      description: "获取各种数学公式"
    },
    async (uri, { name }) => {
      const formulas: Record<string, string> = {
        "pythagoras": "勾股定理：a² + b² = c²",
        "quadratic": "二次方程求根公式：x = (-b ± √(b²-4ac)) / 2a",
        "circle-area": "圆面积公式：A = πr²",
        "volume-sphere": "球体积公式：V = (4/3)πr³"
      };

      const formula = formulas[name as string] || `未找到公式：${name}`;

      return {
        contents: [
          {
            uri: uri.href,
            text: formula
          }
        ]
      };
    }
  );

  // 8. 注册提示模板
  server.registerPrompt(
    "math-tutor",
    {
      title: "数学导师",
      description: "一个友好的数学辅导员，帮助你解决数学问题",
      argsSchema: {
        topic: z.string().describe("数学主题，如：代数、几何、微积分"),
        difficulty: z.enum(["easy", "medium", "hard"]).describe("难度等级")
      }
    },
    ({ topic, difficulty }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `你是一个专业的数学导师。请用简单易懂的方式解释${topic}的${difficulty}难度问题。请提供具体的例子和详细的解题步骤。\n\n请教我${topic}的基础知识，从${difficulty}难度的题目开始。`
          }
        }
      ]
    })
  );

  return server;
}

// STDIO传输模式
async function startStdioServer() {
  const server = createCalculatorServer();
  const transport = new StdioServerTransport();
  
  console.error("🧮 计算器MCP服务器启动中（STDIO模式）...");
  console.error("📊 支持的工具：add, subtract, multiply, divide, calculate");
  console.error("📚 支持的资源：pi, math://formula/{name}");
  console.error("🎓 支持的提示：math-tutor");
  console.error("🔧 准备就绪，等待连接...");

  await server.connect(transport);
}

// HTTP传输模式
async function startHttpServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // 配置CORS以支持浏览器访问
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'Mcp-Session-Id']
  }));

  app.use(express.json());

  // 存储会话传输实例
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // 处理POST请求 - 客户端到服务器通信
  app.all('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // 重用现有传输
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // 新的初始化请求
        const server = createCalculatorServer();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            transports[newSessionId] = transport;
            console.log(`🔌 新会话已建立: ${newSessionId}`);
          },
          enableDnsRebindingProtection: process.env.NODE_ENV === 'production',
          allowedHosts: process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',') : ['127.0.0.1', 'localhost'],
          allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000']
        });

        // 清理传输关闭时的会话
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            console.log(`🔌 会话已关闭: ${transport.sessionId}`);
          }
        };

        await server.connect(transport);
      } else {
        // 无效请求
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('❌ 处理MCP请求时出错:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // 处理GET请求 - 服务器到客户端通知 (SSE)
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // 处理DELETE请求 - 会话终止
  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      server: 'calculator-server-http',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`🧮 计算器MCP HTTP服务器已启动`);
    console.log(`📡 Streamable HTTP端点: http://localhost:${PORT}/mcp`);
    console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
    console.log(`🔧 支持的CORS源: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000, http://127.0.0.1:3000'}`);
    console.log(`📊 支持的工具：add, subtract, multiply, divide, calculate`);
    console.log(`📚 支持的资源：pi, math://formula/{name}`);
    console.log(`🎓 支持的提示：math-tutor`);
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    Object.values(transports).forEach(transport => transport.close());
    process.exit(0);
  });
}

// 主函数
async function main() {
  const transportType = process.env.TRANSPORT || 'stdio';
  
  if (transportType === 'http') {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

// 错误处理
main().catch((error) => {
  console.error("❌ 服务器启动失败:", error);
  process.exit(1);
});

/**
 * 📋 使用说明
 * 
 * STDIO模式（默认）：
 *   npm run calculator-unified
 *   或
 *   TRANSPORT=stdio npm run calculator-unified
 * 
 * HTTP模式：
 *   TRANSPORT=http npm run calculator-unified
 *   TRANSPORT=http PORT=3001 npm run calculator-unified
 * 
 * 自定义CORS：
 *   TRANSPORT=http ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 npm run calculator-unified
 * 
 * 生产环境安全设置：
 *   NODE_ENV=production TRANSPORT=http ALLOWED_ORIGINS=https://yourdomain.com npm run calculator-unified
 */