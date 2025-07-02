# API Specification

**Base URL**: `http://localhost:3056/api`

## 1. Authentication

### 1.1. Login

- **Endpoint**: `POST /auth/login`
- **Description**: Authenticates a user and returns access and refresh tokens.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "votu2003",
    "password": "NgocTu3105"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "_id": "684fc4a0f60417dff0797c0f",
        "username": "votu2003",
        "role": "admin",
        "department": "Phòng Hành chính"
      },
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
  ```

### 1.2. Logout

- **Endpoint**: `POST /auth/logout`
- **Description**: Logs out the user by invalidating the session.
- **Access**: Authenticated
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### 1.3. Refresh Access Token

- **Endpoint**: `POST /auth/refresh-token`
- **Description**: Issues a new access token using a valid refresh token.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "refreshToken": "..."
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "..."
    }
  }
  ```

---

## 2. Users

All user routes require authentication.

### 2.1. Get Current User Profile

- **Endpoint**: `GET /users/me`
- **Description**: Retrieves the profile of the currently authenticated user.
- **Access**: Authenticated
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "User profile fetched successfully",
    "data": {
      "_id": "685bb8a2fa01931b45c14205",
      "username": "manager1",
      "email": "manager1@example.com",
      "fullName": "Manager One"
      // ... other user fields
    }
  }
  ```

### 2.2. Create New User

- **Endpoint**: `POST /users/create`
- **Description**: Creates a new user.
- **Access**: `admin`, `manager`
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "username": "user3",
    "password": "user123",
    "fullName": "User One",
    "email": "user4@example.com",
    "role": "user",
    "position": "Quản lý",
    "phoneNumber": "01234567789",
    "department": "IT",
    "gender": "Nam",
    "directSupervisor": "685bb8a2fa01931b45c14205"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "User created successfully",
    "data": {
      // user object
    }
  }
  ```

### 2.3. Get All Users

- **Endpoint**: `GET /users/all`
- **Description**: Retrieves a list of all users. Can be filtered by query parameters.
- **Access**: Authenticated
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Query Parameters**:
  - `page`: number
  - `limit`: number
  - `department`: string
  - `role`: string
  - `search`: string (searches `fullName` and `email`)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Users fetched successfully",
    "data": {
      "docs": [
        // array of user objects
      ],
      "totalDocs": 15,
      "limit": 10,
      "page": 1,
      "totalPages": 2
    }
  }
  ```

### 2.4. Get Subordinates

- **Endpoint**: `GET /users/subordinates`
- **Description**: Retrieves a list of users who are direct subordinates of the current user (manager).
- **Access**: `manager`
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Subordinates fetched successfully",
    "data": [
      // array of user objects
    ]
  }
  ```

### 2.5. Update User

- **Endpoint**: `PUT /users/:id`
- **Description**: Updates a user's information.
- **Access**: `admin`, `manager`, or the user themselves.
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "fullName": "User One Updated",
    "email": "new.email@example.com"
    // other fields to update
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "User updated successfully",
    "data": {
      // updated user object
    }
  }
  ```

### 2.6. Delete User

- **Endpoint**: `DELETE /users/:id`
- **Description**: Deletes a user.
- **Access**: `admin`, `manager`
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```

---

## 3. Indicators

All indicator routes require `admin` or `manager` role.

### 3.1. Create Indicator

- **Endpoint**: `POST /indicators`
- **Description**: Creates a new performance indicator.
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "code": "CT001",
    "name": "Chỉ tiêu 1"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Indicator created successfully",
    "data": {
      // indicator object
    }
  }
  ```

### 3.2. Get All Indicators

- **Endpoint**: `GET /indicators`
- **Description**: Retrieves a list of all indicators with their task completion status.
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Query Parameters**:
  - `page`: number
  - `limit`: number
  - `search`: string (searches `name` and `code`)
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Lấy danh sách chỉ tiêu thành công",
    "data": {
      "docs": [
        {
          "_id": "...",
          "code": "CT001",
          "name": "Chỉ tiêu 1",
          "status": {
            "completed": 2,
            "total": 5,
            "percentage": 40,
            "overallStatus": "in_progress"
          }
        }
      ],
      "totalDocs": 1,
      "limit": 10,
      "page": 1,
      "totalPages": 1
    }
  }
  ```
- **`overallStatus` values**:
  - `no_tasks`: No tasks associated with the indicator.
  - `not_started`: Tasks exist, but none are completed.
  - `in_progress`: At least one task is completed.
  - `completed`: All tasks are completed.

### 3.3. Update Indicator

- **Endpoint**: `PUT /indicators/:id`
- **Description**: Updates an indicator's information.
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "name": "Chỉ tiêu 1 đã cập nhật"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Indicator updated successfully",
    "data": {
      // updated indicator object
    }
  }
  ```

### 3.4. Delete Indicator

- **Endpoint**: `DELETE /indicators/:id`
- **Description**: Deletes an indicator.
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Indicator deleted successfully"
  }
  ```

### 3.5. Get Tasks by Indicator

- **Endpoint**: `GET /indicators/:id/tasks`
- **Description**: Retrieves all tasks associated with a specific indicator.
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Tasks for indicator fetched successfully",
    "data": {
      "docs": [
        // array of task objects
      ]
      // pagination fields
    }
  }
  ```

---

## 4. Tasks

All task routes require authentication.

### 4.1. Create Task

- **Endpoint**: `POST /tasks`
- **Description**: Creates a new task or subtask.
- **Access**: `admin`, `manager`
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Request Body (for a main task)**:
  ```json
  {
    "code": "TASK001",
    "title": "Nhiệm vụ 1",
    "endDate": "2024-12-31",
    "indicatorId": "685ce6d4fdb9856adb3ddbf8",
    "notes": "Ghi chú nhiệm vụ",
    "assignerId": "684fc4a0f60417dff0797c0f",
    "managerIds": ["684fc4a0f60417dff0797c0f", "685bb8a2fa01931b45c14205"]
  }
  ```
- **Request Body (for a subtask)**:
  ```json
  {
    "code": "STASK003",
    "title": "Nhiệm vụ con 1",
    "endDate": "2024-12-31",
    "indicatorId": "685ce6d4fdb9856adb3ddbf8",
    "notes": "Ghi chú nhiệm vụ con",
    "parentTaskId": "685ce96d88a44cf6856337f3",
    "assigneeId": "685ce673fdb9856adb3ddbed",
    "assignerId": "685bb8a2fa01931b45c14205"
  }
  ```
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "data": {
      // task object
    }
  }
  ```

### 4.2. Update Task

- **Endpoint**: `PUT /tasks/:id`
- **Description**: Updates a task's information or status.
- **Access**: `admin`, `manager` (with `canManageTask` permission)
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "title": "Updated task title",
    "status": "approved"
    // other fields to update
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Task updated successfully",
    "data": {
      // updated task object
    }
  }
  ```

### 4.3. Delete Task

- **Endpoint**: `DELETE /tasks/:id`
- **Description**: Deletes a task.
- **Access**: `admin`, `manager` (with `canManageTask` permission)
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Task deleted successfully"
  }
  ```

### 4.4. Get Task Details

- **Endpoint**: `GET /tasks/:id`
- **Description**: Retrieves the details of a single task.
- **Access**: Authenticated
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Task detail fetched successfully",
    "data": {
      // task object with populated fields
    }
  }
  ```

### 4.5. Get Subtasks

- **Endpoint**: `GET /tasks/:id/subtasks`
- **Description**: Retrieves all subtasks for a given parent task.
- **Access**: Authenticated
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Subtasks fetched successfully",
    "data": {
      "docs": [
        // array of subtask objects
      ]
      // pagination fields
    }
  }
  ```

### 4.6. Submit Task for Review

- **Endpoint**: `PATCH /tasks/:id/submit`
- **Description**: Allows an assignee to submit a completed task.
- **Access**: Authenticated (assignee of the task)
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "submitNote": "Tôi đã hoàn thành nhiệm vụ",
    "submitLink": "https://example.com/submission"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Task submitted successfully",
    "data": {
      // updated task object with 'submitted' status
    }
  }
  ```

### 4.7. Get Pending Tasks (for an assigner)

- **Endpoint**: `GET /tasks/pending/:assignerId`
- **Description**: Retrieves tasks that are pending review by a specific assigner.
- **Access**: Authenticated
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Pending tasks fetched successfully",
    "data": {
      "docs": [
        // array of task objects with status 'submitted'
      ]
      // pagination fields
    }
  }
  ```

### 4.8. Get Incomplete Tasks (for a user)

- **Endpoint**: `GET /tasks/incomplete/:userId`
- **Description**: Retrieves all tasks assigned to a user that are not yet completed.
- **Access**: Authenticated
- **Headers**:
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Incomplete tasks fetched successfully",
    "data": [
      // array of task objects
    ]
  }
  ```
