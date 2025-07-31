/**
 * 节点分类控制器 - 处理节点分类相关的业务逻辑
 * 对应 PHP 中的 app/events/rdb/Cate.php
 * 
 * @package controllers
 * @author System
 * @version 1.0
 */

const Curl = require('../../utils/curl');
const Logger = require('../../utils/logger');
const AuthMiddleware = require('../../middleware/auth');

/**
 * 获取节点分类列表
 * 对应 PHP 中的 cates 方法
 * 
 * @param {object} req Express请求对象
 * @param {object} res Express响应对象
 * @param {function} next 下一个中间件函数
 */
exports.getCates = async (req, res, next) => {
	try {
		const token = req.headers['x-session-token'] || 'auth';
		const { condition, pagination } = req.body;

		Logger.info('获取节点分类列表请求', {
			token: token.substring(0, 10) + '...',
			condition,
			pagination,
			requestId: req.headers['x-request-id']
		});

		// 调用 rdb 服务的 listNodeCate 接口
		const [result, error] = await Curl.api('rdb.listNodeCate', token).request({});
		if (error) {
			Logger.error('获取节点分类列表失败', {
				error,
				token: token.substring(0, 10) + '...',
				requestId: req.headers['x-request-id']
			});
			return res.status(500).json({
				success: false,
				code: 2004,
				message: '获取资源类别数据失败: ' + error
			});
		}

		// 处理返回结果，解析多行JSON数据
		const lines = result.split('\n').filter(line => line.trim());
		const cates = [];

		for (const line of lines) {
			try {
				const tmp = JSON.parse(line);
				if (tmp.result && tmp.result.cate) {
					cates.push(tmp.result.cate);
				}
			} catch (parseError) {
				Logger.warning('解析分类数据行失败', { line, parseError: parseError.message });
			}
		}

		Logger.info('节点分类列表获取成功', {
			count: cates.length,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			data: cates
		});

	} catch (error) {
		Logger.error('获取节点分类列表异常', {
			error: error.message,
			stack: error.stack,
			requestId: req.headers['x-request-id']
		});
		return res.status(500).json({
			success: false,
			code: 500,
			message: '服务器内部错误'
		});
	}
};

/**
 * 创建或编辑节点分类
 * 对应 PHP 中的 edit 方法
 * 
 * @param {object} req Express请求对象
 * @param {object} res Express响应对象
 * @param {function} next 下一个中间件函数
 */
exports.editCate = async (req, res, next) => {
	try {
		const token = req.headers['x-session-token'] || 'auth';
		const { id, name, title, icon_color, remark } = req.body;

		// 验证必填字段
		if (!name || !title) {
			return res.status(400).json({
				success: false,
				code: 400,
				message: '名称和主题为必填字段'
			});
		}

		Logger.info('编辑节点分类请求', {
			token: token.substring(0, 10) + '...',
			id,
			name,
			title,
			requestId: req.headers['x-request-id']
		});

		const data = {
			cate: {
				id: id || 0,
				name,
				title,
				icon_color: icon_color || '',
				remark: remark || ''
			},
			update: (id && id > 0),
			remark: remark || ''
		};

		// 调用 rdb 服务的 createNodeCate 接口
		const [result, error] = await Curl.api('rdb.createNodeCate', token).request(data);
		if (error) {
			Logger.error('编辑节点分类失败', {
				error,
				data,
				token: token.substring(0, 10) + '...',
				requestId: req.headers['x-request-id']
			});
			return res.status(500).json({
				success: false,
				code: 2004,
				message: '获取资源类别数据失败: ' + error
			});
		}

		Logger.info('节点分类编辑成功', {
			result,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			data: result
		});

	} catch (error) {
		Logger.error('编辑节点分类异常', {
			error: error.message,
			stack: error.stack,
			requestId: req.headers['x-request-id']
		});
		return res.status(500).json({
			success: false,
			code: 500,
			message: '服务器内部错误'
		});
	}
};

/**
 * 获取单个节点分类详情
 * 对应 PHP 中的 cate 方法
 * 
 * @param {object} req Express请求对象
 * @param {object} res Express响应对象
 * @param {function} next 下一个中间件函数
 */
exports.getCate = async (req, res, next) => {
	try {
		const token = req.headers['x-session-token'] || 'auth';
		const { name } = req.body;

		// 验证必填字段
		if (!name) {
			return res.status(400).json({
				success: false,
				code: 400,
				message: '分类名称为必填字段'
			});
		}

		Logger.info('获取节点分类详情请求', {
			token: token.substring(0, 10) + '...',
			name,
			requestId: req.headers['x-request-id']
		});

		const data = {
			cate: { name }
		};

		// 调用 rdb 服务的 getNodeCate 接口
		const [result, error] = await Curl.api('rdb.getNodeCate', token).request(data);
		if (error) {
			Logger.error('获取节点分类详情失败', {
				error,
				name,
				token: token.substring(0, 10) + '...',
				requestId: req.headers['x-request-id']
			});
			return res.status(500).json({
				success: false,
				code: 2004,
				message: '获取资源类别数据失败: ' + error
			});
		}

		Logger.info('节点分类详情获取成功', {
			name,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			data: result.cate
		});

	} catch (error) {
		Logger.error('获取节点分类详情异常', {
			error: error.message,
			stack: error.stack,
			requestId: req.headers['x-request-id']
		});
		return res.status(500).json({
			success: false,
			code: 500,
			message: '服务器内部错误'
		});
	}
};

/**
 * 删除节点分类
 * 对应 PHP 中的 remove 方法
 * 
 * @param {object} req Express请求对象
 * @param {object} res Express响应对象
 * @param {function} next 下一个中间件函数
 */
exports.removeCate = async (req, res, next) => {
	try {
		const token = req.headers['x-session-token'] || 'auth';
		const { id } = req.body;

		// 验证必填字段
		if (!id) {
			return res.status(400).json({
				success: false,
				code: 400,
				message: 'ID为必填字段'
			});
		}

		Logger.info('删除节点分类请求', {
			token: token.substring(0, 10) + '...',
			id,
			requestId: req.headers['x-request-id']
		});

		const data = {
			cate: { id },
			remark: ''
		};

		// 调用 rdb 服务的 deleteNodeCate 接口
		const [result, error] = await Curl.api('rdb.deleteNodeCate', token).request(data);
		if (error) {
			Logger.error('删除节点分类失败', {
				error,
				id,
				token: token.substring(0, 10) + '...',
				requestId: req.headers['x-request-id']
			});
			return res.status(500).json({
				success: false,
				code: 2004,
				message: '删除节点类型失败: ' + error
			});
		}

		Logger.info('节点分类删除成功', {
			id,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			data: true
		});

	} catch (error) {
		Logger.error('删除节点分类异常', {
			error: error.message,
			stack: error.stack,
			requestId: req.headers['x-request-id']
		});
		return res.status(500).json({
			success: false,
			code: 500,
			message: '服务器内部错误'
		});
	}
};