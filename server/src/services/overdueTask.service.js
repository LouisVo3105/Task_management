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
  
  const now = new Date();
  
  // Task chính quá hạn - kiểm tra cả status và endDate
  const overdueTasks = await Task.find({
    $or: [
      { status: 'overdue', endDate: { $gte: startDate, $lte: endDate } },
      { 
        status: { $in: ['pending', 'submitted'] }, 
        endDate: { $gte: startDate, $lte: endDate, $lt: now } 
      }
    ]
  }).populate({
    path: 'leader',
    select: 'fullName department',
    populate: {
      path: 'department',
      select: 'name'
    }
  }).populate('department', 'name');
  
  // Subtask quá hạn - kiểm tra cả status và endDate
  const overdueSubTasks = await Task.find({
    $or: [
      { 'subTasks.status': 'overdue', 'subTasks.endDate': { $gte: startDate, $lte: endDate } },
      { 
        'subTasks.status': { $in: ['pending', 'submitted'] }, 
        'subTasks.endDate': { $gte: startDate, $lte: endDate, $lt: now } 
      }
    ]
  }).populate({
    path: 'subTasks.assignee',
    select: 'fullName department',
    populate: {
      path: 'department',
      select: 'name'
    }
  });
  
  // Gom theo user
  const userMap = new Map();
  
  // Xử lý task chính quá hạn
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
  
  // Xử lý subtask quá hạn - thêm điều kiện kiểm tra parent task
  overdueSubTasks.forEach(task => {
    task.subTasks.forEach(sub => {
      // Kiểm tra xem subtask có thực sự quá hạn không
      const isSubtaskOverdue = (sub.status === 'overdue') || 
                              (['pending', 'submitted'].includes(sub.status) && sub.endDate < now);
      
      if (isSubtaskOverdue && sub.assignee) {
        // Kiểm tra xem parent task có quá hạn không
        const isParentTaskOverdue = (task.status === 'overdue') || 
                                   (['pending', 'submitted'].includes(task.status) && task.endDate < now);
        
        // Nếu parent task quá hạn, không hiển thị subtask quá hạn
        if (isParentTaskOverdue) {
          return; // Bỏ qua subtask này
        }
        
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
    .populate('supporters', 'fullName')
    .populate('indicator', 'name endDate creator');
  if (!originalTask) throw new Error('Không tìm thấy nhiệm vụ');
  if (originalTask.status !== 'overdue') throw new Error('Nhiệm vụ này không quá hạn');
  
  const isSubtask = !!originalTask.parentTask;
  const newDeadlineDate = new Date(newDeadline);
  const now = new Date();
  if (isNaN(newDeadlineDate.getTime()) || newDeadlineDate <= now) {
    throw new Error('Deadline mới phải lớn hơn ngày hiện tại');
  }

  // Kiểm tra quyền hạn clone
  let hasPermission = false;
  
  if (isSubtask) {
    // Nếu là subtask, kiểm tra quyền của người chủ trì nhiệm vụ chính hoặc người chủ trì subtask
    const parentTask = await Task.findById(originalTask.parentTask)
      .populate('leader', 'fullName')
      .populate({
        path: 'subTasks.leader',
        select: 'fullName'
      });
    
    if (!parentTask) throw new Error('Không tìm thấy task chính');
    
    // Kiểm tra xem user có phải là người chủ trì của nhiệm vụ chính không
    const isParentTaskLeader = parentTask.leader && parentTask.leader._id.toString() === user.id;
    
    // Kiểm tra xem user có phải là người chủ trì của subtask không
    const subtask = parentTask.subTasks.find(st => st._id.toString() === taskId);
    const isSubtaskLeader = subtask && subtask.leader && subtask.leader.toString() === user.id;
    
    hasPermission = isParentTaskLeader || isSubtaskLeader;
    
    if (!hasPermission) {
      throw new Error('Bạn không có quyền tạo lại nhiệm vụ con này');
    }
    
    // Kiểm tra xem parent task có quá hạn không
    const isParentTaskOverdue = (parentTask.status === 'overdue') || 
                               (['pending', 'submitted'].includes(parentTask.status) && parentTask.endDate < now);
    
    // Nếu parent task quá hạn, không cho phép clone subtask
    if (isParentTaskOverdue) {
      throw new Error('Không thể tạo lại subtask vì nhiệm vụ chính đã quá hạn');
    }
    
    const newSubtask = {
      title: originalTask.title,
      content: originalTask.content,
      endDate: newDeadlineDate,
      assignee: originalTask.assignee,
      leader: originalTask.leader, // Giữ nguyên người chủ trì
      notes: originalTask.notes,
      status: 'pending',
      file: originalTask.file,
      fileName: originalTask.fileName,
      clonedFrom: originalTask._id
    };
    parentTask.subTasks.push(newSubtask);
    await parentTask.save();
    return { message: 'Tạo lại subtask thành công', newSubtask };
  } else {
    // Nếu là task chính, kiểm tra quyền của người chủ trì
    const isTaskLeader = originalTask.leader && originalTask.leader._id.toString() === user.id;
    hasPermission = isTaskLeader;
    
    if (!hasPermission) {
      throw new Error('Bạn không có quyền tạo lại nhiệm vụ chính này');
    }
    
    // Kiểm tra deadline của chỉ tiêu
    if (originalTask.indicator) {
      const indicator = originalTask.indicator;
      const isIndicatorOverdue = (indicator.status === 'overdue') || 
                                (indicator.status === 'active' && indicator.endDate < now);
      
      if (isIndicatorOverdue) {
        throw new Error('Không thể tạo lại nhiệm vụ vì chỉ tiêu đã quá hạn');
      }
      
      // Kiểm tra xem deadline mới có vượt quá deadline của chỉ tiêu không
      if (newDeadlineDate > indicator.endDate) {
        throw new Error('Deadline mới không được vượt quá deadline của chỉ tiêu');
      }
    }
    
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
        parentTask: originalTask._id,
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
            leader: subTask.leader, // Giữ nguyên người chủ trì subtask
            file: subTask.file,
            fileName: subTask.fileName,
            endDate: newSubTaskDeadline <= newDeadlineDate ? newSubTaskDeadline : newDeadlineDate,
            clonedFrom: subTask._id
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
          leader: subTask.leader, // Giữ nguyên người chủ trì
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

exports.getOverdueIndicators = async ({ quarter, year, page = 1, limit = 100 }) => {
  let startDate, endDate;
  if (quarter && year) {
    ({ startDate, endDate } = getQuarterDateRange(Number(quarter), Number(year)));
  } else if (year) {
    ({ startDate, endDate } = getYearDateRange(Number(year)));
  } else {
    const now = new Date();
    ({ startDate, endDate } = getQuarterDateRange(getQuarterFromMonth(now.getMonth() + 1), now.getFullYear()));
  }
  
  const now = new Date();
  
  // Lấy tất cả indicators trong khoảng thời gian
  const Indicator = require('../models/indicator.model');
  const indicators = await Indicator.find({
    endDate: { $gte: startDate, $lte: endDate }
  }).populate('creator', 'fullName');
  
  const overdueIndicators = [];
  
  for (const indicator of indicators) {
    // Kiểm tra xem indicator có quá hạn không
    const isIndicatorOverdue = (indicator.status === 'overdue') || 
                              (indicator.status === 'active' && indicator.endDate < now);
    
    if (isIndicatorOverdue) {
      // Lấy tất cả tasks của indicator này
      const tasks = await Task.find({ indicator: indicator._id })
        .populate({
          path: 'leader',
          select: 'fullName department',
          populate: {
            path: 'department',
            select: 'name'
          }
        })
        .populate('department', 'name')
        .populate({
          path: 'subTasks.assignee',
          select: 'fullName department',
          populate: {
            path: 'department',
            select: 'name'
          }
        })
        .lean();
      
      // Lọc ra các tasks quá hạn
      const overdueTasks = tasks.filter(task => {
        const isTaskOverdue = (task.status === 'overdue') || 
                             (['pending', 'submitted'].includes(task.status) && task.endDate < now);
        return isTaskOverdue;
      });
      
      // Lọc ra các subtasks quá hạn
      const overdueSubTasks = [];
      tasks.forEach(task => {
        if (task.subTasks) {
          task.subTasks.forEach(subTask => {
            const isSubtaskOverdue = (subTask.status === 'overdue') || 
                                   (['pending', 'submitted'].includes(subTask.status) && subTask.endDate < now);
            if (isSubtaskOverdue) {
              overdueSubTasks.push({
                taskId: task._id,
                taskTitle: task.title,
                subTaskId: subTask._id,
                subTaskTitle: subTask.title,
                assignee: subTask.assignee?.fullName || '',
                assigneeDepartment: subTask.assignee?.department?.name || '',
                endDate: subTask.endDate,
                status: subTask.status
              });
            }
          });
        }
      });
      
      overdueIndicators.push({
        indicatorId: indicator._id,
        indicatorName: indicator.name,
        indicatorEndDate: indicator.endDate,
        indicatorCreator: indicator.creator.fullName,
        overdueTasks: overdueTasks.map(task => ({
          taskId: task._id,
          taskTitle: task.title,
          leader: task.leader?.fullName,
          department: task.department?.name,
          endDate: task.endDate,
          status: task.status
        })),
        overdueSubTasks,
        totalOverdueItems: overdueTasks.length + overdueSubTasks.length
      });
    }
  }
  
  // Sắp xếp theo số lượng tasks quá hạn giảm dần
  overdueIndicators.sort((a, b) => b.totalOverdueItems - a.totalOverdueItems);
  
  // Phân trang
  const total = overdueIndicators.length;
  const pageNum = Number(page), limitNum = Number(limit);
  const paginated = overdueIndicators.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  
  return {
    data: paginated,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    filters: { quarter: quarter || getQuarterFromMonth(new Date().getMonth() + 1), year: year || new Date().getFullYear(), startDate, endDate }
  };
};

exports.exportOverdueIndicators = async ({ quarter, year, type = 'excel' }) => {
  const indicators = await exports.getOverdueIndicators({ quarter, year, page: 1, limit: 1000 });
  if (type === 'excel') return await exportIndicatorsToExcel(indicators.data, quarter, year);
  if (type === 'csv') return await exportIndicatorsToCSV(indicators.data, quarter, year);
  throw new Error('Chỉ hỗ trợ excel hoặc csv');
};

async function exportIndicatorsToExcel(data, quarter, year) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Chỉ tiêu quá hạn');
  ws.columns = [
    { header: 'STT', key: 'stt', width: 5 },
    { header: 'Tên chỉ tiêu', key: 'indicatorName', width: 30 },
    { header: 'Người tạo', key: 'creator', width: 20 },
    { header: 'Deadline chỉ tiêu', key: 'endDate', width: 15 },
    { header: 'Tên nhiệm vụ', key: 'taskName', width: 40 },
    { header: 'Loại nhiệm vụ', key: 'taskType', width: 15 },
    { header: 'Người phụ trách', key: 'assignee', width: 20 },
    { header: 'Phòng ban', key: 'department', width: 20 },
    { header: 'Deadline nhiệm vụ', key: 'taskEndDate', width: 15 },
    { header: 'Trạng thái', key: 'status', width: 15 }
  ];
  
  let stt = 1;
  data.forEach(indicator => {
    // Thêm tasks quá hạn
    indicator.overdueTasks.forEach(task => {
      ws.addRow({
        stt: stt++,
        indicatorName: indicator.indicatorName,
        creator: indicator.indicatorCreator,
        endDate: new Date(indicator.indicatorEndDate).toLocaleDateString('vi-VN'),
        taskName: task.taskTitle,
        taskType: 'Nhiệm vụ chính',
        assignee: task.leader || '',
        department: task.department || '',
        taskEndDate: new Date(task.endDate).toLocaleDateString('vi-VN'),
        status: task.status
      });
    });
    
    // Thêm subtasks quá hạn
    indicator.overdueSubTasks.forEach(subTask => {
      ws.addRow({
        stt: stt++,
        indicatorName: indicator.indicatorName,
        creator: indicator.indicatorCreator,
        endDate: new Date(indicator.indicatorEndDate).toLocaleDateString('vi-VN'),
        taskName: `${subTask.taskTitle} - ${subTask.subTaskTitle}`,
        taskType: 'Nhiệm vụ con',
        assignee: subTask.assignee || '',
        department: subTask.assigneeDepartment || '',
        taskEndDate: new Date(subTask.endDate).toLocaleDateString('vi-VN'),
        status: subTask.status
      });
    });
  });
  
  ws.addRow([]);
  ws.addRow(['Thông tin bộ lọc:']);
  ws.addRow([`Quý: ${quarter || 'Hiện tại'}`]);
  ws.addRow([`Năm: ${year || 'Hiện tại'}`]);
  ws.addRow([`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
  
  return await wb.xlsx.writeBuffer();
}

async function exportIndicatorsToCSV(data, quarter, year) {
  const csvData = [];
  let stt = 1;
  
  data.forEach(indicator => {
    // Thêm tasks quá hạn
    indicator.overdueTasks.forEach(task => {
      csvData.push({
        STT: stt++,
        'Tên chỉ tiêu': indicator.indicatorName,
        'Người tạo': indicator.indicatorCreator,
        'Deadline chỉ tiêu': new Date(indicator.indicatorEndDate).toLocaleDateString('vi-VN'),
        'Tên nhiệm vụ': task.taskTitle,
        'Loại nhiệm vụ': 'Nhiệm vụ chính',
        'Người phụ trách': task.leader || '',
        'Phòng ban': task.department || '',
        'Deadline nhiệm vụ': new Date(task.endDate).toLocaleDateString('vi-VN'),
        'Trạng thái': task.status
      });
    });
    
    // Thêm subtasks quá hạn
    indicator.overdueSubTasks.forEach(subTask => {
      csvData.push({
        STT: stt++,
        'Tên chỉ tiêu': indicator.indicatorName,
        'Người tạo': indicator.indicatorCreator,
        'Deadline chỉ tiêu': new Date(indicator.indicatorEndDate).toLocaleDateString('vi-VN'),
        'Tên nhiệm vụ': `${subTask.taskTitle} - ${subTask.subTaskTitle}`,
        'Loại nhiệm vụ': 'Nhiệm vụ con',
        'Người phụ trách': subTask.assignee || '',
        'Phòng ban': subTask.assigneeDepartment || '',
        'Deadline nhiệm vụ': new Date(subTask.endDate).toLocaleDateString('vi-VN'),
        'Trạng thái': subTask.status
      });
    });
  });
  
  csvData.push({ STT: '', 'Tên chỉ tiêu': '', 'Người tạo': '', 'Deadline chỉ tiêu': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Người phụ trách': '', 'Phòng ban': '', 'Deadline nhiệm vụ': '', 'Trạng thái': '' });
  csvData.push({ STT: 'Thông tin bộ lọc:', 'Tên chỉ tiêu': '', 'Người tạo': '', 'Deadline chỉ tiêu': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Người phụ trách': '', 'Phòng ban': '', 'Deadline nhiệm vụ': '', 'Trạng thái': '' });
  csvData.push({ STT: `Quý: ${quarter || 'Hiện tại'}`, 'Tên chỉ tiêu': '', 'Người tạo': '', 'Deadline chỉ tiêu': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Người phụ trách': '', 'Phòng ban': '', 'Deadline nhiệm vụ': '', 'Trạng thái': '' });
  csvData.push({ STT: `Năm: ${year || 'Hiện tại'}`, 'Tên chỉ tiêu': '', 'Người tạo': '', 'Deadline chỉ tiêu': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Người phụ trách': '', 'Phòng ban': '', 'Deadline nhiệm vụ': '', 'Trạng thái': '' });
  csvData.push({ STT: `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 'Tên chỉ tiêu': '', 'Người tạo': '', 'Deadline chỉ tiêu': '', 'Tên nhiệm vụ': '', 'Loại nhiệm vụ': '', 'Người phụ trách': '', 'Phòng ban': '', 'Deadline nhiệm vụ': '', 'Trạng thái': '' });
  
  const parser = new Parser({ 
    fields: ['STT', 'Tên chỉ tiêu', 'Người tạo', 'Deadline chỉ tiêu', 'Tên nhiệm vụ', 'Loại nhiệm vụ', 'Người phụ trách', 'Phòng ban', 'Deadline nhiệm vụ', 'Trạng thái'] 
  });
  return Buffer.from(parser.parse(csvData), 'utf8');
} 

exports.cloneOverdueIndicator = async (indicatorId, newDeadline, user) => {
  // Kiểm tra quyền hạn - chỉ giám đốc mới được clone indicator
  if (user.role !== 'admin') {
    throw new Error('Chỉ giám đốc mới có quyền tạo lại chỉ tiêu quá hạn');
  }
  
  const Indicator = require('../models/indicator.model');
  const originalIndicator = await Indicator.findById(indicatorId);
  
  if (!originalIndicator) {
    throw new Error('Không tìm thấy chỉ tiêu');
  }
  
  // Kiểm tra xem indicator có quá hạn không
  const now = new Date();
  const isIndicatorOverdue = (originalIndicator.status === 'overdue') || 
                            (originalIndicator.status === 'active' && originalIndicator.endDate < now);
  
  if (!isIndicatorOverdue) {
    throw new Error('Chỉ tiêu này không quá hạn');
  }
  
  const newDeadlineDate = new Date(newDeadline);
  if (isNaN(newDeadlineDate.getTime()) || newDeadlineDate <= now) {
    throw new Error('Deadline mới phải lớn hơn ngày hiện tại');
  }
  
  // Tạo chỉ tiêu mới
  const newIndicator = new Indicator({
    name: originalIndicator.name,
    endDate: newDeadlineDate,
    creator: user.id,
    status: 'active'
  });
  
  await newIndicator.save();
  
  // Cập nhật trạng thái chỉ tiêu cũ
  originalIndicator.status = 'completed';
  await originalIndicator.save();
  
  return {
    message: 'Tạo lại chỉ tiêu quá hạn thành công',
    newIndicator: {
      id: newIndicator._id,
      name: newIndicator.name,
      endDate: newIndicator.endDate,
      creator: user.id
    }
  };
}; 