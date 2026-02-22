import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface LoadingScreenProps {
  progress?: number;
  message?: string;
}

export function LoadingScreen({
  progress = 0,
  message = "Loading model...",
}: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.title}>LocalAI</Text>
        <Text style={styles.message}>{message}</Text>
        {progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
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
  },
  content: {
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 20,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: "#888888",
    marginBottom: 30,
  },
  progressContainer: {
    width: 200,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  progressText: {
    color: "#888888",
    fontSize: 13,
    marginTop: 8,
  },
});
