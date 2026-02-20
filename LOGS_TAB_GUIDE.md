# How to Use the Logs Tab

## Overview
The Logs tab provides real-time visibility into everything happening in your app. It shows all events, errors, warnings, and debug information.

## Features

### 1. Real-Time Logging
- All app operations are automatically logged
- Logs update in real-time as events occur
- No need to refresh - the UI updates automatically

### 2. Log Levels
Each log entry has a severity level with color coding:

- **ERROR** (Red ❌): Critical errors that need attention
- **WARN** (Orange ⚠️): Warnings about potential issues
- **INFO** (Green ✅): Informational messages about operations
- **DEBUG** (Blue 🔍): Detailed debugging information

### 3. Filtering
Use the filter buttons at the top to show only specific log levels:
- **ALL**: Shows all logs
- **ERROR**: Shows only errors
- **WARN**: Shows only warnings
- **INFO**: Shows only informational messages
- **DEBUG**: Shows only debug messages

Each button shows the count of logs for that level.

### 4. Log Details
- **Tap any log entry** to expand it and see full details
- Expanded view shows:
  - Timestamp
  - Log level
  - Category (which part of the app logged it)
  - Message
  - Additional details (JSON data, error stacks, etc.)

### 5. Categories
Logs are organized by category:

- **App**: Application lifecycle events
- **LLM**: AI model operations (initialization, generation)
- **Download**: Model download progress
- **Database**: Database operations
- **Chat**: Chat message operations
- **Model**: Model management

### 6. Clear Logs
- Tap the **Clear** button in the top right to delete all logs
- Useful when you want to start fresh

## Common Use Cases

### Debugging Chat Not Responding

1. Go to **Logs tab**
2. Filter by **ERROR**
3. Look for recent errors related to:
   - LLM initialization
   - Model loading
   - Message generation
4. Tap the error to see full details
5. Check the error message and details for the root cause

### Monitoring Model Download

1. Start the download
2. Switch to **Logs tab**
3. Filter by **INFO** to see progress
4. Watch for:
   - "Starting model download"
   - Download progress updates
   - "Model downloaded successfully"
   - "Loading model into LLM engine"
   - "LLM ready for inference"

### Tracking Message Flow

1. Send a message in chat
2. Go to **Logs tab**
3. Filter by **INFO** or **ALL**
4. You should see logs for:
   - User message saved
   - Prompt built
   - Starting AI generation
   - Generation complete
   - Assistant message saved

### Investigating Errors

When you see an error in the chat:

1. Note the time it occurred
2. Go to **Logs tab**
3. Filter by **ERROR**
4. Find the error that matches the time
5. Tap to expand and see:
   - Full error message
   - Error stack trace
   - Context data (prompt length, model path, etc.)

## Tips

- **Keep Logs tab open** during development to watch operations in real-time
- **Use filters** to focus on specific issues
- **Expand log entries** to see full context
- **Clear logs** before testing specific features to isolate relevant logs
- **Check timestamps** to correlate UI events with logged operations

## Example Log Flow

### Successful Message Send:
```
✅ INFO [Chat] User sending message
✅ INFO [Chat] User message saved to database
✅ INFO [Chat] Starting AI generation
✅ INFO [LLM] Starting text generation
✅ INFO [LLM] Generation complete (streaming)
✅ INFO [Chat] Generation complete
✅ INFO [Chat] Assistant message saved to database
```

### Error During Generation:
```
✅ INFO [Chat] User sending message
✅ INFO [Chat] User message saved to database
✅ INFO [Chat] Starting AI generation
❌ ERROR [LLM] Generation failed
   Details: "LLM not initialized. Call initialize() first."
❌ ERROR [Chat] Failed to generate response
```

### App Initialization:
```
✅ INFO [App] Starting app initialization
✅ INFO [Database] Initializing database
✅ INFO [Database] Database initialized successfully
✅ INFO [Database] Conversation ready
✅ INFO [Model] Checking for model file
✅ INFO [Model] Model found on device
✅ INFO [Model] Loading model into LLM engine
✅ INFO [LLM] Initializing LLM with RunAnywhere SDK
✅ INFO [LLM] LLM initialized successfully
✅ INFO [App] LLM ready for inference
```

## Troubleshooting

### No Logs Appearing
- Make sure you're on the **Logs tab**
- Check if filter is set to **ALL**
- Try performing an action (send a message) to generate logs

### Too Many Logs
- Use **filters** to narrow down
- **Clear** old logs to focus on recent activity
- Look at **timestamps** to find relevant logs

### Can't Read Log Details
- **Tap the log entry** to expand it
- Scroll horizontally in the details view for long text
- Details section shows full JSON data and stack traces

## Best Practices

1. **Check logs immediately** when something goes wrong
2. **Use ERROR filter first** to quickly find issues
3. **Note timestamps** to correlate with your actions
4. **Expand entries** for full context
5. **Clear logs** before testing to reduce noise
6. **Share logs** with developers when reporting bugs

The Logs tab is your window into what's happening under the hood. Use it to understand app behavior, debug issues, and monitor operations in real-time.
