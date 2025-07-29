// 用户控制器 - 处理用户相关的业务逻辑
const Logger = require('../utils/logger');

// 模拟数据
const users = [
	{ id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
	{ id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() }
];

// 获取所有用户
exports.getAllUsers = async (req, res, next) => {
	try {
		Logger.info('获取所有用户列表', { 
			requestId: req.headers['x-request-id'],
			userAgent: req.headers['user-agent']
		});

		const result = {
			success: true,
			data: users,
			total: users.length
		};

		Logger.info('用户列表获取成功', { 
			total: users.length,
			requestId: req.headers['x-request-id']
		});

		return res.json(result);
	} catch (error) {
		Logger.error('获取用户列表失败', { 
			error: error.message,
			stack: error.stack,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};

// 根据ID获取用户
exports.getUserById = async (req, res, next) => {
	try {
		const { id } = req.params;
		
		Logger.info('根据ID获取用户', { 
			userId: id,
			requestId: req.headers['x-request-id']
		});

		const user = users.find(user => user.id === parseInt(id));
		
		if (!user) {
			Logger.warning('用户不存在', { 
				userId: id,
				requestId: req.headers['x-request-id']
			});
			
			return res.status(404).json({
				success: false,
				message: 'User not found'
			});
		}

		Logger.info('用户信息获取成功', { 
			userId: id,
			userName: user.name,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			data: user
		});
	} catch (error) {
		Logger.error('获取用户信息失败', { 
			userId: req.params.id,
			error: error.message,
			stack: error.stack,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};

// 创建新用户
exports.createUser = async (req, res, next) => {
	try {
		const { name, email } = req.body;

		Logger.info('创建新用户', { 
			name,
			email,
			requestId: req.headers['x-request-id']
		});

		// 验证必需参数
		if (!name || !email) {
			Logger.warning('创建用户参数不完整', { 
				name: !!name,
				email: !!email,
				requestId: req.headers['x-request-id']
			});

			return res.status(400).json({
				success: false,
				message: 'Name and email are required'
			});
		}

		// 检查邮箱是否已存在
		const existingUser = users.find(user => user.email === email);
		if (existingUser) {
			Logger.warning('邮箱已存在', { 
				email,
				existingUserId: existingUser.id,
				requestId: req.headers['x-request-id']
			});

			return res.status(409).json({
				success: false,
				message: 'Email already exists'
			});
		}

		// 创建新用户
		const newUser = {
			id: Math.max(...users.map(u => u.id)) + 1,
			name,
			email,
			createdAt: new Date()
		};

		users.push(newUser);

		Logger.info('用户创建成功', { 
			userId: newUser.id,
			name: newUser.name,
			email: newUser.email,
			requestId: req.headers['x-request-id']
		});

		return res.status(201).json({
			success: true,
			data: newUser,
			message: 'User created successfully'
		});
	} catch (error) {
		Logger.error('创建用户失败', { 
			error: error.message,
			stack: error.stack,
			requestBody: req.body,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};

// 更新用户信息
exports.updateUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { name, email } = req.body;

		Logger.info('更新用户信息', { 
			userId: id,
			updateData: { name, email },
			requestId: req.headers['x-request-id']
		});

		const userIndex = users.findIndex(user => user.id === parseInt(id));
		
		if (userIndex === -1) {
			Logger.warning('要更新的用户不存在', { 
				userId: id,
				requestId: req.headers['x-request-id']
			});

			return res.status(404).json({
				success: false,
				message: 'User not found'
			});
		}

		// 如果更新邮箱，检查是否与其他用户冲突
		if (email && email !== users[userIndex].email) {
			const existingUser = users.find(user => user.email === email && user.id !== parseInt(id));
			if (existingUser) {
				Logger.warning('更新邮箱冲突', { 
					userId: id,
					email,
					conflictUserId: existingUser.id,
					requestId: req.headers['x-request-id']
				});

				return res.status(409).json({
					success: false,
					message: 'Email already exists'
				});
			}
		}

		// 更新用户信息
		const oldData = { ...users[userIndex] };
		if (name) users[userIndex].name = name;
		if (email) users[userIndex].email = email;
		users[userIndex].updatedAt = new Date();

		Logger.info('用户信息更新成功', { 
			userId: id,
			oldData: { name: oldData.name, email: oldData.email },
			newData: { name: users[userIndex].name, email: users[userIndex].email },
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			data: users[userIndex],
			message: 'User updated successfully'
		});
	} catch (error) {
		Logger.error('更新用户信息失败', { 
			userId: req.params.id,
			error: error.message,
			stack: error.stack,
			requestBody: req.body,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};

// 删除用户
exports.deleteUser = async (req, res, next) => {
	try {
		const { id } = req.params;

		Logger.info('删除用户', { 
			userId: id,
			requestId: req.headers['x-request-id']
		});

		const userIndex = users.findIndex(user => user.id === parseInt(id));
		
		if (userIndex === -1) {
			Logger.warning('要删除的用户不存在', { 
				userId: id,
				requestId: req.headers['x-request-id']
			});

			return res.status(404).json({
				success: false,
				message: 'User not found'
			});
		}

		const deletedUser = users[userIndex];
		users.splice(userIndex, 1);

		Logger.info('用户删除成功', { 
			userId: id,
			deletedUserName: deletedUser.name,
			deletedUserEmail: deletedUser.email,
			requestId: req.headers['x-request-id']
		});

		return res.json({
			success: true,
			message: 'User deleted successfully'
		});
	} catch (error) {
		Logger.error('删除用户失败', { 
			userId: req.params.id,
			error: error.message,
			stack: error.stack,
			requestId: req.headers['x-request-id']
		});
		return next(error);
	}
};