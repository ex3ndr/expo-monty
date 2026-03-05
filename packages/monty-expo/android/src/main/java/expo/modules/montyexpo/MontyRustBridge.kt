package expo.modules.montyexpo

class MontyRustBridge {
  companion object {
    init {
      System.loadLibrary("monty_expo_ffi")
    }

    @JvmStatic
    external fun nativeRun(code: String, runOptionsJson: String?, montyOptionsJson: String?): String
  }
}
