// Chuyển đổi tên chức vụ chuẩn hóa sang tên có dấu tiếng Việt
const positionLabelMap = {
  "Giam doc": "Giám đốc",
  "Pho Giam doc": "Phó Giám đốc",
  "Truong phong": "Trưởng phòng",
  "Chuyen vien": "Chuyên viên",
  "Nhan vien": "Nhân viên"
};

export function mapPositionLabel(position) {
  return positionLabelMap[position] || position;
} 