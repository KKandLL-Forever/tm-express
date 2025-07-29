/**
 * 认证中间件
 * 负责验证用户token和权限检查
 * 
 * @package middleware
 * @author System
 * @version 1.0
 */

const Jwt = require('../utils/jwt');
const Redis = require('../utils/redis');
const Logger = require('../utils/logger');
const Curl = require('../utils/curl');

/**
 * 认证中间件类
 * 提供token验证和用户认证功能
 */
class AuthMiddleware {
    /**
     * Token验证中间件
     * 验证请求头中的token是否有效
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     * @param {function} next 下一个中间件函数
     */
    static async tokenCheck(req, res, next) {
        try {
            // 从请求头获取token
            const token = req.headers['x-session-token'] || 
                         req.headers['authorization']?.replace('Bearer ', '') || 
                         req.query.token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '缺少认证token'
                });
            }

            // 验证JWT token
            const decoded = Jwt.verifyToken(token);
            if (!decoded) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: 'token无效或已过期'
                });
            }

            // 检查Redis中的token缓存
            const cachedToken = await Redis.get(`user-${decoded.sub}`);
            if (!cachedToken || cachedToken !== token) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: 'token已失效，请重新登录'
                });
            }

            // 将用户信息添加到请求对象
            req.user = {
                id: decoded.sub,
                username: decoded.sub,
                token: token,
                payload: decoded.payload
            };

            // 记录认证成功日志
            Logger.info('用户认证成功', {
                userId: decoded.sub,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            next();

        } catch (error) {
            Logger.error('Token验证失败', {
                error: error.message,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({
                success: false,
                code: 401,
                message: '认证失败'
            });
        }
    }

    /**
     * gRPC Token验证
     * 通过gRPC调用认证服务验证token（模拟实现）
     * 
     * @param {string} token 需要验证的token
     * @return {Promise<number>} 用户ID，失败返回0
     */
    static async grpcTokenCheck(token) {
        try {
            // 这里模拟gRPC调用认证服务
            // 在实际项目中，需要使用gRPC客户端调用认证服务
            
            // 首先尝试JWT验证
            const decoded = Jwt.verifyToken(token);
            if (!decoded) {
                return 0;
            }

            // 检查Redis缓存
            const cachedToken = await Redis.get(`user-${decoded.sub}`);
            if (!cachedToken || cachedToken !== token) {
                return 0;
            }

            // 返回用户ID（这里假设sub就是用户ID）
            return parseInt(decoded.sub) || 0;

        } catch (error) {
            Logger.error('gRPC Token验证失败', {
                error: error.message,
                token: token.substring(0, 20) + '...'
            });
            return 0;
        }
    }

    /**
     * 获取当前用户信息
     * 通过token获取用户的详细信息
     * 
     * @param {string} token 用户token
     * @return {Promise<object|null>} 用户信息对象或null
     */
    static async whoami(token) {
        try {
            // 调用认证服务获取用户信息
            const [res, error] = await Curl.api('auth.whoami', token, 'nps').request();
            if (error) {
                throw new Error('认证服务调用失败: ' + error);
            }

            // 解析用户名格式 "app:username"
            const usernameParts = res.username.split(':');
            if (usernameParts.length < 2) {
                throw new Error('用户账号格式错误');
            }

            const userData = {
                user: { username: usernameParts[1] }
            };

            // 获取用户详细信息
            const [userRes, userError] = await Curl.api('rdb.getUser', token).request(userData);
            if (userError) {
                throw new Error('获取用户信息失败: ' + userError);
            }

            const user = userRes.user;
            user.app = usernameParts[0]; // 添加应用标识

            return user;

        } catch (error) {
            Logger.error('获取用户信息失败', {
                error: error.message,
                token: token.substring(0, 20) + '...'
            });
            return null;
        }
    }

    /**
     * 权限检查中间件
     * 检查用户是否有访问特定资源的权限
     * 
     * @param {Array} requiredPermissions 需要的权限列表
     * @return {function} Express中间件函数
     */
    static requirePermissions(requiredPermissions = []) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        code: 401,
                        message: '用户未认证'
                    });
                }

                // 如果没有指定权限要求，直接通过
                if (requiredPermissions.length === 0) {
                    return next();
                }

                // 获取用户权限
                const userPermissions = await this.getUserPermissions(req.user.token, req.user.username);
                
                // 检查是否有所需权限
                const hasPermission = requiredPermissions.some(permission => 
                    userPermissions.includes(permission)
                );

                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        code: 403,
                        message: '权限不足'
                    });
                }

                next();

            } catch (error) {
                Logger.error('权限检查失败', {
                    error: error.message,
                    userId: req.user?.id,
                    requiredPermissions
                });

                return res.status(500).json({
                    success: false,
                    code: 500,
                    message: '权限检查失败'
                });
            }
        };
    }

    /**
     * 获取用户权限列表
     * 
     * @param {string} token 用户token
     * @param {string} username 用户名
     * @return {Promise<Array>} 权限列表
     */
    static async getUserPermissions(token, username) {
        try {
            const data = {
                user: { username: username }
            };

            // 获取用户角色权限
            const [res, error] = await Curl.api('rdb.listUserRole', token).request(data, false);
            if (error) {
                throw new Error('获取用户角色失败: ' + error);
            }

            // 解析权限操作列表
            const lines = res.split('\n');
            const operations = [];
            
            for (const line of lines) {
                try {
                    const tmp = JSON.parse(line);
                    if (tmp.result && tmp.result.operations) {
                        operations.push(...tmp.result.operations);
                    }
                } catch (e) {
                    // 忽略解析错误的行
                }
            }

            // 去重并返回
            return [...new Set(operations)];

        } catch (error) {
            Logger.error('获取用户权限失败', {
                error: error.message,
                username
            });
            return [];
        }
    }

    /**
     * 可选认证中间件
     * 如果有token则验证，没有token则跳过
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     * @param {function} next 下一个中间件函数
     */
    static async optionalAuth(req, res, next) {
        const token = req.headers['x-session-token'] || 
                     req.headers['authorization']?.replace('Bearer ', '') || 
                     req.query.token;

        if (token) {
            // 如果有token，则进行验证
            return AuthMiddleware.tokenCheck(req, res, next);
        } else {
            // 没有token，直接跳过
            next();
        }
    }
}

module.exports = AuthMiddleware;