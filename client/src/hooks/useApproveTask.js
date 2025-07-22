import { useState } from "react";
import { authFetch } from "../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;

export function useApproveTask({ onClose, onApproved, taskId, subTaskId }) {
  const [mode, setMode] = useState("approve"); // approve or reject
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async () => {
    setLoading(true);
    setError("");
    try {
      let url = subTaskId
        ? `${BASE_URL}/api/tasks/${taskId}/subtasks/${subTaskId}/${mode === "approve" ? "approve" : "reject"}`
        : `${BASE_URL}/api/tasks/${taskId}/${mode === "approve" ? "approve" : "reject"}`;
      const res = await authFetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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

  return {
    mode,
    setMode,
    comment,
    setComment,
    loading,
    error,
    handleAction
  };
} 