import React, { useState } from "react";
import { Button, Input, Typography } from "@material-tailwind/react";
import ReactDOM from "react-dom";

const CreateIndicatorModal = ({ open, onClose, onCreated }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:3056/api/indicators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, name }),
      });
      const data = await res.json();
      if (data.success) {
        setCode("");
        setName("");
        onCreated && onCreated();
        onClose();
      } else {
        setError(data.message || "Tạo chỉ tiêu thất bại");
      }
    } catch (e) {
      setError("Lỗi kết nối máy chủ");
    }
    setLoading(false);
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 pointer-events-auto">
        <div className="text-xl font-semibold mb-4">Tạo chỉ tiêu mới</div>
        <div className="space-y-4">
          <Input
            label="Mã chỉ tiêu"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
          />
          <Input
            label="Tên chỉ tiêu"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          {error && <Typography color="red" className="text-sm">{error}</Typography>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="text"
            color="gray"
            onClick={onClose}
            className="mr-2"
          >
            Hủy
          </Button>
          <Button
            className="bg-teal-600 text-white"
            onClick={handleCreate}
            disabled={loading || !code || !name}
          >
            {loading ? "Đang tạo..." : "Tạo chỉ tiêu"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateIndicatorModal; 