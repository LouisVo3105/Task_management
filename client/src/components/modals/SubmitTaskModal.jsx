import React, { useState } from "react";
import { Button, Input, Typography } from "@material-tailwind/react";

const SubmitTaskModal = ({ open, onClose, onSubmitted, taskId }) => {
  const [submitNote, setSubmitNote] = useState("");
  const [submitLink, setSubmitLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:3056/api/tasks/${taskId}/submit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submitNote, submitLink }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitNote("");
        setSubmitLink("");
        onSubmitted && onSubmitted();
        onClose();
      } else {
        setError(data.message || "Nộp nhiệm vụ thất bại");
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
        <div className="text-xl font-semibold mb-4">Nộp nhiệm vụ</div>
        <div className="space-y-4">
          <Input label="Ghi chú nộp bài" value={submitNote} onChange={e => setSubmitNote(e.target.value)} required />
          <Input label="Link nộp bài" value={submitLink} onChange={e => setSubmitLink(e.target.value)} required />
          {error && <Typography color="red" className="text-sm">{error}</Typography>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button className="bg-teal-600 text-white" onClick={handleSubmit} disabled={loading || !submitNote || !submitLink}>
            {loading ? "Đang nộp..." : "Nộp nhiệm vụ"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmitTaskModal; 