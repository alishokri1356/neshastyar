# Modiryar Backend API

This is the standalone backend API for the Modiryar meeting management system.

## Features

- **Authentication**: JWT-based authentication with login, signup, logout, and verification
- **Meeting Management**: CRUD operations for meetings
- **Tag Management**: CRUD operations for tags
- **Meeting-Tag Relationships**: Manage associations between meetings and tags
- **Security**: Rate limiting, CORS, Helmet security headers
- **Database**: Direct MySQL connection with connection pooling

## Prerequisites

- Node.js 16+ 
- MySQL database (configured in Database Structure.md)

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp env.example .env
```

4. Update the `.env` file with your configuration:
```env
DB_HOST=195.248.240.30
DB_PORT=3306
DB_NAME=modiryar
DB_USER=modiryar_app
DB_PASSWORD=Terraworld2020
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Verify session token

### Meetings
- `GET /api/meetings` - Get user's meetings
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `GET /api/meetings/untagged` - Get untagged meetings

### Tags
- `GET /api/tags` - Get user's tags
- `GET /api/tags/:id` - Get specific tag
- `POST /api/tags` - Create new tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag
- `GET /api/tags/:id/meetings` - Get meetings for a tag

### Meeting-Tag Relationships
- `GET /api/meeting-tags` - Get meeting-tag relationships
- `POST /api/meeting-tags` - Create meeting-tag relationship
- `DELETE /api/meeting-tags` - Delete meeting-tag relationship (by meeting_id & tag_id)
- `DELETE /api/meeting-tags/:id` - Delete meeting-tag relationship (by ID)
- `GET /api/meeting-tags/meetings/:meetingId/tags` - Get tags for a meeting
- `GET /api/meeting-tags/tags/:tagId/meetings` - Get meetings for a tag

## Authentication

All endpoints except authentication endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human readable error message"
}
```

## Database

The API connects directly to the MySQL database described in `../Database Structure.md`. Make sure the database is running and accessible before starting the server.

## Health Check

- `GET /health` - Returns server status and uptime

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable origin restrictions
- **Helmet**: Security headers
- **JWT**: Secure token-based authentication
- **Input Validation**: Request body validation
- **SQL Injection Protection**: Parameterized queries

## Development

The server uses nodemon for development with auto-restart on file changes.

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Set up reverse proxy (nginx)
4. Configure SSL/TLS
5. Update CORS origins for production domains
