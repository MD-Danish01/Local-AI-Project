import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLLMContext } from '@/contexts/LLMContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { activeModel } = useLLMContext();

  const settings = [
    {
      section: 'AI Model',
      items: [
        {
          icon: 'cpu',
          title: 'Model Management',
          subtitle: activeModel ? `Active: ${activeModel.name}` : 'No model selected',
          onPress: () => router.push('/settings/models' as any),
        },
      ],
    },
    {
      section: 'Developer',
      items: [
        {
          icon: 'terminal.fill',
          title: 'System Logs',
          subtitle: 'View app logs and debug info',
          onPress: () => router.push('/(tabs)/logs' as any),
        },
      ],
    },
    {
      section: 'About',
      items: [
        {
          icon: 'info.circle',
          title: 'App Version',
          subtitle: '1.0.0',
          onPress: undefined,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {settings.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.item}
                onPress={item.onPress}
                disabled={!item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.iconContainer}>
                    <IconSymbol name={item.icon as any} size={24} color="#00D9FF" />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                {item.onPress && (
                  <IconSymbol name="chevron.right" size={20} color="#666" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
