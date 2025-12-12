# Midtrans Payment Integration Guide

## Overview

This document explains the Midtrans Snap integration for the MERN ecommerce application. The integration allows users to pay for orders using Midtrans payment gateway.

## Implementation Details

### Backend (Server)

**File:** `server/routes/api/order.js`

**Key Endpoint:** `POST /api/order/add`

**Flow:**

1. User clicks "Place Order" button
2. Request is sent to `POST /api/order/add` with:

   - `cartId`: The cart ID (from localStorage)
   - `total`: The total amount
   - `paymentMethod`: 'midtrans' (default)

3. Server:
   - Creates the Order document in MongoDB
   - Finds the Cart with products
   - Sends confirmation email via Mailgun
   - **If paymentMethod === 'midtrans'**:
     - Creates a Midtrans Snap transaction using `midtrans-client` library
     - Returns `midtrans.token` and `clientKey` to client

**Response Example:**

```json
{
  "success": true,
  "message": "Your order has been placed successfully!",
  "order": { "_id": "order123" },
  "midtrans": {
    "token": "snap_token_abc123",
    "redirect_url": "https://app.sandbox.midtrans.com/...",
    "clientKey": "your_client_key"
  }
}
```

### Frontend (Client)

**Main Files:**

- `client/app/containers/Order/actions.js` - Redux actions
- `client/app/containers/Cart/index.js` - Cart container
- `client/app/components/Store/Checkout/index.js` - Checkout component

**Flow:**

1. **placeOrder()** action:

   - Validates user is authenticated and cart has items
   - Gets or creates `cart_id`
   - Calls `addOrder()`

2. **addOrder()** action:

   - Sends POST request to `/api/order/add` with `paymentMethod: 'midtrans'`
   - If Midtrans token is received:
     - Loads Snap script dynamically from CDN
     - Calls `window.snap.pay(token, callbacks)`
   - Handles payment callbacks:
     - `onSuccess`: Redirects to order success page and clears cart
     - `onPending`: Redirects to order success page (payment pending)
     - `onError`: Redirects to order details page
     - `onClose`: User closed payment widget

3. **Snap Script Loading:**
   - Sandbox: `https://app.sandbox.midtrans.com/snap/snap.js`
   - Production: `https://app.midtrans.com/snap/snap.js`
   - Script is cached in DOM (only loads once)

## Environment Variables

**Server `.env`:**

```
MERCHANT_ID=your_merchant_id          # Available in Midtrans dashboard
SERVER_KEY=SB-Mid-server-xxxxx        # Sandbox or Production server key
CLIENT_KEY=SB-Mid-client-xxxxx        # Sandbox or Production client key
NODE_ENV=development                  # 'development' for sandbox, 'production' for live
```

**Current Setup:** Using Sandbox keys (for testing)

## Testing Locally

### Prerequisites:

1. MongoDB running locally (default: `mongodb://127.0.0.1:27017/mern_ecommerce`)
2. Server running: `npm run dev` (from `server/` folder)
3. Client running: `npm start` (from `client/` folder)

### Test Steps:

1. **Check Console Logs:**

   - Browser DevTools → Console
   - Terminal where server is running
   - Look for logs starting with "placeOrder", "addOrder", "Midtrans"

2. **Manual Testing:**

   - Login to the application
   - Add products to cart
   - Click "Place Order"
   - **Check browser console** for:
     ```
     placeOrder called
     Token exists: true, Cart items length: X
     Proceeding with order placement, getting cart ID...
     Cart ID obtained, calling addOrder...
     addOrder - cartId: xxx, total: xxx, paymentMethod: midtrans
     Midtrans token received, initiating payment...
     Loading Midtrans Snap script from: https://app.sandbox...
     Snap script loaded successfully
     Running Snap with token: snap_xxx
     ```
   - **Check server console** for:
     ```
     Creating order - cart: xxx, total: xxx, paymentMethod: midtrans
     Order saved: xxx
     Creating Midtrans transaction...
     Midtrans transaction created: snap_xxx
     ```

3. **Midtrans Sandbox Payment Test:**
   - Use test card: `4811 1111 1111 1114`
   - Expiry: any future date (e.g., 12/25)
   - CVV: 123
   - OTP: 123456

### Troubleshooting

**Issue: "Midtrans token received" but Snap widget doesn't appear**

- Check: `window.snap` is available in browser console
- Ensure CDN URL is accessible
- Check data-client-key attribute is set correctly

**Issue: "Loading Midtrans Snap script" but never completes**

- Check Network tab → Snap script request status
- Verify internet connection
- Try hard refresh (Ctrl+Shift+R)

**Issue: Cart not found or no cartId**

- Ensure user is logged in
- Ensure cart items exist in redux state
- Check localStorage has `cart_id` set

**Issue: Midtrans error in server console**

- Verify `SERVER_KEY` and `CLIENT_KEY` are correct
- Check `NODE_ENV` setting
- Verify Midtrans account is active
- Check Midtrans dashboard for API logs

## Production Deployment

1. Update `server/.env`:

   ```
   NODE_ENV=production
   SERVER_KEY=your_production_server_key
   CLIENT_KEY=your_production_client_key
   ```

2. Snap script will automatically use production URL: `https://app.midtrans.com/snap/snap.js`

3. Test thoroughly with Midtrans production keys before going live

## Dependencies

- **Server:** `midtrans-client` (v1.4.3+)
- **Client:** Uses Midtrans Snap CDN (no additional npm package needed)

## Next Steps (Optional Enhancements)

1. **Webhook Integration:** Implement `/api/order/midtrans-callback` to handle Midtrans notifications
2. **Payment Status:** Store Midtrans transaction ID and status in Order model
3. **UI Improvements:** Add payment status indicators in order details
4. **Error Recovery:** Save draft orders to retry payment later
