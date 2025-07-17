import { Button } from "@material-tailwind/react";
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import authFetch from "../utils/authFetch";
import { useAuth } from "../utils/useAuth";

const socket = io("http://localhost:3056", { withCredentials: true });

function buildCommentTree(comments) {
  const map = {};
  const roots = [];
  comments.forEach(c => { map[c._id] = { ...c, children: [] }; });
  comments.forEach(c => {
    if (c.parentId) {
      if (map[c.parentId]) map[c.parentId].children.push(map[c._id]);
    } else {
      roots.push(map[c._id]);
    }
  });
  return roots;
}

const IndicatorComments = ({ indicatorId }) => {
  const { accessToken, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [parentId, setParentId] = useState(null);
  const inputRef = useRef();

  // Kết nối socket và join room
  useEffect(() => {
    if (!indicatorId) return;
    socket.emit("joinIndicator", indicatorId);
    return () => { socket.emit("leaveIndicator", indicatorId); };
  }, [indicatorId]);

  // Lấy danh sách comment ban đầu
  useEffect(() => {
    if (!indicatorId) return;
    authFetch(`http://localhost:3056/api/comments/indicator/${indicatorId}`)
      .then(res => res.json())
      .then(data => setComments(data.data || []));
  }, [indicatorId, accessToken]);

  // Lắng nghe comment mới
  useEffect(() => {
    const handler = (comment) => {
      if (comment.indicatorId === indicatorId) {
        setComments(prev => [...prev, comment]);
      }
    };
    socket.on("newComment", handler);
    return () => { socket.off("newComment", handler); };
  }, [indicatorId]);

  // Gửi comment mới
  const handleSend = async () => {
    if (!content.trim()) return;
    const res = await authFetch("http://localhost:3056/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ indicatorId, parentId, content })
    });
    const data = await res.json();
    if (data.success && data.data) {
      // KHÔNG setComments ở đây nữa!
      socket.emit("newComment", { indicatorId, comment: data.data });
      setContent("");
      setParentId(null);
      inputRef.current?.focus();
    }
  };

  // Xóa comment
  const handleDelete = async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    const res = await authFetch(`http://localhost:3056/api/comments/${commentId}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (data.success) {
      setComments(prev => prev.filter(c => c._id !== commentId));
    } else {
      alert(data.message || "Xóa bình luận thất bại");
    }
  };

  // Kiểm tra quyền xóa comment
  const canDelete = (c) => {
    if (!user) return false;
    if (user._id === c.authorId?._id || user._id === c.author?._id) return true; // là chủ comment
    if (user.role === 'admin') return true;
    if (user.position === 'Giam doc') return true;
    if (user.position === 'Pho Giam doc') {
      // Không được xóa comment của Giam doc
      if (c.authorId?.position === 'Giam doc' || c.author?.position === 'Giam doc') return false;
      return true;
    }
    return false;
  };

  // Hiển thị comment dạng cây
  const renderComments = (nodes, level = 0) => (
    <ul className={level === 0 ? "space-y-2" : "ml-6 border-l-2 border-teal-200 pl-4 space-y-1"}>
      {nodes.map(c => (
        <li key={c._id} className="">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">{c.authorId?.fullName || c.author?.fullName || c.authorName || "Ẩn danh"}</span>
            <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
          </div>
          <div className="mb-1 text-gray-700">{c.content}</div>
          <div className="flex gap-2 mb-1">
            <button className="text-xs text-teal-600 hover:underline" onClick={() => { setParentId(c._id); inputRef.current?.focus(); }}>Trả lời</button>
            {canDelete(c) && (
              <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(c._id)}>Xóa</button>
            )}
          </div>
          {c.children && c.children.length > 0 && renderComments(c.children, level + 1)}
        </li>
      ))}
    </ul>
  );

  const tree = buildCommentTree(comments);

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mt-8 w-full">
      <h2 className="text-lg font-semibold mb-4">Bình luận chỉ tiêu</h2>
      <div className="mb-4 max-h-64 overflow-y-auto">
        {tree.length > 0 ? renderComments(tree) : <div className="text-gray-400">Chưa có bình luận nào</div>}
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
          rows={2}
          placeholder={parentId ? "Trả lời bình luận..." : "Viết bình luận..."}
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <Button className="bg-teal-600 text-white h-10" onClick={handleSend} disabled={!content.trim()}>Gửi</Button>
      </div>
      {parentId && (
        <div className="text-xs text-gray-500 mt-1">Đang trả lời bình luận <button className="ml-2 text-teal-600 underline" onClick={() => setParentId(null)}>Hủy</button></div>
      )}
    </div>
  );
};

export default IndicatorComments; 