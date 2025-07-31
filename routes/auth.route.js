const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const accountController = require('../controllers/account.controller');
const AuthMiddleware = require('../middleware/auth');
const Logger = require('../utils/logger');

// 初始化认证路由
Logger.info('初始化认证路由模块');

// ============ 公开接口（无需认证） ============

// 获取OIDC配置
router.get('/getOidc', authController.getOidc);

// OIDC认证接口
router.post('/authenticate', authController.exchange);

// 管理员登录
router.post('/supervisor', authController.supervisorLogin);

// 获取在线用户数
router.get('/online', authController.getOnlineUsers);

// ============ 需要认证的接口 ============

// 获取当前用户信息
router.get('/whoami', AuthMiddleware.tokenCheck, accountController.getProfile);

// 用户登出
router.post('/logout', AuthMiddleware.tokenCheck, authController.logout);

// 刷新token
router.post('/refresh', AuthMiddleware.tokenCheck, authController.refreshToken);

// 获取用户详细资料
router.get('/profile', AuthMiddleware.tokenCheck, accountController.getProfile);

// 获取用户权限列表
router.get('/permissions', AuthMiddleware.tokenCheck, accountController.getPermissions);

// 获取用户菜单
router.get('/menu', AuthMiddleware.tokenCheck, accountController.getMenu);

// 更新用户资料
router.put('/profile', AuthMiddleware.tokenCheck, accountController.updateProfile);

// 修改密码
router.post('/change-password', AuthMiddleware.tokenCheck, accountController.changePassword);

// 检查权限
router.get('/check-permission', AuthMiddleware.tokenCheck, accountController.checkPermission);

// ============ 权限管理接口（需要管理员权限） ============

// 加载权限表
router.get('/loadPermissionSheet',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.permission.read']),
	authController.loadPermissionSheet
);

// 获取主体权限
router.get('/getPermissionsForPrincipal',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.permission.read']),
	authController.getPermissionsForPrincipal
);

// 角色列表
router.get('/listRole',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.role.read']),
	authController.listRole
);

// 编辑角色
router.put('/editRole',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.role.write']),
	authController.editRole
);

// 删除角色
router.delete('/deleteRole',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.role.delete']),
	authController.deleteRole
);

// 创建角色绑定
router.post('/createRoleBinding',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.role.bind']),
	authController.createRoleBinding
);

// 修改角色绑定
router.put('/modifyRoleBinding',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.role.bind']),
	authController.modifyRoleBinding
);

// 获取角色绑定
router.get('/getRoleBinding',
	AuthMiddleware.tokenCheck,
	AuthMiddleware.requirePermissions(['admin.role.read']),
	authController.getRoleBinding
);

module.exports = router;