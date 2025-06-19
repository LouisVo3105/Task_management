# Task Management API Documentation

## Base URL

```
http://localhost:3056/api
```

## Authentication

Most endpoints require authentication using a Bearer token. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## User Management

### Login

Authenticate a user and get an access token.

**Endpoint:** `POST /users/login`

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "token": "string",
  "userId": "string",
  "role": "string",
  "position": "string"
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid credentials

### Create User

Create a new user account. Requires authentication.

**Endpoint:** `POST /users/create`

**Request Body:**

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
  "directSupervisor": "string (ObjectId)"
}
```

**Response:**

```json
{
  "message": "User created successfully",
  "userId": "string"
}
```

**Permissions:**

- Admin: Can create any user
- User: Can only create users under their direct supervision

**Error Responses:**

- `400 Bad Request`: Username already exists
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Creator not found

### Get User Profile

Get current user's profile information.

**Endpoint:** `GET /users/profile`

**Response:**

```json
{
  "fullName": "string",
  "email": "string",
  "gender": "string",
  "position": "string",
  "phoneNumber": "string",
  "department": "string",
  "role": "string"
}
```

**Error Responses:**

- `404 Not Found`: User not found

### Get All Users

Retrieve a list of users based on user role and permissions.

**Endpoint:** `GET /users/list`

**Response:**

```json
[
  {
    "_id": "string",
    "fullName": "string",
    "email": "string",
    "gender": "string",
    "position": "string",
    "phoneNumber": "string",
    "department": "string",
    "role": "string",
    "directSupervisor": {
      "_id": "string",
      "fullName": "string",
      "position": "string"
    },
    "createdAt": "string",
    "updatedAt": "string",
    "status": "boolean"
  }
]
```

**Permissions:**

- Admin: Can see all users
- User: Can only see themselves and direct subordinates

**Error Responses:**

- `403 Forbidden`: Invalid role

### Update User

Update an existing user's information.

**Endpoint:** `PUT /users/update/:id`

**URL Parameters:**

- `id`: User ID

**Request Body:**

```json
{
  "fullName": "string",
  "role": "admin|user",
  "position": "string",
  "directSupervisor": "string (ObjectId)",
  "status": "boolean"
}
```

**Response:**

```json
{
  "_id": "string",
  "fullName": "string",
  "email": "string",
  "gender": "string",
  "position": "string",
  "phoneNumber": "string",
  "department": "string",
  "role": "string",
  "directSupervisor": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "status": "boolean"
}
```

**Permissions:**

- Admin: Can update any user
- User: Can only update subordinates or self

**Error Responses:**

- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found

### Delete User

Delete a user account.

**Endpoint:** `DELETE /users/delete/:id`

**URL Parameters:**

- `id`: User ID

**Response:**

```json
{
  "message": "User deleted successfully"
}
```

**Permissions:**

- Admin: Can delete any user
- User: Can only delete subordinates

**Error Responses:**

- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found

### Get Subordinates

Get list of subordinates for current user.

**Endpoint:** `GET /users/subordinates`

**Response:**

```json
[
  {
    "_id": "string",
    "fullName": "string",
    "role": "string",
    "position": "string"
  }
]
```

**Permissions:**

- Admin: Can see all users
- User: Can only see direct subordinates

**Error Responses:**

- `404 Not Found`: User not found

## Task Management

### Create Task

Create a new task.

**Endpoint:** `POST /tasks/create`

**Request Body:**

```json
{
  "title": "string",
  "description": "string",
  "objective": "string",
  "assignedUnit": "string",
  "startDate": "string (ISO date)",
  "endDate": "string (ISO date)",
  "quantitativeTarget": "number",
  "priority": "low|medium|high",
  "field": "string",
  "assignedTo": ["string (ObjectId)"],
  "parentTask": "string (ObjectId)",
  "guideline": "string (base64)"
}
```

**Response:**

```json
{
  "message": "Task created successfully",
  "taskId": "string"
}
```

**Permissions:**

- Admin: Can assign to any user
- User: Can only assign to direct subordinates

**Error Responses:**

- `403 Forbidden`: Can only assign to direct subordinates
- `404 Not Found`: Creator not found

### Get Task List

Retrieve a list of tasks based on user role and permissions.

**Endpoint:** `GET /tasks/list`

**Response:**

```json
[
  {
    "_id": "string",
    "title": "string",
    "description": "string",
    "objective": "string",
    "assignedUnit": "string",
    "startDate": "string",
    "endDate": "string",
    "quantitativeTarget": "number",
    "progress": "number",
    "actualResult": "string",
    "status": "pending|in_progress|submitted|approved|rejected",
    "priority": "low|medium|high",
    "field": "string",
    "assignedBy": {
      "_id": "string",
      "fullName": "string",
      "role": "string"
    },
    "assignedTo": [
      {
        "_id": "string",
        "fullName": "string",
        "role": "string"
      }
    ],
    "parentTask": "string",
    "isParent": "boolean",
    "guideline": "string",
    "report": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

**Permissions:**

- Admin: Can see all tasks
- User: Can only see tasks assigned by or to them

### Get Task Detail

Get detailed information about a specific task.

**Endpoint:** `GET /tasks/:id`

**URL Parameters:**

- `id`: Task ID

**Response:**

```json
{
  "_id": "string",
  "title": "string",
  "description": "string",
  "objective": "string",
  "assignedUnit": "string",
  "startDate": "string",
  "endDate": "string",
  "quantitativeTarget": "number",
  "progress": "number",
  "actualResult": "string",
  "status": "pending|in_progress|submitted|approved|rejected",
  "priority": "low|medium|high",
  "field": "string",
  "assignedBy": {
    "_id": "string",
    "fullName": "string",
    "role": "string"
  },
  "assignedTo": [
    {
      "_id": "string",
      "fullName": "string",
      "role": "string"
    }
  ],
  "parentTask": "string",
  "isParent": "boolean",
  "guideline": "string",
  "report": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Error Responses:**

- `404 Not Found`: Task not found

### Update Task

Update task progress and submit reports.

**Endpoint:** `PUT /tasks/:id`

**URL Parameters:**

- `id`: Task ID

**Request Body:**

```json
{
  "progress": "number (0-100)",
  "actualResult": "string",
  "report": "string (base64)"
}
```

**Response:**

```json
{
  "_id": "string",
  "title": "string",
  "description": "string",
  "objective": "string",
  "assignedUnit": "string",
  "startDate": "string",
  "endDate": "string",
  "quantitativeTarget": "number",
  "progress": "number",
  "actualResult": "string",
  "status": "string",
  "priority": "string",
  "field": "string",
  "assignedBy": "string",
  "assignedTo": ["string"],
  "parentTask": "string",
  "isParent": "boolean",
  "guideline": "string",
  "report": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Permissions:**

- Assigned users can update their tasks
- Admin can update any task

**Error Responses:**

- `403 Forbidden`: Only assigned users or admin can update
- `404 Not Found`: Task not found

### Approve Task

Approve or reject a submitted task.

**Endpoint:** `PUT /tasks/:id/approve`

**URL Parameters:**

- `id`: Task ID

**Request Body:**

```json
{
  "approved": "boolean"
}
```

**Response:**

```json
{
  "message": "Task approved|rejected",
  "taskId": "string"
}
```

**Permissions:**

- Supervisor of assigned user
- Admin

**Error Responses:**

- `400 Bad Request`: Task must be submitted for approval
- `403 Forbidden`: Only supervisor or admin can approve
- `404 Not Found`: Task not found

### Delete Task

Delete a task.

**Endpoint:** `DELETE /tasks/:id`

**URL Parameters:**

- `id`: Task ID

**Response:**

```json
{
  "message": "Task deleted successfully"
}
```

**Permissions:**

- Task creator
- Admin

**Error Responses:**

- `403 Forbidden`: Only creator or admin can delete
- `404 Not Found`: Task not found

## Data Models

### User Model

```json
{
  "username": "string (unique, required)",
  "password": "string (required, hashed)",
  "email": "string (unique, required)",
  "fullName": "string (required)",
  "gender": "Nam|Nữ|Khác (required)",
  "position": "string (required)",
  "phoneNumber": "string (required)",
  "department": "string (required)",
  "role": "admin|user (default: user)",
  "directSupervisor": "ObjectId (ref: User)",
  "createdAt": "Date",
  "updatedAt": "Date",
  "status": "boolean (default: true)"
}
```

### Task Model

```json
{
  "title": "string (required)",
  "description": "string (required)",
  "objective": "string (required)",
  "assignedUnit": "string (required)",
  "startDate": "Date (required)",
  "endDate": "Date (required)",
  "quantitativeTarget": "number",
  "progress": "number (0-100, default: 0)",
  "actualResult": "string",
  "status": "pending|in_progress|submitted|approved|rejected (default: pending)",
  "priority": "low|medium|high (default: medium)",
  "field": "string",
  "assignedBy": "ObjectId (ref: User, required)",
  "assignedTo": ["ObjectId (ref: User, required)"],
  "parentTask": "ObjectId (ref: Task)",
  "isParent": "boolean (default: false)",
  "guideline": "string (base64)",
  "report": "string (base64)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "message": "Error description"
}
```

### 401 Unauthorized

```json
{
  "message": "No token provided|Invalid token"
}
```

### 403 Forbidden

```json
{
  "message": "Insufficient permissions description"
}
```

### 404 Not Found

```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "Something went wrong!"
}
```

## Authentication Flow

1. **Login**: Send username and password to `/users/login`
2. **Get Token**: Receive JWT token in response
3. **Use Token**: Include token in Authorization header for subsequent requests
4. **Token Expiry**: Tokens expire after 1 hour

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Hierarchical user permissions
- Input validation and sanitization
- Helmet.js for security headers
- Compression middleware for performance

## Environment Variables

Required environment variables:

```
PORT=3056
JWT_SECRET=your_jwt_secret_key
MONGODB_URI=your_mongodb_connection_string
```

## Rate Limiting

Currently no rate limiting implemented. Consider adding rate limiting for production use.

## Best Practices

1. Always include the Authorization header for protected endpoints
2. Validate request data before sending
3. Handle all possible error responses
4. Use appropriate HTTP status codes
5. Implement proper error handling for all API responses
6. Store sensitive data (passwords, tokens) securely
7. Use HTTPS in production
