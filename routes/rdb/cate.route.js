/**
 * 节点分类路由配置
 * 对应 PHP 中的 app/events/rdb/Cate.php 的路由映射
 * 
 * @package routes
 * @author System
 * @version 1.0
 */

const express = require('express');
const router = express.Router();
const cateController = require('../../controllers/rdb/cate.controller');
const AuthMiddleware = require('../../middleware/auth');
const Logger = require('../../utils/logger');

// 初始化节点分类路由
Logger.info('初始化节点分类路由模块');

// ============ 需要认证的接口 ============

/**
 * 获取节点分类列表
 * POST /api/cate/list
 * 对应 PHP 中的 cates 方法
 * 
 * 请求参数:
 * - condition: array, 可选, 查询条件
 * - pagination: array, 可选, 分页参数
 */
router.post('/list', 
    AuthMiddleware.tokenCheck,
    cateController.getCates
);

/**
 * 创建或编辑节点分类
 * POST /api/cate/edit
 * 对应 PHP 中的 edit 方法
 * 
 * 请求参数:
 * - id: int, 可选, ID (编辑时需要)
 * - name: string, 必填, 名称
 * - title: string, 必填, 主题
 * - icon_color: string, 可选, 图标颜色
 * - remark: string, 可选, 备注
 */
router.post('/edit',
    AuthMiddleware.tokenCheck,
    cateController.editCate
);

/**
 * 获取单个节点分类详情
 * POST /api/cate/detail
 * 对应 PHP 中的 cate 方法
 * 
 * 请求参数:
 * - name: string, 必填, 分类名称
 */
router.post('/detail',
    AuthMiddleware.tokenCheck,
    cateController.getCate
);

/**
 * 删除节点分类
 * POST /api/cate/remove
 * 对应 PHP 中的 remove 方法
 * 
 * 请求参数:
 * - id: int, 必填, 要删除的分类ID
 */
router.post('/remove',
    AuthMiddleware.tokenCheck,
    cateController.removeCate
);

// ============ RESTful 风格的路由 (可选) ============

/**
 * RESTful 风格的路由，提供更标准的 HTTP 方法映射
 */

// GET /api/cate - 获取分类列表
// router.get('/',
//     AuthMiddleware.tokenCheck,
//     (req, res, next) => {
//         // 将 GET 参数转换为 POST body 格式
//         req.body = {
//             condition: req.query.condition ? JSON.parse(req.query.condition) : {},
//             pagination: req.query.pagination ? JSON.parse(req.query.pagination) : {}
//         };
//         cateController.getCates(req, res, next);
//     }
// );

// // POST /api/cate - 创建新分类
// router.post('/',
//     AuthMiddleware.tokenCheck,
//     cateController.editCate
// );

// // PUT /api/cate/:id - 更新分类
// router.put('/:id',
//     AuthMiddleware.tokenCheck,
//     (req, res, next) => {
//         // 将路径参数添加到 body 中
//         req.body.id = parseInt(req.params.id);
//         cateController.editCate(req, res, next);
//     }
// );

// // GET /api/cate/:name - 获取单个分类详情
// router.get('/:name',
//     AuthMiddleware.tokenCheck,
//     (req, res, next) => {
//         // 将路径参数转换为 body 格式
//         req.body = { name: req.params.name };
//         cateController.getCate(req, res, next);
//     }
// );

// // DELETE /api/cate/:id - 删除分类
// router.delete('/:id',
//     AuthMiddleware.tokenCheck,
//     (req, res, next) => {
//         // 将路径参数转换为 body 格式
//         req.body = { id: parseInt(req.params.id) };
//         cateController.removeCate(req, res, next);
//     }
// );

module.exports = router;