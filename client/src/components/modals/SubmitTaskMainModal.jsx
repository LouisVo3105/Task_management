import React, { useState } from "react";
import { Button, Typography, Input } from "@material-tailwind/react";

const SubmitTaskMainModal = ({ open, onClose, onSubmit, error }) => {
  const [submitNote, setSubmitNote] = useState("");
  const [submitLink, setSubmitLink] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 border border-gray-200">
        <div className="text-xl font-semibold mb-4">Nộp nhiệm vụ chính</div>
        <div className="mb-4">
          <Input
            label="Link báo cáo"
            value={submitLink}
            onChange={e => setSubmitLink(e.target.value)}
            className="mb-2"
          />
          <Input
            label="Ghi chú"
            value={submitNote}
            onChange={e => setSubmitNote(e.target.value)}
          />
          {error && <Typography color="red" className="mt-2">{error}</Typography>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button className="bg-teal-600 text-white" onClick={() => onSubmit({ submitNote, submitLink })}>
            Xác nhận nộp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmitTaskMainModal; 