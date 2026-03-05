require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name           = "MontyExpo"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.description    = package["description"]
  s.license        = package["license"]
  s.author         = "ex3ndr"
  s.homepage       = "https://github.com/ex3ndr/monty-js"
  s.platforms      = {
    :ios => "15.1",
    :tvos => "15.1"
  }
  s.swift_version  = "5.9"
  s.source         = { git: "https://github.com/ex3ndr/monty-js" }
  s.static_framework = true

  s.dependency "ExpoModulesCore"
  s.vendored_libraries = "rust/libmonty_expo_ffi.a"
  s.preserve_paths = "rust/**/*"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES"
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
