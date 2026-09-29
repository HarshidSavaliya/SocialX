import adminService from '../services/adminService.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const data = await adminService.getDashboardStats();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, status, role } = req.query;
    const result = await adminService.getUsers({ page, limit, search, status, role });
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const data = await adminService.getUserById(req.params.id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await adminService.blockUser(req.params.id, req.user._id, reason);
    res.status(200).json({
      success: true,
      message: `User @${user.username} has been blocked successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await adminService.unblockUser(req.params.id, req.user._id, reason);
    res.status(200).json({
      success: true,
      message: `User @${user.username} has been unblocked successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHarmfulPost = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await adminService.deleteHarmfulPost(req.params.id, req.user._id, reason);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditActions = async (req, res, next) => {
  try {
    const { page, limit, actionType } = req.query;
    const result = await adminService.getAuditActions({ page, limit, actionType });
    res.status(200).json({
      success: true,
      data: result.actions,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};
