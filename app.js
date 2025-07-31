const express = require('express');
const path = require('path');
const logger = require('./middleware/logger');
const authRoutes = require('./routes/auth.route');
const cateRoutes = require('./routes/rdb/cate.route');
const basinRoutes = require('./routes/nps/basin.route');
const Redis = require('./utils/redis');
const Logger = require('./utils/logger');

// 创建Express应用实例
const app = express();
const PORT = process.env.PORT || 6000;

// 中间件配置
app.use(logger); // 自定义日志中间件
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体
app.use(express.static(path.join(__dirname, 'public'))); // 静态文件服务

// 基础路由
app.get('/', (req, res) => {
	res.json({
		message: 'Welcome to Express Server!',
		timestamp: new Date().toISOString(),
		version: '1.0.0'
	});
});

// 路由配置
app.use('/api/auth', authRoutes); // 认证相关路由
app.use('/api/cate', cateRoutes); // 节点分类相关路由
app.use('/api/nps/basin', basinRoutes); // 河流管理相关路由

// 在所有API路由之后，404处理之前添加
app.get('*', (req, res) => {
	// 如果请求的是API路由，不进行fallback
	if (req.path.startsWith('/api/')) {
		return res.status(404).json({ error: 'API route not found' });
	}

	// 对于所有其他路由，返回React应用的入口HTML文件
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404处理
app.use('*', (req, res) => {
	res.status(404).json({
		error: 'Route not found',
		path: req.originalUrl
	});
});

// 错误处理中间件
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({
		error: 'Something went wrong!',
		message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
	});
});

// Initialize Redis connection
Redis.init().then(() => {
	Logger.info('Redis连接初始化成功');
}).catch(error => {
	Logger.error('Redis连接初始化失败', { error: error.message });
});

// 启动服务器
app.listen(PORT, () => {
	console.log(`🚀 Server is running on http://localhost:${PORT}`);
	console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
	console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
	Logger.info('服务器启动成功', { port: PORT });
});

module.exports = app;