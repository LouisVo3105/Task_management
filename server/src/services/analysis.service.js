// src/services/analysis.service.js
const Task = require('../models/task.model');
const Indicator = require('../models/indicator.model');
const mongoose = require('mongoose');

const getOverallStats = async () => {
  const subTasksStats = await Task.aggregate([
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
  const subStats = subTasksStats[0];
  const getTotal = (stats) => (stats && stats.length > 0 ? stats[0].count : 0);
  return {
    totalTasks: getTotal(subStats.total),
    approvedTasks: getTotal(subStats.approved),
    pendingTasks: getTotal(subStats.pending),
    submittedTasks: getTotal(subStats.submitted),
    overdueTasks: getTotal(subStats.overdue),
  };
};

const getUserPerformance = async (limit = 10) => {
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
    { $sort: { approvedTasks: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
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
  return userPerformance;
};

const getIndicatorProgress = async () => {
  const allIndicators = await Indicator.find().sort({ createdAt: -1 }).limit(20).select('_id name').lean();
  const tasks = await Task.find().select('indicator status').lean();
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
  return Object.values(indicatorStats).map(stat => ({
    ...stat,
    percent: stat.total === 0 ? 0 : Math.round((stat.completed / stat.total) * 10000) / 100
  }));
};

const getDepartmentProgress = async () => {
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
  return result;
};

const getDepartmentTaskSummary = async (user, month, year) => {
  let matchDepartment = {};
  if (user.role === 'manager' || user.position === 'Truong phong') {
    matchDepartment = { department: user.department };
  }
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
  const [incompleteTasks, completedTasks] = await Promise.all([
    Task.find(matchIncomplete)
      .populate('department leader', 'name fullName email')
      .select('title department leader endDate status')
      .lean(),
    Task.find(matchCompleted)
      .populate('department leader', 'name fullName email')
      .select('title department leader endDate status')
      .lean()
  ]);
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
  return Object.values(depMap);
};

module.exports = {
  getOverallStats,
  getUserPerformance,
  getIndicatorProgress,
  getDepartmentProgress,
  getDepartmentTaskSummary
}; 