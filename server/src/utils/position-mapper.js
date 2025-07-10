/**
 * Utility function để mapping position từ input thành position chuẩn
 * @param {string} inputPosition - Position được nhập từ user
 * @returns {string} - Position chuẩn
 */
function mapPosition(inputPosition) {
  if (!inputPosition) return null;
  
  // Chuẩn hóa input: lowercase và trim
  const normalizedInput = inputPosition.toLowerCase().trim();
  
  // Mapping rules
  const positionMapping = {
    // Giam doc
    'giám đốc': 'Giam doc',
    'giam doc': 'Giam doc',
    'giám đốc công ty': 'Giam doc',
    'giam doc cong ty': 'Giam doc',
    'director': 'Giam doc',
    'gd': 'Giam doc',
    
    // Pho Giam doc
    'phó giám đốc': 'Pho Giam doc',
    'pho giam doc': 'Pho Giam doc',
    'phó giám đốc công ty': 'Pho Giam doc',
    'pho giam doc cong ty': 'Pho Giam doc',
    'deputy director': 'Pho Giam doc',
    'phó gđ': 'Pho Giam doc',
    'pho gd': 'Pho Giam doc',
    
    // Truong phong
    'trưởng phòng': 'Truong phong',
    'truong phong': 'Truong phong',
    'trưởng phòng ban': 'Truong phong',
    'truong phong ban': 'Truong phong',
    'manager': 'Truong phong',
    'head of department': 'Truong phong',
    'tp': 'Truong phong',
    
    // Nhan vien
    'nhân viên': 'Nhan vien',
    'nhan vien': 'Nhan vien',
    'nhân viên văn phòng': 'Nhan vien',
    'nhan vien van phong': 'Nhan vien',
    'employee': 'Nhan vien',
    'staff': 'Nhan vien',
    'nv': 'Nhan vien'
  };
  
  // Tìm mapping
  const mappedPosition = positionMapping[normalizedInput];
  
  if (mappedPosition) {
    return mappedPosition;
  }
  
  // Nếu không tìm thấy mapping, thử tìm partial match
  for (const [key, value] of Object.entries(positionMapping)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      return value;
    }
  }
  
  // Nếu vẫn không tìm thấy, trả về input gốc (sẽ được validate bởi model)
  return inputPosition;
}

/**
 * Lấy danh sách tất cả position chuẩn
 * @returns {string[]} - Danh sách position chuẩn
 */
function getStandardPositions() {
  return ['Giam doc', 'Pho Giam doc', 'Truong phong', 'Nhan vien'];
}

/**
 * Lấy danh sách các từ khóa mapping cho mỗi position
 * @returns {Object} - Object chứa mapping keywords
 */
function getPositionKeywords() {
  return {
    'Giam doc': ['giám đốc', 'giam doc', 'director', 'gd'],
    'Pho Giam doc': ['phó giám đốc', 'pho giam doc', 'deputy director', 'pho gd'],
    'Truong phong': ['trưởng phòng', 'truong phong', 'manager', 'tp'],
    'Nhan vien': ['nhân viên', 'nhan vien', 'employee', 'staff', 'nv']
  };
}

module.exports = {
  mapPosition,
  getStandardPositions,
  getPositionKeywords
}; 