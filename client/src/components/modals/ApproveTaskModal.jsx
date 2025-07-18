import React, { useState } from "react";
import { Button, Input, Typography } from "@material-tailwind/react";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL


const ApproveTaskModal = ({ open, onClose, onApproved, taskId, subTaskId }) => {
  const [mode, setMode] = useState("approve"); // approve or reject
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem('accessToken');
      let url = subTaskId
        ? `${BASE_URL}/api/tasks/${taskId}/subtasks/${subTaskId}/${mode === "approve" ? "approve" : "reject"}`
        : `${BASE_URL}/api/tasks/${taskId}/${mode === "approve" ? "approve" : "reject"}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });
      const data = await res.json();
      if (data.success) {
        setComment("");
        onApproved && onApproved();
        onClose();
      } else {
        setError(data.message || "Cập nhật trạng thái thất bại");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="text-xl font-semibold mb-4">Duyệt nhiệm vụ</div>
        <div className="flex gap-4 mb-4">
          <Button
            className={mode === "approve" ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-700"}
            onClick={() => setMode("approve")}
            disabled={loading}
          >
            Duyệt
          </Button>
          <Button
            className={mode === "reject" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"}
            onClick={() => setMode("reject")}
            disabled={loading}
          >
            Từ chối
          </Button>
        </div>
        <Input
          label={mode === "approve" ? "Nhận xét (bắt buộc)" : "Lý do từ chối (bắt buộc)"}
          value={comment}
          onChange={event => setComment(event.target.value)}
          required
        />
        {error && <Typography color="red" className="text-sm mt-2">{error}</Typography>}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button
            className={mode === "approve" ? "bg-teal-600 text-white" : "bg-red-600 text-white"}
            onClick={handleAction}
            disabled={loading || !comment}
          >
            {loading ? "Đang cập nhật..." : mode === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApproveTaskModal; 