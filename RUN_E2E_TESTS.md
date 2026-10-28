# Running End-to-End Tests for TNEDMS

This guide will help you run automated end-to-end tests against your local development environment following the END_TO_END_TESTING_PLAYBOOK.md.

## Prerequisites

### 1. Backend Server Must Be Running
```powershell
cd backend
npm start
# or
npm run dev
```
The backend should be accessible at `http://127.0.0.1:5000`

### 2. Frontend Dev Server Must Be Running
```powershell
cd frontend
npm run dev
```
The frontend should be accessible at `http://localhost:5173`

### 3. MongoDB Must Be Running
- Local MongoDB instance at `mongodb://127.0.0.1:27017`
- Or ensure MongoDB Atlas connection is working (check backend/.env)

### 4. Install Test Dependencies
```powershell
# From the root directory (EDM-online)
npm install node-fetch
```

## Running the Automated Tests

### Option 1: Run All Tests Automatically
```powershell
# From the root directory (EDM-online)
node e2e-testing-automation.mjs
```

This will:
- ✓ Test direct access (no HTTP Basic Auth)
- ✓ Test incomplete registration capture
- ✓ Test manual lead assignment
- ✓ Test round-robin distribution
- ✓ Test telecaller workspace and queue isolation
- ✓ Test call logging functionality
- ✓ Test full candidate registration flow
- ✓ Test CRM auto-synchronization
- ⚠ WhatsApp re-engagement (manual testing required)

### Option 2: Run Tests Against Staging
```powershell
# Test against live staging environment
$env:TEST_BASE_URL="https://tnedms.online"
$env:TEST_API_URL="https://tnedms.online"
node e2e-testing-automation.mjs
```

**⚠️ WARNING:** Running tests against staging will create real data!

## Test Output

### Console Output
The script provides color-coded console output:
- 🔵 **Blue**: Test scenario headers
- 🟢 **Green**: Passed tests
- 🔴 **Red**: Failed tests
- 🟡 **Yellow**: Warnings or manual tests

### Test Report File
After completion, check `e2e-test-report.json` for detailed results:
```json
{
  "timestamp": "2026-10-27T...",
  "summary": {
    "total": 8,
    "passed": 7,
    "failed": 1,
    "passRate": "87.5%"
  },
  "results": [...]
}
```

## Manual Testing Scenarios

Some scenarios require manual testing through the browser:

### 1. Incomplete Registration Drop-off (Browser)
1. Open incognito: `http://localhost:5173/register`
2. Fill Step 1 with test data
3. Click Next
4. **Close the tab immediately**
5. Login as admin: `http://localhost:5173/login`
6. Go to: `http://localhost:5173/incomplete-registrations`
7. Verify the lead appears under "To follow up"

### 2. Telecaller Workspace (Browser)
1. Login as `abinaya` / `123456`
2. Navigate to: `http://localhost:5173/team/crm`
3. Verify only assigned leads appear
4. Click a conversation
5. Log a call outcome with notes
6. Verify notes are saved

### 3. Full Registration Flow (Browser)
1. Go to: `http://localhost:5173/register`
2. Complete all steps with test data
3. Submit registration
4. Login with new credentials
5. Verify candidate dashboard loads
6. Check admin panel shows "Registered" status

## Troubleshooting

### Tests Fail to Connect
```
Error: Failed to access frontend: connect ECONNREFUSED
```
**Solution:** Make sure both frontend and backend servers are running

### Admin Login Fails
```
✗ FAIL: Failed to login as admin
```
**Solution:** 
- Check backend/.env has correct ADMIN_USERNAME and ADMIN_PASSWORD
- Ensure MongoDB is running and accessible
- Check backend logs for errors

### Lead Creation Fails
```
✗ FAIL: Failed to create lead: API error
```
**Solution:**
- Check backend API is responding at http://127.0.0.1:5000
- Verify MongoDB connection
- Check backend console for error details

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
- Find and kill the process using port 5000
- Or change PORT in backend/.env to a different port
- Update TEST_API_URL accordingly

## Test Data Cleanup

After running tests, you may want to clean up test data:

```javascript
// Connect to MongoDB and run:
db.tbl_leads.deleteMany({ mobile: /^9840\d{6}$/ })
db.tbl_user.deleteMany({ mobile: /^9840\d{6}$/ })
```

Or use a cleanup script:
```powershell
node cleanup-test-data.mjs
```

## Expected Results Summary

| Test | Expected Result | Auto-Tested |
|------|----------------|-------------|
| Direct access | No HTTP Basic Auth prompt | ✓ Yes |
| Incomplete registration | Lead captured in system | ✓ Yes |
| Manual assignment | Lead assigned to telecaller | ✓ Yes |
| Round-robin | Leads distributed evenly | ✓ Yes |
| Telecaller queue | Only assigned leads visible | ✓ Yes |
| Call logging | Notes saved to history | ✓ Yes |
| Full registration | Candidate dashboard loads | ✓ Yes |
| CRM auto-sync | Status updates to "Registered" | ✓ Yes |
| WhatsApp re-engagement | Gets login link, not registration | ⚠ Manual |

## Reporting Issues

If tests fail consistently:
1. Check the `e2e-test-report.json` file
2. Review backend and frontend console logs
3. Verify all environment variables in backend/.env
4. Ensure MongoDB has proper indexes and collections
5. Check network connectivity between components

## Next Steps

After successful testing:
1. Review the test report
2. Fix any failing scenarios
3. Document any environment-specific issues
4. Deploy to staging for physical testing
5. Use the physical tester sign-off sheet from END_TO_END_TESTING_PLAYBOOK.md
