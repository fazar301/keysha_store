#!/bin/bash

# Midtrans Integration Debugging Checklist
# Run this script to verify the integration is working

echo "========================================"
echo "Midtrans Integration Debug Checklist"
echo "========================================"
echo ""

# Check 1: Server package.json has midtrans-client
echo "[1] Checking server dependencies..."
if grep -q "midtrans-client" "server/package.json"; then
    echo "✓ midtrans-client found in package.json"
else
    echo "✗ midtrans-client NOT found in package.json"
    echo "  Run: npm install midtrans-client"
fi
echo ""

# Check 2: Server .env has required keys
echo "[2] Checking server .env configuration..."
if grep -q "SERVER_KEY=" "server/.env"; then
    echo "✓ SERVER_KEY found in .env"
else
    echo "✗ SERVER_KEY NOT found in .env"
fi

if grep -q "CLIENT_KEY=" "server/.env"; then
    echo "✓ CLIENT_KEY found in .env"
else
    echo "✗ CLIENT_KEY NOT found in .env"
fi
echo ""

# Check 3: Server order route has Midtrans code
echo "[3] Checking server order route implementation..."
if grep -q "midtransClient.Snap" "server/routes/api/order.js"; then
    echo "✓ Midtrans Snap implementation found in order.js"
else
    echo "✗ Midtrans Snap implementation NOT found"
fi
echo ""

# Check 4: Client addOrder has payment handling
echo "[4] Checking client addOrder implementation..."
if grep -q "window.snap.pay" "client/app/containers/Order/actions.js"; then
    echo "✓ Snap payment handler found in client"
else
    echo "✗ Snap payment handler NOT found"
fi
echo ""

# Check 5: Client placeOrder dispatches addOrder
echo "[5] Checking client placeOrder flow..."
if grep -q "dispatch(addOrder())" "client/app/containers/Order/actions.js"; then
    echo "✓ placeOrder calls addOrder()"
else
    echo "✗ placeOrder does NOT call addOrder()"
fi
echo ""

# Check 6: Server module imports
echo "[6] Checking server module imports..."
if grep -q "const midtransClient = require('midtrans-client')" "server/routes/api/order.js"; then
    echo "✓ midtransClient imported correctly"
else
    echo "✗ midtransClient NOT imported correctly"
fi
echo ""

echo "========================================"
echo "Manual Testing Steps:"
echo "========================================"
echo ""
echo "1. Start server:  cd server && npm run dev"
echo "2. Start client:  cd client && npm start"
echo "3. Open browser DevTools (F12) → Console tab"
echo "4. Login to the application"
echo "5. Add items to cart"
echo "6. Click 'Place Order' button"
echo "7. Look for these logs in browser console:"
echo "   - 'placeOrder called'"
echo "   - 'Midtrans token received'"
echo "   - 'Snap script loaded successfully'"
echo ""
echo "8. Look for these logs in server terminal:"
echo "   - 'Creating order'"
echo "   - 'Creating Midtrans transaction'"
echo "   - 'Midtrans transaction created'"
echo ""
echo "9. A Midtrans payment popup should appear"
echo ""
echo "10. Test with card: 4811 1111 1111 1114"
echo "    Expiry: 12/25, CVV: 123, OTP: 123456"
echo ""
echo "========================================"
