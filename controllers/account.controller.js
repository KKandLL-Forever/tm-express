/**
 * 账户控制器
 * 处理用户账户相关的业务逻辑
 * 
 * @author AI Assistant
 * @date 2024
 */

const Curl = require('../utils/curl');
const Logger = require('../utils/logger');

Logger.info('初始化账户控制器模块');
/**
 * 根据用户权限生成菜单结构
 * @param {Object} sheet - 权限表
 * @param {boolean} isApp - 是否为应用模式
 * @param {Array} userOperations - 用户操作权限列表
 * @returns {Object} 菜单结构
 */
function toMenu(sheet, isApp = false, userOperations = []) {
	const menu = {};
	
	if (!sheet || !sheet.operations) {
		return menu;
	}
	
	// 遍历权限表中的操作
	sheet.operations.forEach(operation => {
		// 检查用户是否有此操作权限
		if (!userOperations.includes(operation.key)) {
			return;
		}
		
		// 如果是应用模式，只显示标记为应用的菜单项
		if (isApp && !operation.app) {
			return;
		}
		
		// 构建菜单项
		const menuItem = {
			key: operation.key,
			name: operation.name || operation.key,
			path: operation.path || '',
			icon: operation.icon || '',
			order: operation.order || 0,
			parent: operation.parent || null,
			children: []
		};
		
		// 如果有父级菜单
		if (operation.parent) {
			// 确保父级菜单存在
			if (!menu[operation.parent]) {
				menu[operation.parent] = {
					key: operation.parent,
					name: operation.parent,
					path: '',
					icon: '',
					order: 0,
					children: []
				};
			}
			// 添加到父级菜单的子菜单中
			menu[operation.parent].children.push(menuItem);
		} else {
			// 顶级菜单
			menu[operation.key] = menuItem;
		}
	});
	
	// 对菜单项进行排序
	Object.keys(menu).forEach(key => {
		if (menu[key].children && menu[key].children.length > 0) {
			menu[key].children.sort((a, b) => (a.order || 0) - (b.order || 0));
		}
	});
	
	return menu;
}


// 获取用户个人资料
exports.getProfile = async (req, res, next) => {
	try {
		const user = req.user;
		const token = req.headers['authorization'] || req.headers['authn-token'];

		Logger.info('获取用户个人资料请求', {
			userId: user?.id,
			username: user?.username,
			requestId: req.headers['x-request-id'],
			userAgent: req.headers['user-agent']
		});

		if (!user) {
			Logger.warning('获取个人资料时用户信息缺失', {
				requestId: req.headers['x-request-id']
			});
			return res.status(401).json({
				success: false,
				code: 401,
				message: '用户未认证'
			});
		}

		// 获取用户所属租户的详细信息
		let tenant = null;
		if (user.tenant) {
			Logger.debug('获取租户信息', {
				userId: user.id,
				tenant: user.tenant,
				requestId: req.headers['x-request-id']
			});

			const [tenantResult, tenantError] = await Curl.api('rdb.getNode', token)
				.request({ node: { path: user.tenant } });

			if (tenantError) {
				Logger.error('获取租户数据失败', {
					error: tenantError,
					userId: user.id,
					tenant: user.tenant,
					requestId: req.headers['x-request-id']
				});
				return res.status(500).json({
					success: false,
					code: 2004,
					message: '获取租户数据失败' + tenantError
				});
			}
			tenant = tenantResult?.node?.metadata || null;
		}

		// 获取用户的角色和操作权限
		Logger.debug('获取用户角色权限', {
			userId: user.id,
			username: user.username,
			requestId: req.headers['x-request-id']
		});

		const [roleResult, roleError] = await Curl.api('rdb.listUserRole', token)
			.request({ user: { username: user.username } }, false);

		if (roleError) {
			Logger.error('获取用户角色功能数据失败', {
				error: roleError,
				userId: user.id,
				username: user.username,
				requestId: req.headers['x-request-id']
			});
			return res.status(401).json({
				success: false,
				code: 401,
				message: '获取用户角色功能数据失败' + roleError
			});
		}

		// 解析用户权限操作列表
		const operations = [];
		if (roleResult) {
			const lines = roleResult.split('\n');
			lines.forEach(line => {
				if (line.trim()) {
					try {
						const tmp = JSON.parse(line);
						if (tmp.result && tmp.result.operations) {
							operations.push(...tmp.result.operations);
						}
					} catch (e) {
						Logger.warning('解析用户权限行失败', {
							line,
							error: e.message,
							requestId: req.headers['x-request-id']
						});
					}
				}
			});
		}

		// 去重用户操作权限
		const uniqueOperations = [...new Set(operations)];

		Logger.debug('用户权限解析完成', {
			userId: user.id,
			operationCount: uniqueOperations.length,
			requestId: req.headers['x-request-id']
		});

		// 获取系统操作权限表
		Logger.debug('获取系统权限表', {
			userId: user.id,
			requestId: req.headers['x-request-id']
		});

		const [sheetsResult, sheetsError] = await Curl.api('rdb.loadOperationSheet', token, 'nps')
			.request();

		if (sheetsError) {
			Logger.error('获取角色功能权限表失败', {
				error: sheetsError,
				userId: user.id,
				requestId: req.headers['x-request-id']
			});
			return res.status(401).json({
				success: false,
				code: 401,
				message: '获取角色功能权限表失败' + sheetsError
			});
		}

		// 根据用户权限生成菜单结构
		const menu = {};
		if (sheetsResult && sheetsResult.operations) {
			sheetsResult.operations.forEach(sheet => {
				const tmp = toMenu(sheet, user.app || false, uniqueOperations);
				if (tmp && Object.keys(tmp).length > 0) {
					menu[sheet.key] = tmp;
				}
			});
		}

		Logger.info('用户个人资料获取成功', {
			userId: user.id,
			username: user.username,
			hasTenant: !!tenant,
			operationCount: uniqueOperations.length,
			menuCount: Object.keys(menu).length,
			requestId: req.headers['x-request-id']
		});

		// 组装返回数据
		const result = {
			menus: {
				nps: menu  // NPS系统菜单
			},
			user: user,              // 用户信息
			tenant: tenant           // 租户信息
		};

		return res.json({
			success: true,
			data: result
		});

	} catch (error) {
		Logger.error('获取用户个人资料异常', {
			error: error.message,
			stack: error.stack,
			userId: req.user?.id,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};

// 用户登录
exports.login = async (req, res, next) => {
	try {
		const { username, password } = req.body;

		Logger.info('用户登录请求', {
			username,
			requestId: req.headers['x-request-id'],
			userAgent: req.headers['user-agent'],
			clientIp: req.ip
		});

		if (!username || !password) {
			Logger.warning('登录参数缺失', {
				username,
				requestId: req.headers['x-request-id']
			});
			return res.status(400).json({
				success: false,
				code: 400,
				message: '用户名和密码不能为空'
			});
		}

		// 调用RDB登录API
		const [loginResult, loginError] = await Curl.api('rdb.login')
			.request({
				user: {
					username,
					password
				}
			});

		if (loginError) {
			Logger.error('登录失败', {
				error: loginError,
				username,
				requestId: req.headers['x-request-id']
			});
			return res.status(401).json({
				success: false,
				code: 401,
				message: '登录失败: ' + loginError
			});
		}

		Logger.info('用户登录成功', {
			username,
			userId: loginResult?.user?.id,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			data: loginResult
		});

	} catch (error) {
		Logger.error('登录异常', {
			error: error.message,
			stack: error.stack,
			username: req.body?.username,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};

// 用户登出
exports.logout = async (req, res, next) => {
	try {
		const user = req.user;
		const token = req.headers['authorization'] || req.headers['authn-token'];

		Logger.info('用户登出请求', {
			userId: user?.id,
			username: user?.username,
			requestId: req.headers['x-request-id']
		});

		if (!user || !token) {
			Logger.warning('登出时用户信息或令牌缺失', {
				requestId: req.headers['x-request-id']
			});
			return res.status(401).json({
				success: false,
				code: 401,
				message: '用户未认证'
			});
		}

		// 调用RDB登出API
		const [logoutResult, logoutError] = await Curl.api('rdb.logout', token)
			.request();

		if (logoutError) {
			Logger.error('登出失败', {
				error: logoutError,
				userId: user.id,
				username: user.username,
				requestId: req.headers['x-request-id']
			});
			return res.status(500).json({
				success: false,
				code: 500,
				message: '登出失败: ' + logoutError
			});
		}

		Logger.info('用户登出成功', {
			userId: user.id,
			username: user.username,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			message: '登出成功'
		});

	} catch (error) {
		Logger.error('登出异常', {
			error: error.message,
			stack: error.stack,
			userId: req.user?.id,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};

/**
 * 获取用户权限列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getPermissions = async (req, res, next) => {
	try {
		// 从用户信息中获取权限
		const permissions = req.user.permissions || [];
		
		res.status(200).send({
			code: 0,
			message: 'success',
			data: permissions
		});
	} catch (error) {
		Logger.error('获取用户权限失败', {
			error: error.message,
			userId: req.user?.id
		});
		res.status(500).send({ message: 'Failed to get permissions', error: error.message });
	}
};

/**
 * 获取用户菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getMenu = async (req, res, next) => {
	try {
		// 从用户信息中获取菜单
		const menu = req.user.menu || [];
		
		res.status(200).send({
			code: 0,
			message: 'success',
			data: menu
		});
	} catch (error) {
		Logger.error('获取用户菜单失败', {
			error: error.message,
			userId: req.user?.id
		});
		res.status(500).send({ message: 'Failed to get menu', error: error.message });
	}
};

/**
 * 更新用户资料
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.updateProfile = async (req, res, next) => {
	try {
		res.status(501).send({ message: 'Not implemented yet' });
	} catch (error) {
		Logger.error('更新用户资料失败', {
			error: error.message,
			userId: req.user?.id
		});
		res.status(500).send({ message: 'Failed to update profile', error: error.message });
	}
};

/**
 * 修改密码
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.changePassword = async (req, res, next) => {
	try {
		res.status(501).send({ message: 'Not implemented yet' });
	} catch (error) {
		Logger.error('修改密码失败', {
			error: error.message,
			userId: req.user?.id
		});
		res.status(500).send({ message: 'Failed to change password', error: error.message });
	}
};

/**
 * 检查权限
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.checkPermission = async (req, res, next) => {
	try {
		const { permission } = req.query;
		const userPermissions = req.user.permissions || [];
		const hasPermission = userPermissions.includes(permission);
		
		res.status(200).send({
			code: 0,
			message: 'success',
			data: { hasPermission }
		});
	} catch (error) {
		Logger.error('检查权限失败', {
			error: error.message,
			userId: req.user?.id
		});
		res.status(500).send({ message: 'Failed to check permission', error: error.message });
	}
};

Logger.info('账户控制器模块加载完成');