import { consoleLogger, type LogEntry } from "@/services/ConsoleLogger";
import React, { useEffect, useRef, useState } from "react";
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function DebugScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogEntry["level"] | "all">("all");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Subscribe to console logs
    const unsubscribe = consoleLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.level === filter;
  });

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const timeStr = item.timestamp.toLocaleTimeString();
    const levelColor = getLevelColor(item.level);
    const levelEmoji = getLevelEmoji(item.level);

    return (
      <View style={styles.logItem}>
        <Text style={styles.logTime}>{timeStr}</Text>
        <Text style={[styles.logLevel, { color: levelColor }]}>
          {levelEmoji} {item.level.toUpperCase()}
        </Text>
        <Text style={styles.logMessage}>{item.message}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Console</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => consoleLogger.clear()}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {(["all", "log", "info", "warn", "error"] as const).map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.filterButton,
              filter === level && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(level)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === level && styles.filterButtonTextActive,
              ]}
            >
              {level.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderLogItem}
        style={styles.logList}
        contentContainerStyle={styles.logListContent}
        onContentSizeChange={() => {
          // Auto-scroll to bottom when new logs arrive
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No logs yet...</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {filteredLogs.length} {filter === "all" ? "total" : filter} logs
        </Text>
      </View>
    </SafeAreaView>
  );
}

function getLevelColor(level: LogEntry["level"]): string {
  switch (level) {
    case "error":
      return "#FF6B6B";
    case "warn":
      return "#FFA500";
    case "info":
      return "#4ECDC4";
    case "debug":
      return "#9B59B6";
    case "log":
    default:
      return "#95A5A6";
  }
}

function getLevelEmoji(level: LogEntry["level"]): string {
  switch (level) {
    case "error":
      return "❌";
    case "warn":
      return "⚠️";
    case "info":
      return "ℹ️";
    case "debug":
      return "🐛";
    case "log":
    default:
      return "📝";
  }
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clearButton: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: "#ff6b6b",
    fontWeight: "600",
    fontSize: 13,
  },
  filterContainer: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2a2a2a",
  },
  filterButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  filterButtonText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#1f2020",
  },
  logList: {
    flex: 1,
  },
  logListContent: {
    padding: 12,
  },
  logItem: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#444444",
  },
  logTime: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  logMessage: {
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "monospace",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: "#888888",
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#666666",
  },
});
