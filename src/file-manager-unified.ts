#!/usr/bin/env node

/**
 * TypeScript MCP文件管理器服务器 - 统一版本
 * 支持STDIO和Streamable HTTP传输的统一服务器
 * 
 * 使用方式：
 * 1. STDIO模式（默认）：npm run file-manager
 * 2. HTTP模式：TRANSPORT=http npm run file-manager-http
 * 3. 指定端口：TRANSPORT=http PORT=3002 npm run file-manager-http
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { promises as fs } from "fs";
import * as path from "path";

// 创建MCP服务器逻辑
function createFileManagerServer() {
  const server = new McpServer({
    name: "file-manager-unified",
    version: "1.0.0"
  });

  // 工具：读取文件内容
  server.registerTool(
    "read_file",
    {
      title: "读取文件",
      description: "读取指定文件的内容",
      inputSchema: {
        file_path: z.string().describe("要读取的文件路径"),
        encoding: z.enum(["utf8", "base64", "binary"]).default("utf8").describe("文件编码")
      }
    },
    async ({ file_path, encoding }: { file_path: string; encoding: string }) => {
      try {
        const content = await fs.readFile(file_path, encoding as BufferEncoding);
        const stats = await fs.stat(file_path);
        
        return {
          content: [
            {
              type: "text",
              text: `文件: ${file_path}\n大小: ${stats.size} bytes\n修改时间: ${stats.mtime}\n内容:\n${content}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 读取文件失败: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // 工具：写入文件内容
  server.registerTool(
    "write_file",
    {
      title: "写入文件",
      description: "将内容写入指定文件",
      inputSchema: {
        file_path: z.string().describe("要写入的文件路径"),
        content: z.string().describe("要写入的内容"),
        create_dirs: z.boolean().default(true).describe("是否自动创建目录")
      }
    },
    async ({ file_path, content, create_dirs }: { file_path: string; content: string; create_dirs: boolean }) => {
      try {
        if (create_dirs) {
          const dir = path.dirname(file_path);
          await fs.mkdir(dir, { recursive: true });
        }
        
        await fs.writeFile(file_path, content);
        
        return {
          content: [
            {
              type: "text",
              text: `✅ 文件写入成功: ${file_path}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 写入文件失败: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // 工具：列出目录内容
  server.registerTool(
    "list_directory",
    {
      title: "列出目录",
      description: "列出指定目录的内容",
      inputSchema: {
        directory_path: z.string().default(".").describe("要列出的目录路径"),
        show_hidden: z.boolean().default(false).describe("是否显示隐藏文件"),
        recursive: z.boolean().default(false).describe("是否递归列出子目录")
      }
    },
    async ({ directory_path, show_hidden, recursive }: { 
      directory_path: string; 
      show_hidden: boolean; 
      recursive: boolean;
    }) => {
      try {
        const entries = await fs.readdir(directory_path, { withFileTypes: true });
        let results: string[] = [];
        
        for (const entry of entries) {
          if (!show_hidden && entry.name.startsWith(".")) {
            continue;
          }
          
          const fullPath = path.join(directory_path, entry.name);
          
          if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            results.push(`📄 ${entry.name} (${stats.size} bytes)`);
          } else if (entry.isDirectory()) {
            results.push(`📁 ${entry.name}/`);
            
            if (recursive) {
              const subFiles = await fs.readdir(fullPath);
              subFiles.forEach(file => {
                results.push(`  📄 ${entry.name}/${file}`);
              });
            }
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: `目录内容: ${directory_path}\n${results.join("\n")}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 读取目录失败: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // 工具：创建目录
  server.registerTool(
    "create_directory",
    {
      title: "创建目录",
      description: "创建新目录",
      inputSchema: {
        directory_path: z.string().describe("要创建的目录路径"),
        recursive: z.boolean().default(true).describe("是否递归创建父目录")
      }
    },
    async ({ directory_path, recursive }: { directory_path: string; recursive: boolean }) => {
      try {
        await fs.mkdir(directory_path, { recursive });
        
        return {
          content: [
            {
              type: "text",
              text: `✅ 目录创建成功: ${directory_path}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 创建目录失败: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // 工具：删除文件或目录
  server.registerTool(
    "delete_path",
    {
      title: "删除路径",
      description: "删除指定的文件或目录",
      inputSchema: {
        path: z.string().describe("要删除的文件或目录路径"),
        recursive: z.boolean().default(false).describe("是否递归删除目录")
      }
    },
    async ({ path: targetPath, recursive }: { path: string; recursive: boolean }) => {
      try {
        const stats = await fs.stat(targetPath);
        
        if (stats.isDirectory()) {
          await fs.rmdir(targetPath, { recursive });
        } else {
          await fs.unlink(targetPath);
        }
        
        return {
          content: [
            {
              type: "text",
              text: `✅ 删除成功: ${targetPath}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 删除失败: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // 工具：文件信息
  server.registerTool(
    "file_info",
    {
      title: "文件信息",
      description: "获取文件或目录的详细信息",
      inputSchema: {
        path: z.string().describe("文件或目录路径")
      }
    },
    async ({ path: targetPath }: { path: string }) => {
      try {
        const stats = await fs.stat(targetPath);
        const isFile = stats.isFile();
        const isDir = stats.isDirectory();
        
        const info = [
          `📋 文件信息: ${targetPath}`,
          `类型: ${isFile ? "文件" : isDir ? "目录" : "其他"}`,
          `大小: ${isFile ? stats.size + " bytes" : "目录"}`,
          `创建时间: ${stats.birthtime}`,
          `修改时间: ${stats.mtime}`,
          `权限: ${stats.mode.toString(8)}`,
          `绝对路径: ${path.resolve(targetPath)}`
        ];
        
        return {
          content: [
            {
              type: "text",
              text: info.join("\n")
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 获取文件信息失败: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  // 资源：项目概览
  server.resource(
    "project_overview",
    "file://overview/",
    {
      description: "当前项目的文件结构概览",
      mimeType: "text/plain"
    },
    async (uri: URL) => {
      try {
        const entries = await fs.readdir(".", { withFileTypes: true });
        let overview = "📊 项目文件概览\n\n";
        
        for (const entry of entries) {
          if (entry.isFile()) {
            const stats = await fs.stat(entry.name);
            overview += `📄 ${entry.name} (${stats.size} bytes)\n`;
          } else if (entry.isDirectory()) {
            overview += `📁 ${entry.name}/\n`;
          }
        }
        
        return {
          contents: [{ uri: uri.href, text: overview }]
        };
      } catch (error) {
        return {
          contents: [{ uri: uri.href, text: `获取项目概览失败: ${(error as Error).message}` }]
        };
      }
    }
  );

  // 资源：文件内容
  server.registerResource(
    "file_content",
    new ResourceTemplate("file://content/{path}", { list: undefined }),
    {
      title: "文件内容",
      description: "读取指定文件的内容"
    },
    async (uri, { path }) => {
      try {
        const content = await fs.readFile(path as string, "utf8");
        return {
          contents: [{ uri: uri.href, text: content }]
        };
      } catch (error) {
        return {
          contents: [{ uri: uri.href, text: `读取文件失败: ${(error as Error).message}` }]
        };
      }
    }
  );

  // 提示：文件分析助手
  server.registerPrompt(
    "file_analyzer",
    {
      title: "文件分析助手",
      description: "分析代码文件并提供改进建议",
      argsSchema: {
        file_path: z.string().describe("要分析的文件路径"),
        analysis_type: z.enum(["code_review", "documentation", "performance", "security"]).describe("分析类型")
      }
    },
    ({ file_path, analysis_type }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `你是一个专业的代码分析师。请分析文件 ${file_path} 并提供${analysis_type}方面的专业建议。请具体、实用，并给出改进建议。\n\n请帮我分析这个文件的${analysis_type}情况。`
          }
        }
      ]
    })
  );

  return server;
}

// STDIO传输模式
async function startStdioServer() {
  const server = createFileManagerServer();
  const transport = new StdioServerTransport();
  
  console.error("📁 文件管理器MCP服务器启动中（STDIO模式）...");
  console.error("🔧 支持的工具：read_file, write_file, list_directory, create_directory, delete_path, file_info");
  console.error("📚 支持的资源：project_overview, file://content/{path}");
  console.error("🎓 支持的提示：file_analyzer");
  console.error("🔧 准备就绪，等待连接...");

  await server.connect(transport);
}

// HTTP传输模式
async function startHttpServer() {
  const app = express();
  const PORT = process.env.PORT || 3002;

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
        const server = createFileManagerServer();
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
      server: 'file-manager-http',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`📁 文件管理器MCP HTTP服务器已启动`);
    console.log(`📡 Streamable HTTP端点: http://localhost:${PORT}/mcp`);
    console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
    console.log(`🔧 支持的CORS源: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000, http://127.0.0.1:3000'}`);
    console.log(`🔧 支持的工具：read_file, write_file, list_directory, create_directory, delete_path, file_info`);
    console.log(`📚 支持的资源：project_overview, file://content/{path}`);
    console.log(`🎓 支持的提示：file_analyzer`);
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
 *   npm run file-manager-unified
 *   或
 *   TRANSPORT=stdio npm run file-manager-unified
 * 
 * HTTP模式：
 *   TRANSPORT=http npm run file-manager-unified
 *   TRANSPORT=http PORT=3002 npm run file-manager-unified
 * 
 * 自定义CORS：
 *   TRANSPORT=http ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 npm run file-manager-unified
 * 
 * 生产环境安全设置：
 *   NODE_ENV=production TRANSPORT=http ALLOWED_ORIGINS=https://yourdomain.com npm run file-manager-unified
 */