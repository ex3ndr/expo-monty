import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Monty, MontyRuntimeError, montyExpoNativeRuntimeLinked, montyExpoVersion } from "monty-expo";

export default function App() {
  const probe = useMemo(() => {
    try {
      console.log("[monty-expo example] running native Monty probe");
      const monty = new Monty("def add(a, b):\n    return a + b\n\nadd(x, y)", {
        scriptName: "example.py",
        inputs: ["x", "y"],
      });
      const output = monty.run({
        inputs: {
          x: 2,
          y: 5,
        },
      });
      console.log("[monty-expo example] probe success", output);
      return {
        ok: true as const,
        output,
      };
    } catch (error) {
      console.log("[monty-expo example] probe failed", error);
      if (error instanceof MontyRuntimeError) {
        return {
          ok: false as const,
          error: error.display("traceback"),
        };
      }
      return {
        ok: false as const,
        error: String(error),
      };
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>monty-expo native check</Text>
      <Text style={styles.line}>native linked: {String(montyExpoNativeRuntimeLinked())}</Text>
      <Text style={styles.line}>module version: {montyExpoVersion()}</Text>
      <Text style={styles.line}>
        run result: {probe.ok ? JSON.stringify(probe.output) : "error"}
      </Text>
      {!probe.ok ? <Text style={styles.error}>{probe.error}</Text> : null}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 72,
    gap: 10,
    backgroundColor: "#fff",
    minHeight: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  line: {
    fontSize: 16,
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    color: "#aa0000",
  },
});
