/**
 * HTTP请求工具类
 * 提供与外部API服务通信的功能，类似PHP中的Curl工具
 * 
 * @package utils
 * @author System
 * @version 1.0
 */

const axios = require('axios');
const Logger = require('./logger');

/**
 * Curl HTTP请求工具类
 * 封装axios，提供统一的API调用接口
 */
class Curl {
    /**
     * API配置映射
     * 存储不同服务的API配置信息
     */
    static apiConfig = {
        'rdb.login': {
            method: 'POST',
            url: '/api/login',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.getUser': {
            method: 'POST',
            url: '/api/user',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.profileUser': {
            method: 'POST',
            url: '/api/user/profile',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.listUserRole': {
            method: 'POST',
            url: '/api/user/roles',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.loadOperationSheet': {
            method: 'POST',
            url: '/LoadOperationSheet',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.getNode': {
            method: 'POST',
            url: '/InspectNode',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.listNodeCate': {
            method: 'POST',
            url: '/api/node/cate/list',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.createNodeCate': {
            method: 'POST',
            url: '/api/node/cate/create',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.getNodeCate': {
            method: 'POST',
            url: '/api/node/cate/get',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.deleteNodeCate': {
            method: 'POST',
            url: '/api/node/cate/delete',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.getNodeTree': {
            method: 'POST',
            url: '/api/node/tree',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.createNode': {
            method: 'POST',
            url: '/api/node/create',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'rdb.deleteNode': {
            method: 'POST',
            url: '/api/node/delete',
            host: process.env.RDB_HOST || 'http://localhost:8080'
        },
        'auth.whoami': {
            method: 'POST',
            url: '/WhoAmI',
            host: process.env.AUTH_HOST || 'http://localhost:9080'
        },
        'auth.authenticate': {
            method: 'POST',
            url: '/Authenticate',
            host: process.env.AUTH_HOST || 'http://localhost:9080'
        },
        'auth.getOidc': {
            method: 'POST',
            url: '/GetOIDCLogin',
            host: process.env.AUTH_HOST || 'http://localhost:9080'
        },
        'auth.loadPermissionSheet': {
            method: 'POST',
            url: '/LoadPermissionSheet',
            host: process.env.AUTH_HOST || 'http://localhost:9080'
        },
        'auth.getPermissionsForPrincipal': {
            method: 'POST',
            url: '/GetPermissionsForPrincipal',
            host: process.env.AUTH_HOST || 'http://localhost:9080'
        },
        'auth.listRole': {
            method: 'POST',
            url: '/ListRole',
            host: process.env.AUTH_HOST || 'http://localhost:9080'
        }
    };

    /**
     * 创建API请求实例
     * 
     * @param {string} apiName API名称
     * @param {string} token 认证token
     * @param {string} service 服务名称
     * @return {CurlRequest} 请求实例
     */
    static api(apiName, token = '', service = '') {
        return new CurlRequest(apiName, token, service);
    }
}

/**
 * Curl请求类
 * 处理具体的HTTP请求逻辑
 */
class CurlRequest {
    /**
     * 构造函数
     * 
     * @param {string} apiName API名称
     * @param {string} token 认证token
     * @param {string} service 服务名称
     */
    constructor(apiName, token = '', service = '') {
        this.apiName = apiName;
        this.token = token;
        this.service = service;
        this.queryParams = {};
        this.headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'NodeJS-Curl/1.0'
        };
        
        // 添加认证头
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
            this.headers['X-Session-Token'] = token;
        }
    }

    /**
     * 设置查询参数
     * 
     * @param {object} params 查询参数对象
     * @return {CurlRequest} 当前实例，支持链式调用
     */
    setQuery(params) {
        this.queryParams = { ...this.queryParams, ...params };
        return this;
    }

    /**
     * 格式化请求数据
     * 
     * @param {object} data 请求数据
     * @return {CurlRequest} 当前实例，支持链式调用
     */
    format(data) {
        this.formatData = data;
        return this;
    }

    /**
     * 发送HTTP请求
     * 
     * @param {object} data 请求数据
     * @param {boolean} parseJson 是否解析JSON响应
     * @return {Promise<Array>} [响应数据, 错误信息]
     */
    async request(data = {}, parseJson = true) {
        try {
            // 获取API配置
            const config = Curl.apiConfig[this.apiName];
            if (!config) {
                throw new Error(`未找到API配置: ${this.apiName}`);
            }

            // 合并格式化数据
            if (this.formatData) {
                data = { ...data, ...this.formatData };
            }

            // 构建完整URL
            let url = config.host + config.url;
            
            // 添加查询参数
            if (Object.keys(this.queryParams).length > 0) {
                const queryString = new URLSearchParams(this.queryParams).toString();
                url += `?${queryString}`;
            }

            // 构建axios请求配置
            const axiosConfig = {
                method: config.method,
                url: url,
                headers: this.headers,
                timeout: 30000, // 30秒超时
                validateStatus: function (status) {
                    return status < 500; // 只有5xx状态码才认为是错误
                }
            };

            // 添加请求体数据
            if (config.method.toUpperCase() !== 'GET' && Object.keys(data).length > 0) {
                axiosConfig.data = data;
            }

            // 记录请求日志
            Logger.info(`发送API请求: ${this.apiName}`, {
                url: url,
                method: config.method,
                data: data
            });

            // 发送请求
            const response = await axios(axiosConfig);

            // 检查响应状态
            if (response.status >= 400) {
                const errorMsg = `API请求失败: ${response.status} ${response.statusText}`;
                Logger.error(errorMsg, {
                    apiName: this.apiName,
                    status: response.status,
                    data: response.data
                });
                return [null, errorMsg];
            }

            // 解析响应数据
            let responseData = response.data;
            if (parseJson && typeof responseData === 'string') {
                try {
                    responseData = JSON.parse(responseData);
                } catch (e) {
                    // 如果解析失败，保持原始字符串
                }
            }

            // 记录成功日志
            Logger.info(`API请求成功: ${this.apiName}`, {
                status: response.status,
                dataSize: JSON.stringify(responseData).length
            });

            return [responseData, null];

        } catch (error) {
            const errorMsg = `API请求异常: ${error.message}`;
            Logger.error(errorMsg, {
                apiName: this.apiName,
                error: error.message,
                stack: error.stack
            });
            return [null, errorMsg];
        }
    }

    /**
     * 发送GET请求
     * 
     * @param {object} params 查询参数
     * @return {Promise<Array>} [响应数据, 错误信息]
     */
    async get(params = {}) {
        this.setQuery(params);
        return await this.request();
    }

    /**
     * 发送POST请求
     * 
     * @param {object} data 请求数据
     * @return {Promise<Array>} [响应数据, 错误信息]
     */
    async post(data = {}) {
        return await this.request(data);
    }

    /**
     * 发送PUT请求
     * 
     * @param {object} data 请求数据
     * @return {Promise<Array>} [响应数据, 错误信息]
     */
    async put(data = {}) {
        return await this.request(data);
    }

    /**
     * 发送DELETE请求
     * 
     * @param {object} data 请求数据
     * @return {Promise<Array>} [响应数据, 错误信息]
     */
    async delete(data = {}) {
        return await this.request(data);
    }
}

module.exports = Curl;