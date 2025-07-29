const winston = require('winston');
const path = require('path');

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// 定义与PHP Monolog相同的日志级别
const customLevels = {
  levels: {
    emergency: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7
  },
  colors: {
    emergency: 'red',
    alert: 'yellow',
    critical: 'red',
    error: 'red',
    warning: 'yellow',
    notice: 'cyan',
    info: 'green',
    debug: 'blue'
  }
};

// 添加颜色配置
winston.addColors(customLevels.colors);

// 创建Winston logger实例
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // 文件输出 - 所有日志
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 文件输出 - 错误日志
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// 与PHP Monolog相同的日志级别方法
class Logger {
  /**
   * 记录调试信息
   * @param {string} message 
   * @param {object} context 
   */
  static debug(message, context = {}) {
    logger.debug(message, context);
  }

  /**
   * 记录一般信息
   * @param {string} message 
   * @param {object} context 
   */
  static info(message, context = {}) {
    logger.info(message, context);
  }

  /**
   * 记录通知信息
   * @param {string} message 
   * @param {object} context 
   */
  static notice(message, context = {}) {
    logger.notice(message, context);
  }

  /**
   * 记录警告信息
   * @param {string} message 
   * @param {object} context 
   */
  static warning(message, context = {}) {
    logger.warning(message, context);
  }

  /**
   * 记录错误信息
   * @param {string} message 
   * @param {object} context 
   */
  static error(message, context = {}) {
    logger.error(message, context);
  }

  /**
   * 记录严重错误
   * @param {string} message 
   * @param {object} context 
   */
  static critical(message, context = {}) {
    logger.critical(message, context);
  }

  /**
   * 记录警报信息
   * @param {string} message 
   * @param {object} context 
   */
  static alert(message, context = {}) {
    logger.alert(message, context);
  }

  /**
   * 记录紧急情况
   * @param {string} message 
   * @param {object} context 
   */
  static emergency(message, context = {}) {
    logger.emergency(message, context);
  }

  /**
   * 通用日志方法
   * @param {string} level 
   * @param {string} message 
   * @param {object} context 
   */
  static log(level, message, context = {}) {
    logger.log(level, message, context);
  }

  /**
   * 获取Winston logger实例
   * @returns {winston.Logger}
   */
  static getLogger() {
    return logger;
  }
}

module.exports = Logger;