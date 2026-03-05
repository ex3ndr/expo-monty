import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
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

  const externalFunctionProbe = useMemo(() => {
    try {
      console.log("[monty-expo example] running external function probe");
      const monty = new Monty(
        "def run(value):\n    return multiply_and_add(value, 10)\n\nrun(input_value)",
        {
          scriptName: "external-function.py",
          inputs: ["input_value"],
        },
      );
      const output = monty.run({
        inputs: {
          input_value: 2,
        },
        externalFunctions: {
          multiply_and_add: (value: unknown, factor: unknown) => Number(value) * Number(factor) + 7,
        },
      });
      console.log("[monty-expo example] external function probe success", output);
      return {
        ok: true as const,
        output,
      };
    } catch (error) {
      console.log("[monty-expo example] external function probe failed", error);
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
        basic run result: {probe.ok ? JSON.stringify(probe.output) : "error"}
      </Text>
      {!probe.ok ? <Text style={styles.error}>{probe.error}</Text> : null}
      <Text style={styles.line}>
        external call result: {externalFunctionProbe.ok ? JSON.stringify(externalFunctionProbe.output) : "error"}
      </Text>
      {!externalFunctionProbe.ok ? <Text style={styles.error}>{externalFunctionProbe.error}</Text> : null}
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
