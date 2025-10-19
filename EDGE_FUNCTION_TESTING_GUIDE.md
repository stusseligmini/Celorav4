# 🧪 **EDGE FUNCTION TESTING GUIDE**

## 🎯 **Current Status:**
✅ **Database Schema**: DEPLOYED & READY  
✅ **Edge Functions**: DEPLOYED & WAITING  
🧪 **Next**: Test WebSocket & Push Notification functions  

---

## 🔥 **TEST PROCEDURE:**

### **Step 1: Open Supabase Functions Dashboard**
**URL**: https://supabase.com/dashboard/project/zpcycakwdvymqhwvakrv/functions

### **Step 2: Test WebSocket Edge Function**
1. **Click** on `solana-websocket-stream` function
2. **Click** "Test Function" or "Invoke" button  
3. **Copy & Paste** this payload:

```json
{
  "action": "subscribe",
  "data": {
    "wallet_address": "11111111111111111111111111111112",
    "subscription_type": "account",
    "user_id": "test-user-id",
    "auto_link_enabled": true
  }
}
```

**Expected Result**: `{"success": true, "message": "Subscription created"}`

### **Step 3: Test Push Notification Edge Function**
1. **Click** on `solana-push-notifications` function  
2. **Click** "Test Function" or "Invoke" button
3. **Copy & Paste** this payload:

```json
{
  "action": "send_solana_transaction",
  "data": {
    "user_id": "test-user-id",
    "transaction_data": {
      "signature": "test-signature-123",
      "amount": "1.5",
      "token": "SOL",
      "transaction_type": "incoming",
      "network": "mainnet"
    }
  }
}
```

**Expected Result**: `{"success": true, "message": "Notification sent successfully"}`

---

## 🎊 **WHAT SUCCESS LOOKS LIKE:**

### **✅ WebSocket Function Success:**
- Creates subscription in `websocket_subscriptions` table
- Returns subscription ID  
- Shows "QuikNode WebSocket connection established"

### **✅ Push Notification Function Success:**  
- Creates notification in `solana_notification_queue` table
- Uses correct template from `solana_notification_templates`
- Returns success message with notification ID

---

## 🚨 **Common Issues & Fixes:**

### **❌ "Table doesn't exist" Error:**
- **Solution**: Make sure all 4 schema steps were completed
- **Check**: Go to Database → Tables in Supabase Dashboard

### **❌ "VAPID keys not found" Error:**
- **Solution**: Keys are already configured! This is expected for test environment
- **Result**: Function still works, just logs warning

### **❌ "Authentication error":**
- **Solution**: These are test functions, authentication is bypassed in test mode

---

## 🎯 **AFTER SUCCESSFUL TESTING:**

1. **✅ Both functions work** → Move to UI integration
2. **✅ Database tables populated** → Ready for real-time features  
3. **✅ Notifications processed** → Ready for production push notifications

**Next Steps**: Integrate AutoLinkDashboard and NotificationSettings into main app! 🚀

---

*Test both functions, then let me know the results! We're almost at 100% completion! 🌟*