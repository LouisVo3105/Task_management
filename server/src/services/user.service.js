"use strict";
const User = require('../models/user.model');
const Department = require('../models/department.model');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const fs = require('fs');
const { mapPosition, getStandardPositions, getPositionKeywords } = require('../utils/position-mapper');
const { ROLES } = require('../configs/enum');

async function createUser(data, currentUser) {
  const { username, password, directSupervisor, ...userData } = data;
  if (currentUser.role === 'user') throw new Error('Không có quyền tạo người dùng');
  if (currentUser.role === 'manager' && userData.department !== currentUser.department) throw new Error('Chỉ được tạo người dùng trong cùng phòng ban');
  const existingUser = await User.findOne({ $or: [{ username }, { email: userData.email }] });
  if (existingUser) throw new Error('Tên đăng nhập hoặc email đã tồn tại');
  if (ROLES.filter(r => r !== 'admin').includes(userData.role)) {
    const supervisor = await User.findById(directSupervisor).select('isActive');
    if (!supervisor || !supervisor.isActive) throw new Error('Cấp trên không tồn tại hoặc không hoạt động');
  }
  if (userData.position) userData.position = mapPosition(userData.position);
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, directSupervisor, ...userData, createdBy: currentUser.id });
  await user.save();
  const userResponse = user.toObject();
  delete userResponse.password;
  return userResponse;
}

async function getUserProfile(userId) {
  const user = await User.findById(userId)
    .select('-password')
    .populate('directSupervisor', 'fullName position')
    .populate('department', 'name description');
  if (!user) throw new Error('User not found');
  return user;
}

async function getAllUsers(query, currentUser) {
  const { department, role, search, includeInactive, page = 1, limit = 50 } = query;
  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (currentUser.role === 'manager') filter.department = currentUser.department;
  if (department) filter.department = department;
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  let users = await User.find(filter, '-password')
    .populate('directSupervisor', 'fullName position')
    .populate('department', 'name description')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  const currentUserId = currentUser.id;
  const isCurrentUserInList = users.some(u => u._id.toString() === currentUserId);
  if (!isCurrentUserInList) {
    const currentUserObj = await User.findOne({ _id: currentUserId })
      .select('-password')
      .populate('directSupervisor', 'fullName position')
      .populate('department', 'name description')
      .lean();
    if (currentUserObj) users.push(currentUserObj);
  }
  return users;
}

async function updateUser(id, updateData, currentUser) {
  if (currentUser.role === 'user' && currentUser.id !== id) throw new Error('Permission denied');
  if (currentUser.role === 'manager') {
    const userToUpdate = await User.findById(id).select('department');
    if (userToUpdate.department !== currentUser.department) throw new Error('Can only update users in your department');
  }
  if (updateData.username) delete updateData.username;
  if (updateData.password) updateData.password = await bcrypt.hash(updateData.password, 10);
  if (updateData.position) updateData.position = mapPosition(updateData.position);
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { ...updateData, updatedAt: Date.now() },
    { new: true, runValidators: true }
  ).select('-password')
   .populate('directSupervisor', 'fullName position')
   .populate('department', 'name description');
  if (!updatedUser) throw new Error('User not found');
  return updatedUser;
}

async function deleteUser(id, currentUser) {
  if (currentUser.id === id) throw new Error('Cannot delete yourself');
  if (currentUser.role !== 'admin') throw new Error('Permission denied');
  const deletedUser = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).select('-password');
  if (!deletedUser) throw new Error('User not found');
  return deletedUser;
}

async function getSubordinates(currentUser) {
  let subordinates;
  if (currentUser.role === 'admin') {
    subordinates = await User.find({ isActive: true })
      .select('_id fullName role department')
      .lean();
  } else {
    subordinates = await User.find({ directSupervisor: currentUser.id, isActive: true })
      .select('_id fullName role department')
      .lean();
  }
  return subordinates;
}

async function deleteUserPermanently(id) {
  const user = await User.findById(id);
  if (!user) throw new Error('User not found');
  if (user.isActive) throw new Error('User must be deactivated (isActive: false) before permanent deletion.');
  await User.deleteOne({ _id: id });
  return true;
}

async function importUsersFromCSV(file, currentUser) {
  if (!file) throw new Error('Không có file được upload');
  const results = [];
  const errors = [];
  const filePath = file.path;
  const baseFields = ['username','password','email','fullName','position','phoneNumber','department','role'];
  const ext = filePath.split('.').pop().toLowerCase();
  let rows = [];
  try {
    if (ext === 'xlsx') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      const csvRows = await new Promise((resolve, reject) => {
        const arr = [];
        fs.createReadStream(filePath)
          .pipe(require('csv-parser')())
          .on('data', (row) => arr.push(row))
          .on('end', () => resolve(arr))
          .on('error', reject);
      });
      rows = csvRows;
    }
  } catch (e) {
    fs.unlinkSync(filePath);
    throw new Error('Lỗi đọc file: ' + e.message);
  }
  for (const row of rows) {
    const missing = baseFields.filter(f => !row[f] || row[f].toString().trim() === '');
    if (missing.length > 0) {
      errors.push({ row, error: `Thiếu trường: ${missing.join(', ')}` });
      continue;
    }
    if ((row.role === 'user' || row.role === 'manager') && (!row.directSupervisor || row.directSupervisor.toString().trim() === '')) {
      errors.push({ row, error: 'Thiếu directSupervisor cho user/manager' });
      continue;
    }
    if (!ROLES.includes(row.role)) {
      errors.push({ row, error: 'Vai trò không hợp lệ' });
      continue;
    }
    results.push(row);
  }
  let success = 0;
  const departmentCache = {};
  const supervisorCache = {};
  for (const userData of results) {
    try {
      if (userData.department && !/^[0-9a-fA-F]{24}$/.test(userData.department)) {
        if (!departmentCache[userData.department]) {
          const dept = await Department.findOne({ name: userData.department.trim() });
          if (!dept) {
            errors.push({ row: userData, error: `Phòng ban "${userData.department}" không tồn tại` });
            continue;
          }
          departmentCache[userData.department] = dept._id;
        }
        userData.department = departmentCache[userData.department];
      }
      const existingUser = await User.findOne({ $or: [{ username: userData.username }, { email: userData.email }] });
      if (existingUser) {
        errors.push({ row: userData, error: 'Username hoặc email đã tồn tại' });
        continue;
      }
      if (ROLES.filter(r => r !== 'admin').includes(userData.role)) {
        if (!supervisorCache[userData.directSupervisor]) {
          const supervisor = await User.findById(userData.directSupervisor).select('isActive');
          if (!supervisor || !supervisor.isActive) {
            errors.push({ row: userData, error: 'Supervisor không tồn tại hoặc không hoạt động' });
            continue;
          }
          supervisorCache[userData.directSupervisor] = supervisor;
        }
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({ ...userData, password: hashedPassword, createdBy: currentUser.id });
      await user.save();
      success++;
    } catch (err) {
      errors.push({ row: userData, error: err.message });
    }
  }
  fs.unlinkSync(filePath);
  return { success, errors };
}

async function exportUsers(query) {
  const type = (query.type || 'csv').toLowerCase();
  const { page = 1, limit = 1000 } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const users = await User.find({}, '-password -__v')
    .populate('department', 'name')
    .populate('directSupervisor', 'fullName')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  if (!users || users.length === 0) throw new Error('Không có dữ liệu người dùng');
  const exportData = users.map(u => ({
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    position: u.position,
    phoneNumber: u.phoneNumber,
    department: u.department?.name || '',
    role: u.role,
    directSupervisor: u.directSupervisor ? (u.directSupervisor.fullName || u.directSupervisor) : '',
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));
  if (type === 'xlsx') {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportData);
    xlsx.utils.book_append_sheet(wb, ws, 'Users');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { type: 'xlsx', buffer };
  } else {
    const CsvParser = require('json2csv').Parser;
    const csvParser = new CsvParser({ header: true });
    const csv = csvParser.parse(exportData);
    return { type: 'csv', csv };
  }
}

function getPositions() {
  return {
    positions: getStandardPositions(),
    keywords: getPositionKeywords()
  };
}

async function getLeaders() {
  const positions = ['Truong phong', 'Pho Giam doc', 'Giam doc'];
  const users = await User.find({
    isActive: true,
    position: { $in: positions }
  })
    .select('_id fullName email role position department')
    .populate('department', 'name');
  return users;
}

module.exports = {
  createUser,
  getUserProfile,
  getAllUsers,
  updateUser,
  deleteUser,
  getSubordinates,
  deleteUserPermanently,
  importUsersFromCSV,
  exportUsers,
  getPositions,
  getLeaders
}; 