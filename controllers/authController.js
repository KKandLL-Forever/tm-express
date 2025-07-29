/**
 * 认证控制器
 * 负责处理用户认证相关的业务逻辑，包括OIDC认证和token交换
 * 
 * @package controllers
 * @author System
 * @version 1.0
 */

const Jwt = require('../utils/jwt');
const Redis = require('../utils/redis');
const Curl = require('../utils/curl');
const OpenIDClient = require('../libs/openIDClient');
const AuthMiddleware = require('../middleware/auth');
const Logger = require('../utils/logger');

// 认证控制器方法
const authController = {
    /**
     * 获取OIDC登录配置信息
     * 调用认证服务获取OIDC相关配置，用于前端跳转到认证服务器
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    getOidc: async (req, res) => {
        try {
            const token = req.headers['x-session-token'] || 'auth';
            
            // 调用认证服务的getOidc接口获取OIDC配置
            const [result, error] = await Curl.api('auth.getOidc', token, 'nps').request({}, false);
            if (error) {
                Logger.error('获取OIDC配置失败', { error });
                return res.status(500).json({
                    success: false,
                    code: 2004,
                    message: '获取oidc失败: ' + error
                });
            }

            Logger.info('OIDC配置获取成功');
            return res.json({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('OIDC配置获取异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 授权码交换访问令牌
     * 使用OIDC授权码换取ID Token，然后通过认证服务获取系统访问令牌
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    exchange: async (req, res) => {
        try {
            const { code } = req.body;
            
            if (!code) {
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: '缺少授权码参数'
                });
            }

            // 从配置中获取OIDC服务器地址和回调地址
            const issuerUrl = process.env.OIDC_ISSUER || 'http://localhost:5556';
            const webUrl = process.env.WEB_URL || 'http://localhost:3000';
            
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
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: '未获取到ID Token'
                });
            }

            const token = req.headers['x-session-token'] || 'auth';
            
            // 使用ID Token向认证服务换取系统访问令牌
            const [result, error] = await Curl.api('auth.authenticate', token, 'nps')
                .request({ idToken: idToken });
            
            if (error) {
                Logger.error('获取access token失败', { error });
                return res.status(500).json({
                    success: false,
                    code: 2004,
                    message: '获取access token失败: ' + error
                });
            }
            
            Logger.info('Token交换成功', {
                hasIdToken: !!idToken,
                hasPachToken: !!result.pach_token
            });

            // 返回系统访问令牌
            return res.json({
                success: true,
                data: {
                    token: result.pach_token
                }
            });

        } catch (error) {
            Logger.error('Token交换异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 管理员登录接口
     * 验证管理员用户名和密码，成功后生成token并缓存到Redis
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    supervisorLogin: async (req, res) => {
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

            // 验证必需参数
            if (!username || !password) {
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

            // 调用数据库服务进行登录验证
            const [admin, error] = await Curl.api('rdb.login').request(loginData);
            if (error) {
                Logger.error('用户登录失败', {
                    username,
                    error,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    code: 1001,
                    message: '登录用户账号或者密码错误: ' + error
                });
            }

            if (!admin || !admin.token) {
                return res.status(401).json({
                    success: false,
                    code: 1001,
                    message: '登录失败，未获取到有效token'
                });
            }

            // 将用户token缓存到Redis，有效期10分钟（600秒）
            await Redis.set(`user-${username}`, admin.token, 600);

            Logger.info('用户登录成功', {
                username,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // 返回登录成功响应，包含token
            return res.json({
                success: true,
                data: {
                    token: admin.token
                }
            });

        } catch (error) {
            Logger.error('登录处理异常', {
                error: error.message,
                username: req.body?.username,
                ip: req.ip
            });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 获取在线用户数量
     * 统计Redis中缓存的用户token数量，表示当前在线用户数
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    getOnlineUsers: async (req, res) => {
        try {
            // 统计Redis中以'user-'为前缀的key数量，即在线用户数
            const userKeys = await Redis.keys('user-*');
            const onlineCount = userKeys.length;

            Logger.info('在线用户统计', { count: onlineCount });

            return res.json({
                success: true,
                data: onlineCount
            });

        } catch (error) {
            Logger.error('获取在线用户数异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 用户登出
     * 清除Redis中的用户token缓存
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    logout: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            // 从Redis中删除用户token
            await Redis.del(`user-${user.username}`);

            Logger.info('用户登出成功', {
                username: user.username,
                ip: req.ip
            });

            return res.json({
                success: true,
                message: '登出成功'
            });

        } catch (error) {
            Logger.error('用户登出异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 获取当前用户信息
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    getCurrentUser: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            // 获取详细用户信息
            const userInfo = await AuthMiddleware.whoami(user.token);
            if (!userInfo) {
                return res.status(404).json({
                    success: false,
                    code: 404,
                    message: '用户信息不存在'
                });
            }

            return res.json({
                success: true,
                data: userInfo
            });

        } catch (error) {
            Logger.error('获取用户信息异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    },

    /**
     * 刷新token
     * 延长用户token的有效期
     * 
     * @param {object} req Express请求对象
     * @param {object} res Express响应对象
     */
    refreshToken: async (req, res) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    code: 401,
                    message: '用户未登录'
                });
            }

            // 延长Redis中token的有效期
            await Redis.expire(`user-${user.username}`, 600); // 延长10分钟

            Logger.info('Token刷新成功', {
                username: user.username,
                ip: req.ip
            });

            return res.json({
                success: true,
                data: {
                    token: user.token,
                    expiresIn: 600
                }
            });

        } catch (error) {
            Logger.error('Token刷新异常', { error: error.message });
            return res.status(500).json({
                success: false,
                code: 500,
                message: '服务器内部错误'
            });
        }
    }
};

module.exports = authController;