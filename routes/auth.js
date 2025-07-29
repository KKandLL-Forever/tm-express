/**
 * 认证路由配置
 * 定义认证服务相关的API端点，包括登录、OIDC认证、用户信息等
 * 
 * @package routes
 * @author System
 * @version 1.0
 */

const express = require('express');
const authController = require('../controllers/authController');
const accountController = require('../controllers/accountController');
const AuthMiddleware = require('../middleware/auth');
const Logger = require('../utils/logger');

const router = express.Router();

/**
 * 初始化认证路由
 * 配置所有认证相关的API端点
 * 
 * @param {string} host 主机地址，用于构建完整的API URL
 */
function initAuthRoutes(host = 'localhost') {
        Logger.info('初始化认证路由', { host });

        // ============ 公开接口（无需认证） ============
        
        /**
         * 获取当前用户信息
         * GET /auth/whoami
         * 通过token获取用户详细信息
         */
        router.get('/whoami', AuthMiddleware.tokenCheck, accountController.getProfile);

        /**
         * OIDC认证接口
         * POST /auth/authenticate
         * 使用ID Token换取系统访问令牌
         */
        router.post('/authenticate', authController.exchange);

        /**
         * 获取OIDC配置
         * GET /auth/getOidc
         * 获取OIDC认证服务器配置信息
         */
        router.get('/getOidc', authController.getOidc);

        /**
         * 管理员登录
         * POST /auth/supervisor
         * 管理员账号密码登录
         */
        router.post('/supervisor', authController.supervisorLogin);

        /**
         * 获取在线用户数
         * GET /auth/online
         * 获取当前在线用户统计
         */
        router.get('/online', authController.getOnlineUsers);

        // ============ 需要认证的接口 ============

        /**
         * 用户登出
         * POST /auth/logout
         * 清除用户登录状态
         */
        router.post('/logout', AuthMiddleware.tokenCheck, authController.logout);

        /**
         * 刷新token
         * POST /auth/refresh
         * 延长token有效期
         */
        router.post('/refresh', AuthMiddleware.tokenCheck, authController.refreshToken);

        /**
         * 获取当前用户信息（详细版）
         * GET /auth/profile
         * 获取用户详细资料和权限信息
         */
        router.get('/profile', AuthMiddleware.tokenCheck, accountController.getProfile);

        /**
         * 获取用户权限列表
         * GET /auth/permissions
         * 获取当前用户的所有权限
         */
        router.get('/permissions', AuthMiddleware.tokenCheck, accountController.getPermissions);

        /**
         * 获取用户菜单
         * GET /auth/menu
         * 根据权限生成菜单结构
         */
        router.get('/menu', AuthMiddleware.tokenCheck, accountController.getMenu);

        /**
         * 更新用户资料
         * PUT /auth/profile
         * 更新用户个人信息
         */
        router.put('/profile', AuthMiddleware.tokenCheck, accountController.updateProfile);

        /**
         * 修改密码
         * POST /auth/change-password
         * 修改用户登录密码
         */
        router.post('/change-password', AuthMiddleware.tokenCheck, accountController.changePassword);

        /**
         * 检查权限
         * GET /auth/check-permission
         * 检查用户是否有指定权限
         */
        router.get('/check-permission', AuthMiddleware.tokenCheck, accountController.checkPermission);

        // ============ 权限管理接口（需要管理员权限） ============

        /**
         * 加载权限表
         * GET /auth/loadPermissionSheet
         * 获取系统所有权限配置
         */
        router.get('/loadPermissionSheet', 
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.permission.read']),
            loadPermissionSheet
        );

        /**
         * 获取主体权限
         * GET /auth/getPermissionsForPrincipal
         * 获取指定用户或角色的权限列表
         */
        router.get('/getPermissionsForPrincipal',
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.permission.read']),
            getPermissionsForPrincipal
        );

        /**
         * 角色列表
         * GET /auth/listRole
         * 获取系统所有角色列表
         */
        router.get('/listRole',
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.role.read']),
            listRole
        );

        /**
         * 编辑角色
         * PUT /auth/editRole
         * 修改角色信息
         */
        router.put('/editRole',
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.role.write']),
            editRole
        );

        /**
         * 删除角色
         * DELETE /auth/deleteRole
         * 删除指定角色
         */
        router.delete('/deleteRole',
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.role.delete']),
            deleteRole
        );

        /**
         * 创建角色绑定
         * POST /auth/createRoleBinding
         * 为用户分配角色
         */
        router.post('/createRoleBinding',
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.role.bind']),
            createRoleBinding
        );

        /**
         * 修改角色绑定
         * PUT /auth/modifyRoleBinding
         * 修改用户角色分配
         */
        router.put('/modifyRoleBinding',
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.role.bind']),
            modifyRoleBinding
        );

        /**
         * 获取角色绑定
         * GET /auth/getRoleBinding
         * 获取用户角色绑定信息
         */
        router.get('/getRoleBinding',
            AuthMiddleware.tokenCheck,
            AuthMiddleware.requirePermissions(['admin.role.read']),
            getRoleBinding
        );

        // ============ 错误处理中间件 ============
        router.use(errorHandler);

        Logger.info('认证路由初始化完成');
        return router;
}

// ============ 权限管理接口实现 ============

/**
 * 加载权限表
 */
async function loadPermissionSheet(req, res) {
        try {
            // 这里应该调用权限服务获取权限表
            // 暂时返回示例数据
            const permissions = [
                {
                    id: 1,
                    name: 'admin.user.read',
                    description: '查看用户',
                    category: 'user'
                },
                {
                    id: 2,
                    name: 'admin.user.write',
                    description: '编辑用户',
                    category: 'user'
                }
            ];

            return res.json({
                success: true,
                data: permissions
            });
        } catch (error) {
            Logger.error('加载权限表异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

/**
 * 获取主体权限
 */
async function getPermissionsForPrincipal(req, res) {
        try {
            const { principal, type } = req.query;
            
            if (!principal || !type) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必需参数'
                });
            }

            // 这里应该调用权限服务获取主体权限
            const permissions = [];

            return res.json({
                success: true,
                data: permissions
            });
        } catch (error) {
            Logger.error('获取主体权限异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

    /**
 * 获取角色列表
 */
async function listRole(req, res) {
        try {
            // 这里应该调用角色服务获取角色列表
            const roles = [];

            return res.json({
                success: true,
                data: roles
            });
        } catch (error) {
            Logger.error('获取角色列表异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

/**
 * 编辑角色
 */
async function editRole(req, res) {
        try {
            const { id, name, description, permissions } = req.body;
            
            if (!id || !name) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必需参数'
                });
            }

            // 这里应该调用角色服务更新角色
            Logger.info('角色编辑请求', { id, name });

            return res.json({
                success: true,
                message: '角色更新成功'
            });
        } catch (error) {
            Logger.error('编辑角色异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

/**
 * 删除角色
 */
async function deleteRole(req, res) {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '缺少角色ID'
                });
            }

            // 这里应该调用角色服务删除角色
            Logger.info('角色删除请求', { id });

            return res.json({
                success: true,
                message: '角色删除成功'
            });
        } catch (error) {
            Logger.error('删除角色异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

/**
 * 创建角色绑定
 */
async function createRoleBinding(req, res) {
        try {
            const { userId, roleId } = req.body;
            
            if (!userId || !roleId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必需参数'
                });
            }

            // 这里应该调用角色服务创建角色绑定
            Logger.info('创建角色绑定请求', { userId, roleId });

            return res.json({
                success: true,
                message: '角色绑定创建成功'
            });
        } catch (error) {
            Logger.error('创建角色绑定异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

/**
 * 修改角色绑定
 */
async function modifyRoleBinding(req, res) {
        try {
            const { userId, roleIds } = req.body;
            
            if (!userId || !Array.isArray(roleIds)) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必需参数'
                });
            }

            // 这里应该调用角色服务修改角色绑定
            Logger.info('修改角色绑定请求', { userId, roleCount: roleIds.length });

            return res.json({
                success: true,
                message: '角色绑定修改成功'
            });
        } catch (error) {
            Logger.error('修改角色绑定异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

/**
 * 获取角色绑定
 */
async function getRoleBinding(req, res) {
        try {
            const { userId } = req.query;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少用户ID'
                });
            }

            // 这里应该调用角色服务获取角色绑定
            const bindings = [];

            return res.json({
                success: true,
                data: bindings
            });
        } catch (error) {
            Logger.error('获取角色绑定异常', { error: error.message });
            return res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
}

/**
 * 错误处理中间件
 */
function errorHandler(error, req, res, next) {
        Logger.error('认证路由错误', {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
        });

        if (res.headersSent) {
            return next(error);
        }

        return res.status(500).json({
            success: false,
            code: 500,
            message: '服务器内部错误'
        });
}

module.exports = initAuthRoutes();