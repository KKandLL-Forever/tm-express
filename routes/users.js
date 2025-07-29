const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const Logger = require('../utils/logger');

// 初始化用户路由
Logger.info('初始化用户路由模块');

// 获取所有用户
router.get('/', userController.getAllUsers);

// 根据ID获取用户
router.get('/:id', userController.getUserById);

// 创建新用户
router.post('/', userController.createUser);

// 更新用户信息
router.put('/:id', userController.updateUser);

// 删除用户
router.delete('/:id', userController.deleteUser);

module.exports = router;