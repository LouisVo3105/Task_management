# Sử dụng Node.js 20 chính thức
FROM node:20.14.0-alpine

# Tạo thư mục làm việc trong container
WORKDIR /usr/src/app

# Copy file package.json và package-lock.json vào container
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Expose port (giả sử app chạy ở port 3000)
EXPOSE 3056

# Chạy ứng dụng
CMD ["node", "server.js"]