import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { modelRegistry } from '@/services/models/ModelRegistry';
import { modelDownloadService } from '@/services/llm/ModelDownloadService';
import { loggingService } from '@/services/logging/LoggingService';
import type { ModelInfo } from '@/types/llm';
import { useLLMContext } from '@/contexts/LLMContext';

export default function ModelsScreen() {
  const router = useRouter();
  const { activeModel: contextActiveModel, startDownload } = useLLMContext();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      loggingService.info('ModelsScreen', 'Loading models');
      const allModels = await modelRegistry.getAllModels();
      setModels(allModels);
    } catch (error) {
      loggingService.error('ModelsScreen', 'Failed to load models', { error });
      Alert.alert('Error', 'Failed to load models');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadModels();
  }, [loadModels]);

  const handleDownload = useCallback((model: ModelInfo) => {
    Alert.alert(
      'Download Model',
      `Download ${model.name}? (${modelDownloadService.getFormattedSize(model.sizeBytes)})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => {
            startDownload(model);
            router.back();
          },
        },
      ]
    );
  }, [startDownload, router]);

  const handleActivate = useCallback(async (model: ModelInfo) => {
    try {
      Alert.alert(
        'Activate Model',
        `Switch to ${model.name}? The app will restart to load the new model.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate',
            onPress: async () => {
              await modelRegistry.setActiveModel(model.id);
              Alert.alert(
                'Model Activated',
                'Please restart the app to load the new model.',
                [{ text: 'OK' }]
              );
            },
          },
        ]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', errorMsg);
      loggingService.error('ModelsScreen', 'Failed to activate model', {
        error: errorMsg,
        modelId: model.id,
      });
    }
  }, []);

  const handleDelete = useCallback(async (model: ModelInfo) => {
    if (model.isActive) {
      Alert.alert('Cannot Delete', 'Cannot delete the active model. Please activate another model first.');
      return;
    }

    Alert.alert(
      'Delete Model',
      `Delete ${model.name}? This will remove the model file from your device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete file
              await modelDownloadService.deleteModelFile(model.fileName);
              // Remove from registry
              await modelRegistry.deleteModel(model.id);
              // Refresh list
              await loadModels();
              
              loggingService.info('ModelsScreen', 'Model deleted', { modelId: model.id });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Error', `Failed to delete model: ${errorMsg}`);
              loggingService.error('ModelsScreen', 'Failed to delete model', {
                error: errorMsg,
                modelId: model.id,
              });
            }
          },
        },
      ]
    );
  }, [loadModels]);

  const defaultModels = models.filter(m => m.source === 'default');
  const customModels = models.filter(m => m.source !== 'default');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color="#00D9FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Models</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00D9FF"
          />
        }
      >
        {/* Active Model Section */}
        {contextActiveModel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Model</Text>
            <ModelCard
              model={contextActiveModel}
              isActive={true}
              onDownload={handleDownload}
              onActivate={handleActivate}
              onDelete={handleDelete}
            />
          </View>
        )}

        {/* Default Models Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Models</Text>
          {defaultModels.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              isActive={model.id === contextActiveModel?.id}
              onDownload={handleDownload}
              onActivate={handleActivate}
              onDelete={handleDelete}
            />
          ))}
        </View>

        {/* Custom Models Section */}
        {customModels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Models</Text>
            {customModels.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                isActive={model.id === contextActiveModel?.id}
                onDownload={handleDownload}
                onActivate={handleActivate}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}

        {/* Add Custom Model Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Model</Text>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              // TODO: Open Add Custom Model Modal
              Alert.alert('Coming Soon', 'Custom model addition will be available soon!');
            }}
          >
            <IconSymbol name="link" size={20} color="#00D9FF" />
            <Text style={styles.addButtonText}>Add from URL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              // TODO: Open File Picker
              Alert.alert('Coming Soon', 'File import will be available soon!');
            }}
          >
            <IconSymbol name="folder" size={20} color="#00D9FF" />
            <Text style={styles.addButtonText}>Import from Device</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Model Card Component
interface ModelCardProps {
  model: ModelInfo;
  isActive: boolean;
  onDownload: (model: ModelInfo) => void;
  onActivate: (model: ModelInfo) => void;
  onDelete: (model: ModelInfo) => void;
}

function ModelCard({ model, isActive, onDownload, onActivate, onDelete }: ModelCardProps) {
  const getStatusColor = () => {
    if (isActive) return '#10B981';
    if (model.status === 'downloaded') return '#00D9FF';
    if (model.status === 'downloading') return '#F59E0B';
    if (model.status === 'error') return '#EF4444';
    return '#6B7280';
  };

  const getStatusText = () => {
    if (isActive) return 'Active';
    if (model.status === 'downloaded') return 'Downloaded';
    if (model.status === 'downloading') return 'Downloading...';
    if (model.status === 'error') return 'Error';
    return 'Available';
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{model.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
        {model.description && (
          <Text style={styles.cardDescription}>{model.description}</Text>
        )}
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.infoRow}>
          <IconSymbol name="chart.bar" size={16} color="#9CA3AF" />
          <Text style={styles.infoText}>{model.quantization}</Text>
        </View>
        <View style={styles.infoRow}>
          <IconSymbol name="doc.text" size={16} color="#9CA3AF" />
          <Text style={styles.infoText}>{model.contextLength} tokens</Text>
        </View>
        <View style={styles.infoRow}>
          <IconSymbol name="arrow.down.circle" size={16} color="#9CA3AF" />
          <Text style={styles.infoText}>
            {modelDownloadService.getFormattedSize(model.sizeBytes)}
          </Text>
        </View>
        {model.minRamMB && (
          <View style={styles.infoRow}>
            <IconSymbol name="memorychip" size={16} color="#9CA3AF" />
            <Text style={styles.infoText}>{(model.minRamMB / 1024).toFixed(1)}GB+ RAM</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {model.status === 'available' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDownload(model)}
          >
            <IconSymbol name="arrow.down.circle.fill" size={20} color="#00D9FF" />
            <Text style={styles.actionButtonText}>Download</Text>
          </TouchableOpacity>
        )}

        {model.status === 'downloaded' && !isActive && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onActivate(model)}
            >
              <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
              <Text style={styles.actionButtonText}>Activate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete(model)}
            >
              <IconSymbol name="trash" size={20} color="#EF4444" />
            </TouchableOpacity>
          </>
        )}

        {isActive && (
          <View style={styles.activeIndicator}>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
            <Text style={styles.activeText}>Currently Active</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  cardInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#374151',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 12,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  activeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
