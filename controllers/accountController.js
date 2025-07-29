/**
 * 账户控制器
 * 负责处理用户账户相关的业务逻辑，包括个人资料管理、密码修改等
 * 
 * @package controllers
 * @author System
 * @version 1.0
 */

const Curl = require('../utils/curl');
const Logger = require('../utils/logger');

Logger.info('初始化账户控制器模块');

// 账户控制器方法
// 获取用户个人资料
exports.getProfile = async (req, res, next) => {
    try {
        const user = req.user;
        
        Logger.info('获取用户个人资料请求', {
            userId: user?.id,
            username: user?.username,
            requestId: req.headers['x-request-id'],
            userAgent: req.headers['user-agent']
        });

        if (!user) {
            Logger.warning('获取个人资料时用户信息缺失', {
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未认证'
            });
        }

        // 构建用户资料响应
        const profile = {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name || user.username,
            avatar: user.avatar || null,
            roles: user.roles || [],
            permissions: user.permissions || [],
            lastLoginAt: user.lastLoginAt || null,
            createdAt: user.createdAt || null
        };

        Logger.info('用户个人资料获取成功', {
            userId: user.id,
            username: user.username,
            hasAvatar: !!profile.avatar,
            roleCount: profile.roles.length,
            permissionCount: profile.permissions.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: profile
        });

    } catch (error) {
        Logger.error('获取用户个人资料异常', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 获取用户权限列表
exports.getPermissions = async (req, res, next) => {
    try {
        const user = req.user;
        
        Logger.info('获取用户权限列表请求', {
            userId: user?.id,
            username: user?.username,
            requestId: req.headers['x-request-id']
        });

        if (!user) {
            Logger.warning('获取权限列表时用户信息缺失', {
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未认证'
            });
        }

        // 这里应该调用权限服务获取用户权限
        // const [permissions, error] = await Curl.api('auth.getUserPermissions').request({
        //     userId: user.id
        // });

        // 暂时返回模拟权限数据
        const permissions = user.permissions || [
            'user.profile.read',
            'user.profile.write'
        ];

        Logger.info('用户权限列表获取成功', {
            userId: user.id,
            username: user.username,
            permissionCount: permissions.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: {
                permissions,
                total: permissions.length
            }
        });

    } catch (error) {
        Logger.error('获取用户权限列表异常', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 获取用户菜单
exports.getMenu = async (req, res, next) => {
    try {
        const user = req.user;
        
        Logger.info('获取用户菜单请求', {
            userId: user?.id,
            username: user?.username,
            requestId: req.headers['x-request-id']
        });

        if (!user) {
            Logger.warning('获取菜单时用户信息缺失', {
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未认证'
            });
        }

        // 获取用户权限列表
        const permissions = user.permissions || [];

        // 生成菜单结构
        const menu = toMenu(permissions);

        Logger.info('用户菜单获取成功', {
            userId: user.id,
            username: user.username,
            menuItemCount: menu.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: menu
        });

    } catch (error) {
        Logger.error('获取用户菜单异常', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 更新用户个人资料
exports.updateProfile = async (req, res, next) => {
    try {
        const user = req.user;
        const { name, email, avatar } = req.body;
        
        Logger.info('更新用户个人资料请求', {
            userId: user?.id,
            username: user?.username,
            updateFields: { name: !!name, email: !!email, avatar: !!avatar },
            requestId: req.headers['x-request-id']
        });

        if (!user) {
            Logger.warning('更新个人资料时用户信息缺失', {
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未认证'
            });
        }

        // 验证邮箱格式
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Logger.warning('更新个人资料邮箱格式无效', {
                userId: user.id,
                email,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '邮箱格式无效'
            });
        }

        // 构建更新数据
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (avatar !== undefined) updateData.avatar = avatar;

        if (Object.keys(updateData).length === 0) {
            Logger.warning('更新个人资料无有效字段', {
                userId: user.id,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '没有提供有效的更新字段'
            });
        }

        Logger.debug('调用数据库服务更新用户资料', {
            userId: user.id,
            updateFields: Object.keys(updateData),
            requestId: req.headers['x-request-id']
        });

        // 这里应该调用数据库服务更新用户资料
        // const [result, error] = await Curl.api('rdb.updateUser').request({
        //     id: user.id,
        //     ...updateData
        // });

        // 暂时模拟更新成功
        const updatedProfile = {
            ...user,
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        Logger.info('用户个人资料更新成功', {
            userId: user.id,
            username: user.username,
            updatedFields: Object.keys(updateData),
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: updatedProfile,
            message: '个人资料更新成功'
        });

    } catch (error) {
        Logger.error('更新用户个人资料异常', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestBody: req.body,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 修改密码
exports.changePassword = async (req, res, next) => {
    try {
        const user = req.user;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        Logger.info('修改密码请求', {
            userId: user?.id,
            username: user?.username,
            hasCurrentPassword: !!currentPassword,
            hasNewPassword: !!newPassword,
            hasConfirmPassword: !!confirmPassword,
            requestId: req.headers['x-request-id']
        });

        if (!user) {
            Logger.warning('修改密码时用户信息缺失', {
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未认证'
            });
        }

        // 验证必需参数
        if (!currentPassword || !newPassword || !confirmPassword) {
            Logger.warning('修改密码参数不完整', {
                userId: user.id,
                hasCurrentPassword: !!currentPassword,
                hasNewPassword: !!newPassword,
                hasConfirmPassword: !!confirmPassword,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '请提供当前密码、新密码和确认密码'
            });
        }

        // 验证新密码和确认密码是否一致
        if (newPassword !== confirmPassword) {
            Logger.warning('修改密码确认密码不匹配', {
                userId: user.id,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '新密码和确认密码不一致'
            });
        }

        // 验证新密码强度
        if (newPassword.length < 6) {
            Logger.warning('修改密码新密码强度不足', {
                userId: user.id,
                passwordLength: newPassword.length,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '新密码长度至少为6位'
            });
        }

        Logger.debug('调用数据库服务验证当前密码', {
            userId: user.id,
            requestId: req.headers['x-request-id']
        });

        // 这里应该调用数据库服务验证当前密码并更新新密码
        // const [result, error] = await Curl.api('rdb.changePassword').request({
        //     userId: user.id,
        //     currentPassword,
        //     newPassword
        // });

        // 暂时模拟密码修改成功
        Logger.info('用户密码修改成功', {
            userId: user.id,
            username: user.username,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            message: '密码修改成功'
        });

    } catch (error) {
        Logger.error('修改密码异常', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

/**
 * 将权限列表转换为菜单结构
 * 根据权限信息生成层级菜单，用于前端渲染
 * 
 * @param {Array} permissions 权限列表数组
 * @returns {Array} 菜单结构数组
 */
function toMenu(permissions) {
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
}

// 检查用户权限
exports.checkPermission = async (req, res, next) => {
    try {
        const user = req.user;
        const { permission } = req.query;
        
        Logger.info('检查用户权限请求', {
            userId: user?.id,
            username: user?.username,
            permission,
            requestId: req.headers['x-request-id']
        });

        if (!user) {
            Logger.warning('检查权限时用户信息缺失', {
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未认证'
            });
        }

        if (!permission) {
            Logger.warning('检查权限缺少权限参数', {
                userId: user.id,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '请提供要检查的权限'
            });
        }

        // 获取用户权限列表
        const permissions = user.permissions || [];
        const hasPermission = permissions.some(p => 
            p.name === permission || p.code === permission || p === permission
        );

        Logger.info('用户权限检查完成', {
            userId: user.id,
            username: user.username,
            permission,
            hasPermission,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: {
                permission: permission,
                hasPermission: hasPermission
            }
        });

    } catch (error) {
        Logger.error('权限检查异常', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            permission: req.query?.permission,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};