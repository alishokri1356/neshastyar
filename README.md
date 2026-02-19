# Modiryar - Meeting Management System

## Project Overview

Modiryar is a comprehensive meeting management system that allows users to record, transcribe, and organize meetings with AI-powered summaries and tagging capabilities. The system features a modern React frontend with a Node.js/Express backend, providing secure user authentication, email verification, and robust audio file management.

## Architecture

This project uses a **full-stack architecture** with:

### Frontend (React + TypeScript)
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn-ui components
- **Styling**: Tailwind CSS
- **State Management**: Custom stores with Zustand
- **Data Fetching**: React Query for API calls and caching
- **Port**: Dynamic (8080-8085)
- **API Client**: Custom MySQL client wrapper (Supabase-compatible API)

### Backend (Node.js + Express)
- **Framework**: Express.js
- **Language**: JavaScript (Node.js)
- **Database**: MySQL with mysql2 driver
- **Authentication**: JWT tokens with email verification
- **Email Service**: Nodemailer with Gmail SMTP
- **File Upload**: Multer for audio file handling
- **Security**: Helmet, CORS, rate limiting
- **Port**: 3001

### Database
- **Type**: MySQL
- **Host**: 127.0.0.1
- **Database**: modiryar
- **User**: modiryar_app

## Key Features

### 🔐 **Security & Authentication**
- **Email Verification Required**: Users must verify their email before accessing the app
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **CORS Protection**: Configured for multiple frontend ports

### 📧 **Email System**
- **Email Verification**: Automatic verification emails on registration
- **Password Reset**: Secure password reset via email
- **Gmail SMTP**: Professional email delivery
- **Persian Templates**: Beautiful RTL email templates

### 🎯 **Core Functionality**
- **Meeting Recording**: Upload and manage audio files (MP3, WAV, OGG, WebM, M4A)
- **AI Summarization**: Automatic meeting summaries
- **Tag Management**: Organize meetings with custom tags and colors
- **User Management**: Secure user registration and login with email verification
- **File Management**: Secure audio file storage with user isolation
- **Real-time Updates**: Optimized data fetching with React Query

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MySQL database access

### Installation & Setup

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd modiryar
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Setup backend**
```bash
cd backend
npm install
```

4. **Configure environment variables**
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your database and email settings
```

5. **Run database migration**
```sql
-- Add email verification fields to users table
ALTER TABLE `users` 
ADD COLUMN `email_verified` BOOLEAN DEFAULT FALSE AFTER `name`,
ADD COLUMN `email_verification_token` VARCHAR(255) NULL AFTER `email_verified`,
ADD COLUMN `email_verification_expires` TIMESTAMP NULL AFTER `email_verification_token`,
ADD COLUMN `password_reset_token` VARCHAR(255) NULL AFTER `email_verification_expires`,
ADD COLUMN `password_reset_expires` TIMESTAMP NULL AFTER `password_reset_token`;

-- Add indexes for performance
ALTER TABLE `users` 
ADD INDEX `idx_email_verification_token` (`email_verification_token`),
ADD INDEX `idx_password_reset_token` (`password_reset_token`);
```

6. **Start the application**
```bash
# Terminal 1: Start backend
cd backend
node src/server.js

# Terminal 2: Start frontend
npm run dev
```

## Technologies Used

### Frontend
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type-safe JavaScript
- **React**: Component-based UI library
- **shadcn-ui**: Modern UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Query**: Data fetching, caching, and synchronization
- **React Router**: Client-side routing

### Backend
- **Express.js**: Web application framework
- **MySQL2**: MySQL database driver with connection pooling
- **JWT**: JSON Web Token authentication
- **bcrypt**: Password hashing
- **Nodemailer**: Email sending with Gmail SMTP
- **Multer**: File upload handling
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Express Rate Limit**: API rate limiting

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login (requires email verification)
- `POST /api/auth/signup` - User registration (sends verification email)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Verify JWT token

### Email Management
- `GET /api/auth/verify-email?token=xxx` - Verify email with token
- `POST /api/auth/resend-verification-email` - Resend verification email
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Meetings (Protected - Requires Email Verification)
- `GET /api/meetings` - Get user's meetings (with pagination and filtering)
- `GET /api/meetings/untagged` - Get untagged meetings
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings` - Create new meeting
- `POST /api/meetings/create-sample` - Create sample meetings for testing
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Tags (Protected - Requires Email Verification)
- `GET /api/tags` - Get user's tags
- `GET /api/tags/:id` - Get specific tag
- `POST /api/tags` - Create new tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

### Meeting Tags (Protected - Requires Email Verification)
- `GET /api/meeting-tags` - Get meeting-tag relationships
- `POST /api/meeting-tags` - Create meeting-tag relationship
- `DELETE /api/meeting-tags` - Remove meeting-tag relationship

### File Upload (Protected - Requires Email Verification)
- `POST /api/upload/audio` - Upload audio file (multipart/form-data, max 500MB)
- `GET /api/files/audio/:userId/:filename` - Download audio file
- `DELETE /api/files/audio/:userId/:filename` - Delete audio file

### Public Audio Download (No Authentication Required)
- `GET /api/download/audio/:meetingId` - Download audio file by meeting ID (bypasses authorization)

**Example Usage:**
```bash
# Download audio for a specific meeting
curl http://localhost:3001/api/download/audio/5a325f95-5915-4d91-8050-5aea3fec3a74

# Or access directly in browser
http://localhost:3001/api/download/audio/5a325f95-5915-4d91-8050-5aea3fec3a74
```

**Note:** This endpoint allows external systems to download audio files without requiring authentication tokens. It automatically resolves file paths and handles cases where database records don't exactly match actual file names.

## Security Features

### Email Verification System
- **Mandatory Verification**: Users cannot access the app without email verification
- **Token-based**: Cryptographically secure verification tokens
- **Expiration**: Tokens expire after 24 hours
- **Resend Capability**: Users can request new verification emails

### Authentication Flow
1. **Registration**: User registers → Verification email sent → No session created
2. **Email Verification**: User clicks link → Email verified → Can now login
3. **Login**: User logs in → Session created → Full app access
4. **API Access**: All protected routes check email verification status

### Password Security
- **Hashing**: bcrypt with salt rounds
- **Reset Flow**: Secure token-based password reset
- **Expiration**: Reset tokens expire after 1 hour

## Database Configuration

The application connects to a MySQL database with the following configuration:

- **Host**: 127.0.0.1
- **Database**: modiryar
- **User**: modiryar_app
- **Password**: MY-PASSWORD
- **Port**: 3306

### Database Schema Documentation

For detailed information about the database structure, tables, relationships, and schema, please refer to the [`Database Structure.md`](./Database%20Structure.md) file. This file contains:

- Complete table definitions with column details
- Indexes and foreign key relationships
- CREATE TABLE statements for all tables
- Current row counts for each table
- **NEW**: Email verification fields and indexes

**Important**: Use the `Database Structure.md` file to understand the current database schema when making any database-related changes or when working with the application's data layer.

## Email Configuration

The application uses Gmail SMTP for email confirmation functionality with the following settings:

- **SMTP Host**: smtp.gmail.com
- **SMTP Port**: 587
- **SMTP User**: shokriali@gmail.com
- **SMTP Password**: orslxvkgfzqfpgjx (Gmail App Password)
- **Frontend URL**: https://modiryar.online

### Email Setup Notes

- The SMTP password is a Gmail App Password, not the regular Gmail password
- Gmail App Passwords are required for SMTP authentication when 2FA is enabled
- The frontend URL is used for generating confirmation links in emails
- These settings should be configured in the backend environment variables
- **Email verification is mandatory** for app access

## Environment Variables

### Backend (.env)
```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=modiryar
DB_USER=modiryar_app
DB_PASSWORD=MY-PASSWORD

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=shokriali@gmail.com
SMTP_PASS=orslxvkgfzqfpgjx
FRONTEND_URL=https://modiryar.online
```

## Development

### Running in Development Mode

1. **Start Backend Server**
```bash
cd backend
node src/server.js
```

2. **Start Frontend Development Server**
```bash
npm run dev
```

3. **Access the Application**
- Frontend: http://localhost:8080-8085 (dynamic port)
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/health

### Project Structure

```
modiryar/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/     # API route handlers
│   │   ├── middleware/     # Authentication & email verification
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   └── server.js       # Main server file
│   ├── migrations/         # Database migration scripts
│   └── package.json
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── store/             # State management
│   ├── lib/               # Utilities & MySQL client
│   └── integrations/      # External service integrations
├── Database Structure.md   # Database documentation
└── README.md              # This file
```

## Recent Updates & Fixes

### ✅ **Database Query Optimization (October 2025)**
- **Fixed MySQL query execution**: Changed from `pool.execute()` to `pool.query()` to resolve `ER_WRONG_ARGUMENTS` errors
- **Improved parameter handling**: Proper integer conversion for LIMIT clauses
- **Enhanced error handling**: Better debugging and error reporting

### ✅ **Frontend Performance Improvements**
- **Optimized data fetching**: Implemented React Query for efficient API calls and caching
- **Reduced polling frequency**: Changed from 10-second to 30-second intervals for new meetings
- **Improved user experience**: Better loading states and error handling

### ✅ **API Client Enhancement**
- **Chainable query builder**: Implemented Supabase-compatible API for MySQL backend
- **Better error handling**: Comprehensive error logging and debugging
- **Type safety**: Improved TypeScript support for database operations

## Deployment

### Production Deployment
The application is currently deployed on a VPS with the following configuration:
- **Domain**: https://modiryar.online
- **Backend**: Node.js with PM2 process manager
- **Frontend**: Static files served via Nginx
- **Database**: MySQL on remote server
- **File Storage**: Local filesystem with user isolation

### Development Setup
For local development, see the "Getting Started" section above.

## Troubleshooting

### Common Issues
1. **Database Connection Errors**: Ensure MySQL server is running and credentials are correct
2. **Email Verification Issues**: Check Gmail SMTP settings and app password
3. **File Upload Errors**: Verify upload directory permissions and file size limits
4. **Authentication Issues**: Ensure JWT secret is properly configured

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in the backend environment variables.
