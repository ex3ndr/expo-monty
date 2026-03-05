import Foundation
import ExpoModulesCore

private let moduleVersion = "0.1.0"

@_silgen_name("monty_expo_run_json")
private func monty_expo_run_json(
  _ code: UnsafePointer<CChar>?,
  _ runOptionsJson: UnsafePointer<CChar>?,
  _ montyOptionsJson: UnsafePointer<CChar>?
) -> UnsafeMutablePointer<CChar>?

@_silgen_name("monty_expo_string_free")
private func monty_expo_string_free(_ pointer: UnsafeMutablePointer<CChar>?)

private func toJSONString(_ value: Any?) -> String? {
  guard let value else {
    return nil
  }
  guard JSONSerialization.isValidJSONObject(value) else {
    return nil
  }
  guard let data = try? JSONSerialization.data(withJSONObject: value), let text = String(data: data, encoding: .utf8) else {
    return nil
  }
  return text
}

private func parseRustResponse(_ text: String) -> [String: Any] {
  guard let data = text.data(using: .utf8) else {
    return [
      "ok": false,
      "error": [
        "typeName": "RuntimeError",
        "message": "Rust response is not valid UTF-8",
        "traceback": []
      ]
    ]
  }
  guard let object = try? JSONSerialization.jsonObject(with: data), let dict = object as? [String: Any] else {
    return [
      "ok": false,
      "error": [
        "typeName": "RuntimeError",
        "message": "Rust response is not valid JSON",
        "traceback": []
      ]
    ]
  }
  return dict
}

private func withOptionalCString<T>(_ value: String?, body: (UnsafePointer<CChar>?) -> T) -> T {
  guard let value else {
    return body(nil)
  }
  return value.withCString { ptr in
    body(ptr)
  }
}

public class MontyExpoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MontyExpo")

    Function("version") {
      return moduleVersion
    }

    Function("isNativeRuntimeLinked") {
      return true
    }

    Function("runSync") { (code: String, runOptions: [String: Any]?, montyOptions: [String: Any]?) -> [String: Any] in
      let runOptionsJson = toJSONString(runOptions)
      let montyOptionsJson = toJSONString(montyOptions)

      let resultPointer = code.withCString { codePointer in
        withOptionalCString(runOptionsJson) { runOptionsPointer in
          withOptionalCString(montyOptionsJson) { montyOptionsPointer in
            monty_expo_run_json(codePointer, runOptionsPointer, montyOptionsPointer)
          }
        }
      }

      guard let resultPointer else {
        return [
          "ok": false,
          "error": [
            "typeName": "RuntimeError",
            "message": "monty_expo_run_json returned nil",
            "traceback": []
          ]
        ]
      }

      let text = String(cString: resultPointer)
      monty_expo_string_free(resultPointer)
      return parseRustResponse(text)
    }
  }
}
