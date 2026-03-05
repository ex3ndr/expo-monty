package expo.modules.montyexpo

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

private const val MODULE_VERSION = "0.1.0"

private fun toJsonValue(value: Any?): Any? {
  return when (value) {
    null -> JSONObject.NULL
    is Boolean, is Number, is String -> value
    is Map<*, *> -> {
      val obj = JSONObject()
      value.forEach { (k, v) ->
        if (k is String) {
          obj.put(k, toJsonValue(v))
        }
      }
      obj
    }
    is List<*> -> {
      val arr = JSONArray()
      value.forEach { arr.put(toJsonValue(it)) }
      arr
    }
    else -> value.toString()
  }
}

private fun mapToJson(map: Map<String, Any?>?): String? {
  if (map == null) {
    return null
  }
  val json = JSONObject()
  map.forEach { (k, v) ->
    json.put(k, toJsonValue(v))
  }
  return json.toString()
}

private fun jsonToAny(value: Any?): Any? {
  return when (value) {
    JSONObject.NULL -> null
    is JSONObject -> {
      val map = mutableMapOf<String, Any?>()
      val keys = value.keys()
      while (keys.hasNext()) {
        val key = keys.next()
        map[key] = jsonToAny(value.get(key))
      }
      map
    }
    is JSONArray -> {
      val list = mutableListOf<Any?>()
      for (i in 0 until value.length()) {
        list.add(jsonToAny(value.get(i)))
      }
      list
    }
    else -> value
  }
}

private fun parseRustResponse(raw: String): Map<String, Any?> {
  return try {
    @Suppress("UNCHECKED_CAST")
    jsonToAny(JSONObject(raw)) as? Map<String, Any?> ?: mapOf(
      "ok" to false,
      "error" to mapOf(
        "typeName" to "RuntimeError",
        "message" to "Rust response is not a JSON object",
        "traceback" to emptyList<Any?>()
      )
    )
  } catch (_: Throwable) {
    mapOf(
      "ok" to false,
      "error" to mapOf(
        "typeName" to "RuntimeError",
        "message" to "Rust response is not valid JSON",
        "traceback" to emptyList<Any?>()
      )
    )
  }
}

class MontyExpoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MontyExpo")

    Function("version") {
      MODULE_VERSION
    }

    Function("isNativeRuntimeLinked") {
      true
    }

    Function("runSync") { code: String, runOptions: Map<String, Any?>?, montyOptions: Map<String, Any?>? ->
      try {
        val raw = MontyRustBridge.nativeRun(
          code,
          mapToJson(runOptions),
          mapToJson(montyOptions)
        )
        parseRustResponse(raw)
      } catch (e: Throwable) {
        mapOf(
          "ok" to false,
          "error" to mapOf(
            "typeName" to "RuntimeError",
            "message" to (e.message ?: "Rust bridge call failed"),
            "traceback" to emptyList<Any?>()
          )
        )
      }
    }
  }
}
