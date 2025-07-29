/**
 * OpenID Connect客户端类
 * 处理OIDC认证流程，包括授权码交换和token验证
 * 
 * @package libs
 * @author System
 * @version 1.0
 */

const axios = require('axios');
const crypto = require('crypto');
const Logger = require('../utils/logger');

/**
 * OpenIDClient类
 * 实现OpenID Connect协议的客户端功能
 */
class OpenIDClient {
    /**
     * 构造函数
     * 
     * @param {string} issuerUrl OIDC服务器地址
     * @param {string} clientId 客户端ID
     * @param {string} clientSecret 客户端密钥
     */
    constructor(issuerUrl, clientId, clientSecret) {
        this.issuerUrl = issuerUrl.replace(/\/$/, ''); // 移除末尾斜杠
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUrl = null;
        this.scope = 'openid profile email';
        this.responseType = 'code';
        this.idToken = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenType = null;
        this.expiresIn = null;
    }

    /**
     * 设置重定向URL
     * 
     * @param {string} url 重定向URL
     */
    setRedirectURL(url) {
        this.redirectUrl = url;
    }

    /**
     * 设置授权范围
     * 
     * @param {string} scope 授权范围
     */
    setScope(scope) {
        this.scope = scope;
    }

    /**
     * 生成授权URL
     * 
     * @param {string} state 状态参数，用于防止CSRF攻击
     * @return {string} 授权URL
     */
    getAuthorizationUrl(state = null) {
        if (!this.redirectUrl) {
            throw new Error('重定向URL未设置');
        }

        if (!state) {
            state = this.generateState();
        }

        const params = new URLSearchParams({
            response_type: this.responseType,
            client_id: this.clientId,
            redirect_uri: this.redirectUrl,
            scope: this.scope,
            state: state
        });

        return `${this.issuerUrl}/auth?${params.toString()}`;
    }

    /**
     * 生成随机状态字符串
     * 
     * @return {string} 随机状态字符串
     */
    generateState() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * 使用授权码请求tokens
     * 
     * @param {string} code 授权码
     * @return {Promise<object>} token响应数据
     */
    async requestTokens(code) {
        try {
            if (!this.redirectUrl) {
                throw new Error('重定向URL未设置');
            }

            const tokenUrl = `${this.issuerUrl}/token`;
            
            const data = {
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUrl,
                client_id: this.clientId,
                client_secret: this.clientSecret
            };

            Logger.info('请求OIDC tokens', {
                tokenUrl: tokenUrl,
                clientId: this.clientId,
                redirectUri: this.redirectUrl
            });

            const response = await axios.post(tokenUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            if (response.status !== 200) {
                throw new Error(`Token请求失败: ${response.status} ${response.statusText}`);
            }

            const tokenData = response.data;
            
            // 保存token信息
            this.accessToken = tokenData.access_token;
            this.idToken = tokenData.id_token;
            this.refreshToken = tokenData.refresh_token;
            this.tokenType = tokenData.token_type || 'Bearer';
            this.expiresIn = tokenData.expires_in;

            Logger.info('OIDC tokens获取成功', {
                tokenType: this.tokenType,
                expiresIn: this.expiresIn,
                hasIdToken: !!this.idToken,
                hasAccessToken: !!this.accessToken
            });

            return tokenData;

        } catch (error) {
            Logger.error('OIDC token请求失败', {
                error: error.message,
                code: code
            });
            throw error;
        }
    }

    /**
     * 获取ID Token
     * 
     * @return {string|null} ID Token
     */
    getIdToken() {
        return this.idToken;
    }

    /**
     * 获取Access Token
     * 
     * @return {string|null} Access Token
     */
    getAccessToken() {
        return this.accessToken;
    }

    /**
     * 获取Refresh Token
     * 
     * @return {string|null} Refresh Token
     */
    getRefreshToken() {
        return this.refreshToken;
    }

    /**
     * 解析JWT token（不验证签名）
     * 
     * @param {string} token JWT token
     * @return {object} 解析后的payload
     */
    parseJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('无效的JWT格式');
            }

            const payload = parts[1];
            const decoded = Buffer.from(payload, 'base64').toString('utf8');
            return JSON.parse(decoded);
        } catch (error) {
            Logger.error('JWT解析失败', {
                error: error.message,
                token: token.substring(0, 50) + '...'
            });
            throw error;
        }
    }

    /**
     * 获取用户信息
     * 
     * @return {Promise<object>} 用户信息
     */
    async getUserInfo() {
        try {
            if (!this.accessToken) {
                throw new Error('Access Token未设置');
            }

            const userInfoUrl = `${this.issuerUrl}/userinfo`;
            
            const response = await axios.get(userInfoUrl, {
                headers: {
                    'Authorization': `${this.tokenType} ${this.accessToken}`
                },
                timeout: 30000
            });

            if (response.status !== 200) {
                throw new Error(`用户信息请求失败: ${response.status} ${response.statusText}`);
            }

            Logger.info('用户信息获取成功', {
                userInfoUrl: userInfoUrl
            });

            return response.data;

        } catch (error) {
            Logger.error('获取用户信息失败', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 刷新Access Token
     * 
     * @return {Promise<object>} 新的token数据
     */
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('Refresh Token未设置');
            }

            const tokenUrl = `${this.issuerUrl}/token`;
            
            const data = {
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret
            };

            const response = await axios.post(tokenUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            if (response.status !== 200) {
                throw new Error(`Token刷新失败: ${response.status} ${response.statusText}`);
            }

            const tokenData = response.data;
            
            // 更新token信息
            this.accessToken = tokenData.access_token;
            if (tokenData.id_token) {
                this.idToken = tokenData.id_token;
            }
            if (tokenData.refresh_token) {
                this.refreshToken = tokenData.refresh_token;
            }
            this.tokenType = tokenData.token_type || 'Bearer';
            this.expiresIn = tokenData.expires_in;

            Logger.info('Access Token刷新成功', {
                tokenType: this.tokenType,
                expiresIn: this.expiresIn
            });

            return tokenData;

        } catch (error) {
            Logger.error('Token刷新失败', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 撤销token
     * 
     * @param {string} token 要撤销的token
     * @return {Promise<boolean>} 是否成功
     */
    async revokeToken(token = null) {
        try {
            const tokenToRevoke = token || this.accessToken;
            if (!tokenToRevoke) {
                throw new Error('没有可撤销的token');
            }

            const revokeUrl = `${this.issuerUrl}/revoke`;
            
            const data = {
                token: tokenToRevoke,
                client_id: this.clientId,
                client_secret: this.clientSecret
            };

            const response = await axios.post(revokeUrl, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            Logger.info('Token撤销成功', {
                revokeUrl: revokeUrl
            });

            return true;

        } catch (error) {
            Logger.error('Token撤销失败', {
                error: error.message
            });
            return false;
        }
    }
}

module.exports = OpenIDClient;