/**
 * 河流管理控制器
 * 处理河流相关的业务逻辑
 * 
 * @author AI Assistant
 * @date 2024
 */

const Curl = require('../../utils/curl');
const Logger = require('../../utils/logger');

Logger.info('初始化河流管理控制器模块');

// 河流分类常量
const CATE = "river";

/**
 * 获取河流树结构
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getBasins = async (req, res) => {
  try {
    const path = `inner.tenant.${CATE}`;
    const data = {
      path: path,
      cate: CATE,
      query: path
    };

    const response = await Curl.apiConfig('rdb.getNodeTree', data, 'GET', req.user.token);
    
    if (response.code !== 0) {
      return res.status(500).send({
        code: 2004,
        message: `获取资源树数据失败: ${response.message}`
      });
    }

    res.status(200).send({
      code: 0,
      message: 'success',
      data: response.data.tree
    });
  } catch (error) {
    Logger.error('获取河流树失败:', error);
    res.status(500).send({
      code: 500,
      message: '获取河流树失败',
      error: error.message
    });
  }
};

/**
 * 编辑河流（创建或更新）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.editBasin = async (req, res) => {
  try {
    const { id, pid, name, title, remark, metadata } = req.body;

    // 验证必填字段
    if (!pid || !name || !title) {
      return res.status(400).send({
        code: 400,
        message: '缺少必填字段: pid, name, title'
      });
    }

    const region = {
      id: id || 0,
      pid: pid,
      name: name,
      title: title,
      cate_name: CATE,
      leaf: 0
    };

    // 如果有metadata且不为空，则添加到region中
    if (metadata && Object.keys(metadata).length > 0) {
      region.metadata = metadata;
    }

    const data = {
      node: region,
      update: id > 0,
      remark: remark || ''
    };

    const response = await Curl.apiConfig('rdb.createNode', data, 'POST', req.user.token);
    
    if (response.code !== 0) {
      return res.status(500).send({
        code: 2004,
        message: `创建地区节点数据失败: ${response.message}`
      });
    }

    res.status(200).send({
      code: 0,
      message: 'success',
      data: response.data
    });
  } catch (error) {
    Logger.error('编辑河流失败:', error);
    res.status(500).send({
      code: 500,
      message: '编辑河流失败',
      error: error.message
    });
  }
};

/**
 * 删除河流
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.removeBasin = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).send({
        code: 400,
        message: '缺少必填字段: id'
      });
    }

    const data = {
      node: { id: id },
      remark: ''
    };

    const response = await Curl.apiConfig('rdb.deleteNode', data, 'DELETE', req.user.token);
    
    if (response.code !== 0) {
      return res.status(500).send({
        code: 2004,
        message: `删除河流数据失败: ${response.message}`
      });
    }

    res.status(200).send({
      code: 0,
      message: 'success',
      data: true
    });
  } catch (error) {
    Logger.error('删除河流失败:', error);
    res.status(500).send({
      code: 500,
      message: '删除河流失败',
      error: error.message
    });
  }
};

Logger.info('河流管理控制器模块加载完成');