# استفاده از نسخه رسمی Node.js
FROM node:18

# تنظیم دایرکتوری کاری
WORKDIR /app

# کپی فایل‌های پروژه
COPY package*.json ./
RUN npm install
COPY . .

# پورت 8080
EXPOSE 8080

# اجرای پروژه
CMD ["npm", "start"]
