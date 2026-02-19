# KodBank - Modern Banking Application

A full-stack banking application built with React (frontend) and Node.js/Express (backend) with PostgreSQL database. Features secure authentication, real-time transactions, and a modern user interface.

## 🏦 Features

### Authentication & Security
- JWT-based authentication with token refresh
- Secure password hashing with bcrypt
- Rate limiting and request throttling
- CORS protection and security headers
- Session management and logout from all devices
- Password change functionality

### Banking Features
- Account balance checking with real-time updates
- Money transfers between customers
- Deposit and withdrawal operations
- Comprehensive transaction history
- Transaction search and filtering
- Account statements and mini-statements
- Transfer suggestions based on history

### User Experience
- Responsive dashboard with analytics
- Modern UI with Material Design principles
- Real-time balance updates
- Transaction notifications
- Export transaction history (CSV)
- Account management and preferences
- Mobile-friendly interface

### Technical Features
- RESTful API design
- Database migrations and seeding
- Comprehensive error handling
- Request logging and monitoring
- Health check endpoints
- Docker containerization
- Environment-based configuration

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Styling with custom design system
- **Google Fonts** - Typography (Roboto, Montserrat)

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Winston** - Logging
- **Joi/Express-validator** - Input validation

### DevOps & Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy (production)
- **Morgan** - HTTP request logging
- **PM2** - Process management (production)

## 📋 Prerequisites

- Node.js 16+ and npm 8+
- PostgreSQL 12+
- Docker and Docker Compose (optional)
- Git

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd KodBank-App
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health Check: http://localhost:5000/health

### Option 2: Local Development

1. **Setup Database**
   ```bash
   # Start PostgreSQL
   sudo systemctl start postgresql
   
   # Create database
   createdb kodbank
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run setup  # Install dependencies, run migrations, and seed data
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm start
   ```

## 📁 Project Structure

```
KodBank-App/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── config/            # Database and JWT configuration
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   ├── app.js            # Express app setup
│   │   └── server.js         # Server startup
│   ├── database/
│   │   ├── migrations/       # Database migrations
│   │   └── seeds/           # Sample data
│   ├── Dockerfile
│   └── package.json
├── frontend/                  # React application
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/         # React context
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   ├── styles/          # CSS styles
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main App component
│   │   └── index.jsx        # Entry point
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/kodbank

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRY=24h
BCRYPT_SALT_ROUNDS=10

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Features
RUN_MIGRATIONS=true
SEED_DATABASE=true
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |
| POST | `/api/auth/change-password` | Change password |

### Banking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bank/balance` | Get account balance |
| POST | `/api/bank/transfer` | Transfer money |
| GET | `/api/bank/transactions` | Get transaction history |
| POST | `/api/bank/deposit` | Deposit money |
| POST | `/api/bank/withdraw` | Withdraw money |
| GET | `/api/bank/statistics` | Get account statistics |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/dashboard` | Get dashboard data |
| GET | `/api/user/activity` | Get account activity |
| GET | `/api/user/search` | Search users |
| GET | `/api/user/preferences` | Get user preferences |

For detailed API documentation, visit: `http://localhost:5000/api/docs`

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

### Frontend Tests
```bash
cd frontend
npm test               # Run tests
npm run test:coverage  # Run tests with coverage
```

## 🗄️ Database Schema

### Tables
- **BankUser** - User accounts and authentication
- **BankUserJwt** - JWT token management
- **Transactions** - Transaction history

### Key Features
- Foreign key constraints for data integrity
- Database functions for complex operations
- Indexes for performance optimization
- Triggers for automatic updates
- Views for complex queries

## 🔐 Security Features

- **Authentication**: JWT tokens with expiration
- **Authorization**: Role-based access control
- **Password Security**: Bcrypt hashing with salt rounds
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Cross-origin request security
- **Security Headers**: XSS, CSRF protection

## 📊 Monitoring & Logging

### Logging Levels
- **Error**: Application errors and exceptions
- **Warn**: Security events and warnings
- **Info**: General application events
- **HTTP**: Request/response logging
- **Debug**: Detailed debugging information

### Health Checks
- **Server Health**: `/health` endpoint
- **Database Health**: Connection and query performance
- **Application Metrics**: Response times, error rates

## 🚀 Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Considerations
- Use environment variables for sensitive data
- Enable SSL/TLS encryption
- Configure reverse proxy (Nginx)
- Set up database backups
- Monitor application performance
- Implement log rotation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -l

# Check connection string
psql postgresql://postgres:postgres123@localhost:5432/kodbank
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :5000  # Backend
lsof -i :3000  # Frontend

# Kill process
kill -9 <PID>
```

#### Docker Issues
```bash
# Clean Docker cache
docker system prune -a

# Rebuild containers
docker-compose build --no-cache
```

### Sample Users (Seeded Data)
- **Email**: john.doe@example.com, **Password**: password123
- **Email**: jane.smith@example.com, **Password**: password123
- **Email**: bob.johnson@example.com, **Password**: password123

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api/docs`
- Review the health check endpoint at `/health`

---

**Built with ❤️ by the KodBank Team**
#   K o d B a n k - A p p  
 #   K o d B a n k - A p p  
 #   K o d B a n k - A p p  
 #   K o d B a n k - A p p  
 