# E2E Testing Quick Start Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Ensure Servers Are Running

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```
Backend should show: `[edm] API listening on http://localhost:5000`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
Frontend should show: `Local: http://localhost:5173/`

### Step 2: Run the Tests

**Terminal 3 - From project root:**
```powershell
# Easy way - Use the PowerShell runner
.\run-tests.ps1

# OR directly with Node
node e2e-testing-automation.mjs
```

### Step 3: Review Results

Check the console output and `e2e-test-report.json` file for detailed results.

---

## 📋 What Gets Tested

The automated tests cover all scenarios from `END_TO_END_TESTING_PLAYBOOK.md`:

✅ **Scenario 0:** Direct access (no HTTP Basic Auth prompt)
✅ **Scenario 1:** Incomplete registration capture
✅ **Scenario 2A:** Manual lead assignment to telecaller
✅ **Scenario 2B:** Round-robin automatic distribution
✅ **Scenario 3:** Telecaller workspace & queue isolation
✅ **Scenario 3:** Call logging with notes
✅ **Scenario 3:** Cross-agent isolation verification
✅ **Scenario 4:** Full candidate registration flow
✅ **Scenario 4:** Candidate dashboard verification
✅ **Scenario 4:** CRM automatic status synchronization
⚠️ **Scenario 5:** WhatsApp re-engagement (requires manual testing)

---

## 🎯 Test Against Different Environments

### Local Development (Default)
```powershell
.\run-tests.ps1
```

### Staging Server (tnedms.online)
```powershell
.\run-tests.ps1 -Staging
```
⚠️ **Warning:** This will create real data on staging!

### Custom Environment
```powershell
$env:TEST_BASE_URL="http://your-frontend-url"
$env:TEST_API_URL="http://your-backend-url"
node e2e-testing-automation.mjs
```

---

## 🧹 Clean Up Test Data

After running tests, clean up test records:

```powershell
# Interactive cleanup
.\run-tests.ps1 -Cleanup

# OR directly
node cleanup-test-data.mjs --force
```

This removes:
- Test leads (mobile: 9840XXXXXX)
- Test users (names containing: Test, Auto, Automated)
- Test CRM conversations

---

## 📊 Understanding Test Results

### Console Output Colors
- 🔵 **Blue** = Test scenario header
- 🟢 **Green** = Test passed
- 🔴 **Red** = Test failed
- 🟡 **Yellow** = Warning or manual test needed

### Test Report JSON
```json
{
  "summary": {
    "total": 8,
    "passed": 7,
    "failed": 1,
    "passRate": "87.5%"
  },
  "results": [
    {
      "testItem": "Incomplete registration capture",
      "targetUrl": "/incomplete-registrations",
      "expectedResult": "Lead appears under 'To follow up'",
      "status": "PASS",
      "details": "Lead ID: 507f1f77bcf86cd799439011",
      "timestamp": "2026-10-27T10:30:00.000Z"
    }
  ]
}
```

---

## 🔧 Troubleshooting

### "Cannot connect to backend"
```
✗ FAIL: Failed to access frontend: connect ECONNREFUSED
```
**Fix:** Start the backend server
```powershell
cd backend
npm start
```

### "Admin login failed"
```
✗ FAIL: Failed to login as admin
```
**Fix:** Check `backend/.env` has correct credentials:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=UL5-q9SmiZLcSp9l
```

### "MongoDB connection failed"
**Fix:** Ensure MongoDB is running
```powershell
# Check if MongoDB service is running
Get-Service MongoDB

# Or if using MongoDB Atlas, check backend/.env:
# MONGO_APP_URL=mongodb+srv://...
```

### "Port 5000 already in use"
**Fix:** Find and kill the process or change port
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in backend/.env
# PORT=5001
```

---

## 📝 Manual Testing Checklist

Some scenarios are best tested manually through the browser:

### Browser Test 1: Incomplete Registration
1. ✅ Open incognito: `http://localhost:5173/register`
2. ✅ Fill Step 1, click Next
3. ✅ Close tab immediately
4. ✅ Login as admin, check `/incomplete-registrations`
5. ✅ Verify lead appears with correct source

### Browser Test 2: Telecaller Experience
1. ✅ Login as `abinaya` / `123456`
2. ✅ Go to `/team/crm`
3. ✅ Click a conversation
4. ✅ Log call outcome with notes
5. ✅ Verify notes save and timestamp updates

### Browser Test 3: Full Registration
1. ✅ Complete registration form at `/register`
2. ✅ Login with new credentials
3. ✅ Verify dashboard shows assembly data
4. ✅ Check admin panel shows "Registered" status

### Browser Test 4: WhatsApp Flow
1. ✅ Send "Hi" to WhatsApp bot from registered number
2. ✅ Verify bot responds with login link (not registration)
3. ✅ If unpaid, verify payment instructions appear

---

## 🎓 Test Credentials Reference

### Super Admin
- URL: `http://localhost:5173/login`
- Username: `admin`
- Password: `UL5-q9SmiZLcSp9l`

### Telecallers (all use passcode `123456`)
| Name | Username | Workspace |
|------|----------|-----------|
| Abinaya M | `abinaya` | `/team/crm` |
| Yuvasri | `yuvasri` | `/team/crm` |
| Omsree | `omsree` | `/team/crm` |
| Sathiya Priya I | `sathiyapriya` | `/team/crm` |
| A. Vedha Priya | `vedhapriya` | `/team/crm` |

### Test Candidate (created by automated tests)
- Mobile: `9840XXXXXX` (auto-generated)
- Passcode: `123456`
- Portal: `/candidate`

---

## 📁 Files Created

After running tests:
- `e2e-test-report.json` - Detailed test results
- Console output - Real-time test progress

Test scripts:
- `e2e-testing-automation.mjs` - Main test automation
- `cleanup-test-data.mjs` - Database cleanup utility
- `run-tests.ps1` - PowerShell test runner

---

## 🎯 Next Steps

1. ✅ Run automated tests
2. ✅ Review test report
3. ✅ Perform manual browser tests
4. ✅ Fix any failing scenarios
5. ✅ Clean up test data
6. ✅ Deploy to staging
7. ✅ Run tests against staging
8. ✅ Complete physical tester sign-off sheet

---

## 💡 Tips

- Run tests frequently during development
- Keep test data clean (run cleanup regularly)
- Review failed tests immediately
- Use staging tests before production deployment
- Document any environment-specific issues
- Keep test credentials secure (don't commit .env files)

---

## 📞 Need Help?

If tests consistently fail:
1. Check all services are running (backend, frontend, MongoDB)
2. Verify environment variables in `backend/.env`
3. Review backend and frontend console logs
4. Check `e2e-test-report.json` for detailed error messages
5. Try cleaning test data and re-running
6. Ensure MongoDB has proper connectivity

---

**Happy Testing! 🎉**
