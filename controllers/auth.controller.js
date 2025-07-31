// 认证控制器 - 处理用户认证相关的业务逻辑
const Jwt = require('../utils/jwt');
const Redis = require('../utils/redis');
const Curl = require('../utils/curl');
const OpenIDClient = require('../libs/openIDClient');
const AuthMiddleware = require('../middleware/auth');
const Logger = require('../utils/logger');

// 获取OIDC登录配置信息
exports.getOidc = async (req, res, next) => {
    try {
        const token = req.headers['x-session-token'] || 'auth';
        
        Logger.info('获取OIDC配置请求', { 
            token: token.substring(0, 10) + '...',
            requestId: req.headers['x-request-id'],
            userAgent: req.headers['user-agent']
        });
        
        // 调用认证服务的getOidc接口获取OIDC配置
        const [result, error] = await Curl.api('auth.getOidc', token, 'nps').request({}, false);
        if (error) {
            Logger.error('获取OIDC配置失败', { 
                error,
                token: token.substring(0, 10) + '...',
                requestId: req.headers['x-request-id']
            });
            return res.status(500).json({
                success: false,
                code: 2004,
                message: '获取oidc失败: ' + error
            });
        }

        Logger.info('OIDC配置获取成功', {
            hasResult: !!result,
            requestId: req.headers['x-request-id']
        });
        
        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        Logger.error('OIDC配置获取异常', { 
            error: error.message,
            stack: error.stack,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 授权码交换访问令牌
exports.exchange = async (req, res, next) => {
    try {
        const { code } = req.body;
        
        Logger.info('Token交换请求', { 
            hasCode: !!code,
            requestId: req.headers['x-request-id'],
            userAgent: req.headers['user-agent']
        });
        
        if (!code) {
            Logger.warning('Token交换缺少授权码', {
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '缺少授权码参数'
            });
        }

        // 从配置中获取OIDC服务器地址和回调地址
        const issuerUrl = process.env.OIDC_ISSUER || 'http://localhost:5556';
        const webUrl = process.env.WEB_URL || 'http://localhost:3000';
        
        Logger.debug('OIDC配置信息', {
            issuerUrl,
            webUrl,
            requestId: req.headers['x-request-id']
        });
        
        // 创建OpenID Connect客户端实例
        const oidc = new OpenIDClient(
            issuerUrl,
            'enterprise-tmsc',  // 客户端ID
            '123456'           // 客户端密钥
        );

        // 设置重定向URL
        oidc.setRedirectURL(webUrl + '/nps');
        
        // 使用授权码请求tokens
        await oidc.requestTokens(code);

        // 获取ID Token
        const idToken = oidc.getIdToken();
        if (!idToken) {
            Logger.warning('未获取到ID Token', {
                code: code.substring(0, 10) + '...',
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '未获取到ID Token'
            });
        }

        const token = req.headers['x-session-token'] || 'auth';
        
        Logger.info('开始向认证服务交换系统令牌', {
            hasIdToken: !!idToken,
            token: token.substring(0, 10) + '...',
            requestId: req.headers['x-request-id']
        });
        
        // 使用ID Token向认证服务换取系统访问令牌
        const [result, error] = await Curl.api('auth.authenticate', token, 'nps')
            .request({ idToken: idToken });
        
        if (error) {
            Logger.error('获取access token失败', { 
                error,
                hasIdToken: !!idToken,
                requestId: req.headers['x-request-id']
            });
            return res.status(500).json({
                success: false,
                code: 2004,
                message: '获取access token失败: ' + error
            });
        }
        
        Logger.info('Token交换成功', {
            hasIdToken: !!idToken,
            hasPachToken: !!result.pach_token,
            requestId: req.headers['x-request-id']
        });

        // 返回系统访问令牌
        return res.json({
            success: true,
            data: {
                token: result.pach_token
            }
        });

    } catch (error) {
        Logger.error('Token交换异常', { 
            error: error.message,
            stack: error.stack,
            requestBody: req.body,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 管理员登录接口
exports.supervisorLogin = async (req, res, next) => {
    try {
        const {
            username,
            password,
            lng,
            lat,
            method = 'account',
            device_token,
            device_uid,
            device_type
        } = req.body;

        Logger.info('管理员登录请求', { 
            username,
            method,
            hasPassword: !!password,
            device_type,
            ip: req.ip,
            requestId: req.headers['x-request-id']
        });

        // 验证必需参数
        if (!username || !password) {
            Logger.warning('管理员登录参数不完整', { 
                username: !!username,
                password: !!password,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                code: 400,
                message: '用户名和密码不能为空'
            });
        }

        // 构建登录请求参数
        const loginData = {
            username: username,
            password: password,
            type: 'password',
            phone: 'phone',
            email: 'email',
            code: 'code',
            answer: 'answer',
            captcha_id: 'captcha_id',
            remote_addr: req.ip || 'unknown'
        };

        Logger.debug('调用数据库服务进行登录验证', {
            username,
            remote_addr: loginData.remote_addr,
            requestId: req.headers['x-request-id']
        });

        // 调用数据库服务进行登录验证
        const [admin, error] = await Curl.api('rdb.login').request(loginData);
        if (error) {
            Logger.error('用户登录失败', {
                username,
                error,
                ip: req.ip,
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 1001,
                message: '登录用户账号或者密码错误: ' + error
            });
        }

        if (!admin || !admin.token) {
            Logger.warning('登录返回数据异常', {
                username,
                hasAdmin: !!admin,
                hasToken: !!(admin && admin.token),
                requestId: req.headers['x-request-id']
            });
            return res.status(401).json({
                success: false,
                code: 1001,
                message: '登录失败，未获取到有效令牌'
            });
        }

        Logger.info('管理员登录成功', {
            username,
            adminId: admin.id,
            hasToken: !!admin.token,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: {
                token: admin.token,
                user: {
                    id: admin.id,
                    username: admin.username,
                    email: admin.email
                }
            },
            message: '登录成功'
        });

    } catch (error) {
        Logger.error('管理员登录异常', { 
            error: error.message,
            stack: error.stack,
            username: req.body.username,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 获取在线用户数
exports.getOnlineUsers = async (req, res, next) => {
    try {
        Logger.info('获取在线用户数请求', {
            requestId: req.headers['x-request-id']
        });

        // 这里应该从Redis或其他缓存中获取在线用户数
        // 暂时返回模拟数据
        const onlineCount = Math.floor(Math.random() * 100) + 1;

        Logger.info('在线用户数获取成功', {
            onlineCount,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: {
                online: onlineCount,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        Logger.error('获取在线用户数异常', { 
            error: error.message,
            stack: error.stack,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 用户登出
exports.logout = async (req, res, next) => {
    try {
        const user = req.user;
        
        Logger.info('用户登出请求', {
            userId: user?.id,
            username: user?.username,
            requestId: req.headers['x-request-id']
        });

        // 这里应该清除Redis中的token缓存
        // 暂时只返回成功响应
        
        Logger.info('用户登出成功', {
            userId: user?.id,
            username: user?.username,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            message: '登出成功'
        });

    } catch (error) {
        Logger.error('用户登出异常', { 
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 刷新token
exports.refreshToken = async (req, res, next) => {
    try {
        const user = req.user;
        
        Logger.info('刷新token请求', {
            userId: user?.id,
            username: user?.username,
            requestId: req.headers['x-request-id']
        });

        // 这里应该生成新的token并更新Redis缓存
        // 暂时返回原token
        
        Logger.info('token刷新成功', {
            userId: user?.id,
            username: user?.username,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: {
                token: user.token,
                expiresIn: 3600
            },
            message: 'Token刷新成功'
        });

    } catch (error) {
        Logger.error('刷新token异常', { 
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 加载权限表
exports.loadPermissionSheet = async (req, res, next) => {
    try {
        Logger.info('加载权限表请求', {
            requestId: req.headers['x-request-id']
        });

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
            },
            {
                id: 3,
                name: 'admin.role.read',
                description: '查看角色',
                category: 'role'
            },
            {
                id: 4,
                name: 'admin.role.write',
                description: '编辑角色',
                category: 'role'
            }
        ];

        Logger.info('权限表加载成功', {
            permissionCount: permissions.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: permissions
        });

    } catch (error) {
        Logger.error('加载权限表异常', { 
            error: error.message,
            stack: error.stack,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 获取主体权限
exports.getPermissionsForPrincipal = async (req, res, next) => {
    try {
        const { principal, type } = req.query;
        
        Logger.info('获取主体权限请求', {
            principal,
            type,
            requestId: req.headers['x-request-id']
        });
        
        if (!principal || !type) {
            Logger.warning('获取主体权限参数不完整', {
                principal: !!principal,
                type: !!type,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                message: '缺少必需参数'
            });
        }

        // 这里应该调用权限服务获取主体权限
        const permissions = [];

        Logger.info('主体权限获取成功', {
            principal,
            type,
            permissionCount: permissions.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: permissions
        });

    } catch (error) {
        Logger.error('获取主体权限异常', { 
            error: error.message,
            stack: error.stack,
            principal: req.query.principal,
            type: req.query.type,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 获取角色列表
exports.listRole = async (req, res, next) => {
    try {
        Logger.info('获取角色列表请求', {
            requestId: req.headers['x-request-id']
        });

        // 这里应该调用角色服务获取角色列表
        const roles = [
            {
                id: 1,
                name: 'admin',
                description: '系统管理员',
                createdAt: new Date()
            },
            {
                id: 2,
                name: 'user',
                description: '普通用户',
                createdAt: new Date()
            }
        ];

        Logger.info('角色列表获取成功', {
            roleCount: roles.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: roles
        });

    } catch (error) {
        Logger.error('获取角色列表异常', { 
            error: error.message,
            stack: error.stack,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 编辑角色
exports.editRole = async (req, res, next) => {
    try {
        const { id, name, description, permissions } = req.body;
        
        Logger.info('编辑角色请求', {
            id,
            name,
            description,
            permissionCount: permissions ? permissions.length : 0,
            requestId: req.headers['x-request-id']
        });
        
        if (!id || !name) {
            Logger.warning('编辑角色参数不完整', {
                id: !!id,
                name: !!name,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                message: '缺少必需参数'
            });
        }

        // 这里应该调用角色服务更新角色
        Logger.info('角色编辑成功', { 
            id, 
            name,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            message: '角色更新成功'
        });

    } catch (error) {
        Logger.error('编辑角色异常', { 
            error: error.message,
            stack: error.stack,
            roleId: req.body.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 删除角色
exports.deleteRole = async (req, res, next) => {
    try {
        const { id } = req.body;
        
        Logger.info('删除角色请求', {
            id,
            requestId: req.headers['x-request-id']
        });
        
        if (!id) {
            Logger.warning('删除角色缺少ID', {
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                message: '缺少角色ID'
            });
        }

        // 这里应该调用角色服务删除角色
        Logger.info('角色删除成功', { 
            id,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            message: '角色删除成功'
        });

    } catch (error) {
        Logger.error('删除角色异常', { 
            error: error.message,
            stack: error.stack,
            roleId: req.body.id,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 创建角色绑定
exports.createRoleBinding = async (req, res, next) => {
    try {
        const { userId, roleId } = req.body;
        
        Logger.info('创建角色绑定请求', {
            userId,
            roleId,
            requestId: req.headers['x-request-id']
        });
        
        if (!userId || !roleId) {
            Logger.warning('创建角色绑定参数不完整', {
                userId: !!userId,
                roleId: !!roleId,
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                message: '缺少必需参数'
            });
        }

        // 这里应该调用角色服务创建角色绑定
        Logger.info('角色绑定创建成功', { 
            userId, 
            roleId,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            message: '角色绑定创建成功'
        });

    } catch (error) {
        Logger.error('创建角色绑定异常', { 
            error: error.message,
            stack: error.stack,
            userId: req.body.userId,
            roleId: req.body.roleId,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 修改角色绑定
exports.modifyRoleBinding = async (req, res, next) => {
    try {
        const { userId, roleIds } = req.body;
        
        Logger.info('修改角色绑定请求', {
            userId,
            roleCount: roleIds ? roleIds.length : 0,
            requestId: req.headers['x-request-id']
        });
        
        if (!userId || !Array.isArray(roleIds)) {
            Logger.warning('修改角色绑定参数不完整', {
                userId: !!userId,
                roleIds: Array.isArray(roleIds),
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                message: '缺少必需参数'
            });
        }

        // 这里应该调用角色服务修改角色绑定
        Logger.info('角色绑定修改成功', { 
            userId, 
            roleCount: roleIds.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            message: '角色绑定修改成功'
        });

    } catch (error) {
        Logger.error('修改角色绑定异常', { 
            error: error.message,
            stack: error.stack,
            userId: req.body.userId,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};

// 获取角色绑定
exports.getRoleBinding = async (req, res, next) => {
    try {
        const { userId } = req.query;
        
        Logger.info('获取角色绑定请求', {
            userId,
            requestId: req.headers['x-request-id']
        });
        
        if (!userId) {
            Logger.warning('获取角色绑定缺少用户ID', {
                requestId: req.headers['x-request-id']
            });
            return res.status(400).json({
                success: false,
                message: '缺少用户ID'
            });
        }

        // 这里应该调用角色服务获取角色绑定
        const bindings = [];

        Logger.info('角色绑定获取成功', {
            userId,
            bindingCount: bindings.length,
            requestId: req.headers['x-request-id']
        });

        return res.json({
            success: true,
            data: bindings
        });

    } catch (error) {
        Logger.error('获取角色绑定异常', { 
            error: error.message,
            stack: error.stack,
            userId: req.query.userId,
            requestId: req.headers['x-request-id']
        });
        return next(error);
    }
};