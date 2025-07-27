# 使用Node.js 18 Alpine作为基础镜像
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括dev依赖用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 仅安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# 设置权限
RUN chown -R mcp:nodejs /app
USER mcp

# 启动命令 - 根据环境变量选择服务
CMD ["sh", "-c", "if [ \"$SERVICE\" = \"calculator\" ]; then node dist/calculator-server-unified.js; else node dist/file-manager-unified.js; fi"]