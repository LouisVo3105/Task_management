"use strict";
const Task = require('../models/task.model');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');

// Helper: quý từ tháng
function getQuarterFromMonth(month) {
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  if (month >= 10 && month <= 12) return 4;
  return 1;
}
// Helper: range quý
function getQuarterDateRange(quarter, year) {
  const startMonth = (quarter - 1) * 3;
  const endMonth = quarter * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, endMonth, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}
// Helper: range năm
function getYearDateRange(year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  return { startDate, endDate };
}

exports.getOverdueWarnings = async ({ quarter, year, page = 1, limit = 100 }) => {
  let startDate, endDate;
  if (quarter && year) {
    ({ startDate, endDate } = getQuarterDateRange(Number(quarter), Number(year)));
  } else if (year) {
    ({ startDate, endDate } = getYearDateRange(Number(year)));
  } else {
    const now = new Date();
    ({ startDate, endDate } = getQuarterDateRange(getQuarterFromMonth(now.getMonth() + 1), now.getFullYear()));
  }
  // Task chính quá hạn
  const overdueTasks = await Task.find({
    status: 'overdue',
    endDate: { $gte: startDate, $lte: endDate }
  }).populate('leader', 'fullName department').populate('department', 'name');
  // Subtask quá hạn
  const overdueSubTasks = await Task.find({
    'subTasks.status': 'overdue',
    'subTasks.endDate': { $gte: startDate, $lte: endDate }
  }).populate('subTasks.assignee', 'fullName department');
  // Gom theo user
  const userMap = new Map();
  overdueTasks.forEach(task => {
    if (task.leader) {
      const userId = String(task.leader._id);
      if (!userMap.has(userId)) userMap.set(userId, {
        userId, userName: task.leader.fullName,
        department: task.leader.department?.name || '', overdueTasks: []
      });
      userMap.get(userId).overdueTasks.push({
        taskId: task._id, taskName: task.title,
        dueDate: task.endDate, overdueDate: task.endDate, taskType: 'main'
      });
    }
  });
  overdueSubTasks.forEach(task => {
    task.subTasks.forEach(sub => {
      if (sub.status === 'overdue' && sub.assignee) {
        const userId = String(sub.assignee._id);
        if (!userMap.has(userId)) userMap.set(userId, {
          userId, userName: sub.assignee.fullName,
          department: sub.assignee.department?.name || '', overdueTasks: []
        });
        userMap.get(userId).overdueTasks.push({
          taskId: task._id, subTaskId: sub._id,
          taskName: `${task.title} - ${sub.title}`,
          dueDate: sub.endDate, overdueDate: sub.endDate, taskType: 'subtask'
        });
      }
    });
  });
  // Sắp xếp
  let arr = Array.from(userMap.values());
  arr.sort((a, b) => {
    const cmp = a.userName.localeCompare(b.userName, 'vi');
    if (cmp !== 0) return cmp;
    const aEarliest = Math.min(...a.overdueTasks.map(t => t.overdueDate.getTime()));
    const bEarliest = Math.min(...b.overdueTasks.map(t => t.overdueDate.getTime()));
    return aEarliest - bEarliest;
  });
  arr.forEach(u => u.overdueTasks.sort((a, b) => a.overdueDate - b.overdueDate));
  // Phân trang
  const total = arr.length;
  const pageNum = Number(page), limitNum = Number(limit);
  const paginated = arr.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  return {
    data: paginated,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    filters: { quarter: quarter || getQuarterFromMonth(new Date().getMonth() + 1), year: year || new Date().getFullYear(), startDate, endDate }
  };
};

exports.exportOverdueWarnings = async ({ quarter, year, type = 'excel' }) => {
  const warnings = await exports.getOverdueWarnings({ quarter, year, page: 1, limit: 1000 });
  if (type === 'excel') return await exportToExcel(warnings.data, quarter, year);
  if (type === 'csv') return await exportToCSV(warnings.data, quarter, year);
  throw new Error('Chỉ hỗ trợ excel hoặc csv');
};

async function exportToExcel(data, quarter, year) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Danh sách cảnh cáo');
  ws.columns = [
    { header: 'STT', key: 'stt', width: 5 },
    { header: 'Họ và tên', key: 'userName', width: 25 },
    { header: 'Phòng ban', key: 'department', width: 20 },
    { header: 'Tên nhiệm vụ', key: 'taskName', width: 40 },
    { header: 'Loại nhiệm vụ', key: 'taskType', width: 15 },
    { header: 'Deadline cũ', key: 'dueDate', width: 15 },
    { header: 'Ngày quá hạn', key: 'overdueDate', width: 15 },
    { header: 'Số ngày quá hạn', key: 'overdueDays', width: 15 }
  ];
  let stt = 1;
  data.forEach(user => user.overdueTasks.forEach(task => {
    const overdueDate = new Date(task.overdueDate);
    const now = new Date();
    const overdueDays = Math.ceil((now - overdueDate) / (1000 * 60 * 60 * 24));
    ws.addRow({
      stt: stt++,
      userName: user.userName,
      department: user.department,
      taskName: task.taskName,
      taskType: task.taskType === 'main' ? 'Nhiệm vụ chính' : 'Nhiệm vụ con',
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '',
      overdueDate: task.overdueDate ? new Date(task.overdueDate).toLocaleDateString('vi-VN') : '',
      overdueDays
    });
  }));
  ws.addRow([]);
  ws.addRow(['Thông tin bộ lọc:']);
  ws.addRow([`Quý: ${quarter || 'Hiện tại'}`]);
  ws.addRow([`Năm: ${year || 'Hiện tại'}`]);
  ws.addRow([`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
  return await wb.xlsx.writeBuffer();
}

async function exportToCSV(data, quarter, year) {
  const csvData = [];
  let stt = 1;
  data.forEach(user => user.overdueTasks.forEach(task => {
    const overdueDate = new Date(task.overdueDate);
    const now = new Date();
    const overdueDays = Math.ceil((now - overdueDate) / (1000 * 60 * 60 * 24));
    csvData.push({
      STT: stt++,
      'Họ và tên': user.userName,
      'Phòng ban': user.department,
      'Tên nhiệm vụ': task.taskName,
      'Loại nhiệm vụ': task.taskType === 'main' ? 'Nhiệm vụ chính' : 'Nhiệm vụ con',
      'Deadline cũ': task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '',
      'Ngày quá hạn': task.overdueDate ? new Date(task.overdueDate).toLocaleDateString('vi-VN') : '',
      'Số ngày quá hạn': overdueDays
    });
  }));
  csvData.push({ STT: '', 'Họ và tên': '', 'Phòng ban': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Deadline cũ': '', 'Ngày quá hạn': '', 'Số ngày quá hạn': '' });
  csvData.push({ STT: 'Thông tin bộ lọc:', 'Họ và tên': '', 'Phòng ban': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Deadline cũ': '', 'Ngày quá hạn': '', 'Số ngày quá hạn': '' });
  csvData.push({ STT: `Quý: ${quarter || 'Hiện tại'}`, 'Họ và tên': '', 'Phòng ban': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Deadline cũ': '', 'Ngày quá hạn': '', 'Số ngày quá hạn': '' });
  csvData.push({ STT: `Năm: ${year || 'Hiện tại'}`, 'Họ và tên': '', 'Phòng ban': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Deadline cũ': '', 'Ngày quá hạn': '', 'Số ngày quá hạn': '' });
  csvData.push({ STT: `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 'Họ và tên': '', 'Phòng ban': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Deadline cũ': '', 'Ngày quá hạn': '', 'Số ngày quá hạn': '' });
  const parser = new Parser({ fields: ['STT', 'Họ và tên', 'Phòng ban', 'Tên nhiệm vụ', 'Loại nhiệm vụ', 'Deadline cũ', 'Ngày quá hạn', 'Số ngày quá hạn'] });
  return Buffer.from(parser.parse(csvData), 'utf8');
}

exports.cloneOverdueTask = async (taskId, newDeadline, user) => {
  // Tìm nhiệm vụ cũ
  const originalTask = await Task.findById(taskId)
    .populate('subTasks.assignee', 'fullName')
    .populate('leader', 'fullName')
    .populate('department', 'name')
    .populate('supporters', 'fullName');
  if (!originalTask) throw new Error('Không tìm thấy nhiệm vụ');
  if (originalTask.status !== 'overdue') throw new Error('Nhiệm vụ này không quá hạn');
  const isSubtask = !!originalTask.parentTask;
  const newDeadlineDate = new Date(newDeadline);
  const now = new Date();
  if (isNaN(newDeadlineDate.getTime()) || newDeadlineDate <= now) {
    throw new Error('Deadline mới phải lớn hơn ngày hiện tại');
  }

  if (isSubtask) {
    // Nếu là subtask, tạo lại subtask mới trong task chính
    const parentTask = await Task.findById(originalTask.parentTask);
    if (!parentTask) throw new Error('Không tìm thấy task chính');
    const newSubtask = {
      title: originalTask.title,
      content: originalTask.content,
      endDate: newDeadlineDate,
      assignee: originalTask.assignee,
      notes: originalTask.notes,
      status: 'pending',
      file: originalTask.file,
      fileName: originalTask.fileName,
      clonedFrom: originalTask._id // Thêm trường clonedFrom để đánh dấu subtask gốc
    };
    parentTask.subTasks.push(newSubtask);
    await parentTask.save();
    return { message: 'Tạo lại subtask thành công', newSubtask };
  } else {
    // Nếu là task chính, kiểm tra logic tạo lại
    const taskCompleted = originalTask.status === 'approved';
    const overdueSubTasks = (originalTask.subTasks || []).filter(st => st.status === 'overdue');
    let shouldCreateMainTask = false, shouldCreateSubTasks = false;
    if (taskCompleted && overdueSubTasks.length > 0) shouldCreateSubTasks = true;
    else if (!taskCompleted && overdueSubTasks.length === 0) shouldCreateMainTask = true;
    else if (!taskCompleted && overdueSubTasks.length > 0) { shouldCreateMainTask = true; shouldCreateSubTasks = true; }
    let newMainTask = null;
    if (shouldCreateMainTask) {
      const newTaskData = {
        title: originalTask.title,
        content: originalTask.content,
        endDate: newDeadlineDate,
        indicator: originalTask.indicator,
        indicatorCreator: originalTask.indicatorCreator,
        parentTask: originalTask._id, // Gán parentTask là _id của nhiệm vụ gốc
        department: originalTask.department,
        notes: originalTask.notes,
        status: 'pending',
        leader: originalTask.leader,
        supporters: originalTask.supporters,
        file: originalTask.file,
        fileName: originalTask.fileName,
        subTasks: []
      };
      if (shouldCreateSubTasks) {
        newTaskData.subTasks = overdueSubTasks.map(subTask => {
          const originalTaskDeadline = originalTask.endDate;
          const subTaskDeadline = subTask.endDate;
          const timeDiff = originalTaskDeadline.getTime() - subTaskDeadline.getTime();
          const newSubTaskDeadline = new Date(newDeadlineDate.getTime() - timeDiff);
          return {
            title: subTask.title,
            content: subTask.content,
            notes: subTask.notes,
            status: 'pending',
            assignee: subTask.assignee,
            file: subTask.file,
            fileName: subTask.fileName,
            endDate: newSubTaskDeadline <= newDeadlineDate ? newSubTaskDeadline : newDeadlineDate,
            clonedFrom: subTask._id // Thêm trường clonedFrom để đánh dấu subtask gốc
          };
        });
      }
      newMainTask = new Task(newTaskData);
      await newMainTask.save();
    }
    // Nếu chỉ tạo lại subtask trong task cũ
    if (shouldCreateSubTasks && !shouldCreateMainTask) {
      overdueSubTasks.forEach(subTask => {
        const newSubTaskData = {
          title: subTask.title,
          content: subTask.content,
          notes: subTask.notes,
          status: 'pending',
          assignee: subTask.assignee,
          file: subTask.file,
          fileName: subTask.fileName,
          endDate: newDeadlineDate
        };
        originalTask.subTasks.push(newSubTaskData);
      });
      await originalTask.save();
    }
    return {
      message: 'Clone nhiệm vụ quá hạn thành công',
      newTask: newMainTask,
      updatedOriginalTask: shouldCreateSubTasks && !shouldCreateMainTask ? originalTask : undefined
    };
  }
}; 