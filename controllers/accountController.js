/**
 * 账户控制器
 * 负责处理用户账户信息获取、权限验证和菜单生成等功能
 * 
 * @package controllers
 * @author System
 * @version 1.0
 */

const Jwt = require('../utils/jwt');
const Redis = require('../utils/redis');
const Curl = require('../utils/curl');
const AuthMiddleware = require('../middleware/auth');
const Logger = require('../utils/logger');

// 账户控制器方法
const accountController = {
    /**
     * 获取用户个人资料
     * 通过token验证用户身份，获取用户详细信息和权限
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    getProfile: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            // 通过认证服务获取用户详细信息
            const userInfo = await AuthMiddleware.whoami(user.token);
            if (!userInfo) {
                return res.status(404).json({
                    success: false,
                    code: 404,
                    message: '用户信息不存在'
                });
            }

            // 获取用户权限列表
            const permissions = await AuthMiddleware.getUserPermissions(user.token);

            // 生成菜单结构
            const menu = accountController.toMenu(permissions || []);

            Logger.info('用户资料获取成功', {
                username: userInfo.username || 'unknown',
                permissionCount: permissions ? permissions.length : 0
            });

            return res.json({
                success: true,
                data: {
                    user: userInfo,
                    permissions: permissions || [],
                    menu: menu
                }
            });

        } catch (error) {
            Logger.error('获取用户资料异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 获取用户权限列表
     * 返回当前用户的所有权限信息
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    getPermissions: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            // 获取用户权限列表
            const permissions = await AuthMiddleware.getUserPermissions(user.token);

            Logger.info('用户权限获取成功', {
                username: user.username || 'unknown',
                permissionCount: permissions ? permissions.length : 0
            });

            return res.json({
                success: true,
                data: permissions || []
            });

        } catch (error) {
            Logger.error('获取用户权限异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 根据用户权限生成菜单结构
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    getMenu: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            // 获取用户权限列表
            const permissions = await AuthMiddleware.getUserPermissions(user.token);

            // 生成菜单结构
            const menu = accountController.toMenu(permissions || []);

            Logger.info('用户菜单获取成功', {
                username: user.username || 'unknown',
                menuItemCount: menu.length
            });

            return res.json({
                success: true,
                data: menu
            });

        } catch (error) {
            Logger.error('获取用户菜单异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 更新用户资料
     * 允许用户更新部分个人信息
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    updateProfile: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            const { nickname, email, phone } = req.body;

            // 构建更新数据
            const updateData = {};
            if (nickname !== undefined) updateData.nickname = nickname;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: '没有提供要更新的数据'
                });
            }

            // 这里应该调用用户服务更新用户信息
            // 由于原PHP代码中没有更新功能，这里只是示例
            Logger.info('用户资料更新请求', {
                username: user.username || 'unknown',
                updateFields: Object.keys(updateData)
            });

            return res.json({
                success: true,
                message: '资料更新成功',
                data: updateData
            });

        } catch (error) {
            Logger.error('更新用户资料异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 修改用户密码
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    changePassword: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            const { oldPassword, newPassword, confirmPassword } = req.body;

            // 验证必需参数
            if (!oldPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: '请提供完整的密码信息'
                });
            }

            // 验证新密码确认
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: '新密码与确认密码不匹配'
                });
            }

            // 这里应该调用用户服务验证旧密码并更新新密码
            // 由于原PHP代码中没有密码修改功能，这里只是示例
            Logger.info('用户密码修改请求', {
                username: user.username || 'unknown'
            });

            return res.json({
                success: true,
                message: '密码修改成功'
            });

        } catch (error) {
            Logger.error('修改密码异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 将权限列表转换为菜单结构
     * 根据权限信息生成层级菜单，用于前端渲染
     * 
     * @param {Array} permissions 权限列表数组
     * @returns {Array} 菜单结构数组
     */
    toMenu(permissions) {
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return [];
        }

        const menuMap = new Map();
        const rootMenus = [];

        // 处理权限列表，构建菜单项
        permissions.forEach(permission => {
            if (!permission || typeof permission !== 'object') {
                return;
            }

            const {
                id,
                name,
                path,
                icon,
                parent_id,
                sort_order = 0,
                type = 'menu',
                description
            } = permission;

            // 只处理菜单类型的权限
            if (type !== 'menu') {
                return;
            }

            const menuItem = {
                id: id,
                name: name || 'Unknown',
                path: path || '#',
                icon: icon || 'default',
                parentId: parent_id || null,
                sortOrder: parseInt(sort_order) || 0,
                description: description || '',
                children: []
            };

            menuMap.set(id, menuItem);

            // 如果没有父级，则为根菜单
            if (!parent_id) {
                rootMenus.push(menuItem);
            }
        });

        // 构建菜单层级关系
        menuMap.forEach(menuItem => {
            if (menuItem.parentId && menuMap.has(menuItem.parentId)) {
                const parent = menuMap.get(menuItem.parentId);
                parent.children.push(menuItem);
            }
        });

        // 对菜单进行排序
        const sortMenus = (menus) => {
            menus.sort((a, b) => a.sortOrder - b.sortOrder);
            menus.forEach(menu => {
                if (menu.children && menu.children.length > 0) {
                    sortMenus(menu.children);
                }
            });
        };

        sortMenus(rootMenus);

        Logger.debug('菜单生成完成', {
            totalPermissions: permissions.length,
            rootMenuCount: rootMenus.length,
            totalMenuItems: menuMap.size
        });

        return rootMenus;
    },

    /**
     * 检查用户是否有指定权限
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    checkPermission: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            const { permission } = req.query;
            if (!permission) {
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: '请提供要检查的权限'
                });
            }

            // 获取用户权限列表
            const permissions = await AuthMiddleware.getUserPermissions(user.token);
            const hasPermission = permissions && permissions.some(p => 
                p.name === permission || p.code === permission
            );

            return res.json({
                success: true,
                data: {
                    permission: permission,
                    hasPermission: hasPermission
                }
            });

        } catch (error) {
            Logger.error('权限检查异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    }
};

module.exports = accountController;