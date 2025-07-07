const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString('vi-VN');
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Ngày không hợp lệ";
  }
};

export default formatDate;