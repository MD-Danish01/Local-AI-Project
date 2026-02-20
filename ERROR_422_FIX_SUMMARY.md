# Error -422 Fix Summary

## What Was Done

### 1. **Enhanced LLMService Error Handling**
- Added detailed error code capture (the -422 code is now logged)
- Added error stack traces for debugging
- Better error messages with context
- Logs model path, model ID, and error details

### 2. **Added Copy Logs Button**
Location: **Logs Tab** (middle tab)

**Features:**
- **📋 Copy Button**: Copies filtered logs to clipboard as JSON
- **📤 Share Button** (mobile only): Share logs via system share sheet
- **Clear Button**: Clear all logs

**How to Use:**
1. Open the **Logs tab**
2. Optionally filter by ERROR to see only errors
3. Tap **📋 Copy** to copy logs to clipboard
4. Paste logs in a text editor or message to share

The copied logs include:
- Timestamp
- Log level
- Category
- Message
- All details (error codes, paths, etc.)

### 3. **Improved Error Logging Throughout**

All services now log with more detail:

**LLMService:**
- Logs error codes (like -422)
- Logs model path being used
- Logs model ID
- Captures stack traces

**ModelService:**
- Validates model path format (.gguf check)
- Logs path validation errors
- Logs model preparation steps

**ModelDownloadService:**
- Logs download URL and destination
- Logs file size and progress
- Logs completion status

**DatabaseService:**
- Logs all database operations
- Logs query failures with details

### 4. **Created Troubleshooting Guides**

**Files Created:**
- `FIXES_DOCUMENTATION.md` - Technical implementation details
- `LOGS_TAB_GUIDE.md` - User guide for using logs
- `TROUBLESHOOTING_422.md` - Specific guide for error -422

## How to Debug Error -422

### Quick Steps:

1. **Open Logs Tab** (middle tab icon)
2. **Filter by ERROR** (tap the ERROR button)
3. **Find "LLM initialization failed" log**
4. **Tap the log to expand it**
5. **Look for these details:**
   ```json
   {
     "error": "actual error message",
     "errorCode": "-422",
     "modelPath": "file:///path/to/model.gguf",
     "modelId": "qwen2.5-0.5b-q4",
     "stack": "error stack trace..."
   }
   ```

6. **Tap 📋 Copy button** to copy all logs
7. **Paste into a text editor** to review

### What to Look For:

**Model Path Issues:**
- Path should start with `file://`
- Path should end with `.gguf`
- Path should point to documents directory

**SDK Issues:**
- Check for "RunAnywhere SDK ready" log before model loading
- If missing, SDK didn't initialize

**Download Issues:**
- Check for "Model downloaded successfully" log
- Verify download wasn't interrupted
- Check file size matches expected size (~397 MB)

## Testing Your Fix

### Test 1: Check Logs Appear
1. Start the app
2. Go to Logs tab
3. You should see logs like:
   ```
   ✅ INFO [App] Starting app initialization
   ✅ INFO [Database] Initializing database
   ✅ INFO [Database] Database initialized successfully
   ```

### Test 2: Test Copy Button
1. Send a message in chat (it might fail, that's ok)
2. Go to Logs tab
3. Tap **📋 Copy**
4. Paste in Notes app
5. You should see JSON with all log entries

### Test 3: Check Error Details
1. If error -422 occurs:
2. Go to Logs tab
3. Filter by ERROR
4. Tap the error log
5. You should see full error details including:
   - Error code: -422
   - Model path
   - Model ID
   - Stack trace

### Test 4: Verify Model Path
1. After successful download
2. Check Logs tab
3. Look for "Model found on device" log
4. Expand it to see the path
5. Path should be: `file:///data/.../qwen2.5-0.5b-instruct-q4_0.gguf`

## Common Issues and Solutions

### Issue: Still Getting Error -422

**Possible Causes:**
1. Model file corrupt - Re-download
2. Wrong path format - Check logs for exact path
3. SDK not initialized - Check for SDK ready log
4. Insufficient memory - Close other apps

**Solution:**
1. Copy logs using the Copy button
2. Look for the error log
3. Check the `modelPath` in error details
4. Verify path format is correct
5. If path is wrong, check ModelService code

### Issue: Copy Button Not Working

**Check:**
- expo-clipboard package is installed
- Permissions are granted
- Try the Share button instead

**Fix:**
```bash
npm install expo-clipboard
```

### Issue: No Logs Appearing

**Check:**
1. Make sure you're on the Logs tab (middle tab)
2. Check filter is set to ALL
3. Try performing an action (send message)

**Fix:**
- Force quit and restart app
- Logs should start appearing immediately

## What the Error -422 Means

Error code -422 from RunAnywhere SDK typically means:

1. **Model file not found** at the specified path
2. **Model file corrupted** or incomplete
3. **Invalid model format** (not a valid GGUF file)
4. **SDK not properly initialized** before loading
5. **Memory issues** preventing model loading

The enhanced logging now captures:
- The exact error message from SDK
- The error code (-422)
- The path that was attempted
- The model ID being used
- Full stack trace for debugging

## Next Steps

1. **Run the app and reproduce the error**
2. **Go to Logs tab immediately**
3. **Tap Copy button**
4. **Review the logs** to find:
   - What step failed
   - What the error code was
   - What the model path was
   - Any other error details

5. **Check the troubleshooting guide** at `TROUBLESHOOTING_422.md`

6. **If issue persists**, share the copied logs for further analysis

## Key Files Modified

1. **services/llm/LLMService.ts** - Enhanced error capture
2. **services/llm/ModelService.ts** - Added validation
3. **services/llm/ModelDownloadService.ts** - Added download logging
4. **services/database/DatabaseService.ts** - Added DB logging
5. **services/logging/LoggingService.ts** - Core logging service
6. **app/(tabs)/logs.tsx** - Logs UI with Copy button
7. **hooks/useLLMChat.ts** - Chat operation logging
8. **contexts/LLMContext.tsx** - App initialization logging

All services now log comprehensively, making it much easier to debug issues like the -422 error.

## Success Criteria

You know the fix is working when:

1. ✅ Logs appear in the Logs tab
2. ✅ Copy button successfully copies logs
3. ✅ Error logs show error code (-422)
4. ✅ Error logs show model path
5. ✅ Error logs show full details
6. ✅ You can trace exactly where it fails

The logging system is now comprehensive enough that **any error** should be easily diagnosable through the Logs tab.
