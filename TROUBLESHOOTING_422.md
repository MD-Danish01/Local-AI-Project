# Troubleshooting Error -422: Unable to Load LLM

## What is Error -422?

Error code -422 from the RunAnywhere SDK typically indicates that the model file could not be loaded properly. This can happen for several reasons.

## Common Causes and Solutions

### 1. **Model File Path Issue**

**Symptoms:**
- Error -422 appears when trying to load the model
- Logs show "LLM initialization failed"

**Solution:**
Check the logs for the exact path being used. The model path should:
- Be in the format: `file:///data/user/0/.../qwen2.5-0.5b-instruct-q4_0.gguf`
- Point to a .gguf file
- Be a valid file URI (starts with `file://`)

**How to Fix:**
1. Go to **Logs tab**
2. Filter by **ERROR**
3. Find the "LLM initialization failed" log
4. Tap to expand and check the `modelPath` value
5. If the path looks wrong, the issue is in model preparation

### 2. **SDK Not Initialized**

**Symptoms:**
- Error happens very early in app startup
- Logs show SDK initialization errors before model loading

**Solution:**
The RunAnywhere SDK must be initialized before loading models.

**Check:**
1. Open **Logs tab**
2. Look for "Initializing RunAnywhere SDK" log
3. Verify you see "RunAnywhere SDK ready" before "Loading model"

**Fix in Code:**
The initialization happens in `LLMContext.tsx` and should be done before any model operations.

### 3. **Model File Corrupted or Incomplete**

**Symptoms:**
- Download completed but model won't load
- Error -422 appears after successful download

**Solution:**
1. Go to **Logs tab**
2. Check the download completed successfully
3. Delete the model file and re-download:
   - Force quit the app
   - Clear app data (Settings > Apps > Your App > Clear Data)
   - Restart and download again

### 4. **Incorrect Model Format**

**Symptoms:**
- Error -422 with message about unsupported format
- Model loads but can't generate

**Solution:**
Ensure you're using a GGUF format model that's compatible with LlamaCPP:
- Model should be `.gguf` extension
- Should be a quantized model (Q4, Q5, Q8)
- Current config uses: `qwen2.5-0.5b-instruct-q4_0.gguf`

### 5. **Memory Issues**

**Symptoms:**
- Error -422 on devices with low RAM
- App crashes during model loading

**Solution:**
- Close other apps to free memory
- Restart device
- Consider using a smaller model if available

## Debugging Steps

### Step 1: Check Logs
1. Open **Logs tab**
2. Tap **Copy** button to copy all logs
3. Look for these key log entries in order:

```
✅ INFO [App] Starting app initialization
✅ INFO [Database] Initializing database
✅ INFO [Database] Database initialized successfully
✅ INFO [Model] Checking if model exists on device
✅ INFO [Model] Model found on device
✅ INFO [Model] Preparing model from local path
✅ INFO [LLM] Initializing LLM with RunAnywhere SDK
```

If any of these fail, that's where the problem is.

### Step 2: Verify Model Path
Look for the log with model path details:
```
✅ INFO [LLM] Initializing LLM with RunAnywhere SDK
   Details: {
     modelPath: "file:///path/to/model.gguf",
     modelId: "qwen2.5-0.5b-q4"
   }
```

The path should:
- Start with `file://`
- End with `.gguf`
- Point to the documents directory

### Step 3: Check Error Details
When error -422 occurs, expand the error log to see:
```
❌ ERROR [LLM] LLM initialization failed
   Details: {
     error: "Error message here",
     errorCode: "-422",
     modelPath: "...",
     modelId: "...",
     stack: "Error stack trace..."
   }
```

The `error` field will tell you exactly what went wrong.

### Step 4: Verify SDK Initialization
Make sure these logs appear early:
```
✅ INFO Initializing RunAnywhere SDK...
✅ INFO RunAnywhere SDK ready
```

If missing, the SDK didn't initialize properly.

## Quick Fixes to Try

### Fix 1: Restart App
1. Force quit the app
2. Reopen and check logs
3. See if error persists

### Fix 2: Re-download Model
1. Clear app data or reinstall
2. Download model again
3. Check logs during download
4. Verify "Download complete" log appears

### Fix 3: Check Model URL
In `services/llm/config.ts`, verify:
```typescript
url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf'
```

The URL should be accessible and point to a valid GGUF file.

### Fix 4: Verify File System Permissions
The app needs permission to:
- Download files
- Store files in documents directory
- Read files from documents directory

Check app permissions in device settings.

## Code Changes That Can Help

### 1. Enhanced Error Logging (Already Implemented)

The LLMService now includes:
- Error code capture
- Full stack traces
- Model path logging
- Alternative loading methods

### 2. Add Retry Logic

If the error is intermittent, you could add:

```typescript
// In LLMService.initialize()
let retries = 3;
while (retries > 0) {
  try {
    await RunAnywhere.loadModel({ id: this.modelId, uri: modelPath });
    break;
  } catch (error) {
    retries--;
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 3. Validate File Before Loading

Add file validation before loading:

```typescript
// Check file exists and is not empty
const fileInfo = await FileSystem.getInfoAsync(modelPath);
if (!fileInfo.exists || fileInfo.size < 1000000) {
  throw new Error('Model file missing or too small');
}
```

## Getting Help

If the error persists:

1. **Copy Logs**: Use the **Copy** button in Logs tab
2. **Note Error Code**: Look for error code in logs
3. **Check Model Path**: Verify the path format
4. **Device Info**: Note device model and OS version
5. **Report Issue**: Share logs with these details

## Expected Log Sequence (Success)

When everything works correctly, you should see:

```
✅ INFO [App] Starting app initialization
✅ INFO [Database] Initializing database
✅ INFO [Database] Database initialized successfully
✅ INFO [Database] Conversation ready
✅ INFO [Model] Checking if model exists on device
✅ INFO [Model] Model found on device
✅ INFO [Model] Preparing model from local path
✅ INFO [Model] Model prepared successfully
✅ INFO [LLM] Initializing LLM with RunAnywhere SDK
✅ INFO [LLM] Model loaded successfully with ID
✅ INFO [LLM] LLM initialized successfully
✅ INFO [App] LLM ready for inference
```

Any deviation from this sequence indicates where the problem is.

## Prevention

To avoid -422 errors in the future:

1. **Always check logs after download**
2. **Verify model file size matches expected size**
3. **Don't interrupt downloads**
4. **Keep app updated**
5. **Ensure sufficient device storage**

The new logging system makes it much easier to diagnose these issues. Always check the **Logs tab** first when troubleshooting!
