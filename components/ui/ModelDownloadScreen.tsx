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
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Title */}
        <Text style={styles.title}>LocalAI</Text>
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
              after download.
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
                {error ? "Retry Download" : "Download Model"}
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
              color="#FFFFFF"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1f2020",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#888888",
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#1f2020",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoLabel: {
    color: "#888888",
    fontSize: 14,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#3a2020",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    color: "#ff6b6b",
    fontWeight: "600",
    marginBottom: 4,
  },
  errorMessage: {
    color: "#ff9999",
    fontSize: 12,
  },
  downloadButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  downloadButtonText: {
    color: "#1f2020",
    fontSize: 15,
    fontWeight: "600",
  },
  hint: {
    color: "#666666",
    fontSize: 12,
    textAlign: "center",
  },

  // --- Downloading state ---
  downloadingLabel: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 20,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "#1f2020",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  statsText: {
    color: "#888888",
    fontSize: 13,
  },
  spinner: {
    marginBottom: 20,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444444",
  },
  cancelButtonText: {
    color: "#888888",
    fontSize: 14,
  },
});
