# 🎯 Midtrans Integration - Verification & Testing Guide

## ✅ Changes Made

### 1. Backend Changes (`server/routes/api/order.js`)

- ✓ Added `midtransClient` import
- ✓ Modified `POST /api/order/add` endpoint to create Midtrans Snap transaction
- ✓ Returns `midtrans.token` and `clientKey` in response
- ✓ Added comprehensive console logging for debugging

### 2. Frontend Changes (`client/app/containers/Order/actions.js`)

- ✓ Updated `addOrder()` to handle Midtrans payment flow
- ✓ Dynamically loads Snap script from CDN (sandbox or production)
- ✓ Implements payment callbacks (onSuccess, onPending, onError, onClose)
- ✓ Added console logging to track flow
- ✓ Updated `placeOrder()` with detailed logging and error handling

### 3. Dependencies

- ✓ Added `midtrans-client: ^1.4.3` to `server/package.json`
- ✓ Ran `npm install` to install dependencies

### 4. Documentation

- ✓ Created `MIDTRANS_INTEGRATION.md` with detailed guide
- ✓ Created `DEBUG_MIDTRANS.sh` for quick verification

---

## 🔍 Quick Debug Checklist

### Before Testing - Verify Setup:

```bash
# 1. Check if midtrans-client is installed
cd server
npm list midtrans-client

# 2. Verify .env has keys
cat .env | grep -E "SERVER_KEY|CLIENT_KEY|NODE_ENV"

# 3. Check server order.js has the code
grep -n "midtransClient.Snap" server/routes/api/order.js

# 4. Check client actions has payment handler
grep -n "window.snap.pay" client/app/containers/Order/actions.js
```

---

## 🚀 Testing Steps

### Step 1: Start Services

```bash
# Terminal 1 - Start Server
cd server
npm run dev

# Terminal 2 - Start Client
cd client
npm start
```

### Step 2: Test in Browser

1. **Open DevTools Console** (F12 → Console tab)
2. **Login** to the application
3. **Add products** to cart
4. **Click "Place Order"** button
5. **Watch console logs** and look for:

#### Expected Browser Console Output:

```
✓ placeOrder called
✓ Token exists: true, Cart items length: X
✓ Proceeding with order placement, getting cart ID...
✓ Cart ID obtained, calling addOrder...
✓ addOrder - cartId: xxxxxx, total: 50000, paymentMethod: midtrans
✓ Order created response: { success: true, message: "...", order: {...}, midtrans: {...} }
✓ Midtrans token received, initiating payment...
✓ Loading Midtrans Snap script from: https://app.sandbox.midtrans.com/snap/snap.js
✓ Snap script loaded successfully
✓ Running Snap with token: snap_abc123xyz
```

#### Expected Server Console Output:

```
Creating order - cart: xxxxxx, total: 50000, paymentMethod: midtrans, user: xxxxxx
✓ Order saved: 5f7d4e3c2b1a0d9f8e7c6b5a
✓ Creating Midtrans transaction...
✓ Midtrans parameter: { transaction_details: {...}, customer_details: {...}, item_details: [...] }
✓ Midtrans transaction created: snap_abc123xyz
```

### Step 3: Complete Payment Test

After Snap popup appears:

1. Use **Test Card**: `4811 1111 1111 1114`
2. **Expiry**: 12/25
3. **CVV**: 123
4. **OTP**: 123456

Expected result:

- ✓ Payment page shows
- ✓ "Payment success" log appears in console
- ✓ Redirected to `/order/success/[orderId]`
- ✓ Cart is cleared

---

## ❌ Troubleshooting

### Issue: "placeOrder called" but nothing happens next

**Causes:**

- [ ] User not logged in (`token` missing)
- [ ] Cart is empty
- [ ] Redux dispatch not working

**Fix:**

```javascript
// Check in browser console:
localStorage.getItem('token'); // Should return token
localStorage.getItem('cart_items'); // Should show items
```

---

### Issue: "Midtrans token received" but Snap widget doesn't show

**Causes:**

- [ ] Snap script failed to load
- [ ] `window.snap` not available
- [ ] Network/CDN blocked

**Fix:**

```javascript
// Check in browser console:
window.snap; // Should exist
document.getElementById('midtrans-snap-js'); // Should exist after load
```

---

### Issue: "Creating Midtrans transaction..." but no token returned

**Causes:**

- [ ] Invalid `SERVER_KEY` or `CLIENT_KEY`
- [ ] Midtrans account not set up
- [ ] Network error

**Fix:**

1. Verify keys in `server/.env`:

```bash
echo "Server Key: $(grep SERVER_KEY server/.env)"
echo "Client Key: $(grep CLIENT_KEY server/.env)"
```

2. Check Midtrans dashboard: https://dashboard.midtrans.com

3. Look at server console for detailed Midtrans error message

---

### Issue: Cart not found or cartId is null

**Causes:**

- [ ] `getCartId()` action failed
- [ ] Cart not saved in backend
- [ ] localStorage corrupted

**Fix:**

```javascript
// Check in browser console:
localStorage.getItem('cart_id'); // Should have value
JSON.parse(localStorage.getItem('cart_items')).length; // Should be > 0
```

---

## 📊 Data Flow Visualization

```
User clicks "Place Order"
        ↓
placeOrder() action
   ├─ Check: token exists?
   ├─ Check: cartItems.length > 0?
   └─ YES → dispatch(getCartId()) → dispatch(addOrder('midtrans'))
        ↓
addOrder('midtrans') action
   ├─ POST /api/order/add { cartId, total, paymentMethod: 'midtrans' }
   ├─ Response: { order: {...}, midtrans: { token, clientKey } }
        ↓
Server Processing:
   ├─ Save Order to MongoDB
   ├─ Send confirmation email
   ├─ Create Midtrans Snap transaction
   └─ Return token
        ↓
Load Snap Script
   ├─ window.snap.pay(token, callbacks)
        ↓
User Payment UI
   ├─ Enter payment details
   ├─ Complete transaction
        ↓
Callback (onSuccess/onPending)
   ├─ dispatch(push(/order/success/[id]))
   ├─ dispatch(clearCart())
        ↓
Redirect to Order Success Page
```

---

## 🔧 Environment Configuration

### Sandbox (Testing)

```env
NODE_ENV=development
SERVER_KEY=SB-Mid-server-a736LlTj3H2YhDbHFBZ7r064
CLIENT_KEY=SB-Mid-client-82pWwmhrAb0WRpBS
```

### Production (Live)

```env
NODE_ENV=production
SERVER_KEY=your_production_server_key
CLIENT_KEY=your_production_client_key
```

---

## 📝 API Reference

### POST /api/order/add

**Request:**

```json
{
  "cartId": "507f1f77bcf86cd799439011",
  "total": 50000,
  "paymentMethod": "midtrans"
}
```

**Response (Success with Midtrans):**

```json
{
  "success": true,
  "message": "Your order has been placed successfully!",
  "order": {
    "_id": "507f1f77bcf86cd799439012"
  },
  "midtrans": {
    "token": "snap_xxx...",
    "redirect_url": "https://app.sandbox.midtrans.com/snap?token=snap_xxx...",
    "clientKey": "SB-Mid-client-xxx..."
  }
}
```

---

## ✨ What's Next?

- [ ] Test full payment flow locally
- [ ] Test sandbox cards (provided above)
- [ ] Monitor server & browser logs
- [ ] Document any issues
- [ ] Once working, implement webhook for payment status updates
- [ ] Deploy to production with real keys

---

**Need help?** Check console logs first - they contain the most detailed info about what's happening! 🎯
