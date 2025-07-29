# Node.js 认证系统

本项目实现了与PHP版本相同的登录验证功能，包括JWT token管理、OIDC认证、用户权限管理等。

## 功能特性

- **JWT Token管理**: 生成、验证和刷新JWT token
- **OIDC认证**: 支持OpenID Connect单点登录
- **Redis缓存**: 用户session和token缓存
- **权限管理**: 基于角色的权限控制
- **用户管理**: 用户信息获取和管理
- **在线统计**: 实时在线用户数量统计

## 项目结构

```
nodejs/
├── controllers/
│   ├── authController.js      # 认证控制器
│   └── accountController.js   # 账户控制器
├── middleware/
│   └── auth.js               # 认证中间件
├── routes/
│   └── auth.js               # 认证路由
├── utils/
│   ├── jwt.js                # JWT工具类
│   ├── redis.js              # Redis工具类
│   └── curl.js               # HTTP请求工具
├── libs/
│   └── openIDClient.js       # OIDC客户端
└── test-auth.js              # 认证功能测试
```

## 环境配置

复制 `.env.example` 到 `.env` 并配置相关参数：

```bash
cp .env.example .env
```

主要配置项：

```env
# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# OIDC配置
OIDC_ISSUER=http://localhost:5556
OIDC_CLIENT_ID=enterprise-tmsc
OIDC_CLIENT_SECRET=123456
WEB_URL=http://localhost:3000

# API服务配置
RDB_API_URL=http://localhost:8080
AUTH_API_URL=http://localhost:8081
GRPC_AUTH_HOST=localhost
GRPC_AUTH_PORT=9090
```

## 安装依赖

```bash
pnpm install
```

## 启动服务

```bash
npm start
# 或
node app.js
```

## 测试认证功能

```bash
node test-auth.js
```

## API接口

### 公开接口（无需认证）

#### 1. 获取OIDC配置
```http
GET /api/auth/getOidc
```

#### 2. OIDC认证
```http
POST /api/auth/authenticate
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

#### 3. 管理员登录
```http
POST /api/auth/supervisor
Content-Type: application/json

{
  "username": "admin",
  "password": "password",
  "lng": "116.404",
  "lat": "39.915",
  "method": "account"
}
```

#### 4. 获取在线用户数
```http
GET /api/auth/online
```

### 需要认证的接口

所有需要认证的接口都需要在请求头中包含token：

```http
Authorization: Bearer <token>
# 或
x-session-token: <token>
```

#### 1. 获取当前用户信息
```http
GET /api/auth/whoami
```

#### 2. 获取用户详细资料
```http
GET /api/auth/profile
```

#### 3. 获取用户权限
```http
GET /api/auth/permissions
```

#### 4. 获取用户菜单
```http
GET /api/auth/menu
```

#### 5. 用户登出
```http
POST /api/auth/logout
```

#### 6. 刷新token
```http
POST /api/auth/refresh
```

#### 7. 更新用户资料
```http
PUT /api/auth/profile
Content-Type: application/json

{
  "nickname": "新昵称",
  "email": "new@example.com",
  "phone": "13800138000"
}
```

#### 8. 修改密码
```http
POST /api/auth/change-password
Content-Type: application/json

{
  "oldPassword": "old123",
  "newPassword": "new123",
  "confirmPassword": "new123"
}
```

#### 9. 检查权限
```http
GET /api/auth/check-permission?permission=admin.user.read
```

### 管理员接口（需要特定权限）

#### 1. 加载权限表
```http
GET /api/auth/loadPermissionSheet
```
需要权限：`admin.permission.read`

#### 2. 获取主体权限
```http
GET /api/auth/getPermissionsForPrincipal?principal=user123&type=user
```
需要权限：`admin.permission.read`

#### 3. 角色管理
```http
# 获取角色列表
GET /api/auth/listRole

# 编辑角色
PUT /api/auth/editRole
{
  "id": 1,
  "name": "管理员",
  "description": "系统管理员角色",
  "permissions": [1, 2, 3]
}

# 删除角色
DELETE /api/auth/deleteRole
{
  "id": 1
}
```

#### 4. 角色绑定管理
```http
# 创建角色绑定
POST /api/auth/createRoleBinding
{
  "userId": 123,
  "roleId": 1
}

# 修改角色绑定
PUT /api/auth/modifyRoleBinding
{
  "userId": 123,
  "roleIds": [1, 2]
}

# 获取角色绑定
GET /api/auth/getRoleBinding?userId=123
```

## 核心组件说明

### JWT工具类 (utils/jwt.js)

- `issueToken()`: 签发JWT token
- `verifyToken()`: 验证JWT token
- `getJti()`: 生成唯一标识符
- `base64UrlEncode/Decode()`: Base64 URL编解码
- `signature()`: HMAC SHA256签名

### Redis工具类 (utils/redis.js)

- `init()`: 初始化Redis连接
- `set/get/del()`: 基本键值操作
- `exists()`: 检查键是否存在
- `expire()`: 设置过期时间
- `keys()`: 获取匹配的键
- `ttl()`: 获取剩余生存时间

### 认证中间件 (middleware/auth.js)

- `tokenCheck()`: Token验证中间件
- `grpcTokenCheck()`: gRPC token验证
- `whoami()`: 获取用户信息
- `requirePermissions()`: 权限检查中间件
- `getUserPermissions()`: 获取用户权限
- `optionalAuth()`: 可选认证中间件

### OIDC客户端 (libs/openIDClient.js)

- `getAuthorizationUrl()`: 生成授权URL
- `requestTokens()`: 请求tokens
- `getIdToken/AccessToken()`: 获取tokens
- `getUserInfo()`: 获取用户信息
- `refreshAccessToken()`: 刷新token
- `revokeToken()`: 撤销token

## 错误码说明

- `400`: 请求参数错误
- `401`: 未认证或token无效
- `403`: 权限不足
- `404`: 资源不存在
- `500`: 服务器内部错误
- `1001`: 登录失败
- `2004`: 外部服务调用失败

## 安全特性

1. **JWT签名验证**: 使用HMAC SHA256算法签名
2. **Token过期检查**: 自动检查token有效期
3. **Redis缓存**: 用户session缓存，支持快速登出
4. **权限控制**: 基于角色的访问控制
5. **请求日志**: 详细的认证和授权日志
6. **错误处理**: 统一的错误处理和日志记录

## 与PHP版本的对应关系

| PHP文件 | Node.js文件 | 功能说明 |
|---------|-------------|----------|
| `Auth.php` | `authController.js` | 认证控制器 |
| `Account.php` | `accountController.js` | 账户控制器 |
| `Token.php` | `authController.js` | Token管理 |
| `Events.php` | `auth.js` (middleware) | 认证中间件 |
| `Jwt.php` | `jwt.js` | JWT工具类 |
| `Auth.php` (urls) | `auth.js` (routes) | 认证路由 |
| `OpenIDClient.php` | `openIDClient.js` | OIDC客户端 |

## 开发说明

1. 所有API接口都返回统一的JSON格式
2. 使用Winston进行日志记录
3. 支持环境变量配置
4. 遵循RESTful API设计规范
5. 完整的错误处理和异常捕获
6. 支持跨域请求(CORS)

## 部署建议

1. 生产环境请修改JWT密钥
2. 配置Redis持久化
3. 启用HTTPS
4. 配置反向代理
5. 设置适当的日志级别
6. 监控Redis和数据库连接