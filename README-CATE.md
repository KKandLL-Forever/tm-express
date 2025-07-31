# 节点分类 API (Cate)

## 概述

本文档描述了从 PHP 版本的 `app/events/rdb/Cate.php` 转换而来的 Node.js 节点分类 API。该 API 提供了节点分类的完整 CRUD 操作功能。

## 文件结构

```
nodejs/
├── controllers/
│   └── rdb/
│       └── cate.controller.js # 节点分类控制器
├── routes/
│   └── rdb/
│       └── cate.route.js      # 节点分类路由配置
├── utils/
│   └── curl.js                # HTTP 请求工具 (已添加 rdb.cate 相关配置)
├── test-cate.js               # API 测试文件
└── README-CATE.md             # 本文档
```

## API 功能对比

| PHP 方法 | Node.js 控制器方法 | 路由 | 功能描述 |
|---------|-------------------|------|----------|
| `cates()` | `getCates()` | `POST /api/cate/list` | 获取节点分类列表 |
| `edit()` | `editCate()` | `POST /api/cate/edit` | 创建或编辑节点分类 |
| `cate()` | `getCate()` | `POST /api/cate/detail` | 获取单个节点分类详情 |
| `remove()` | `removeCate()` | `POST /api/cate/remove` | 删除节点分类 |

## API 接口详情

### 1. 获取节点分类列表

**接口**: `POST /api/cate/list`

**请求参数**:
```json
{
  "condition": {},           // 可选，查询条件
  "pagination": {            // 可选，分页参数
    "page": 1,
    "limit": 10
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "server",
      "title": "服务器",
      "icon_color": "#2196F3",
      "remark": "服务器节点分类"
    }
  ]
}
```

### 2. 创建或编辑节点分类

**接口**: `POST /api/cate/edit`

**请求参数**:
```json
{
  "id": 1,                    // 可选，编辑时需要
  "name": "server",           // 必填，分类名称
  "title": "服务器",          // 必填，分类标题
  "icon_color": "#2196F3",    // 可选，图标颜色
  "remark": "服务器节点分类"   // 可选，备注
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "server",
    "title": "服务器",
    "icon_color": "#2196F3",
    "remark": "服务器节点分类"
  }
}
```

### 3. 获取单个节点分类详情

**接口**: `POST /api/cate/detail`

**请求参数**:
```json
{
  "name": "server"            // 必填，分类名称
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "server",
    "title": "服务器",
    "icon_color": "#2196F3",
    "remark": "服务器节点分类"
  }
}
```

### 4. 删除节点分类

**接口**: `POST /api/cate/remove`

**请求参数**:
```json
{
  "id": 1                     // 必填，要删除的分类ID
}
```

**响应示例**:
```json
{
  "success": true,
  "data": true
}
```

## RESTful 风格接口

除了上述 POST 接口外，还提供了 RESTful 风格的接口：

| 方法 | 路由 | 功能 |
|------|------|------|
| `GET` | `/api/cate` | 获取分类列表 |
| `POST` | `/api/cate` | 创建新分类 |
| `PUT` | `/api/cate/:id` | 更新分类 |
| `GET` | `/api/cate/:name` | 获取单个分类详情 |
| `DELETE` | `/api/cate/:id` | 删除分类 |

## 认证要求

所有接口都需要在请求头中包含有效的认证 token：

```
Headers:
  x-session-token: your-auth-token
```

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "code": 400,
  "message": "错误描述"
}
```

### 常见错误码

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 500 | 服务器内部错误 |
| 2004 | 业务逻辑错误 |

## 后端服务配置

在 `utils/curl.js` 中已添加以下 API 配置：

```javascript
'rdb.listNodeCate': {
    method: 'POST',
    url: '/api/node/cate/list',
    host: process.env.RDB_HOST || 'http://localhost:8080'
},
'rdb.createNodeCate': {
    method: 'POST',
    url: '/api/node/cate/create',
    host: process.env.RDB_HOST || 'http://localhost:8080'
},
'rdb.getNodeCate': {
    method: 'POST',
    url: '/api/node/cate/get',
    host: process.env.RDB_HOST || 'http://localhost:8080'
},
'rdb.deleteNodeCate': {
    method: 'POST',
    url: '/api/node/cate/delete',
    host: process.env.RDB_HOST || 'http://localhost:8080'
}
```

## 环境变量

确保设置以下环境变量：

```bash
RDB_HOST=http://your-rdb-service-host:port
```

## 测试

使用提供的测试文件进行 API 测试：

```bash
node test-cate.js
```

注意：测试前需要确保：
1. 服务器正在运行
2. 有有效的认证 token
3. 后端 RDB 服务可用

## 主要改进

相比 PHP 版本，Node.js 版本具有以下改进：

1. **更好的错误处理**: 统一的错误响应格式和详细的日志记录
2. **RESTful 支持**: 提供标准的 HTTP 方法映射
3. **参数验证**: 更严格的请求参数验证
4. **日志记录**: 详细的操作日志，便于调试和监控
5. **代码结构**: 清晰的控制器和路由分离
6. **文档完善**: 详细的 API 文档和测试用例

## 注意事项

1. 所有接口都需要有效的认证 token
2. 请求和响应都使用 JSON 格式
3. 确保后端 RDB 服务的 API 端点与配置一致
4. 生产环境中请设置正确的 `RDB_HOST` 环境变量