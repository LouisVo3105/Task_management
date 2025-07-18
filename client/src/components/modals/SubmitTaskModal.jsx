import React, { useState } from "react";
import { Button, Input, Typography } from "@material-tailwind/react";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL



const SubmitTaskModal = ({ open, onClose, onSubmitted, taskId }) => {
  const [submitNote, setSubmitNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileObj, setFileObj] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileObj(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('note', submitNote);
      if (fileObj) formData.append('file', fileObj);
      const res = await fetch(`${BASE_URL}/api/tasks/${taskId}/submit`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSubmitNote("");
        setFileObj(null);
        onSubmitted && onSubmitted();
        onClose();
      } else {
        setError(data.message || "Nộp nhiệm vụ thất bại");
      }
    } catch{
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
          <input
            type="text"
            placeholder="Ghi chú nộp bài"
            value={submitNote}
            onChange={e => setSubmitNote(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 px-4 py-3 text-base placeholder-gray-400 transition"
          />
          <div>
            <label className="block text-sm font-medium mb-1">File đính kèm (tùy chọn):</label>
            <label htmlFor="submit-task-file-upload" className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg cursor-pointer hover:bg-teal-700 transition">
              Chọn file
            </label>
            <input
              id="submit-task-file-upload"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileObj && <div className="text-xs text-green-600 mt-1">Đã chọn: {fileObj.name}</div>}
          </div>
          {error && <Typography color="red" className="text-sm">{error}</Typography>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button className="bg-teal-600 text-white" onClick={handleSubmit} disabled={loading || !submitNote}>
            {loading ? "Đang nộp..." : "Nộp nhiệm vụ"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmitTaskModal; 