# Express Backend Server

基于Express框架的Node.js后端服务项目，提供RESTful API接口。

## 项目结构

```
nodejs/
├── app.js                 # 主应用入口文件
├── package.json           # 项目配置文件
├── README.md             # 项目说明文档
├── routes/               # 路由模块
│   └── users.js          # 用户路由
├── controllers/          # 控制器模块
│   └── userController.js # 用户控制器
└── middleware/           # 中间件模块
    └── logger.js         # 日志中间件
```

## 功能特性

- ✅ Express.js 框架
- ✅ RESTful API 设计
- ✅ 模块化路由管理
- ✅ 控制器层分离
- ✅ 自定义中间件
- ✅ 请求日志记录
- ✅ 错误处理机制
- ✅ 开发环境热重载

## 安装依赖

```bash
# 使用pnpm安装依赖
pnpm install
```

## 启动项目

### 开发模式（热重载）
```bash
pnpm run dev
```

### 生产模式
```bash
pnpm start
```

服务器将在 `http://localhost:3000` 启动

## API 接口

### 基础接口

- `GET /` - 欢迎页面
- `GET /api/health` - 健康检查

### 用户管理接口

- `GET /api/users` - 获取所有用户
- `GET /api/users/:id` - 根据ID获取用户
- `POST /api/users` - 创建新用户
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户

### 请求示例

#### 创建用户
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com"
  }'
```

#### 获取所有用户
```bash
curl http://localhost:3000/api/users
```

#### 获取特定用户
```bash
curl http://localhost:3000/api/users/1
```

#### 更新用户
```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "李四",
    "email": "lisi@example.com"
  }'
```

#### 删除用户
```bash
curl -X DELETE http://localhost:3000/api/users/1
```

## 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息",
  "error": "详细错误描述"
}
```

## 开发说明

### 添加新路由

1. 在 `routes/` 目录下创建新的路由文件
2. 在 `app.js` 中引入并注册路由

### 添加新控制器

1. 在 `controllers/` 目录下创建控制器文件
2. 在对应的路由文件中引入控制器方法

### 添加新中间件

1. 在 `middleware/` 目录下创建中间件文件
2. 在 `app.js` 中引入并使用中间件

## 环境变量

可以创建 `.env` 文件来配置环境变量：

```env
PORT=3000
NODE_ENV=development
```

## 日志系统

项目使用 Winston 日志库，支持与 PHP Monolog 相同的日志级别：

### 日志级别（按优先级排序）
- `emergency`: 紧急情况，系统不可用
- `alert`: 警报，需要立即采取行动
- `critical`: 严重错误，关键组件故障
- `error`: 错误，运行时错误但不需要立即处理
- `warning`: 警告，使用了废弃的API或不当用法
- `notice`: 通知，正常但重要的事件
- `info`: 信息，一般性信息消息
- `debug`: 调试，详细的调试信息

### 使用方法
```javascript
const Logger = require('./utils/logger');

// 记录不同级别的日志
Logger.emergency('系统紧急情况');
Logger.alert('需要立即处理的警报');
Logger.critical('严重错误');
Logger.error('运行时错误');
Logger.warning('警告信息');
Logger.notice('重要通知');
Logger.info('一般信息');
Logger.debug('调试信息');

// 带上下文信息的日志
Logger.info('用户登录', { userId: 123, ip: '192.168.1.1' });
```

### 日志输出
- **控制台**: 彩色格式化输出
- **文件**: `logs/app.log` (所有级别)
- **错误文件**: `logs/error.log` (error及以上级别)

### 配置
通过环境变量 `LOG_LEVEL` 设置日志级别，默认为 `info`。

## 技术栈

- **Node.js**: JavaScript运行时环境
- **Express**: Web应用框架
- **Winston**: 日志管理库（与PHP Monolog兼容）
- **nodemon**: 开发时热重载工具
- **pnpm**: 包管理器

## 许可证

ISC License