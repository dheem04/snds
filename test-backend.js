const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';

async function testBackend() {
  console.log('🔍 Testing Backend Connection...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connection...');
    const healthResponse = await axios.get('http://localhost:4000/');
    console.log('✅ Backend is running!');
    console.log('   Version:', healthResponse.data.version);
    console.log('   Features:', healthResponse.data.features.length, 'features available\n');

    // Test 2: Try to register demo user
    console.log('2. Creating demo user...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'password123'
      });
      console.log('✅ Demo user created successfully!');
      console.log('   User ID:', registerResponse.data.user.id);
      console.log('   Email:', registerResponse.data.user.email);
      console.log('   API Key:', registerResponse.data.user.apiKey);
      console.log('   Token:', registerResponse.data.token.substring(0, 20) + '...\n');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'User already exists') {
        console.log('ℹ️  Demo user already exists, trying to login...\n');
      } else {
        throw error;
      }
    }

    // Test 3: Try to login with demo user
    console.log('3. Testing login with demo user...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'demo@example.com',
      password: 'password123'
    });
    console.log('✅ Login successful!');
    console.log('   User:', loginResponse.data.user.name);
    console.log('   Role:', loginResponse.data.user.role);
    console.log('   Token:', loginResponse.data.token.substring(0, 20) + '...\n');

    // Test 4: Test authenticated endpoint
    console.log('4. Testing authenticated endpoint...');
    const token = loginResponse.data.token;
    const dashboardResponse = await axios.get(`${API_BASE_URL}/analytics/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Dashboard data retrieved successfully!');
    console.log('   Total notifications:', dashboardResponse.data.summary.totalNotifications);
    console.log('   Success rate:', dashboardResponse.data.summary.successRate + '%\n');

    console.log('🎉 ALL TESTS PASSED! Backend is working correctly!\n');
    console.log('📋 Next steps:');
    console.log('   1. Go to http://localhost:3000');
    console.log('   2. Click "create a new account" or use register page');
    console.log('   3. Use: demo@example.com / password123');
    console.log('   4. Or create your own account\n');

  } catch (error) {
    console.error('❌ Backend test failed:');
    if (error.code === 'ECONNREFUSED') {
      console.error('   Backend is not running! Please start it with: npm run dev');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running: npm run dev');
    console.log('   2. Make sure worker is running: npm run worker');
    console.log('   3. Check database connection');
    console.log('   4. Check Redis connection');
  }
}

testBackend();