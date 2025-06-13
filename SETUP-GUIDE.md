# 🚀 Dheenotifications - Complete Setup Guide

## 📋 **QUICK START (5 Minutes)**

### **Step 1: Clone Repository**
```bash
git clone https://github.com/dheem04/snds.git
cd snds
```

### **Step 2: Backend Setup**
```bash
cd backend

# Install dependencies
npm install

# Create environment file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/dheenotifications"
REDIS_URL="redis://localhost:6379"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mymaildheenew@gmail.com
SMTP_PASS=hyjssbljfzvcgpin
TWILIO_ACCOUNT_SID=AC8d483a93712c9850e974a179cb325430
TWILIO_AUTH_TOKEN=be6a8efd629bc80277e4adade5c74ecd
TWILIO_PHONE=+18108813439
JWT_SECRET="eSGBW+1Th2o4t8xoLX4BtxlB+fDLwcX+QC56cNKWnF0="
EOF
```

### **Step 3: Database Setup (PostgreSQL)**
```bash
# Install PostgreSQL (Ubuntu/WSL)
sudo apt update && sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Create database
sudo -u postgres psql -c "CREATE DATABASE dheenotifications;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dheenotifications TO postgres;"

# Run migrations
npx prisma generate
npx prisma migrate dev --name init
```

### **Step 4: Redis Setup**
```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Test Redis
redis-cli ping  # Should return PONG
```

### **Step 5: Start Backend Services**
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Worker Process (NEW TERMINAL)
npm run worker
```

### **Step 6: Frontend Setup**
```bash
# NEW TERMINAL - Navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api" > .env.local

# Start frontend
npm run dev
```

### **Step 7: Test Everything**
```bash
# NEW TERMINAL - Test backend
cd ..
node test-backend.js
```

---

## 🎯 **DEMO CREDENTIALS**

### **Option 1: Use Demo Account**
- **Email:** `demo@example.com`
- **Password:** `password123`

### **Option 2: Create New Account**
1. Go to http://localhost:3000
2. Click "create a new account"
3. Fill in your details
4. Login and enjoy!

---

## 🌐 **DEPLOYMENT GUIDE**

### **Railway Backend Deployment**

#### **1. Prepare Backend**
```bash
cd backend

# Create railway.json
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
EOF

# Update package.json scripts
```

Add to `backend/package.json`:
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "start:worker": "node dist/worker/notificationWorker.js",
    "postinstall": "prisma generate"
  }
}
```

#### **2. Deploy to Railway**
1. Go to [Railway.app](https://railway.app)
2. Create New Project → Deploy from GitHub
3. Select repository: `dheem04/snds`
4. Create **TWO services:**

**Service 1: API Server**
- Name: `dheenotifications-api`
- Root Directory: `/backend`
- Start Command: `npm run build && npm start`

**Service 2: Worker**
- Name: `dheenotifications-worker`
- Root Directory: `/backend`
- Start Command: `npm run build && npm run start:worker`

#### **3. Add Railway Plugins**
- Add **PostgreSQL** plugin
- Add **Redis** plugin

#### **4. Environment Variables (Both Services)**
```env
DATABASE_URL=<Railway PostgreSQL URL>
REDIS_URL=<Railway Redis URL>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mymaildheenew@gmail.com
SMTP_PASS=hyjssbljfzvcgpin
TWILIO_ACCOUNT_SID=AC8d483a93712c9850e974a179cb325430
TWILIO_AUTH_TOKEN=be6a8efd629bc80277e4adade5c74ecd
TWILIO_PHONE=+18108813439
JWT_SECRET=eSGBW+1Th2o4t8xoLX4BtxlB+fDLwcX+QC56cNKWnF0=
NODE_ENV=production
```

### **Vercel Frontend Deployment**

#### **1. Deploy Frontend**
```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Project name: dheenotifications
# - Framework: Next.js
# - Root directory: ./
```

#### **2. Environment Variables**
In Vercel Dashboard → Settings → Environment Variables:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-railway-api-url.up.railway.app/api
```

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues & Solutions**

#### **1. "Invalid credentials" on login**
```bash
# Solution: Create demo user first
node test-backend.js
# OR register new user at /auth/register
```

#### **2. Backend not starting**
```bash
# Check PostgreSQL
sudo service postgresql status
sudo service postgresql start

# Check Redis
redis-cli ping

# Check environment variables
cat backend/.env
```

#### **3. Database connection error**
```bash
# Reset database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS dheenotifications;"
sudo -u postgres psql -c "CREATE DATABASE dheenotifications;"
cd backend && npx prisma migrate dev --name init
```

#### **4. Port already in use**
```bash
# Kill processes
sudo lsof -ti:4000 | xargs kill -9
sudo lsof -ti:3000 | xargs kill -9
```

#### **5. Frontend can't connect to backend**
```bash
# Check backend is running
curl http://localhost:4000

# Check frontend environment
cat frontend/.env.local
```

---

## ✅ **VERIFICATION CHECKLIST**

### **Local Development:**
- [ ] PostgreSQL running and database created
- [ ] Redis running (`redis-cli ping` returns PONG)
- [ ] Backend API running on port 4000
- [ ] Worker process running
- [ ] Frontend running on port 3000
- [ ] Can register new user
- [ ] Can login with demo credentials
- [ ] Can send notifications
- [ ] Logs showing successful deliveries

### **Production Deployment:**
- [ ] Railway project with 2 services deployed
- [ ] PostgreSQL and Redis plugins added
- [ ] Environment variables configured
- [ ] Vercel frontend deployed
- [ ] Frontend connects to Railway backend
- [ ] End-to-end testing completed

---

## 🎉 **SUCCESS INDICATORS**

When everything is working correctly, you should see:

1. **Backend Terminal 1 (API):**
   ```
   🚀 Server listening on port 4000
   ✅ Database connected successfully
   ✅ Redis connected successfully
   ✅ Email service connected successfully
   ```

2. **Backend Terminal 2 (Worker):**
   ```
   Worker started and waiting for jobs...
   Job completed successfully
   ```

3. **Frontend:**
   - Login page loads at http://localhost:3000
   - Can register/login successfully
   - Dashboard shows analytics
   - Can send notifications
   - Logs show delivery status

4. **Test Script:**
   ```bash
   node test-backend.js
   # Should show: 🎉 ALL TESTS PASSED!
   ```

---

## 📞 **Support**

If you encounter any issues:

1. **Run the test script:** `node test-backend.js`
2. **Check all services are running**
3. **Verify environment variables**
4. **Check database and Redis connections**

**Your notification platform is now ready for interviews! 🚀**