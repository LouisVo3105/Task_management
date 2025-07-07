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
              { $match: { status: { $nin: ['approved'] }, endDate: { $lt: new Date() } } },
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
      console.error('Analysis Error:', error);
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
                                    { $ne: ["$subTasks.status", "approved"] },
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
        console.error('User Performance Error:', error);
        this.#sendResponse(res, 500, false, 'Lỗi khi lấy dữ liệu hiệu suất người dùng', null, error.message);
    }
  }
}

module.exports = new AnalysisController();