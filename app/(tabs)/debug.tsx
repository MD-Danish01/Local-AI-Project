import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { consoleLogger, type LogEntry } from '@/services/ConsoleLogger';

export default function DebugScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Subscribe to console logs
    const unsubscribe = consoleLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
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
        {(['all', 'log', 'info', 'warn', 'error'] as const).map((level) => (
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
          {filteredLogs.length} {filter === 'all' ? 'total' : filter} logs
        </Text>
      </View>
    </SafeAreaView>
  );
}

function getLevelColor(level: LogEntry['level']): string {
  switch (level) {
    case 'error':
      return '#FF6B6B';
    case 'warn':
      return '#FFA500';
    case 'info':
      return '#4ECDC4';
    case 'debug':
      return '#9B59B6';
    case 'log':
    default:
      return '#95A5A6';
  }
}

function getLevelEmoji(level: LogEntry['level']): string {
  switch (level) {
    case 'error':
      return '❌';
    case 'warn':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'debug':
      return '🐛';
    case 'log':
    default:
      return '📝';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2433',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2433',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E2433',
  },
  filterButtonActive: {
    backgroundColor: '#00D9FF',
  },
  filterButtonText: {
    color: '#95A5A6',
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#0A0E1A',
  },
  logList: {
    flex: 1,
  },
  logListContent: {
    padding: 12,
  },
  logItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#1E2433',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00D9FF',
  },
  logTime: {
    fontSize: 11,
    color: '#7F8C9B',
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  logMessage: {
    fontSize: 13,
    color: '#D1D8E0',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C9B',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E2433',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#7F8C9B',
  },
});
