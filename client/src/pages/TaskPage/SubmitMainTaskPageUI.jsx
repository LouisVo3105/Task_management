import React from "react";
import { Button, Input, Typography } from "@material-tailwind/react";

export default function SubmitMainTaskPageUI({
  submitNote,
  setSubmitNote,
  submitLink,
  setSubmitLink,
  loading,
  error,
  task,
  taskLoading,
  handleSubmit,
  navigate,
}) {
  if (taskLoading) {
    return <div className="max-w-md mx-auto p-6 text-center">Đang tải thông tin nhiệm vụ...</div>;
  }
  if (!task) {
    return <div className="max-w-md mx-auto p-6 text-center text-red-500">Không tìm thấy nhiệm vụ.</div>;
  }
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Nộp nhiệm vụ chính</h1>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">Thông tin nhiệm vụ</h2>
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">Tiêu đề:</span> {task.title}</div>
          <div><span className="font-medium">Nội dung:</span> {task.content}</div>
          <div><span className="font-medium">Ngày hết hạn:</span> {task.endDate ? new Date(task.endDate).toLocaleDateString() : 'Chưa có'}</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="mb-4">
          <Input
            label="Link nộp bài"
            value={submitLink}
            onChange={e => setSubmitLink(e.target.value)}
            className="mb-2"
            required
          />
          <Input
            label="Ghi chú nộp bài"
            value={submitNote}
            onChange={e => setSubmitNote(e.target.value)}
            required
          />
        </div>
        {error && <Typography color="red" className="mb-2">{error}</Typography>}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={() => navigate(-1)} disabled={loading}>Hủy</Button>
          <Button className="bg-teal-600 text-white" type="submit" disabled={loading}>
            {loading ? 'Đang nộp...' : 'Xác nhận nộp'}
          </Button>
        </div>
      </form>
    </div>
  );
} 