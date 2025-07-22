import { useState } from "react";
import authFetch from "../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;

export function useCreateIndicator({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${BASE_URL}/api/indicators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, endDate }),
      });
      const data = await res.json();
      if (data.success) {
        setName("");
        setEndDate("");
        onCreated && onCreated();
        onClose();
      } else {
        setError(data.message || "Tạo chỉ tiêu thất bại");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    }
    setLoading(false);
  };

  return {
    name,
    setName,
    endDate,
    setEndDate,
    loading,
    error,
    handleCreate
  };
} 