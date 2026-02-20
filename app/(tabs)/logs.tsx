import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { loggingService, LogLevel, LogEntry } from '@/services/logging/LoggingService';

export default function LogsScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');
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

  const filteredLogs = filterLevel === 'ALL' 
    ? logs 
    : logs.filter(log => log.level === filterLevel);

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.ERROR: return '#EF4444';
      case LogLevel.WARN: return '#F59E0B';
      case LogLevel.INFO: return '#10B981';
      case LogLevel.DEBUG: return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const getLevelIcon = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return '✅';
      case LogLevel.DEBUG: return '🔍';
      default: return '📝';
    }
  };

  const formatTime = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
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
              <Text style={[styles.logLevel, { color: getLevelColor(item.level) }]}>
                {item.level}
              </Text>
              <Text style={styles.logCategory}>[{item.category}]</Text>
              <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.logMessage} numberOfLines={isExpanded ? undefined : 2}>
              {item.message}
            </Text>
            {isExpanded && item.details && (
              <ScrollView style={styles.logDetails} horizontal>
                <Text style={styles.logDetailsText}>
                  {typeof item.details === 'string' 
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
    { label: 'ALL', value: 'ALL' as const },
    { label: 'ERROR', value: LogLevel.ERROR },
    { label: 'WARN', value: LogLevel.WARN },
    { label: 'INFO', value: LogLevel.INFO },
    { label: 'DEBUG', value: LogLevel.DEBUG },
  ];

  const getLogCount = (level: LogLevel | 'ALL'): number => {
    if (level === 'ALL') return logs.length;
    return logs.filter(log => log.level === level).length;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Logs</Text>
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
            {filterLevel === 'ALL' 
              ? 'Logs will appear here as events occur' 
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
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#00D9FF',
    borderColor: '#00D9FF',
  },
  filterButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#0A0E1A',
  },
  listContent: {
    paddingVertical: 8,
  },
  logItem: {
    backgroundColor: '#1F2937',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#374151',
  },
  logHeader: {
    flexDirection: 'row',
  },
  logIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logInfo: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  logCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 8,
  },
  logTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  logMessage: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  logDetails: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#111827',
    borderRadius: 4,
    maxHeight: 200,
  },
  logDetailsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
