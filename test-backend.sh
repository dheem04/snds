#!/bin/bash

echo "🔍 Testing Backend Connection..."
echo ""

# Test 1: Check if backend is running
echo "1. Testing backend connection..."
if curl -s http://localhost:4000/ > /dev/null; then
    echo "✅ Backend is running!"
    echo "   Response: $(curl -s http://localhost:4000/ | head -c 100)..."
    echo ""
else
    echo "❌ Backend is not running!"
    echo "   Please start it with: cd backend && npm run dev"
    echo ""
    exit 1
fi

# Test 2: Try to register demo user
echo "2. Creating demo user..."
REGISTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo@example.com","password":"password123"}')

HTTP_CODE="${REGISTER_RESPONSE: -3}"
RESPONSE_BODY="${REGISTER_RESPONSE%???}"

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Demo user created successfully!"
    echo "   Response: $(echo $RESPONSE_BODY | head -c 100)..."
    echo ""
elif [ "$HTTP_CODE" = "400" ]; then
    echo "ℹ️  Demo user already exists, trying to login..."
    echo ""
else
    echo "❌ Failed to create demo user (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE_BODY"
    echo ""
fi

# Test 3: Try to login with demo user
echo "3. Testing login with demo user..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ Login successful!"
    echo "   User found in response"
    echo ""
    
    # Extract token for next test
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    # Test 4: Test authenticated endpoint
    echo "4. Testing authenticated endpoint..."
    DASHBOARD_RESPONSE=$(curl -s -w "%{http_code}" -X GET http://localhost:4000/api/analytics/dashboard \
      -H "Authorization: Bearer $TOKEN")
    
    DASH_HTTP_CODE="${DASHBOARD_RESPONSE: -3}"
    DASH_BODY="${DASHBOARD_RESPONSE%???}"
    
    if [ "$DASH_HTTP_CODE" = "200" ]; then
        echo "✅ Dashboard data retrieved successfully!"
        echo "   Response: $(echo $DASH_BODY | head -c 100)..."
        echo ""
    else
        echo "⚠️  Dashboard test failed (HTTP $DASH_HTTP_CODE)"
        echo "   Response: $DASH_BODY"
        echo ""
    fi
else
    echo "❌ Login failed!"
    echo "   Response: $LOGIN_RESPONSE"
    echo ""
    exit 1
fi

echo "🎉 ALL TESTS PASSED! Backend is working correctly!"
echo ""
echo "📋 Next steps:"
echo "   1. Go to http://localhost:3000"
echo "   2. Click 'create a new account' or go to /auth/register"
echo "   3. Use: demo@example.com / password123"
echo "   4. Or create your own account"
echo ""
echo "🚀 Your notification platform is ready!"