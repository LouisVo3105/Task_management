# API Duyệt Báo Cáo - Hướng Dẫn Sử Dụng

## Tổng Quan

Hệ thống đã được bổ sung tính năng duyệt báo cáo với nhận xét. Thay vì sử dụng API `updateTask` để chuyển trạng thái, giờ đây có 2 API riêng biệt cho việc chấp thuận và từ chối.

## Các API Mới

### 1. Chấp Thuận Báo Cáo

**Endpoint:** `PATCH /api/tasks/:id/approve`
**Endpoint SubTask:** `PATCH /api/tasks/:taskId/subtasks/:subTaskId/approve`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**

```json
{
  "comment": "Nhận xét của người duyệt (bắt buộc)"
}
```

**Response thành công:**

```json
{
  "success": true,
  "message": "Chấp thuận nhiệm vụ thành công",
  "data": {
    "task": {
      /* thông tin task */
    },
    "approvalHistory": {
      "action": "approve",
      "comment": "Nhận xét của người duyệt",
      "reviewer": "user_id",
      "reviewedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. Từ Chối Báo Cáo

**Endpoint:** `PATCH /api/tasks/:id/reject`
**Endpoint SubTask:** `PATCH /api/tasks/:taskId/subtasks/:subTaskId/reject`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**

```json
{
  "comment": "Lý do từ chối (bắt buộc)"
}
```

**Response thành công:**

```json
{
  "success": true,
  "message": "Từ chối nhiệm vụ thành công",
  "data": {
    "task": {
      /* thông tin task */
    },
    "approvalHistory": {
      "action": "reject",
      "comment": "Lý do từ chối",
      "reviewer": "user_id",
      "reviewedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 3. Lấy Lịch Sử Duyệt

**Endpoint:** `GET /api/tasks/:id/approval-history`
**Endpoint SubTask:** `GET /api/tasks/:taskId/subtasks/:subTaskId/approval-history`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Lấy lịch sử duyệt nhiệm vụ thành công",
  "data": [
    {
      "_id": "history_id",
      "action": "approve",
      "comment": "Nhận xét",
      "reviewer": {
        "_id": "user_id",
        "fullName": "Tên người duyệt"
      },
      "reviewedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Quyền Truy Cập

- **Admin, Director, Manager:** Có thể duyệt tất cả nhiệm vụ
- **Leader:** Chỉ có thể duyệt nhiệm vụ mà mình là leader
- **User thường:** Không có quyền duyệt

## Quy Tắc Hoạt Động

### Khi Chấp Thuận:

- Trạng thái task/subtask chuyển thành `approved`
- Nhận xét được lưu vào lịch sử duyệt
- Chỉ có thể chấp thuận task có trạng thái `submitted`

### Khi Từ Chối:

- Trạng thái task/subtask chuyển về `pending`
- Lý do từ chối được lưu vào lịch sử duyệt
- User có thể nộp lại báo cáo
- Chỉ có thể từ chối task có trạng thái `submitted`

## Validation

- **Comment bắt buộc:** Không được để trống
- **Trạng thái:** Chỉ duyệt được task có trạng thái `submitted`
- **Quyền:** Kiểm tra role và quyền sở hữu task

## Lịch Sử Duyệt

Mỗi lần duyệt sẽ tạo một bản ghi trong `approvalHistory` với thông tin:

- `action`: "approve" hoặc "reject"
- `comment`: Nhận xét/lý do
- `reviewer`: ID người duyệt
- `reviewedAt`: Thời gian duyệt

## Cập Nhật API Hiện Tại

API `getTaskDetail` đã được cập nhật để bao gồm thông tin lịch sử duyệt trong response.

## Test

Sử dụng file `test_approval_apis.http` để test các API mới với Postman.

## Lưu Ý

- Khi từ chối, task sẽ chuyển về trạng thái `pending` để có thể nộp lại
- Lịch sử duyệt được lưu vĩnh viễn và không thể xóa
- Mỗi task có thể có nhiều lần duyệt (approve/reject) trong lịch sử
