"use strict";
const Department = require('../models/department.model');
const User = require('../models/user.model');

const getDepartments = async () => {
  return await Department.find().select('_id name description').lean();
};

const getLeaders = async (id, page = 1, limit = 50) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const departmentLeaders = await User.find({
    department: id,
    isActive: true,
    $or: [
      { role: 'admin' },
      { position: 'Truong phong' }
    ]
  })
    .select('_id fullName email role position department')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  const directors = await User.find({
    isActive: true,
    position: { $in: ['Giam doc', 'Pho Giam doc'] }
  })
    .select('_id fullName email role position department')
    .lean();
  const allLeadersMap = new Map();
  [...departmentLeaders, ...directors].forEach(user => {
    allLeadersMap.set(user._id.toString(), user);
  });
  return Array.from(allLeadersMap.values());
};

const getSupporters = async (id, page = 1, limit = 50) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  return await User.find({ department: id, isActive: true })
    .select('_id fullName email role position')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
};

module.exports = {
  getDepartments,
  getLeaders,
  getSupporters,
}; 