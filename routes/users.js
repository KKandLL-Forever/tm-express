const express = require('express');
const router = express.Router();

// 模拟用户数据
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() }
];

// 获取所有用户
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: users,
    total: users.length
  });
});

// 根据ID获取用户
router.get('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
});

// 创建新用户
router.post('/', (req, res) => {
  const { name, email } = req.body;
  
  // 验证必填字段
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name and email are required'
    });
  }
  
  // 检查邮箱是否已存在
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email already exists'
    });
  }
  
  // 创建新用户
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name,
    email,
    createdAt: new Date()
  };
  
  users.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: newUser
  });
});

// 更新用户
router.put('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // 检查邮箱是否被其他用户使用
  if (email) {
    const existingUser = users.find(u => u.email === email && u.id !== userId);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }
  }
  
  // 更新用户信息
  if (name) users[userIndex].name = name;
  if (email) users[userIndex].email = email;
  users[userIndex].updatedAt = new Date();
  
  res.json({
    success: true,
    message: 'User updated successfully',
    data: users[userIndex]
  });
});

// 删除用户
router.delete('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  
  res.json({
    success: true,
    message: 'User deleted successfully',
    data: deletedUser
  });
});

module.exports = router;