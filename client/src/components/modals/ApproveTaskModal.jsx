import React, { useState } from "react";
import { Button, Input, Typography } from "@material-tailwind/react";

const ApproveTaskModal = ({ open, onClose, onApproved, taskId }) => {
  const [mode, setMode] = useState("approve"); // approve or reject
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:3056/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          mode === "approve"
            ? { status: "approved" }
            : { status: "pending", rejectNote }
        ),
      });
      const data = await res.json();
      if (data.success) {
        setRejectNote("");
        onApproved && onApproved();
        onClose();
      } else {
        setError(data.message || "Cập nhật trạng thái thất bại");
      }
    } catch (e) {
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
            Yêu cầu làm lại
          </Button>
        </div>
        {mode === "reject" && (
          <Input
            label="Lý do yêu cầu làm lại"
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            required
          />
        )}
        {error && <Typography color="red" className="text-sm mt-2">{error}</Typography>}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button
            className={mode === "approve" ? "bg-teal-600 text-white" : "bg-red-600 text-white"}
            onClick={handleApprove}
            disabled={loading || (mode === "reject" && !rejectNote)}
          >
            {loading ? "Đang cập nhật..." : mode === "approve" ? "Xác nhận duyệt" : "Xác nhận yêu cầu làm lại"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApproveTaskModal; 