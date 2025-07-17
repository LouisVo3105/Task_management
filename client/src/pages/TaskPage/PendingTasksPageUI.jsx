import React from "react";
import { Card, Typography, Button } from "@material-tailwind/react";

export default function PendingTasksPageUI({ user, tasks, loading, handleApprove, handleReject, TABLE_HEAD, statusMap }) {
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <div className="p-6 text-red-600">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Nhiệm vụ chờ duyệt</h1>
      {loading ? (
        <div className="h-40 bg-gray-100 rounded animate-pulse my-4" />
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có nhiệm vụ nào chờ duyệt.</div>
      ) : (
        <Card className="h-full w-full overflow-scroll">
          <table className="w-full min-w-max table-auto text-left">
            <thead>
              <tr>
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                    <Typography variant="small" color="blue-gray" className="font-normal leading-none opacity-70">{head}</Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((item) => {
                const statusInfo = statusMap[item.status] || { text: item.status, color: 'text-gray-800' };
                return (
                  <tr key={item._id}>
                    <td className="p-4 border-b border-blue-gray-50">{item.title}</td>
                    <td className="p-4 border-b border-blue-gray-50">{item.endDate ? new Date(item.endDate).toLocaleDateString() : ""}</td>
                    <td className={`p-4 border-b border-blue-gray-50 font-semibold ${statusInfo.color}`}>{statusInfo.text}</td>
                    <td className="p-4 border-b border-blue-gray-50 space-x-2">
                      <Button variant="outlined" size="sm" color="green" onClick={() => handleApprove(item._id)}>
                        Duyệt
                      </Button>
                      <Button variant="outlined" size="sm" color="red" onClick={() => handleReject(item._id)}>
                        Từ chối
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
} 