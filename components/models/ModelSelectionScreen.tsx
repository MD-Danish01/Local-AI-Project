import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { modelRegistry } from '@/services/models/ModelRegistry';
import { DEFAULT_MODELS } from '@/services/llm/config';
import type { ModelInfo } from '@/types/llm';
import { useLLMContext } from '@/contexts/LLMContext';
import { modelDownloadService } from '@/services/llm/ModelDownloadService';

interface ModelSelectionScreenProps {
  onModelSelected?: (model: ModelInfo) => void;
}

export function ModelSelectionScreen({ onModelSelected }: ModelSelectionScreenProps) {
  const { startDownload } = useLLMContext();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const allModels = await modelRegistry.getAllModels();
      // Only show default models for first-time selection
      const defaultModels = allModels.filter(m => m.source === 'default');
      setModels(defaultModels);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectModel = (model: ModelInfo) => {
    setSelectedModel(model);
  };

  const handleContinue = () => {
    if (selectedModel) {
      startDownload(selectedModel);
      if (onModelSelected) {
        onModelSelected(selectedModel);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
        <Text style={styles.loadingText}>Loading models...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your AI Model</Text>
          <Text style={styles.subtitle}>
            Select a model to get started. You can change this later in Settings.
          </Text>
        </View>

        {/* Model Cards */}
        <View style={styles.modelsContainer}>
          {models.map((model, index) => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelCard,
                selectedModel?.id === model.id && styles.modelCardSelected,
                index === 0 && styles.recommendedCard,
              ]}
              onPress={() => handleSelectModel(model)}
              activeOpacity={0.7}
            >
              {index === 0 && (
                <View style={styles.recommendedBadge}>
                  <IconSymbol name="star.fill" size={12} color="#FCD34D" />
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}

              <View style={styles.modelHeader}>
                <Text style={styles.modelName}>{model.name}</Text>
                {selectedModel?.id === model.id && (
                  <View style={styles.checkmark}>
                    <IconSymbol name="checkmark.circle.fill" size={24} color="#00D9FF" />
                  </View>
                )}
              </View>

              {model.description && (
                <Text style={styles.modelDescription}>{model.description}</Text>
              )}

              <View style={styles.modelSpecs}>
                <View style={styles.specRow}>
                  <IconSymbol name="arrow.down.circle" size={16} color="#9CA3AF" />
                  <Text style={styles.specText}>
                    {modelDownloadService.getFormattedSize(model.sizeBytes)}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <IconSymbol name="memorychip" size={16} color="#9CA3AF" />
                  <Text style={styles.specText}>
                    {model.minRamMB ? `${(model.minRamMB / 1024).toFixed(1)}GB+ RAM` : 'N/A'}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <IconSymbol name="doc.text" size={16} color="#9CA3AF" />
                  <Text style={styles.specText}>{model.contextLength} tokens</Text>
                </View>
              </View>

              {index === 0 && (
                <View style={styles.benefitsContainer}>
                  <View style={styles.benefit}>
                    <IconSymbol name="bolt.fill" size={14} color="#10B981" />
                    <Text style={styles.benefitText}>Fast responses</Text>
                  </View>
                  <View style={styles.benefit}>
                    <IconSymbol name="battery.100.bolt" size={14} color="#10B981" />
                    <Text style={styles.benefitText}>Battery efficient</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <IconSymbol name="info.circle" size={20} color="#00D9FF" />
          <Text style={styles.infoText}>
            The model runs entirely on your device. No internet required after download.
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !selectedModel && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedModel}
        >
          <Text style={styles.continueButtonText}>
            {selectedModel
              ? `Download ${modelDownloadService.getFormattedSize(selectedModel.sizeBytes)}`
              : 'Select a Model'}
          </Text>
          {selectedModel && (
            <IconSymbol name="arrow.right" size={20} color="#0A0E1A" />
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0E1A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
  },
  modelsContainer: {
    marginBottom: 24,
  },
  modelCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#374151',
  },
  modelCardSelected: {
    borderColor: '#00D9FF',
    backgroundColor: '#1e3a4a',
  },
  recommendedCard: {
    borderColor: '#FCD34D',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FCD34D20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCD34D',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  checkmark: {
    marginLeft: 8,
  },
  modelDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 16,
  },
  modelSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  benefitsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  benefitText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#374151',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D9FF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  continueButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A0E1A',
  },
});
