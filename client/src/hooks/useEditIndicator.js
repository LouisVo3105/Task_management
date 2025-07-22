import { useState, useEffect } from "react";
import authFetch from "../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;

export function useEditIndicator({ onClose, indicator, onUpdated }) {
  const [name, setName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (indicator) {
      setName(indicator.name || "");
      setEndDate(indicator.endDate ? indicator.endDate.slice(0, 10) : "");
    }
  }, [indicator]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${BASE_URL}/api/indicators/${indicator._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, endDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Cập nhật thất bại");
      }
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
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
    handleSubmit
  };
} 