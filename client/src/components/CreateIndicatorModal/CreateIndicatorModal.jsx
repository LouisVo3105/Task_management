import React from "react";
import { Button, Input, Typography } from "@material-tailwind/react";
import ReactDOM from "react-dom";
import { useCreateIndicator } from "../../hooks/useCreateIndicator";

const CreateIndicatorModal = ({ open, onClose, onCreated }) => {
  const {
    name,
    setName,
    endDate,
    setEndDate,
    loading,
    error,
    handleCreate
  } = useCreateIndicator({ onClose, onCreated });

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 pointer-events-auto">
        <div className="text-xl font-semibold mb-4">Tạo chỉ tiêu mới</div>
        <div className="space-y-4">
          <Input
            label="Tên chỉ tiêu"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label="Deadline chỉ tiêu"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
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
            disabled={loading || !name || !endDate}
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