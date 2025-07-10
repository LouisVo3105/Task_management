import React, { useState } from "react";
import { Button, Typography, Input } from "@material-tailwind/react";

const SubmitTaskMainModal = ({ open, onClose, onSubmit, error }) => {
  const [submitNote, setSubmitNote] = useState("");
  const [submitLink, setSubmitLink] = useState("");
  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setFileObj(file);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 border border-gray-200">
        <div className="text-xl font-semibold mb-4 text-center">Nộp nhiệm vụ chính</div>
        <form
          onSubmit={e => {
            e.preventDefault();
            const dataToSend = { submitNote, submitLink, file: fileObj };
            onSubmit(dataToSend);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Link báo cáo</label>
              <input
                type="text"
                value={submitLink}
                onChange={e => setSubmitLink(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
                placeholder="Nhập link báo cáo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <input
                type="text"
                value={submitNote}
                onChange={e => setSubmitNote(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
                placeholder="Nhập ghi chú..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File đính kèm (tùy chọn):</label>
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
              >
                Chọn file
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              {fileName && <div className="text-xs text-green-600 mt-1">Đã chọn: {fileName}</div>}
            </div>
            {error && <Typography color="red" className="mt-2">{error}</Typography>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="text" color="gray" onClick={onClose} type="button">Hủy</Button>
            <Button className="bg-teal-600 text-white px-6 py-2 rounded font-semibold text-base shadow hover:bg-teal-700 transition" type="submit">
              Xác nhận nộp
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitTaskMainModal; 