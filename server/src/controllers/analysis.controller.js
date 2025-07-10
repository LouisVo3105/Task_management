const Task = require('../models/task.model');
const mongoose = require('mongoose');

class AnalysisController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async getOverallStats(req, res) {
    try {
      const subTasksStatsPromise = Task.aggregate([
        { $unwind: '$subTasks' },
        { $replaceRoot: { newRoot: '$subTasks' } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            approved: [{ $match: { status: 'approved' } }, { $count: 'count' }],
            pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
            submitted: [{ $match: { status: 'submitted' } }, { $count: 'count' }],
            overdue: [
              { $match: { 
                $or: [
                  { status: { $in: ['pending', 'submitted', 'overdue'] }, endDate: { $lt: new Date() } },
                  { 'subTasks.status': { $in: ['pending', 'submitted', 'overdue'] }, 'subTasks.endDate': { $lt: new Date() } }
                ]
              } },
              { $count: 'count' }
            ]
          }
        }
      ]);

      const [subTasksResult] = await Promise.all([subTasksStatsPromise]);

      const subStats = subTasksResult[0];
      const getTotal = (stats) => (stats && stats.length > 0 ? stats[0].count : 0);

      const combinedStats = {
        totalTasks: getTotal(subStats.total),
        approvedTasks: getTotal(subStats.approved),
        pendingTasks: getTotal(subStats.pending),
        submittedTasks: getTotal(subStats.submitted),
        overdueTasks: getTotal(subStats.overdue),
      };

      this.#sendResponse(res, 200, true, 'Lấy dữ liệu phân tích tổng quan thành công', combinedStats);

    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy dữ liệu phân tích tổng quan', null, error.message);
    }
  }

  async getUserPerformance(req, res) {
    try {
        // Lấy tham số limit từ query string, mặc định là 10
        const limit = parseInt(req.query.limit, 10) || 10;

        const userPerformance = await Task.aggregate([
            { $unwind: "$subTasks" },
            { $match: { "subTasks.assignee": { $exists: true } } },
            {
                $group: {
                    _id: "$subTasks.assignee",
                    totalTasks: { $sum: 1 },
                    approvedTasks: { $sum: { $cond: [{ $eq: ["$subTasks.status", "approved"] }, 1, 0] } },
                    submittedTasks: { $sum: { $cond: [{ $eq: ["$subTasks.status", "submitted"] }, 1, 0] } },
                    overdueTasks: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $in: ["$subTasks.status", ["pending", "submitted", "overdue"]] },
                                    { $lt: ["$subTasks.endDate", new Date()] }
                                ]}, 1, 0
                            ]
                        }
                    }
                }
            },
            // Sắp xếp người dùng theo số lượng công việc đã hoàn thành (cao xuống thấp)
            {
                $sort: { approvedTasks: -1 }
            },
            // Giới hạn kết quả ở top N người dùng
            { $limit: limit },
            {
                $lookup: {
                    from: 'users', // Tên collection của User
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            { $match: { 'userDetails.isActive': true } },
            {
                $project: {
                    _id: 0,
                    user: {
                        _id: '$userDetails._id',
                        fullName: '$userDetails.fullName',
                        email: '$userDetails.email'
                    },
                    stats: {
                        totalTasks: '$totalTasks',
                        approvedTasks: '$approvedTasks',
                        submittedTasks: '$submittedTasks',
                        overdueTasks: '$overdueTasks'
                    }
                }
            }
        ]);

        this.#sendResponse(res, 200, true, 'Lấy dữ liệu hiệu suất người dùng thành công', userPerformance);
    } catch (error) {
        this.#sendResponse(res, 500, false, 'Lỗi khi lấy dữ liệu hiệu suất người dùng', null, error.message);
    }
  }

  // 1. Tiến độ hoàn thành của từng chỉ tiêu
  async getIndicatorProgress(req, res) {
    try {
      const Indicator = require('../models/indicator.model');
      // Lấy 20 chỉ tiêu tạo gần nhất
      const allIndicators = await Indicator.find().sort({ createdAt: -1 }).limit(20).select('_id name');
      // Lấy tất cả nhiệm vụ chính (không tính subtask)
      const tasks = await Task.find().select('indicator status');
      // Gom nhiệm vụ chính theo chỉ tiêu
      const indicatorStats = {};
      allIndicators.forEach(ind => {
        indicatorStats[ind._id.toString()] = {
          indicatorId: ind._id,
          indicatorName: ind.name,
          total: 0,
          completed: 0
        };
      });
      tasks.forEach(task => {
        const indId = task.indicator?.toString();
        if (indicatorStats[indId]) {
          indicatorStats[indId].total++;
          if (task.status === 'approved') indicatorStats[indId].completed++;
        }
      });
      // Tính phần trăm
      const result = Object.values(indicatorStats).map(stat => ({
        ...stat,
        percent: stat.total === 0 ? 0 : Math.round((stat.completed / stat.total) * 10000) / 100
      }));
      this.#sendResponse(res, 200, true, 'Tiến độ hoàn thành của từng chỉ tiêu', result);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy tiến độ chỉ tiêu', null, error.message);
    }
  }

  // 2. Mức độ hoàn thành nhiệm vụ của từng phòng ban
  async getDepartmentProgress(req, res) {
    try {
      const result = await Task.aggregate([
        { $unwind: '$subTasks' },
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$subTasks.status', 'approved'] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'department'
          }
        },
        { $unwind: '$department' },
        {
          $project: {
            _id: 0,
            departmentId: '$_id',
            departmentName: '$department.name',
            total: 1,
            completed: 1,
            percent: {
              $cond: [
                { $eq: ['$total', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 2] }
              ]
            }
          }
        }
      ]);
      this.#sendResponse(res, 200, true, 'Mức độ hoàn thành nhiệm vụ của từng phòng ban', result);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy tiến độ phòng ban', null, error.message);
    }
  }

  // API gộp: Thống kê nhiệm vụ chính theo phòng ban, phân quyền theo role, hỗ trợ lọc tháng/năm
  async getDepartmentTaskSummary(req, res) {
    try {
      const user = req.user;
      let matchDepartment = {};
      if (user.role === 'manager' || user.position === 'Truong phong') {
        matchDepartment = { department: user.department };
      }
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);
      let matchIncomplete = { ...matchDepartment };
      let matchCompleted = { ...matchDepartment };
      const now = new Date();
      if (month && year) {
        matchIncomplete = {
          ...matchIncomplete,
          status: { $ne: 'approved' },
          $expr: {
            $and: [
              { $eq: [{ $month: '$endDate' }, month] },
              { $eq: [{ $year: '$endDate' }, year] },
              { $gte: ['$endDate', now] }
            ]
          }
        };
        matchCompleted = {
          ...matchCompleted,
          status: 'approved',
          $expr: {
            $and: [
              { $eq: [{ $month: '$endDate' }, month] },
              { $eq: [{ $year: '$endDate' }, year] }
            ]
          }
        };
      } else {
        matchIncomplete = { ...matchIncomplete, status: { $ne: 'approved' } };
        matchCompleted = { ...matchCompleted, status: 'approved' };
      }
      const incompleteTasks = await Task.find(matchIncomplete)
        .populate('department leader')
        .select('title department leader endDate status');
      const completedTasks = await Task.find(matchCompleted)
        .populate('department leader')
        .select('title department leader endDate status');
      const groupByDepartment = (tasks) => {
        const map = {};
        tasks.forEach(task => {
          const depId = task.department?._id?.toString() || (task.department + '');
          if (!map[depId]) {
            map[depId] = {
              departmentId: depId,
              departmentName: task.department?.name || '',
              leader: task.leader ? { _id: task.leader._id, fullName: task.leader.fullName, email: task.leader.email } : null,
              incompleteTasks: [],
              completedTasks: []
            };
          }
        });
        return map;
      };
      const depMap = groupByDepartment([...incompleteTasks, ...completedTasks]);
      incompleteTasks.forEach(task => {
        const depId = task.department?._id?.toString() || (task.department + '');
        depMap[depId]?.incompleteTasks.push({
          taskId: task._id,
          title: task.title,
          endDate: task.endDate,
          leader: task.leader ? { _id: task.leader._id, fullName: task.leader.fullName, email: task.leader.email } : null
        });
      });
      completedTasks.forEach(task => {
        const depId = task.department?._id?.toString() || (task.department + '');
        depMap[depId]?.completedTasks.push({
          taskId: task._id,
          title: task.title,
          endDate: task.endDate,
          leader: task.leader ? { _id: task.leader._id, fullName: task.leader.fullName, email: task.leader.email } : null
        });
      });
      const result = Object.values(depMap);
      this.#sendResponse(res, 200, true, 'Thống kê nhiệm vụ chính theo phòng ban', result);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy thống kê nhiệm vụ phòng ban', null, error.message);
    }
  }
}

module.exports = new AnalysisController();