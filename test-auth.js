/**
 * 认证功能测试脚本
 * 用于测试JWT、Redis和认证中间件的基本功能
 */

const Jwt = require('./utils/jwt');
const Redis = require('./utils/redis');
const Logger = require('./utils/logger');

async function testAuth() {
    try {
        Logger.info('开始认证功能测试');

        // 测试JWT功能
        Logger.info('测试JWT功能...');
        const payload = {
            userId: 123,
            username: 'testuser',
            role: 'admin'
        };
        
        const token = Jwt.issueToken('test-issuer', 'test-subject', payload, 3600);
        Logger.info('JWT Token生成成功', { token: token.substring(0, 50) + '...' });
        
        const verification = Jwt.verifyToken(token);
        if (verification.valid) {
            Logger.info('JWT Token验证成功', { payload: verification.payload });
        } else {
            Logger.error('JWT Token验证失败', { error: verification.error });
        }

        // 测试Redis功能
        Logger.info('测试Redis功能...');
        await Redis.init();
        
        // 设置测试数据
        await Redis.set('test-key', 'test-value', 60);
        const value = await Redis.get('test-key');
        Logger.info('Redis读写测试', { key: 'test-key', value });
        
        // 测试用户token缓存
        await Redis.set('user-testuser', token, 600);
        const cachedToken = await Redis.get('user-testuser');
        Logger.info('用户token缓存测试', { 
            cached: !!cachedToken,
            tokenMatch: cachedToken === token
        });
        
        // 测试在线用户统计
        const userKeys = await Redis.keys('user-*');
        Logger.info('在线用户统计测试', { onlineUsers: userKeys.length });
        
        // 清理测试数据
        await Redis.del('test-key');
        await Redis.del('user-testuser');
        
        Logger.info('认证功能测试完成');
        
    } catch (error) {
        Logger.error('认证功能测试失败', { error: error.message });
    } finally {
        // 关闭Redis连接
        await Redis.close();
        process.exit(0);
    }
}

// 运行测试
testAuth();