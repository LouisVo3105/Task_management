import React from "react";
import ReactSelect from "react-select";
import { useEditTask } from "../../hooks/useEditTask";

const EditTaskModal = ({ open, onClose, task, onUpdated }) => {
  const {
    title,
    setTitle,
    content,
    setContent,
    endDate,
    setEndDate,
    indicatorId,
    setIndicatorId,
    notes,
    setNotes,
    fileBase64,
    setFileBase64,
    fileName,
    setFileName,
    currentFile,
    setCurrentFile,
    fileObj,
    setFileObj,
    departmentId,
    setDepartmentId,
    departments,
    setDepartments,
    leaderId,
    setLeaderId,
    leaders,
    setLeaders,
    supporterIds,
    setSupporterIds,
    supporters,
    setSupporters,
    indicators,
    setIndicators,
    loading,
    error,
    handleFileChange,
    handleSubmit
  } = useEditTask({ onClose, task, onUpdated, open });

  if (!open || !task) return null;

  // Check if this is a subtask
  const isSubtask = !!task?.parentTask && task.isRoot === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">Cập nhật nhiệm vụ</h2>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="mb-3">
                <label className="block mb-1 font-medium">Tên nhiệm vụ</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">Nội dung nhiệm vụ</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                  rows={3}
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">Ngày hết hạn</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">Ghi chú</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <label className="block mb-1 font-medium">Phòng ban</label>
                <ReactSelect
                  options={departments.map(dep => ({ value: dep._id, label: dep.name }))}
                  value={departments.find(dep => dep._id === departmentId) ? { value: departmentId, label: departments.find(dep => dep._id === departmentId).name } : null}
                  onChange={opt => setDepartmentId(opt ? opt.value : "")}
                  placeholder="Chọn phòng ban..."
                  classNamePrefix="react-select"
                  styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">Người chủ trì</label>
                <ReactSelect
                  options={leaders.map(l => ({ value: l._id, label: l.fullName || l.username }))}
                  value={leaders.find(l => l._id === leaderId) ? { value: leaderId, label: leaders.find(l => l._id === leaderId).fullName || leaders.find(l => l._id === leaderId).username } : null}
                  onChange={opt => setLeaderId(opt ? opt.value : "")}
                  placeholder="Chọn người chủ trì..."
                  classNamePrefix="react-select"
                  isDisabled={!departmentId}
                  styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">
                  {isSubtask ? "Người thực hiện" : "Người hỗ trợ"}
                </label>
                <ReactSelect
                  isMulti={!isSubtask}
                  options={supporters.map(s => ({ value: s._id, label: s.fullName || s.username }))}
                  value={isSubtask
                    ? (supporters.find(s => s._id === supporterIds[0]) ? { value: supporterIds[0], label: supporters.find(s => s._id === supporterIds[0]).fullName || supporters.find(s => s._id === supporterIds[0]).username } : null)
                    : supporters.filter(s => supporterIds.includes(s._id)).map(s => ({ value: s._id, label: s.fullName || s.username }))
                  }
                  onChange={opts => setSupporterIds(isSubtask
                    ? (opts ? [opts.value] : [])
                    : (opts ? opts.map(o => o.value) : [])
                  )}
                  placeholder={isSubtask ? "Chọn người thực hiện..." : "Chọn người hỗ trợ..."}
                  classNamePrefix="react-select"
                  isDisabled={!departmentId}
                  styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">File đính kèm (tùy chọn):</label>
                {currentFile && (
                  <div className="text-sm text-gray-600 mb-2">
                    File hiện tại: {currentFile.includes('originalName') ?
                      JSON.parse(currentFile).originalName : 'File đính kèm'}
                  </div>
                )}
                <label
                  htmlFor="edit-task-file-upload"
                  className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
                >
                  Chọn file mới
                </label>
                <input
                  id="edit-task-file-upload"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {fileName && <div className="text-xs text-green-600 mt-1">Đã chọn: {fileName}</div>}
              </div>
            </div>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal; 