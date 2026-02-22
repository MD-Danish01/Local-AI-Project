import {
    LogEntry,
    loggingService,
    LogLevel,
} from "@/services/logging/LoggingService";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function LogsScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "ALL">("ALL");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    // Initial load
    setLogs(loggingService.getLogs());

    // Subscribe to updates
    const unsubscribe = loggingService.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredLogs =
    filterLevel === "ALL"
      ? logs
      : logs.filter((log) => log.level === filterLevel);

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.ERROR:
        return "#EF4444";
      case LogLevel.WARN:
        return "#F59E0B";
      case LogLevel.INFO:
        return "#10B981";
      case LogLevel.DEBUG:
        return "#3B82F6";
      default:
        return "#9CA3AF";
    }
  };

  const getLevelIcon = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.ERROR:
        return "❌";
      case LogLevel.WARN:
        return "⚠️";
      case LogLevel.INFO:
        return "✅";
      case LogLevel.DEBUG:
        return "🔍";
      default:
        return "📝";
    }
  };

  const formatTime = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderLog = ({ item }: { item: LogEntry }) => {
    const isExpanded = expandedLog === item.id;

    return (
      <TouchableOpacity
        style={styles.logItem}
        onPress={() => setExpandedLog(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <Text style={styles.logIcon}>{getLevelIcon(item.level)}</Text>
          <View style={styles.logInfo}>
            <View style={styles.logTitleRow}>
              <Text
                style={[styles.logLevel, { color: getLevelColor(item.level) }]}
              >
                {item.level}
              </Text>
              <Text style={styles.logCategory}>[{item.category}]</Text>
              <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text
              style={styles.logMessage}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {item.message}
            </Text>
            {isExpanded && item.details && (
              <ScrollView style={styles.logDetails} horizontal>
                <Text style={styles.logDetailsText}>
                  {typeof item.details === "string"
                    ? item.details
                    : JSON.stringify(item.details, null, 2)}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filterButtons = [
    { label: "ALL", value: "ALL" as const },
    { label: "ERROR", value: LogLevel.ERROR },
    { label: "WARN", value: LogLevel.WARN },
    { label: "INFO", value: LogLevel.INFO },
    { label: "DEBUG", value: LogLevel.DEBUG },
  ];

  const getLogCount = (level: LogLevel | "ALL"): number => {
    if (level === "ALL") return logs.length;
    return logs.filter((log) => log.level === level).length;
  };

  const copyLogsToClipboard = async () => {
    try {
      const logsText = loggingService.exportLogs();
      await Clipboard.setStringAsync(logsText);
      Alert.alert("Success", "Logs copied to clipboard!");
    } catch (error) {
      Alert.alert("Error", "Failed to copy logs to clipboard");
    }
  };

  const shareLogsAsText = async () => {
    try {
      const logsText = loggingService.exportLogs();
      const result = await Share.share({
        message: logsText,
        title: "App Logs",
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type:", result.activityType);
        } else {
          console.log("Logs shared successfully");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share logs");
    }
  };

  const copyFilteredLogs = async () => {
    try {
      const logsToExport = filteredLogs.map((log) => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        category: log.category,
        message: log.message,
        details: log.details,
      }));

      const logsText = JSON.stringify(logsToExport, null, 2);
      await Clipboard.setStringAsync(logsText);
      Alert.alert(
        "Success",
        `Copied ${filteredLogs.length} filtered logs to clipboard!`,
      );
    } catch (error) {
      Alert.alert("Error", "Failed to copy logs");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Logs</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={copyFilteredLogs}
          >
            <Text style={styles.copyButtonText}>📋 Copy</Text>
          </TouchableOpacity>
          {Platform.OS !== "web" && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareLogsAsText}
            >
              <Text style={styles.shareButtonText}>📤</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              loggingService.clearLogs();
              setExpandedLog(null);
            }}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterButtons.map((btn) => (
            <TouchableOpacity
              key={btn.value}
              style={[
                styles.filterButton,
                filterLevel === btn.value && styles.filterButtonActive,
              ]}
              onPress={() => setFilterLevel(btn.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterLevel === btn.value && styles.filterButtonTextActive,
                ]}
              >
                {btn.label} ({getLogCount(btn.value)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No logs yet</Text>
          <Text style={styles.emptySubtext}>
            {filterLevel === "ALL"
              ? "Logs will appear here as events occur"
              : `No ${filterLevel} logs found`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          inverted={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2020",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  copyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  shareButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 16,
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  clearButtonText: {
    color: "#ff6b6b",
    fontWeight: "600",
    fontSize: 13,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
  },
  filterButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  filterButtonText: {
    color: "#888888",
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#1f2020",
  },
  listContent: {
    paddingVertical: 8,
  },
  logItem: {
    backgroundColor: "#2a2a2a",
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#444444",
  },
  logHeader: {
    flexDirection: "row",
  },
  logIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logInfo: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  logLevel: {
    fontSize: 11,
    fontWeight: "bold",
    marginRight: 8,
  },
  logCategory: {
    fontSize: 11,
    color: "#888888",
    marginRight: 8,
  },
  logTime: {
    fontSize: 10,
    color: "#666666",
  },
  logMessage: {
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 18,
  },
  logDetails: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#1f2020",
    borderRadius: 4,
    maxHeight: 200,
  },
  logDetailsText: {
    fontSize: 11,
    color: "#888888",
    fontFamily: "monospace",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#888888",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
  },
});
