/**
 * Redis连接和操作工具类
 * 提供Redis连接管理和常用操作方法
 * 
 * @package utils
 * @author System
 * @version 1.0
 */

const redis = require('redis');
const Logger = require('./logger');

/**
 * Redis工具类
 * 封装Redis连接和常用操作
 */
class Redis {
    /**
     * Redis客户端实例
     */
    static client = null;

    /**
     * 连接状态
     */
    static connected = false;

    /**
     * 初始化Redis连接
     * 
     * @param {object} config Redis配置选项
     * @return {Promise<void>}
     */
    static async init(config = {}) {
        try {
            const defaultConfig = {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || null,
                db: process.env.REDIS_DB || 0
            };

            const redisConfig = { ...defaultConfig, ...config };
            
            // 构建Redis连接URL
            let url = `redis://`;
            if (redisConfig.password) {
                url += `:${redisConfig.password}@`;
            }
            url += `${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`;

            this.client = redis.createClient({ url });

            // 监听连接事件
            this.client.on('connect', () => {
                Logger.info('Redis连接已建立');
            });

            this.client.on('ready', () => {
                this.connected = true;
                Logger.info('Redis连接就绪');
            });

            this.client.on('error', (err) => {
                this.connected = false;
                Logger.error('Redis连接错误:', { error: err.message });
            });

            this.client.on('end', () => {
                this.connected = false;
                Logger.warning('Redis连接已断开');
            });

            // 连接到Redis
            await this.client.connect();
            
        } catch (error) {
            Logger.error('Redis初始化失败:', { error: error.message });
            throw error;
        }
    }

    /**
     * 获取Redis客户端实例
     * 
     * @return {object} Redis客户端实例
     */
    static getClient() {
        if (!this.client || !this.connected) {
            throw new Error('Redis未连接，请先调用init()方法');
        }
        return this.client;
    }

    /**
     * 设置键值对
     * 
     * @param {string} key 键名
     * @param {string} value 值
     * @param {number} ttl 过期时间（秒），可选
     * @return {Promise<string>} 操作结果
     */
    static async set(key, value, ttl = null) {
        try {
            const client = this.getClient();
            if (ttl) {
                return await client.setEx(key, ttl, value);
            } else {
                return await client.set(key, value);
            }
        } catch (error) {
            Logger.error('Redis SET操作失败:', { key, error: error.message });
            throw error;
        }
    }

    /**
     * 获取键值
     * 
     * @param {string} key 键名
     * @return {Promise<string|null>} 键值或null
     */
    static async get(key) {
        try {
            const client = this.getClient();
            return await client.get(key);
        } catch (error) {
            Logger.error('Redis GET操作失败:', { key, error: error.message });
            throw error;
        }
    }

    /**
     * 删除键
     * 
     * @param {string} key 键名
     * @return {Promise<number>} 删除的键数量
     */
    static async del(key) {
        try {
            const client = this.getClient();
            return await client.del(key);
        } catch (error) {
            Logger.error('Redis DEL操作失败:', { key, error: error.message });
            throw error;
        }
    }

    /**
     * 检查键是否存在
     * 
     * @param {string} key 键名
     * @return {Promise<boolean>} 是否存在
     */
    static async exists(key) {
        try {
            const client = this.getClient();
            const result = await client.exists(key);
            return result === 1;
        } catch (error) {
            Logger.error('Redis EXISTS操作失败:', { key, error: error.message });
            throw error;
        }
    }

    /**
     * 设置键的过期时间
     * 
     * @param {string} key 键名
     * @param {number} seconds 过期时间（秒）
     * @return {Promise<boolean>} 操作是否成功
     */
    static async expire(key, seconds) {
        try {
            const client = this.getClient();
            const result = await client.expire(key, seconds);
            return result === 1;
        } catch (error) {
            Logger.error('Redis EXPIRE操作失败:', { key, seconds, error: error.message });
            throw error;
        }
    }

    /**
     * 获取匹配模式的所有键
     * 
     * @param {string} pattern 匹配模式
     * @return {Promise<Array>} 匹配的键数组
     */
    static async keys(pattern) {
        try {
            const client = this.getClient();
            return await client.keys(pattern);
        } catch (error) {
            Logger.error('Redis KEYS操作失败:', { pattern, error: error.message });
            throw error;
        }
    }

    /**
     * 获取键的剩余生存时间
     * 
     * @param {string} key 键名
     * @return {Promise<number>} 剩余时间（秒），-1表示永不过期，-2表示键不存在
     */
    static async ttl(key) {
        try {
            const client = this.getClient();
            return await client.ttl(key);
        } catch (error) {
            Logger.error('Redis TTL操作失败:', { key, error: error.message });
            throw error;
        }
    }

    /**
     * 关闭Redis连接
     * 
     * @return {Promise<void>}
     */
    static async close() {
        try {
            if (this.client && this.connected) {
                await this.client.quit();
                this.connected = false;
                Logger.info('Redis连接已关闭');
            }
        } catch (error) {
            Logger.error('关闭Redis连接失败:', { error: error.message });
            throw error;
        }
    }
}

module.exports = Redis;