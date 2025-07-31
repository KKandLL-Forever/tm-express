# 河流管理模块 (Basin Management)

本模块提供河流管理相关的API接口，包括河流树结构获取、河流信息编辑和删除等功能。

## 功能概述

河流管理模块是从PHP版本的 `Basin.php` 重构而来，保持了原有的所有功能特性：

- 获取河流树结构
- 创建/编辑河流信息
- 删除河流节点

## 文件结构

```
nodejs/
├── controllers/
│   └── nps/
│       └── basin.controller.js    # 河流管理控制器
├── routes/
│   └── nps/
│       └── basin.route.js         # 河流管理路由配置
├── utils/
│   └── curl.js                    # HTTP 请求工具 (已添加 rdb.basin 相关配置)
└── app.js                         # 主应用文件 (已添加河流管理路由)
```

## API 接口

### 1. 获取河流树结构

**接口地址：** `GET /api/nps/basin/basins`

**请求头：**
```
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tree": [
      {
        "id": 1,
        "name": "yangtze",
        "title": "长江",
        "pid": 0,
        "children": [
          {
            "id": 2,
            "name": "yangtze_upper",
            "title": "长江上游",
            "pid": 1
          }
        ]
      }
    ]
  }
}
```

### 2. 编辑河流（创建或更新）

**接口地址：** `POST /api/nps/basin/edit`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "id": 0,                    // 可选，河流ID，0或不传表示创建新河流
  "pid": 1,                   // 必填，父级ID
  "name": "yellow_river",     // 必填，河流识别代码
  "title": "黄河",            // 必填，河流名称
  "remark": "中国第二大河",    // 可选，备注
  "metadata": {               // 可选，扩展数据
    "length": "5464km",
    "source": "青海省"
  }
}
```

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 3,
    "name": "yellow_river",
    "title": "黄河",
    "pid": 1,
    "cate_name": "river",
    "leaf": 0,
    "metadata": {
      "length": "5464km",
      "source": "青海省"
    }
  }
}
```

### 3. 删除河流

**接口地址：** `DELETE /api/nps/basin/remove`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "id": 3    // 必填，河流ID
}
```

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": true
}
```

## 错误处理

所有接口都包含统一的错误处理机制：

**客户端错误 (400)：**
```json
{
  "code": 400,
  "message": "缺少必填字段: pid, name, title"
}
```

**服务器错误 (500)：**
```json
{
  "code": 2004,
  "message": "获取资源树数据失败: 连接超时"
}
```

## 依赖服务

河流管理模块依赖以下外部服务：

- **RDB服务：** 提供节点数据的存储和管理
  - `rdb.getNodeTree` - 获取节点树结构
  - `rdb.createNode` - 创建/更新节点
  - `rdb.deleteNode` - 删除节点

## 环境配置

在 `.env` 文件中配置RDB服务地址：

```env
RDB_HOST=http://localhost:8080
```

## 认证要求

所有API接口都需要有效的JWT token进行认证。token应在请求头中以Bearer格式传递：

```
Authorization: Bearer <your-jwt-token>
```

## 与PHP版本的对应关系

| PHP方法 | Node.js方法 | 功能描述 |
|---------|-------------|----------|
| `basins()` | `getBasins()` | 获取河流树结构 |
| `edit()` | `editBasin()` | 编辑河流信息 |
| `remove()` | `removeBasin()` | 删除河流 |

## 测试

可以使用以下curl命令测试API：

```bash
# 获取河流树
curl -X GET "http://localhost:6000/api/nps/basin/basins" \
  -H "Authorization: Bearer <token>"

# 创建河流
curl -X POST "http://localhost:6000/api/nps/basin/edit" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pid": 0,
    "name": "yangtze",
    "title": "长江",
    "remark": "中国最长河流"
  }'

# 删除河流
curl -X DELETE "http://localhost:6000/api/nps/basin/remove" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

## 注意事项

1. 所有接口都需要认证token
2. 创建河流时，`pid`、`name`、`title` 为必填字段
3. 删除河流时，需要确保没有子节点依赖
4. 河流分类固定为 "river"
5. 所有河流节点的 `leaf` 属性默认为 0（非叶子节点）