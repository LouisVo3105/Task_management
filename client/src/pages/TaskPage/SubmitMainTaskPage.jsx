import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Input, Typography } from "@material-tailwind/react";

const SubmitMainTaskPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [submitNote, setSubmitNote] = useState("");
  const [submitLink, setSubmitLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:3056/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status: 'submitted', submitNote, submitLink }),
      });
      if (!res.ok) throw new Error('Nộp nhiệm vụ thất bại');
      navigate('/tasks');
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Nộp nhiệm vụ chính</h1>
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
};

export default SubmitMainTaskPage; 