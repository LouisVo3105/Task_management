"use strict";
const Task = require('../models/task.model');
const Indicator = require('../models/indicator.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { createModuleLogger } = require('../utils/logger');
const logger = createModuleLogger('task');
const { sendIncompleteTasksCount, sendPendingApprovalTasksCount, sendTaskApprovalResult } = require('./sse.service');

// Helper: decode file name
function decodeFileName(fileName) {
  return fileName ? Buffer.from(fileName, 'latin1').toString('utf8') : undefined;
}

// CRUD TASK
const createTask = async (data, fileObj) => {
  try {
    let fileName = fileObj ? decodeFileName(fileObj.originalname) : undefined;
    const { title, content, endDate, indicatorId, parentTaskId, assigneeId, notes, leaderId, supporterIds, departmentId } = data;
    const indicator = await Indicator.findById(indicatorId).select('_id creator');
    if (!indicator) {
      const err = new Error('Không tìm thấy chỉ tiêu'); err.status = 404; throw err;
    }
    let parentTask = null;
    if (parentTaskId) {
      parentTask = await Task.findById(parentTaskId).select('status subTasks');
      if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ cha'); err.status = 404; throw err; }
      if (parentTask.status === 'submitted' || parentTask.status === 'approved') {
        const err = new Error('Không thể tạo nhiệm vụ con cho nhiệm vụ đã submit hoặc đã duyệt'); err.status = 400; throw err;
      }
      const assignee = await User.findById(assigneeId).select('_id');
      if (!assignee) { const err = new Error('Không tìm thấy người thực hiện'); err.status = 404; throw err; }
      const subTask = {
        title, content, endDate, indicator: indicatorId, notes,
        file: fileObj ? fileObj.path : undefined, fileName, assignee: assigneeId, status: 'pending'
      };
      parentTask.subTasks.push(subTask);
      await parentTask.save();
      return { type: 'subtask', parentTaskId: parentTask._id, subTask: parentTask.subTasks[parentTask.subTasks.length - 1] };
    } else {
      if (!Array.isArray(supporterIds) || supporterIds.length === 0) {
        const err = new Error('Thiếu danh sách người hỗ trợ (supporterIds)'); err.status = 400; throw err;
      }
      const supporters = await User.find({ _id: { $in: supporterIds } }).select('_id');
      if (supporters.length !== supporterIds.length) {
        const err = new Error('Một hoặc nhiều người hỗ trợ không tồn tại'); err.status = 404; throw err;
      }
      const leader = await User.findById(leaderId).select('_id');
      if (!leader) { const err = new Error('Không tìm thấy người chủ trì'); err.status = 404; throw err; }
      const uniqueCode = `${Date.now()}_${Math.floor(Math.random()*1000000)}`;
      const task = new Task({
        title, content, endDate, indicator: indicatorId, notes, department: departmentId,
        file: fileObj ? fileObj.path : undefined, fileName, leader: leaderId, supporters: supporterIds,
        indicatorCreator: indicator.creator, code: uniqueCode
      });
      await task.save();
      return { type: 'main', taskId: task._id, task };
    }
  } catch (err) {
    logger.error('Lỗi nghiêm trọng khi tạo task: ' + err.message + '\n' + err.stack);
    throw err;
  }
};

const updateTask = async (id, data, fileObj) => {
  try {
    const { assigneeId, leaderId, supporterIds, departmentId, ...updateData } = data;
    let task = await Task.findById(id);
    if (!task) {
      const parentTask = await Task.findOne({ 'subTasks._id': new mongoose.Types.ObjectId(id) });
      if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
      if (parentTask.status === 'approved') { const err = new Error('Không thể cập nhật nhiệm vụ con của nhiệm vụ đã duyệt'); err.status = 400; throw err; }
      const subTask = parentTask.subTasks.id(new mongoose.Types.ObjectId(id));
      if (subTask.status === 'approved') { const err = new Error('Không thể cập nhật nhiệm vụ con đã duyệt'); err.status = 400; throw err; }
      if (assigneeId) {
        const assignee = await User.findById(assigneeId);
        if (!assignee) { const err = new Error('Không tìm thấy người thực hiện'); err.status = 404; throw err; }
        subTask.assignee = assigneeId;
      }
      
      // Xử lý leaderId nếu có
      if (leaderId) {
        const leader = await User.findById(leaderId);
        if (!leader) { const err = new Error('Không tìm thấy người chủ trì'); err.status = 404; throw err; }
        subTask.leader = leaderId;
      }
      
      // Xử lý file nếu có
      if (fileObj) {
        // Xóa file cũ nếu có
        if (subTask.file) {
          try { fs.unlinkSync(subTask.file); } catch (err) { logger.error('Lỗi xóa file cũ: ' + err.message); }
        }
        subTask.file = fileObj.path;
        subTask.fileName = decodeFileName(fileObj.originalname);
      }
      Object.assign(subTask, updateData);
      await parentTask.save();
      return { type: 'subtask', parentTaskId: parentTask._id, subTask };
    } else {
      if (task.status === 'approved') { const err = new Error('Không thể cập nhật nhiệm vụ đã duyệt'); err.status = 400; throw err; }
      
      // Xử lý leaderId nếu có
      if (leaderId) {
        const leader = await User.findById(leaderId);
        if (!leader) { const err = new Error('Không tìm thấy người chủ trì'); err.status = 404; throw err; }
        task.leader = leaderId;
      }
      
      // Xử lý supporterIds nếu có
      if (supporterIds) {
        const supporters = await User.find({ _id: { $in: supporterIds } });
        if (supporters.length !== supporterIds.length) {
          const err = new Error('Một hoặc nhiều người hỗ trợ không tồn tại'); err.status = 404; throw err;
        }
        task.supporters = supporterIds;
      }
      
      // Xử lý departmentId nếu có
      if (departmentId) {
        const Department = require('../models/department.model');
        const department = await Department.findById(departmentId);
        if (!department) { const err = new Error('Không tìm thấy phòng ban'); err.status = 404; throw err; }
        task.department = departmentId;
      }
      
      // Xử lý file nếu có
      if (fileObj) {
        // Xóa file cũ nếu có
        if (task.file) {
          try { fs.unlinkSync(task.file); } catch (err) { logger.error('Lỗi xóa file cũ: ' + err.message); }
        }
        task.file = fileObj.path;
        task.fileName = decodeFileName(fileObj.originalname);
      }
      Object.assign(task, updateData);
      await task.save();
      
      // Populate lại task để trả về thông tin đầy đủ
      const updatedTask = await Task.findById(task._id)
        .populate('leader', 'fullName email')
        .populate('supporters', 'fullName email')
        .populate('department', 'name')
        .populate('indicator', 'name')
        .lean();
      
      return { type: 'main', taskId: task._id, task: updatedTask };
    }
  } catch (err) {
    logger.error('Lỗi nghiêm trọng khi cập nhật task: ' + err.message + '\n' + err.stack);
    throw err;
  }
};

const deleteTask = async (id) => {
  try {
    const task = await Task.findById(id);
    if (!task) {
      const parentTask = await Task.findOne({ 'subTasks._id': id });
      if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
      if (parentTask.status === 'submitted' || parentTask.status === 'approved') {
        const err = new Error('Không thể xóa nhiệm vụ con của nhiệm vụ đã submit hoặc đã duyệt'); err.status = 400; throw err;
      }
      const subTask = parentTask.subTasks.id(id);
      if (subTask && subTask.file) { try { fs.unlinkSync(subTask.file); } catch (err) {} }
      if (subTask && subTask.submissions) {
        subTask.submissions.forEach(submission => { if (submission.file) { try { fs.unlinkSync(submission.file); } catch (err) {} } });
      }
      parentTask.subTasks.pull(id);
      await parentTask.save();
      return { type: 'subtask', parentTaskId: parentTask._id };
    } else {
      if (task.status === 'submitted' || task.status === 'approved') {
        const err = new Error('Không thể xóa nhiệm vụ đã submit hoặc đã duyệt'); err.status = 400; throw err;
      }
      if (task.file) { try { fs.unlinkSync(task.file); } catch (err) {} }
      if (task.submissions) {
        task.submissions.forEach(submission => { if (submission.file) { try { fs.unlinkSync(submission.file); } catch (err) {} } });
      }
      if (task.subTasks) {
        task.subTasks.forEach(subTask => {
          if (subTask.file) { try { fs.unlinkSync(subTask.file); } catch (err) {} }
          if (subTask.submissions) {
            subTask.submissions.forEach(submission => { if (submission.file) { try { fs.unlinkSync(submission.file); } catch (err) {} } });
          }
        });
      }
      await Task.deleteMany({ $or: [{ _id: id }, { parentTask: id }] });
      return { type: 'main', taskId: id };
    }
  } catch (err) {
    logger.error('Lỗi nghiêm trọng khi xóa task: ' + err.message + '\n' + err.stack);
    throw err;
  }
};

const getSubTasks = async (id) => {
  const task = await Task.findById(id).select('subTasks').populate('subTasks.assignee', 'fullName');
  if (!task) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
  return task.subTasks;
};

const getTaskDetail = async (id) => {
  const selectUserFields = 'fullName email';
  const selectIndicatorFields = 'name description';
  let task = await Task.findById(id)
    .populate('indicator', selectIndicatorFields)
    .populate('leader', selectUserFields)
    .populate({ path: 'supporters', select: selectUserFields + ' department', populate: { path: 'department', select: '_id name' } })
    .populate('subTasks.assignee', selectUserFields)
    .populate('department', '_id name')
    .populate('approvalHistory.reviewer', 'fullName')
    .lean();
  if (task) return { type: 'main', task: { ...task, isRoot: true } };
  const parentTask = await Task.findOne({ 'subTasks._id': new mongoose.Types.ObjectId(id) })
    .populate('indicator', selectIndicatorFields)
    .populate('leader', selectUserFields)
    .populate('supporters', selectUserFields)
    .populate('department', '_id name')
    .populate({ path: 'subTasks.assignee', select: selectUserFields, model: 'User' })
    .lean();
  if (parentTask) {
    const subTask = parentTask.subTasks.find(st => st._id.toString() === id);
    if (subTask) {
      const populatedHistory = subTask.approvalHistory ? await Promise.all(subTask.approvalHistory.map(async (history) => {
        const reviewer = await User.findById(history.reviewer).select('fullName');
        return { ...history, reviewer: reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null };
      })) : [];
      // Lấy leader và supporters của subtask (nếu có)
      let subtaskLeader = null;
      let subtaskSupporters = [];
      if (subTask.leader) {
        subtaskLeader = await User.findById(subTask.leader).select('fullName email');
      }
      if (subTask.supporters && Array.isArray(subTask.supporters) && subTask.supporters.length > 0) {
        subtaskSupporters = await User.find({ _id: { $in: subTask.supporters } }).select('fullName email');
      }
      const response = {
        ...subTask,
        file: subTask.file || null,
        fileName: subTask.fileName || null,
        approvalHistory: populatedHistory,
        department: { _id: parentTask.department._id, name: parentTask.department.name },
        parentTask: { _id: parentTask._id, title: parentTask.title },
        indicator: parentTask.indicator,
        leader: subtaskLeader,
        supporters: subtaskSupporters,
        isRoot: false
      };
      return { type: 'subtask', subTask: response };
    }
  }
  const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err;
};

// SUBMISSIONS
const submitTask = async (params, file, body) => {
  // params: { id, taskId, subTaskId }
  // body: { link, note, file (base64) }
  let fileData = null;
  if (file) {
    let uploadFileName = decodeFileName(file.originalname);
    fileData = { path: file.path, fileName: uploadFileName };
  } else if (body.file) {
    try {
      const fileInfo = JSON.parse(body.file);
      if (fileInfo.dataURL) {
        const base64Data = fileInfo.dataURL.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = fileInfo.originalName || 'uploaded_file';
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        const timestamp = Date.now();
        const savedFileName = `${nameWithoutExt}_${timestamp}${ext}`;
        const filePath = `uploads/${savedFileName}`;
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, path.basename(filePath)), buffer);
        fileData = { path: filePath, fileName };
      }
    } catch (error) {
      const err = new Error('File không hợp lệ'); err.status = 400; throw err;
    }
  }
  if (!fileData) { const err = new Error('File upload là bắt buộc'); err.status = 400; throw err; }
  const { id, taskId, subTaskId } = params;
  const link = body.link || body.submitLink;
  const note = body.note || body.submitNote;
  // Nộp cho subtask
  if (taskId && subTaskId) {
    const parentTask = await Task.findById(taskId);
    if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ cha'); err.status = 404; throw err; }
    const subTask = parentTask.subTasks.id(subTaskId);
    if (!subTask) { const err = new Error('Không tìm thấy nhiệm vụ con'); err.status = 404; throw err; }
    subTask.submissions = subTask.submissions || [];
    subTask.submissions.push({ file: fileData.path, fileName: fileData.fileName, link, note });
    if (subTask.status !== 'approved') subTask.status = 'submitted';
    await parentTask.save();
    // Gửi notification cho leader của subtask nếu có
    if (subTask.leader) {
      const { sendSseToastToUser, sendPendingApprovalTasksCount } = require('./sse.service');
      sendSseToastToUser(subTask.leader.toString(), 'info', `Nhiệm vụ con "${subTask.title}" vừa được nộp, vui lòng kiểm tra và duyệt!`);
      sendPendingApprovalTasksCount(subTask.leader.toString());
    }
    return { type: 'subtask', subTask, submission: subTask.submissions[subTask.submissions.length - 1] };
  }
  // Nộp cho task chính
  const mainTaskId = id || taskId;
  let task = await Task.findById(mainTaskId);
  if (task) {
    if (task.subTasks && task.subTasks.length > 0) {
      const hasUnsubmittedSubtask = task.subTasks.some(st => st.status !== 'submitted' && st.status !== 'approved');
      if (hasUnsubmittedSubtask) { const err = new Error('Không thể nộp nhiệm vụ chính khi còn nhiệm vụ con chưa nộp hoặc chưa hoàn thành'); err.status = 400; throw err; }
    }
    task.submissions.push({ file: fileData.path, fileName: fileData.fileName, link, note });
    if (task.status !== 'approved') task.status = 'submitted';
    await task.save();
    return { type: 'main', task, submission: task.submissions[task.submissions.length - 1], indicatorCreator: task.indicatorCreator };
  } else {
    // Trường hợp cũ tìm subtask theo id
    const parentTask = await Task.findOne({ 'subTasks._id': mainTaskId });
    if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
    const subTask = parentTask.subTasks.id(mainTaskId);
    if (!subTask) { const err = new Error('Không tìm thấy nhiệm vụ con'); err.status = 404; throw err; }
    subTask.submissions = subTask.submissions || [];
    subTask.submissions.push({ file: fileData.path, fileName: fileData.fileName, link, note });
    if (subTask.status !== 'approved') subTask.status = 'submitted';
    await parentTask.save();
    return { type: 'subtask', subTask, submission: subTask.submissions[subTask.submissions.length - 1] };
  }
};

const getTaskSubmissions = async (id) => {
  const task = await Task.findById(id).select('submissions').populate('submissions.reviewer', 'fullName');
  if (!task) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
  const populatedSubmissions = await Promise.all(task.submissions.map(async (submission) => {
    const submissionObj = submission.toObject();
    if (submission.reviewer) {
      const reviewer = await User.findById(submission.reviewer).select('fullName');
      submissionObj.reviewer = reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null;
    }
    return submissionObj;
  }));
  return populatedSubmissions;
};

const getSubTaskSubmissions = async (taskId, subTaskId) => {
  const task = await Task.findById(taskId).select('subTasks');
  if (!task) { const err = new Error('Không tìm thấy nhiệm vụ cha'); err.status = 404; throw err; }
  const subTask = task.subTasks.id(subTaskId);
  if (!subTask) { const err = new Error('Không tìm thấy nhiệm vụ con'); err.status = 404; throw err; }
  const populatedSubmissions = await Promise.all((subTask.submissions || []).map(async (submission) => {
    const submissionObj = submission.toObject();
    if (submission.reviewer) {
      const reviewer = await User.findById(submission.reviewer).select('fullName');
      submissionObj.reviewer = reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null;
    }
    return submissionObj;
  }));
  return populatedSubmissions;
};

// APPROVAL/REJECT
const approveTask = async (params, body, reviewer) => {
  const { id, taskId, subTaskId, submissionId } = params;
  const { comment } = body;
  // if (!comment || comment.trim() === '') {
  //   const err = new Error('Nhận xét là bắt buộc'); err.status = 400; throw err;
  // }
  // Subtask
  if (taskId && subTaskId) {
    const parentTask = await Task.findById(taskId);
    if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ cha'); err.status = 404; throw err; }
    const subTask = parentTask.subTasks.id(subTaskId);
    if (!subTask) { const err = new Error('Không tìm thấy nhiệm vụ con'); err.status = 404; throw err; }
    // Chỉ cho phép leader của subtask được duyệt hoặc từ chối
    const reviewerId = reviewer._id || reviewer.id;
    if (!subTask.leader || subTask.leader.toString() !== reviewerId) {
      const err = new Error('Chỉ chủ trì của nhiệm vụ con mới có quyền duyệt hoặc từ chối'); err.status = 403; throw err;
    }
    let targetSubmission = null;
    if (submissionId) {
      targetSubmission = subTask.submissions.id(submissionId);
      if (!targetSubmission) { const err = new Error(`Không tìm thấy submission với ID: ${submissionId} trong subtask.`); err.status = 404; throw err; }
    } else {
      if (subTask.submissions.length === 0) { const err = new Error('Không có submission nào để duyệt'); err.status = 400; throw err; }
      targetSubmission = subTask.submissions[subTask.submissions.length - 1];
    }
    targetSubmission.approvalStatus = 'approved';
    targetSubmission.approvalComment = comment.trim();
    targetSubmission.reviewer = reviewer.id;
    targetSubmission.reviewedAt = new Date();
    subTask.approvalHistory = subTask.approvalHistory || [];
    subTask.approvalHistory.push({ action: 'approve', comment: comment.trim(), reviewer: reviewer.id, reviewedAt: new Date() });
    subTask.status = 'approved';
    await parentTask.save();
    // Gửi SSE cho assignee
    if (subTask.assignee) {
      sendTaskApprovalResult(subTask.assignee.toString(), 'approved', { type: 'subtask', subTaskId: subTask._id, title: subTask.title });
      sendIncompleteTasksCount(subTask.assignee.toString());
      sendPendingApprovalTasksCount(subTask.assignee.toString());
    }
    return { subTask, approvedSubmission: targetSubmission, approvalHistory: subTask.approvalHistory[subTask.approvalHistory.length - 1] };
  }
  // Main task
  const mainTaskId = id || taskId;
  const task = await Task.findById(mainTaskId);
  if (!task) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
  if (task.subTasks && task.subTasks.length > 0) {
    const hasUnsubmittedSubtask = task.subTasks.some(st => st.status !== 'submitted' && st.status !== 'approved');
    if (hasUnsubmittedSubtask) { const err = new Error('Không thể duyệt nhiệm vụ chính khi còn nhiệm vụ con chưa nộp hoặc chưa hoàn thành'); err.status = 400; throw err; }
  }
  if (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.position !== 'Giam doc' &&reviewer.position !== 'Pho giam doc' && task.leader.toString() !== reviewer.id) {
    const err = new Error('Bạn không có quyền duyệt nhiệm vụ này'); err.status = 403; throw err;
  }
  let targetSubmission = null;
  if (submissionId) {
    targetSubmission = task.submissions.id(submissionId);
    if (!targetSubmission) { const err = new Error(`Không tìm thấy submission với ID: ${submissionId}.`); err.status = 404; throw err; }
  } else {
    if (task.submissions.length === 0) { const err = new Error('Không có submission nào để duyệt'); err.status = 400; throw err; }
    targetSubmission = task.submissions[task.submissions.length - 1];
  }
  targetSubmission.approvalStatus = 'approved';
  targetSubmission.approvalComment = comment.trim();
  targetSubmission.reviewer = reviewer.id;
  targetSubmission.reviewedAt = new Date();
  task.approvalHistory = task.approvalHistory || [];
  task.approvalHistory.push({ action: 'approve', comment: comment.trim(), reviewer: reviewer.id, reviewedAt: new Date() });
  task.status = 'approved';
  await task.save();
  if (task.assignee) {
    sendTaskApprovalResult(task.assignee.toString(), 'approved', { type: 'main', taskId: task._id, title: task.title });
    sendIncompleteTasksCount(task.assignee.toString());
    sendPendingApprovalTasksCount(task.assignee.toString());
  }
  return { task, approvedSubmission: targetSubmission, approvalHistory: task.approvalHistory[task.approvalHistory.length - 1] };
};

const rejectTask = async (params, body, reviewer) => {
  const { id, taskId, subTaskId, submissionId } = params;
  const { comment } = body;
  if (!comment || comment.trim() === '') {
    const err = new Error('Lý do từ chối là bắt buộc'); err.status = 400; throw err;
  }
  // Subtask
  if (taskId && subTaskId) {
    const parentTask = await Task.findById(taskId);
    if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ cha'); err.status = 404; throw err; }
    const subTask = parentTask.subTasks.id(subTaskId);
    if (!subTask) { const err = new Error('Không tìm thấy nhiệm vụ con'); err.status = 404; throw err; }
    if (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.position !== 'Giam doc' && parentTask.leader.toString() !== reviewer.id) {
      const err = new Error('Bạn không có quyền duyệt nhiệm vụ này'); err.status = 403; throw err;
    }
    let targetSubmission = null;
    if (submissionId) {
      targetSubmission = subTask.submissions.id(submissionId);
      if (!targetSubmission) { const err = new Error(`Không tìm thấy submission với ID: ${submissionId} trong subtask.`); err.status = 404; throw err; }
    } else {
      if (subTask.submissions.length === 0) { const err = new Error('Không có submission nào để từ chối'); err.status = 400; throw err; }
      targetSubmission = subTask.submissions[subTask.submissions.length - 1];
    }
    targetSubmission.approvalStatus = 'rejected';
    targetSubmission.approvalComment = comment.trim();
    targetSubmission.reviewer = reviewer.id;
    targetSubmission.reviewedAt = new Date();
    subTask.approvalHistory = subTask.approvalHistory || [];
    subTask.approvalHistory.push({ action: 'reject', comment: comment.trim(), reviewer: reviewer.id, reviewedAt: new Date() });
    subTask.status = 'pending';
    await parentTask.save();
    if (subTask.assignee) {
      sendTaskApprovalResult(subTask.assignee.toString(), 'rejected', { type: 'subtask', subTaskId: subTask._id, title: subTask.title });
      sendIncompleteTasksCount(subTask.assignee.toString());
      sendPendingApprovalTasksCount(subTask.assignee.toString());
    }
    return { subTask, rejectedSubmission: targetSubmission, approvalHistory: subTask.approvalHistory[subTask.approvalHistory.length - 1] };
  }
  // Main task
  const mainTaskId = id || taskId;
  const task = await Task.findById(mainTaskId);
  if (!task) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
  if (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.position !== 'Giam doc' && task.leader.toString() !== reviewer.id) {
    const err = new Error('Bạn không có quyền duyệt nhiệm vụ này'); err.status = 403; throw err;
  }
  let targetSubmission = null;
  if (submissionId) {
    targetSubmission = task.submissions.id(submissionId);
    if (!targetSubmission) { const err = new Error(`Không tìm thấy submission với ID: ${submissionId} trong task.`); err.status = 404; throw err; }
  } else {
    if (task.submissions.length === 0) { const err = new Error('Không có submission nào để từ chối'); err.status = 400; throw err; }
    targetSubmission = task.submissions[task.submissions.length - 1];
  }
  targetSubmission.approvalStatus = 'rejected';
  targetSubmission.approvalComment = comment.trim();
  targetSubmission.reviewer = reviewer.id;
  targetSubmission.reviewedAt = new Date();
  task.approvalHistory = task.approvalHistory || [];
  task.approvalHistory.push({ action: 'reject', comment: comment.trim(), reviewer: reviewer.id, reviewedAt: new Date() });
  task.status = 'pending';
  await task.save();
  if (task.assignee) {
    sendTaskApprovalResult(task.assignee.toString(), 'rejected', { type: 'main', taskId: task._id, title: task.title });
    sendIncompleteTasksCount(task.assignee.toString());
    sendPendingApprovalTasksCount(task.assignee.toString());
  }
  return { task, rejectedSubmission: targetSubmission, approvalHistory: task.approvalHistory[task.approvalHistory.length - 1] };
};

const getApprovalHistory = async (params) => {
  const { id, taskId, subTaskId } = params;
  if (taskId && subTaskId) {
    const parentTask = await Task.findById(taskId).populate('approvalHistory.reviewer', 'fullName');
    if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ cha'); err.status = 404; throw err; }
    const subTask = parentTask.subTasks.id(subTaskId);
    if (!subTask) { const err = new Error('Không tìm thấy nhiệm vụ con'); err.status = 404; throw err; }
    const populatedHistory = subTask.approvalHistory ? await Promise.all(subTask.approvalHistory.map(async (history) => {
      const reviewer = await User.findById(history.reviewer).select('fullName');
      return { ...history.toObject(), reviewer: reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null };
    })) : [];
    return populatedHistory;
  }
  const mainTaskId = id || taskId;
  const task = await Task.findById(mainTaskId).populate('approvalHistory.reviewer', 'fullName');
  if (!task) { const err = new Error('Không tìm thấy nhiệm vụ'); err.status = 404; throw err; }
  return task.approvalHistory || [];
};

// SEARCH/FILTER
const searchTasks = async (query) => {
  const { title, department, leader, indicator, endDateFrom, endDateTo, page = 1, limit = 50 } = query;
  const filter = {};
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (department) filter.department = department;
  if (leader) filter.leader = leader;
  if (indicator) filter.indicator = indicator;
  if (endDateFrom || endDateTo) {
    filter.endDate = {};
    if (endDateFrom) filter.endDate.$gte = new Date(endDateFrom);
    if (endDateTo) filter.endDate.$lte = new Date(endDateTo);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const tasks = await Task.find(filter)
    .populate('department leader indicator')
    .select('title department leader indicator endDate status')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  return tasks;
};

// OVERDUE
const getOverdueTasks = async (query) => {
  const { page = 1, limit = 10, userId } = query;
  const now = new Date();
  const overdueQuery = {
    $or: [
      { status: { $in: ['pending', 'submitted', 'overdue'] }, endDate: { $lt: now } },
      { 'subTasks.status': { $in: ['pending', 'submitted', 'overdue'] }, 'subTasks.endDate': { $lt: now } }
    ]
  };
  if (userId) {
    overdueQuery.$and = [
      { $or: [ { assignee: userId }, { 'subTasks.assignee': userId } ] }
    ];
  }
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { endDate: 1 },
    select: 'title content endDate status subTasks leader department indicator',
    populate: [
      { path: 'subTasks.assignee', select: 'fullName' },
      { path: 'leader', select: 'fullName' },
      { path: 'department', select: 'name' },
      { path: 'indicator', select: 'name' }
    ]
  };
  const tasks = await Task.paginate(overdueQuery, options);

  // Lấy tất cả task để kiểm tra clone
  const allTasks = await Task.find({});

  const result = tasks.docs.flatMap(task => {
    const overdueItems = [];
    // Kiểm tra nhiệm vụ chính đã được clone chưa
    let mainCloned = false;
    // Nếu có task khác có parentTask là task này và không phải trạng thái 'overdue'
    if (allTasks.some(t => t.parentTask && t.parentTask.toString() === task._id.toString() && t.status !== 'overdue')) {
      mainCloned = true;
    }
    if (['pending', 'submitted', 'overdue'].includes(task.status) && task.endDate < now) {
      overdueItems.push({
        _id: task._id, title: task.title, content: task.content, endDate: task.endDate, status: task.status, type: 'main', parentTask: null,
        indicator: task.indicator?.name, leader: task.leader?.fullName, department: task.department?.name,
        daysOverdue: Math.ceil((now - task.endDate) / (1000 * 60 * 60 * 24)),
        cloned: mainCloned
      });
    }
    if (task.subTasks && task.subTasks.length > 0) {
      task.subTasks.forEach(subTask => {
        // Kiểm tra subtask đã được clone chưa
        let subCloned = false;
        // Nếu có subtask khác trong các task khác có title, content, assignee, parentTask giống và không phải trạng thái 'overdue'
        for (const t of allTasks) {
          if (t._id.toString() !== task._id.toString() && t.subTasks && t.subTasks.length > 0) {
            for (const st of t.subTasks) {
              if (
                st.title === subTask.title &&
                st.content === subTask.content &&
                st.assignee?.toString() === subTask.assignee?._id?.toString() &&
                t.parentTask && t.parentTask.toString() === task._id.toString() &&
                st.status !== 'overdue'
              ) {
                subCloned = true;
              }
            }
          }
        }
        if (['pending', 'submitted', 'overdue'].includes(subTask.status) && subTask.endDate < now) {
          overdueItems.push({
            _id: subTask._id, title: subTask.title, content: subTask.content, endDate: subTask.endDate, status: subTask.status, type: 'sub',
            parentTask: task.title, indicator: task.indicator?.name, leader: task.leader?.fullName, department: task.department?.name,
            assignee: subTask.assignee?.fullName, daysOverdue: Math.ceil((now - subTask.endDate) / (1000 * 60 * 60 * 24)),
            cloned: subCloned
          });
        }
      });
    }
    return overdueItems;
  });
  result.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return { ...tasks, docs: result };
};

// HIERARCHY
const getAllTasksByHierarchy = async () => {
  const indicators = await Indicator.find({}).populate('creator', 'fullName').lean();
  const tasks = await Task.find({})
    .populate('leader', 'fullName')
    .populate('indicator', '_id')
    .populate('subTasks.assignee', 'fullName')
    .populate('subTasks.leader', 'fullName') 
    .lean();
  const indicatorTaskMap = {};
  tasks.forEach(task => {
    const indId = task.indicator?._id?.toString() || (task.indicator + '');
    if (!indicatorTaskMap[indId]) indicatorTaskMap[indId] = [];
    indicatorTaskMap[indId].push(task);
  });
  const result = indicators.map(ind => {
    const mainTasks = (indicatorTaskMap[ind._id.toString()] || []).map(task => ({
      _id: task._id,
      leader: task.leader ? { _id: task.leader._id, fullName: task.leader.fullName } : null,
      content: task.content,
      createdAt: task.createdAt,
      status: task.status,
      file: task.file || null,
      subTasks: (task.subTasks || []).map(st => {
        return {
          _id: st._id,
          leader: st.leader ? { _id: st.leader._id, fullName: st.leader.fullName } : null,
          assigner: st.leader ? { _id: st.leader._id, fullName: st.leader.fullName } : null,
          assignee: st.assignee ? { _id: st.assignee._id, fullName: st.assignee.fullName } : null,
          content: st.content,
          createdAt: st.createdAt,
          status: st.status,
          file: st.file || null
        };
      })
    }));
    return {
      _id: ind._id,
      creator: ind.creator ? { _id: ind.creator._id, fullName: ind.creator.fullName } : null,
      content: ind.name,
      createdAt: ind.createdAt,
      status: ind.status,
      mainTasks
    };
  });
  return result;
};

// PENDING TASKS
const getPendingTasks = async (userId, page = 1, limit = 10) => {
  // 1. Main tasks user là indicatorCreator, status=submitted
  const mainTaskQuery = {
    indicatorCreator: userId,
    status: 'submitted'
  };
  // 2. Subtasks user là leader của subtask, status=submitted
  const subTaskAggregate = [
    { $unwind: '$subTasks' },
    { $match: { 'subTasks.status': 'submitted', 'subTasks.leader': new mongoose.Types.ObjectId(userId) } },
    { $project: {
        _id: '$subTasks._id',
        title: '$subTasks.title',
        content: '$subTasks.content',
        endDate: '$subTasks.endDate',
        status: '$subTasks.status',
        indicator: '$indicator',
        assignee: '$subTasks.assignee',
        parentTask: '$title',
        submitNote: '$subTasks.submitNote',
        submitLink: '$subTasks.submitLink',
        type: { $literal: 'sub' }
      }
    }
  ];
  // Lấy main tasks
  const Task = require('../models/task.model');
  const mainTasks = await Task.find(mainTaskQuery)
    .populate('indicator', 'name')
    .select('title content endDate status indicator submitNote submitLink')
    .lean();
  const mainTaskResults = mainTasks.map(task => ({
    _id: task._id,
    title: task.title,
    content: task.content,
    endDate: task.endDate,
    status: task.status,
    indicator: task.indicator?.name,
    assignee: null,
    parentTask: null,
    submitNote: task.submitNote || null,
    submitLink: task.submitLink || null,
    type: 'main',
  }));
  // Lấy subtask chờ duyệt mà user là leader
  const subTaskResults = await Task.aggregate(subTaskAggregate);
  // Populate indicator & assignee cho subtask
  const Indicator = require('../models/indicator.model');
  const User = require('../models/user.model');
  for (const st of subTaskResults) {
    if (st.indicator) {
      const ind = await Indicator.findById(st.indicator).select('name');
      st.indicator = ind ? ind.name : null;
    }
    if (st.assignee) {
      const user = await User.findById(st.assignee).select('fullName');
      st.assignee = user ? { _id: user._id, fullName: user.fullName } : null;
    }
  }
  // Gộp kết quả, phân trang
  const allResults = [...mainTaskResults, ...subTaskResults];
  allResults.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
  const total = allResults.length;
  const totalPages = Math.ceil(total / limit);
  const pagedResults = allResults.slice((page - 1) * limit, page * limit);
  return {
    docs: pagedResults,
    totalDocs: total,
    limit,
    page,
    totalPages
  };
};

// INCOMPLETE TASKS
const getIncompleteTasks = async (userId, page = 1, limit = 10) => {
  const query = {
    $or: [
      { assignee: userId, status: { $in: ['pending', 'submitted'] } },
      { 'subTasks.assignee': userId, 'subTasks.status': { $in: ['pending', 'submitted'] } }
    ]
  };
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    select: 'title content endDate status subTasks submitNote submitLink',
    populate: [
      { path: 'subTasks.assignee', select: 'fullName' },
      { path: 'indicator', select: 'name' }
    ]
  };
  const tasks = await Task.paginate(query, options);
  const result = tasks.docs.flatMap(task =>
    task.subTasks.length > 0
      ? task.subTasks
          .filter(st => st.status !== 'approved' && st.assignee && st.assignee._id?.toString() === userId)
          .map(st => ({
            ...st.toObject(),
            parentTask: task.title,
            indicator: task.indicator.name,
            createdAt: st.createdAt || task.createdAt
          }))
      : task.status !== 'approved' && task.assignee?.toString() === userId
      ? [{ ...task.toObject(), parentTask: null, createdAt: task.createdAt }]
      : []
  );
  return { ...tasks, docs: result };
};

// COMPLETED TASKS
const getCompletedTasks = async (userId, page = 1, limit = 10) => {
  const query = {
    $or: [
      { assignee: userId, status: 'approved' },
      { 'subTasks.assignee': userId, 'subTasks.status': 'approved' }
    ]
  };
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    select: 'title content endDate status subTasks submitNote submitLink',
    populate: [
      { path: 'subTasks.assignee', select: 'fullName' },
      { path: 'indicator', select: 'name' }
    ]
  };
  const tasks = await Task.paginate(query, options);
  const result = tasks.docs.flatMap(task =>
    task.subTasks.length > 0
      ? task.subTasks
          .filter(st => st.status === 'approved' && st.assignee && st.assignee._id?.toString() === userId)
          .map(st => ({
            ...st.toObject(),
            parentTask: task.title,
            indicator: task.indicator.name
          }))
      : task.status === 'approved' && task.assignee?.toString() === userId
      ? [{ ...task.toObject(), parentTask: null }]
      : []
  );
  return { ...tasks, docs: result };
};

// CREATE SUBTASK
const createSubTask = async (parentTaskId, data, file, user) => {
  const { title, content, endDate, assigneeId, notes, leaderId } = data;
  const parentTask = await Task.findById(parentTaskId);
  if (!parentTask) { const err = new Error('Không tìm thấy nhiệm vụ cha'); err.status = 404; throw err; }
  if (parentTask.status === 'submitted' || parentTask.status === 'approved') {
    const err = new Error('Không thể tạo nhiệm vụ con cho nhiệm vụ đã submit hoặc đã duyệt'); err.status = 400; throw err;
  }
  // Kiểm tra deadline subtask không vượt quá deadline nhiệm vụ chính
  if (new Date(endDate) > new Date(parentTask.endDate)) {
    const err = new Error('Deadline của nhiệm vụ con không được vượt quá deadline của nhiệm vụ chính'); err.status = 400; throw err;
  }
  // Cho phép: admin, director, deputy director, leader hoặc supporter của nhiệm vụ chính được tạo subtask
  const isSupporter = parentTask.supporters && parentTask.supporters.map(id => id.toString()).includes(user.id);
  if (!user || !user.id || (
    user.role !== 'admin' &&
    user.role !== 'director' &&
    user.position !== 'Pho Giam doc' &&
    user.position !== 'Giam doc' &&
    (!parentTask.leader || parentTask.leader.toString() !== user.id) &&
    !isSupporter
  )) {
    const err = new Error('Bạn không có quyền tạo nhiệm vụ con cho nhiệm vụ này'); err.status = 403; throw err;
  }
  const assignee = await User.findById(assigneeId);
  if (!assignee) { const err = new Error('Không tìm thấy người thực hiện'); err.status = 404; throw err; }
  if (!leaderId) { const err = new Error('Thiếu thông tin chủ trì (leader) của nhiệm vụ con'); err.status = 400; throw err; }
  const leader = await User.findById(leaderId);
  if (!leader) { const err = new Error('Không tìm thấy chủ trì (leader) của nhiệm vụ con'); err.status = 404; throw err; }
  const department = parentTask.department;
  const supporters = parentTask.supporters;
  let subTaskFileName = file ? file.originalname : null;
  if (subTaskFileName) {
    subTaskFileName = Buffer.from(subTaskFileName, 'latin1').toString('utf8');
  }
  const subTaskData = {
    title, content, endDate, assignee: assigneeId, notes,
    leader: leaderId,
    file: file ? file.path : null, fileName: subTaskFileName, mimeType: file ? file.mimetype : null,
    status: 'pending',
    creator: user.id // Lưu id người tạo subtask
  };
  parentTask.subTasks.push(subTaskData);
  await parentTask.save();
  return parentTask.subTasks[parentTask.subTasks.length - 1];
};

module.exports = {
  createTask,
  updateTask,
  deleteTask,
  getSubTasks,
  getTaskDetail,
  submitTask,
  getTaskSubmissions,
  getSubTaskSubmissions,
  approveTask,
  rejectTask,
  getApprovalHistory,
  searchTasks,
  getOverdueTasks,
  getAllTasksByHierarchy,
  getPendingTasks,
  getIncompleteTasks,
  getCompletedTasks,
  createSubTask,
  // ... các hàm khác sẽ tiếp tục bổ sung ...
}; 