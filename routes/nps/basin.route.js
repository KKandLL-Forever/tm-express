/**
 * 河流管理路由
 * 定义河流相关的API路由
 * 
 * @author AI Assistant
 * @date 2024
 */

const express = require('express');
const router = express.Router();
const basinController = require('../../controllers/nps/basin.controller');
const AuthMiddleware = require('../../middleware/auth');
const Logger = require('../../utils/logger');

// 初始化河流管理路由
Logger.info('初始化河流管理路由模块');

// ============ 河流管理接口（需要认证） ============

/**
 * 获取河流树结构
 * GET /api/nps/basin/basins
 */
router.get('/basins', 
  AuthMiddleware.tokenCheck,
  basinController.getBasins
);

/**
 * 编辑河流（创建或更新）
 * POST /api/nps/basin/edit
 * 
 * 请求体参数:
 * - id: number (可选) - 河流ID，0或不传表示创建新河流
 * - pid: number (必填) - 父级ID
 * - name: string (必填) - 河流识别代码
 * - title: string (必填) - 河流名称
 * - remark: string (可选) - 备注
 * - metadata: object (可选) - 扩展数据
 */
router.post('/edit',
  AuthMiddleware.tokenCheck,
  basinController.editBasin
);

/**
 * 删除河流
 * DELETE /api/nps/basin/remove
 * 
 * 请求体参数:
 * - id: number (必填) - 河流ID
 */
router.delete('/remove',
  AuthMiddleware.tokenCheck,
  basinController.removeBasin
);

// 导出路由
module.exports = router;

Logger.info('河流管理路由模块加载完成');