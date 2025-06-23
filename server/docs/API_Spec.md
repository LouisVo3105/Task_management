# API Specification

## Ghi chú Đánh giá

- **Xác thực không nhất quán**: Dự án sử dụng cả `express-validator` (trong `task.route.js`, `indicator.route.js`) và middleware tùy chỉnh (trong `user.route.js`). Nên thống nhất sử dụng một phương thức xác thực duy nhất.
- **Tuyến đường phê duyệt bị trùng lặp**: `POST /api/tasks/:taskId/review` và `POST /api/tasks/:taskId/subtasks/:subTaskId/review` cùng trỏ đến `TaskController.reviewTask`. Điều này có thể dẫn đến logic phức tạp trong controller. Nên xem xét tách thành các hàm riêng biệt.
- **Thiếu API lấy danh sách công việc**: Không có API để lấy danh sách tất cả các công việc.
- **Logic nghiệp vụ trong Controller**: Logic nghiệp vụ có vẻ được đặt trực tiếp trong các controller thay vì tách ra một lớp `Service`. Điều này làm giảm khả năng tái sử dụng và gây khó khăn cho việc viết unit test.
- **Xử lý kết nối Database**: Cần có cơ chế xử lý khi mất kết nối tới cơ sở dữ liệu trong quá trình ứng dụng đang chạy.

---

## 1. Auth API

| Method | Endpoint            | Input (Body/Query)                 | Output (Success) | Error/Note             | Access |
| ------ | ------------------- | ---------------------------------- | ---------------- | ---------------------- | ------ |
| POST   | /auth/login         | `{ username, password }`           | Token, user info | 401: Sai thông tin     | Public |
| POST   | /auth/logout        | Header: Authorization Bearer token | `{ success }`    | 401: Không token       | Auth   |
| POST   | /auth/refresh-token | `{ refreshToken }`                 | New access token | 401: Token lỗi/hết hạn | Public |

### Chi tiết các endpoint

#### 1.1. Đăng nhập

- **Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

- **Response Body:**

```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "user": {
      "id": "ObjectId",
      "fullName": "string",
      "role": "admin|manager|user",
      "position": "string",
      "department": "string"
    }
  }
}
```

#### 1.2. Làm mới token

- **Request Body:**

```json
{
  "refreshToken": "string"
}
```

- **Response Body:**

```json
{
  "success": true,
  "data": {
    "accessToken": "string"
  }
}
```

---

## 2. User API

| Method | Endpoint            | Input (Body/Query)        | Output (Success) | Error/Note                           | Access                    |
| ------ | ------------------- | ------------------------- | ---------------- | ------------------------------------ | ------------------------- |
| POST   | /users/             | Thông tin user, password  | User info        | 403: Không đủ quyền                  | Admin/Manager             |
| GET    | /users/me           | -                         | User info        | 404: Không tìm thấy                  | Auth                      |
| GET    | /users/             | `?department,role,search` | List users       | 403: Manager chỉ xem phòng mình      | Auth                      |
| GET    | /users/subordinates | -                         | List users       | -                                    | Auth                      |
| PUT    | /users/:id          | Thông tin update          | User info        | 403/404: Không đủ quyền              | Admin/Manager/User (self) |
| DELETE | /users/:id          | -                         | User info        | 403: Chỉ admin, không xóa chính mình | Admin                     |

### Chi tiết các endpoint

#### 2.1. Tạo user mới

- **Request Body:**

```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "fullName": "string",
  "gender": "Nam|Nữ|Khác",
  "position": "string",
  "phoneNumber": "string",
  "department": "string",
  "role": "admin|manager|user",
  "directSupervisor": "ObjectId (bắt buộc nếu role là user)"
}
```

- **Response Body:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "username": "string",
    "email": "string",
    "fullName": "string",
    "gender": "string",
    "position": "string",
    "phoneNumber": "string",
    "department": "string",
    "role": "string",
    "directSupervisor": "ObjectId",
    "isActive": true,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

- **Giải thích các trường:**
  - `role`: Quyền của user (`admin`, `manager`, `user`)
  - `directSupervisor`: ID của người quản lý trực tiếp (bắt buộc nếu là user thường)

#### 2.2. Cập nhật user

- **Request Body:**
  - Các trường giống tạo user, trừ `username` không được cập nhật.

#### 2.3. Lấy thông tin user hiện tại

- **Response Body:**
  - Như response của tạo user, có thêm trường `directSupervisor` dạng object nếu populate.

#### 2.4. Lấy danh sách user

- **Query:**
  - `department`, `role`, `search` (lọc theo phòng ban, vai trò, tìm kiếm tên/email)
- **Response Body:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "username": "string",
      "email": "string",
      "fullName": "string",
      "gender": "string",
      "position": "string",
      "phoneNumber": "string",
      "department": "string",
      "role": "string",
      "directSupervisor": {
        "_id": "ObjectId",
        "fullName": "string",
        "position": "string"
      },
      "isActive": true
    }
  ]
}
```

---

## 3. Task API

| Method | Endpoint                                  | Input (Body/Query)                                          | Output (Success) | Error/Note               | Access                  |
| ------ | ----------------------------------------- | ----------------------------------------------------------- | ---------------- | ------------------------ | ----------------------- |
| POST   | /tasks/                                   | Thông tin task, indicatorId, subTasks                       | Task info        | 403: Không đủ quyền      | Admin/Manager           |
| PUT    | /tasks/:taskId                            | Thông tin update                                            | Task info        | 403/404: Không đủ quyền  | Assigner/Admin          |
| DELETE | /tasks/:taskId                            | -                                                           | Success          | 403/404: Không đủ quyền  | Assigner/Admin          |
| PATCH  | /tasks/:taskId/submit                     | `{ report }`                                                | Task info        | 403: Không phải assignee | Assignee                |
| PATCH  | /tasks/:taskId/subtasks/:subTaskId/submit | `{ report }`                                                | SubTask info     | 403: Không phải assignee | Assignee                |
| PATCH  | /tasks/:taskId/review                     | `{ approved, feedback }`                                    | Task info        | 403: Không phải assigner | Assigner/Admin          |
| PATCH  | /tasks/:taskId/subtasks/:subTaskId/review | `{ approved, feedback }`                                    | SubTask info     | 403: Không phải assigner | Assigner/Admin          |
| GET    | /tasks/                                   | `?page,limit,status,assigneeId,indicatorId,priority,search` | List tasks       | -                        | Auth                    |
| GET    | /tasks/:id                                | -                                                           | Task detail      | 404: Không tìm thấy      | Auth                    |
| POST   | /tasks/:taskId/subtasks                   | Thông tin subtask                                           | SubTask info     | 403: Không đủ quyền      | Assigner/Admin          |
| PUT    | /tasks/:taskId/subtasks/:subTaskId        | Thông tin update                                            | SubTask info     | 403: Không đủ quyền      | Assignee/Assigner/Admin |
| DELETE | /tasks/:taskId/subtasks/:subTaskId        | -                                                           | Success          | 403: Không đủ quyền      | Assigner/Admin          |

### Chi tiết các endpoint

#### 3.1. Tạo task mới

- **Request Body:**

```json
{
  "title": "string",
  "description": "string",
  "indicator": "ObjectId",
  "assigner": "ObjectId",
  "assignee": "ObjectId",
  "startDate": "date",
  "endDate": "date",
  "priority": "low|medium|high",
  "notes": "string",
  "subTasks": [
    {
      "title": "string",
      "description": "string",
      "assignee": "ObjectId",
      "startDate": "date",
      "endDate": "date"
    }
  ]
}
```

- **Response Body:**

```json
{
  "success": true,
  "message": "Nhiệm vụ đã được tạo",
  "data": {
    "title": "string",
    "description": "string",
    "indicator": "ObjectId",
    "assigner": "ObjectId",
    "assignee": "ObjectId",
    "startDate": "date",
    "endDate": "date",
    "progress": 0,
    "report": "string",
    "feedback": "string",
    "notes": "string",
    "status": "pending|in_progress|submitted|approved|rejected",
    "priority": "low|medium|high",
    "subTasks": [
      {
        "title": "string",
        "description": "string",
        "assignee": "ObjectId",
        "startDate": "date",
        "endDate": "date",
        "progress": 0,
        "report": "string",
        "feedback": "string",
        "status": "pending|in_progress|submitted|approved|rejected"
      }
    ],
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

- **Giải thích các trường:**
  - `indicator`: ID chỉ tiêu liên quan
  - `assigner`: Người giao việc
  - `assignee`: Người nhận việc
  - `subTasks`: Danh sách công việc con

#### 3.2. Thêm/Cập nhật subtask

- **Request Body:**

```json
{
  "title": "string",
  "description": "string",
  "assignee": "ObjectId",
  "startDate": "date",
  "endDate": "date"
}
```

#### 3.3. Nộp task/chấm điểm/review

- **Nộp:**

```json
{ "report": "string" }
```

- **Review:**

```json
{ "approved": true, "feedback": "string" }
```

---

## 4. Indicator API

| Method | Endpoint        | Input (Body/Query)                              | Output (Success) | Error/Note          | Access |
| ------ | --------------- | ----------------------------------------------- | ---------------- | ------------------- | ------ |
| POST   | /indicators/    | code, name, category, unit, department, ...     | Indicator info   | 403: Chỉ admin      | Admin  |
| PUT    | /indicators/:id | Thông tin update                                | Indicator info   | 403: Chỉ admin      | Admin  |
| DELETE | /indicators/:id | -                                               | Indicator info   | 403: Chỉ admin      | Admin  |
| GET    | /indicators/    | `?page,limit,category,department,status,search` | List indicators  | -                   | Auth   |
| GET    | /indicators/all | `?page,limit,category,department,search`        | List indicators  | -                   | Auth   |
| GET    | /indicators/:id | -                                               | Indicator detail | 404: Không tìm thấy | Auth   |

### Chi tiết các endpoint

#### 4.1. Tạo chỉ tiêu

- **Request Body:**

```json
{
  "code": "string",
  "name": "string",
  "description": "string",
  "category": "KHCN|ĐMST|CĐS",
  "unit": "string",
  "department": "string",
  "notes": "string"
}
```

- **Response Body:**

```json
{
  "success": true,
  "message": "Chỉ tiêu đã được tạo thành công",
  "data": {
    "code": "string",
    "name": "string",
    "description": "string",
    "category": "KHCN|ĐMST|CĐS",
    "unit": "string",
    "department": "string",
    "notes": "string",
    "status": "active|completed|archived",
    "createdBy": "ObjectId",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

- **Giải thích các trường:**
  - `category`: Danh mục chỉ tiêu (`KHCN`, `ĐMST`, `CĐS`)
  - `status`: Trạng thái chỉ tiêu

---

**Lưu ý:**

- Các endpoint (trừ login, refresh-token) đều yêu cầu header Authorization: Bearer <token>.
- Các lỗi trả về dạng `{ success: false, message, error? }`.
- Các trường input/output chi tiết có thể xem thêm ở phần model hoặc liên hệ backend để biết thêm chi tiết.
