import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Typography,
  Select as MTSelect,
  Option,
} from "@material-tailwind/react";
import ReactSelect from "react-select";
import { useCreateSubtask } from "../../hooks/useCreateSubtask";

const CreateSubtaskModal = ({ open, onClose, onCreated, parentTaskId, supporters = [] }) => {
  const {
    title,
    setTitle,
    content,
    setContent,
    endDate,
    setEndDate,
    notes,
    setNotes,
    leaderId,
    setLeaderId,
    assigneeId,
    setAssigneeId,
    loading,
    error,
    fileObj,
    setFileObj,
    fileName,
    setFileName,
    departmentUsers,
    setDepartmentUsers,
    handleFileChange,
    handleCreate
  } = useCreateSubtask({ onClose, onCreated, parentTaskId, supporters });

  if (!open) return null;

  // Options cho leader
  const leaderOptions = (supporters || []).map(u => ({ value: u._id, label: `${u.fullName} (${u.email})` }));
  const selectedLeader = leaderOptions.find(opt => opt.value === leaderId) || null;
  // Options cho assignee
  const assigneeOptions = (departmentUsers || []).map(u => ({ value: u._id, label: `${u.fullName} (${u.email})` }));
  const selectedAssignee = assigneeOptions.find(opt => opt.value === assigneeId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="text-xl font-semibold mb-4">Tạo nhiệm vụ con</div>
        <div className="space-y-4">
          {/* Tiêu đề */}
          <div>
            <div className="mb-1 font-medium text-sm">Tiêu đề:</div>
            <Input
              label="Nhập tiêu đề..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          {/* Nội dung */}
          <div>
            <div className="mb-1 font-medium text-sm">Nội dung:</div>
            <textarea
              placeholder="Nhập nội dung nhiệm vụ..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
            />
          </div>
          {/* Ngày kết thúc */}
          <div>
            <div className="mb-1 font-medium text-sm">Ngày kết thúc:</div>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
          {/* Ghi chú */}
          <div>
            <div className="mb-1 font-medium text-sm">Ghi chú:</div>
            <Input
              label="Nhập ghi chú..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          {/* Người chủ trì */}
          <div>
            <div className="mb-1 font-medium text-sm">Người chủ trì:</div>
            <ReactSelect
              options={leaderOptions}
              value={selectedLeader}
              onChange={opt => setLeaderId(opt ? opt.value : "")}
              placeholder="Chọn người chủ trì..."
              classNamePrefix="react-select"
              styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
            />
          </div>
          {/* Người thực hiện */}
          <div>
            <div className="mb-1 font-medium text-sm">Người thực hiện:</div>
            <ReactSelect
              options={assigneeOptions}
              value={selectedAssignee}
              onChange={opt => setAssigneeId(opt ? opt.value : "")}
              placeholder="Chọn người thực hiện..."
              classNamePrefix="react-select"
              isDisabled={!leaderId || assigneeOptions.length === 0}
              styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">File đính kèm (tùy chọn):</label>
            <label
              htmlFor="subtask-file-upload"
              className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
            >
              Chọn file
            </label>
            <input
              id="subtask-file-upload"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileName && <div className="text-xs text-green-600 mt-1">Đã chọn: {fileName}</div>}
          </div>
          {error && <Typography color="red" className="text-sm">{error}</Typography>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button className="bg-teal-600 text-white" onClick={handleCreate} disabled={loading || !title || !content || !endDate || !assigneeId}>
            {loading ? "Đang tạo..." : "Tạo nhiệm vụ con"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSubtaskModal; 