// 用户控制器 - 处理用户相关的业务逻辑

const Logger = require('../utils/logger');
const users = [
	{ id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
	{ id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() }
];

// 获取所有用户
exports.getAllUsers = async (req, res, next) => {
	try {
		return res.json({
			success: true,
			data: users,
			total: users.length
		});
	} catch (error) {
		return next(error);
	}
};
// 模拟数据库操作的用户服务
class UserService {
	constructor() {
		this.users = [
			{ id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
			{ id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() }
		];
	}

	getAllUsers() {
		return this.users;
	}

	// 根据ID获取用户
	getUserById(id) {
		return this.users.find(user => user.id === parseInt(id));
	}

	// 根据邮箱获取用户
	getUserByEmail(email) {
		return this.users.find(user => user.email === email);
	}

	// 创建用户
	createUser(userData) {
		const newUser = {
			id: this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1,
			...userData,
			createdAt: new Date()
		};
		this.users.push(newUser);
		return newUser;
	}

	// 更新用户
	updateUser(id, userData) {
		const userIndex = this.users.findIndex(user => user.id === parseInt(id));
		if (userIndex === -1) return null;

		this.users[userIndex] = {
			...this.users[userIndex],
			...userData,
			updatedAt: new Date()
		};
		return this.users[userIndex];
	}

	// 删除用户
	deleteUser(id) {
		const userIndex = this.users.findIndex(user => user.id === parseInt(id));
		if (userIndex === -1) return null;

		return this.users.splice(userIndex, 1)[0];
	}
}

const userService = new UserService();

// 控制器方法
const userController = {
	// 获取所有用户
	getAllUsers: async (req, res) => {
		try {
			Logger.info('获取所有用户列表', { action: 'getAllUsers', ip: req.ip });

			const users = userService.getAllUsers();
			res.json({
				success: true,
				data: users,
				total: users.length
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to fetch users',
				error: error.message
			});
		}
	},

	// 根据ID获取用户
	getUserById: async (req, res) => {
		try {
			const { id } = req.params;
			const user = userService.getUserById(id);

			Logger.info('获取用户信息', { action: 'getUserById', userId: id, ip: req.ip });

			if (!user) {
				Logger.warning('用户不存在', { action: 'getUserById', userId: id, ip: req.ip });
				return res.status(404).json({
					success: false,
					message: 'User not found'
				});
			}

			res.json({
				success: true,
				data: user
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to fetch user',
				error: error.message
			});
		}
	},

	// 创建用户
	createUser: async (req, res) => {
		try {
			const { name, email } = req.body;

			Logger.info('创建新用户请求', { action: 'createUser', name, email, ip: req.ip });

			// 验证必填字段
			if (!name || !email) {
				Logger.warning('创建用户失败：参数不完整', { action: 'createUser', name, email, ip: req.ip });
				return res.status(400).json({
					success: false,
					message: 'Name and email are required'
				});
			}

			// 验证邮箱格式
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return res.status(400).json({
					success: false,
					message: 'Invalid email format'
				});
			}

			// 检查邮箱是否已存在
			const existingUser = userService.getUserByEmail(email);
			if (existingUser) {
				return res.status(409).json({
					success: false,
					message: 'Email already exists'
				});
			}

			const newUser = userService.createUser({ name, email });

			Logger.info('用户创建成功', { action: 'createUser', userId: newUser.id, name, email, ip: req.ip });

			res.status(201).json({
				success: true,
				message: 'User created successfully',
				data: newUser
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to create user',
				error: error.message
			});
		}
	},

	// 更新用户
	updateUser: async (req, res) => {
		try {
			const { id } = req.params;
			const { name, email } = req.body;

			Logger.info('更新用户请求', { action: 'updateUser', userId: id, name, email, ip: req.ip });

			// 检查用户是否存在
			const existingUser = userService.getUserById(id);
			if (!existingUser) {
				Logger.warning('更新用户失败：用户不存在', { action: 'updateUser', userId: id, ip: req.ip });
				return res.status(404).json({
					success: false,
					message: 'User not found'
				});
			}

			// 如果更新邮箱，检查是否被其他用户使用
			if (email && email !== existingUser.email) {
				const emailUser = userService.getUserByEmail(email);
				if (emailUser) {
					return res.status(409).json({
						success: false,
						message: 'Email already exists'
					});
				}

				// 验证邮箱格式
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(email)) {
					return res.status(400).json({
						success: false,
						message: 'Invalid email format'
					});
				}
			}

			const updateData = {};
			if (name) updateData.name = name;
			if (email) updateData.email = email;

			const updatedUser = userService.updateUser(id, updateData);

			Logger.info('用户更新成功', { action: 'updateUser', userId: id, updatedData: { name, email }, ip: req.ip });

			res.json({
				success: true,
				message: 'User updated successfully',
				data: updatedUser
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to update user',
				error: error.message
			});
		}
	},

	// 删除用户
	deleteUser: async (req, res) => {
		try {
			const { id } = req.params;

			Logger.info('删除用户请求', { action: 'deleteUser', userId: id, ip: req.ip });

			const deletedUser = userService.deleteUser(id);

			if (!deletedUser) {
				Logger.warning('删除用户失败：用户不存在', { action: 'deleteUser', userId: id, ip: req.ip });
				return res.status(404).json({
					success: false,
					message: 'User not found'
				});
			}

			Logger.info('用户删除成功', { action: 'deleteUser', userId: id, deletedUser, ip: req.ip });

			res.json({
				success: true,
				message: 'User deleted successfully',
				data: deletedUser
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to delete user',
				error: error.message
			});
		}
	}
};

module.exports = userController;