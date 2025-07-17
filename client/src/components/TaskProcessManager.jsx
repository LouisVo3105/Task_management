import React, { useEffect, useState, useCallback } from "react";
import StatusDot from "./StatusDot";
import authFetch from "../utils/authFetch";
import { useSSEContext } from "@utils/SSEContext";

function getIndicatorStatus(indicator) {
  if (!indicator.mainTasks || indicator.mainTasks.length === 0) return "pending";
  return indicator.mainTasks.every(task => task.status === "approved") ? "approved" : "pending";
}

export default function TaskProcessManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Xây dựng rows phân cấp từ dữ liệu API
  const buildRows = (data) => {
    const result = [];
    let stt = 1;
    (data || []).forEach(indicator => {
      // Xác định trạng thái chỉ tiêu
      const indicatorStatus = getIndicatorStatus(indicator);
      // Chỉ tiêu (gốc)
      result.push({
        stt: stt++,
        type: "indicator",
        indent: 0,
        name: indicator.creator?.fullName || "",
        content: indicator.content,
        createdAt: indicator.createdAt,
        status: indicatorStatus,
        file: null,
      });
      // Nhiệm vụ chính
      (indicator.mainTasks || []).forEach(mainTask => {
        result.push({
          type: "mainTask",
          indent: 1,
          name: mainTask.leader?.fullName || "",
          content: mainTask.content,
          createdAt: mainTask.createdAt,
          status: mainTask.status,
          file: mainTask.file || null,
        });
        // Nhiệm vụ con
        (mainTask.subTasks || []).forEach(subTask => {
          // Dòng người chủ trì nhiệm vụ con
          result.push({
            type: "subTaskLeader",
            indent: 2,
            name: subTask.leader?.fullName || "",
            content: subTask.content,
            createdAt: subTask.createdAt,
            status: subTask.status,
            file: subTask.file || null,
          });
          // Dòng người thực hiện nhiệm vụ con
          result.push({
            type: "subTaskAssignee",
            indent: 3,
            name: subTask.assignee?.fullName || "",
            content: subTask.content,
            createdAt: subTask.createdAt,
            status: subTask.status,
            file: subTask.file || null,
          });
        });
      });
    });
    return result;
  };

  const fetchAllTasks = useCallback(() => {
    setLoading(true);
    setError(null);
    authFetch("http://localhost:3056/api/tasks/all")
      .then(res => res.json())
      .then(json => {
        if (json.success) setRows(buildRows(json.data));
        else setError("Không lấy được dữ liệu");
        setLoading(false);
      })
      .catch(() => {
        setError("Lỗi kết nối server");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  useSSEContext((event) => {
    // Lắng nghe các sự kiện liên quan đến task/subtask và indicator
    if (
      [
        "task_created",
        "task_updated",
        "task_deleted",
        "subtask_created",
        "subtask_updated",
        "indicator_created",
        "indicator_updated",
        "indicator_deleted"
      ].includes(event.type)
    ) {
      console.log("SSE event in TaskProcessManager: ", event);
      setTimeout(() => {
        fetchAllTasks();
      }, 1000);
    }
  });

  if (loading) return <div className="h-40 bg-gray-100 rounded animate-pulse my-4" />;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;

  // Helper để render file link đúng host
  const renderFile = (file) => {
    if (!file) return "";
    const url = file.startsWith("http") ? file : `http://localhost:3056/${file.replace(/^\\|\//, "")}`;
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">File</a>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max table-auto border text-sm bg-white shadow">
        <thead className="bg-blue-100">
          <tr>
            <th className="p-2 border">STT</th>
            <th className="p-2 border">Tên người dùng</th>
            <th className="p-2 border">Nội dung</th>
            <th className="p-2 border">File</th>
            <th className="p-2 border">Ngày tạo</th>
            <th className="p-2 border">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="text-center p-4 text-gray-500">Không có dữ liệu</td></tr>
          ) : rows.map((row, idx) => {
            // Xác định hàng hoàn thành
            const isDone = row.status === "approved" || row.status === "completed";
            const doneClass = isDone ? "bg-green-200" : "";
            const checkIcon = isDone ? <span className="mr-1">✅</span> : null;
            if (row.type === "indicator") {
              return (
                <tr key={idx} className={`${doneClass} font-bold`}>
                  <td className="border p-2 align-top">{row.stt}</td>
                  <td className="border p-2 align-top" style={{ paddingLeft: 8 }}>{row.name} <span className="text-xs text-gray-400">(Người tạo chỉ tiêu)</span></td>
                  <td className="border p-2 align-top">{checkIcon}{row.content}</td>
                  <td className="border p-2 align-top"></td>
                  <td className="border p-2 align-top">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ""}</td>
                  <td className="border p-2 align-top"><StatusDot status={row.status} /></td>
                </tr>
              );
            }
            if (row.type === "mainTask") {
              return (
                <tr key={idx} className={doneClass}>
                  <td className="border p-2"></td>
                  <td className="border p-2" style={{ paddingLeft: 32 }}>{row.name} <span className="text-xs text-gray-400">(Người chủ trì)</span></td>
                  <td className="border p-2">{checkIcon}{row.content}</td>
                  <td className="border p-2">{renderFile(row.file)}</td>
                  <td className="border p-2">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ""}</td>
                  <td className="border p-2"><StatusDot status={row.status} /></td>
                </tr>
              );
            }
            if (row.type === "subTaskLeader") {
              return (
                <tr key={idx} className={doneClass}>
                  <td className="border p-2"></td>
                  <td className="border p-2" style={{ paddingLeft: 56 }}>{row.name} <span className="text-xs text-gray-400">(Người chủ trì NV con)</span></td>
                  <td className="border p-2">{checkIcon}{row.content}</td>
                  <td className="border p-2">{renderFile(row.file)}</td>
                  <td className="border p-2">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ""}</td>
                  <td className="border p-2"><StatusDot status={row.status} /></td>
                </tr>
              );
            }
            if (row.type === "subTaskAssignee") {
              return (
                <tr key={idx} className={doneClass}>
                  <td className="border p-2"></td>
                  <td className="border p-2" style={{ paddingLeft: 80 }}>{row.name} <span className="text-xs text-gray-400">(Người thực hiện NV con)</span></td>
                  <td className="border p-2">{checkIcon}{row.content}</td>
                  <td className="border p-2">{renderFile(row.file)}</td>
                  <td className="border p-2">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ""}</td>
                  <td className="border p-2"><StatusDot status={row.status} /></td>
                </tr>
              );
            }
            return null;
          })}
        </tbody>
      </table>
    </div>
  );
} 