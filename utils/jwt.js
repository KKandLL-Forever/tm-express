/**
 * JWT (JSON Web Token) 工具类
 * 提供JWT token的生成、验证和解析功能
 * 使用HMAC SHA256算法进行签名验证
 * 
 * @package utils
 * @author System
 * @version 1.0
 */

const crypto = require('crypto');

/**
 * JWT处理类
 * 实现JWT token的完整生命周期管理
 */
class Jwt {
    /**
     * JWT头部信息
     * 定义JWT的算法类型和token类型
     */
    static header = {
        alg: 'HS256', // 生成signature的算法：HMAC SHA256
        typ: 'JWT'    // token类型：JWT
    };

    /**
     * HMAC签名密钥
     * 用于生成和验证JWT签名的密钥
     */
    static key = 'e1n2v3i4r5k7e8e9p10e11r12';

    /**
     * 生成JWT唯一标识符
     * 使用当前时间戳和随机字符串生成唯一的JTI
     * 
     * @return {string} JWT唯一标识符
     */
    static getJti() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2);
        return crypto.createHash('md5').update(`JWT${random}${timestamp}`).digest('hex');
    }

    /**
     * 签发JWT token
     * 根据提供的参数生成完整的JWT token
     * 
     * @param {string} iss 该JWT的签发者（issuer）
     * @param {string} sub 面向的用户（subject）
     * @param {string} payload 自定义载荷数据
     * @param {number} time 有效期时间（秒），默认36000秒（10小时）
     * @return {string|boolean} 成功返回JWT token字符串，失败返回false
     * 
     * JWT载荷包含以下标准字段：
     * - iss: 签发者
     * - sub: 主题/用户
     * - iat: 签发时间
     * - exp: 过期时间
     * - jti: JWT唯一标识
     * - payload: 自定义数据
     */
    static issueToken(iss, sub, payload = '', time = 36000) {
        if (payload) {
            const token = {
                iss: iss,
                sub: sub,
                iat: Math.floor(Date.now() / 1000),
                exp: time,
                jti: this.getJti(),
                payload: payload
            };

            const base64header = this.base64UrlEncode(JSON.stringify(this.header));
            const base64payload = this.base64UrlEncode(JSON.stringify(token));

            const jwt = base64header + '.' + base64payload + '.' + this.signature(base64header + '.' + base64payload, this.key, this.header.alg);
            return jwt;
        } else {
            return false;
        }
    }

    /**
     * 验证JWT token是否有效
     * 验证token的格式、签名和时间有效性
     * 
     * @param {string} str 需要验证的JWT token
     * @return {object|boolean} 验证成功返回解析后的token数据对象，失败返回false
     * 
     * 验证项目包括：
     * - token格式（必须包含3个部分）
     * - 签名验证
     * - 签发时间（iat）不能大于当前时间
     * - 过期时间（exp）不能小于当前时间
     * - 生效时间（nbf）不能大于当前时间
     */
    static verifyToken(str) {
        // 分割JWT token为三个部分：header.payload.signature
        const jwt = str.split('.');
        if (jwt.length !== 3) {
            return false;
        }

        const [base64header, base64token, sign] = jwt;

        // 解析JWT头部，获取算法信息
        let base64decodeheader;
        try {
            base64decodeheader = JSON.parse(this.base64UrlDecode(base64header));
        } catch (e) {
            return false;
        }

        if (!base64decodeheader.alg) {
            return false;
        }

        // 验证JWT签名
        if (this.signature(base64header + '.' + base64token, this.key, base64decodeheader.alg) !== sign) {
            return false;
        }

        // 解析JWT载荷数据
        let token;
        try {
            token = JSON.parse(this.base64UrlDecode(base64token));
        } catch (e) {
            return false;
        }

        const currentTime = Math.floor(Date.now() / 1000);

        // 验证签发时间：签发时间不能大于当前服务器时间
        if (token.iat && token.iat > currentTime) {
            return false;
        }

        // 验证过期时间：当前时间不能超过过期时间
        if (token.exp && (token.iat + token.exp) < currentTime) {
            return false;
        }

        // 验证生效时间：当前时间必须大于等于生效时间
        if (token.nbf && (token.iat + token.nbf) > currentTime) {
            return false;
        }

        return token;
    }

    /**
     * Base64 URL安全编码
     * 实现JWT标准的Base64 URL安全编码，替换+/字符并移除=填充
     * 
     * @param {string} input 需要编码的字符串
     * @return {string} Base64 URL安全编码后的字符串
     */
    static base64UrlEncode(input) {
        return Buffer.from(input)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Base64 URL安全解码
     * 实现JWT标准的Base64 URL安全解码，还原+/字符并补充=填充
     * 
     * @param {string} input 需要解码的字符串
     * @return {string} 解码后的字符串
     */
    static base64UrlDecode(input) {
        // 补充填充字符
        const remainder = input.length % 4;
        if (remainder) {
            const addlen = 4 - remainder;
            input += '='.repeat(addlen);
        }
        
        // 还原URL安全字符
        const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
        
        return Buffer.from(base64, 'base64').toString('utf8');
    }

    /**
     * HMAC SHA256签名生成
     * 使用指定密钥和算法对输入数据进行签名
     * 
     * @param {string} input 待签名的数据，格式为：base64UrlEncode(header).".".base64UrlEncode(payload)
     * @param {string} key 签名密钥
     * @param {string} alg 签名算法，默认HS256
     * @return {string} Base64 URL安全编码的签名字符串
     */
    static signature(input, key, alg = 'HS256') {
        const algConfig = {
            'HS256': 'sha256'
        };
        
        const hmac = crypto.createHmac(algConfig[alg], key);
        hmac.update(input);
        const signature = hmac.digest('base64');
        
        return this.base64UrlEncode(Buffer.from(signature, 'base64'));
    }
}

module.exports = Jwt;