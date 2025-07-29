const Logger = require('../utils/logger');

// 请求日志中间件
const logger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求开始
  Logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url
  });
  
  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = getLogLevel(res.statusCode);
    const logMessage = `${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`;
    
    // 根据状态码选择日志级别
    Logger[logLevel](logMessage, {
      ip: req.ip,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};

// 根据状态码返回日志级别
function getLogLevel(statusCode) {
  if (statusCode >= 200 && statusCode < 300) {
    return 'info'; // 成功请求
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'info'; // 重定向
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'warning'; // 客户端错误
  } else if (statusCode >= 500) {
    return 'error'; // 服务器错误
  }
  return 'info'; // 默认
}

module.exports = logger;