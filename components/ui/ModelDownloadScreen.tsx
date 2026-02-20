import { ThemedView } from "@/components/themed-view";
import { modelDownloadService } from "@/services/llm/ModelDownloadService";
import { QWEN_MODEL_CONFIG } from "@/services/llm/config";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ModelDownloadScreenProps {
  /** Whether a download is currently in progress */
  isDownloading: boolean;
  /** 0-100 */
  progress: number;
  /** Bytes received so far */
  downloadedBytes: number;
  /** Total bytes expected */
  totalBytes: number;
  /** Any error message to display */
  error: string | null;
  onStartDownload: () => void;
  onCancelDownload: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function ModelDownloadScreen({
  isDownloading,
  progress,
  downloadedBytes,
  totalBytes,
  error,
  onStartDownload,
  onCancelDownload,
}: ModelDownloadScreenProps) {
  const modelSizeMB = modelDownloadService.getFormattedSize();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        {/* Icon / Logo */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>🤖</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>LocalAI Chat</Text>
        <Text style={styles.subtitle}>{QWEN_MODEL_CONFIG.name}</Text>

        {/* ---- IDLE / ERROR state ---- */}
        {!isDownloading && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Model size</Text>
              <Text style={styles.infoValue}>~{modelSizeMB}</Text>
            </View>

            <Text style={styles.description}>
              The AI model runs entirely on your device — no internet required
              after download. Tap below to download it once.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Download failed</Text>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.downloadButton}
              onPress={onStartDownload}
              activeOpacity={0.8}
            >
              <Text style={styles.downloadButtonText}>
                {error ? "🔄  Retry Download" : "⬇️  Download Model"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Make sure you're on Wi-Fi before downloading.
            </Text>
          </>
        )}

        {/* ---- DOWNLOADING state ---- */}
        {isDownloading && (
          <>
            <Text style={styles.downloadingLabel}>Downloading…</Text>

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>
                {formatBytes(downloadedBytes)} /{" "}
                {formatBytes(totalBytes || QWEN_MODEL_CONFIG.size)}
              </Text>
              <Text style={styles.statsText}>{Math.round(progress)}%</Text>
            </View>

            <ActivityIndicator
              size="small"
              color="#00D9FF"
              style={styles.spinner}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancelDownload}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0E1A",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0A0E1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00D9FF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#1F2937",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoLabel: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  infoValue: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#2D1B1B",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#4B1C1C",
  },
  errorTitle: {
    color: "#F87171",
    fontWeight: "700",
    marginBottom: 4,
  },
  errorMessage: {
    color: "#FCA5A5",
    fontSize: 12,
  },
  downloadButton: {
    width: "100%",
    backgroundColor: "#00D9FF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  downloadButtonText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    color: "#4B5563",
    fontSize: 12,
    textAlign: "center",
  },

  // --- Downloading state ---
  downloadingLabel: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  progressBarContainer: {
    width: "100%",
    height: 10,
    backgroundColor: "#1F2937",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00D9FF",
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  statsText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  spinner: {
    marginBottom: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cancelButtonText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});
