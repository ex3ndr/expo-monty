use std::ffi::{CStr, CString, c_char};

use monty::{MontyException, MontyObject, MontyRun};
use serde::Deserialize;
use serde_json::{Map, Number, Value as JsonValue, json};

#[derive(Debug, Deserialize, Default)]
#[serde(default)]
struct RunOptionsInput {
    inputs: Option<Map<String, JsonValue>>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(default)]
struct MontyOptionsInput {
    #[serde(rename = "scriptName")]
    script_name: Option<String>,
    inputs: Option<Vec<String>>,
}

fn c_char_ptr_to_string(ptr: *const c_char) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    let c_str = unsafe { CStr::from_ptr(ptr) };
    Some(c_str.to_string_lossy().into_owned())
}

fn parse_json_or_default<T: for<'de> Deserialize<'de> + Default>(raw: Option<String>) -> T {
    raw.and_then(|text| serde_json::from_str::<T>(&text).ok()).unwrap_or_default()
}

fn json_to_monty(value: &JsonValue) -> Result<MontyObject, String> {
    match value {
        JsonValue::Null => Ok(MontyObject::None),
        JsonValue::Bool(v) => Ok(MontyObject::Bool(*v)),
        JsonValue::Number(v) => {
            if let Some(i) = v.as_i64() {
                Ok(MontyObject::Int(i))
            } else if let Some(u) = v.as_u64() {
                if let Ok(i) = i64::try_from(u) {
                    Ok(MontyObject::Int(i))
                } else {
                    Ok(MontyObject::BigInt(num_bigint::BigInt::from(u)))
                }
            } else if let Some(f) = v.as_f64() {
                Ok(MontyObject::Float(f))
            } else {
                Err("unsupported numeric value".to_owned())
            }
        }
        JsonValue::String(v) => Ok(MontyObject::String(v.clone())),
        JsonValue::Array(values) => {
            let mut output = Vec::with_capacity(values.len());
            for item in values {
                output.push(json_to_monty(item)?);
            }
            Ok(MontyObject::List(output))
        }
        JsonValue::Object(values) => {
            let mut pairs = Vec::with_capacity(values.len());
            for (key, value) in values {
                pairs.push((MontyObject::String(key.clone()), json_to_monty(value)?));
            }
            Ok(MontyObject::dict(pairs))
        }
    }
}

fn monty_to_json(value: MontyObject) -> JsonValue {
    match value {
        MontyObject::Ellipsis => json!({ "$ellipsis": true }),
        MontyObject::None => JsonValue::Null,
        MontyObject::Bool(v) => JsonValue::Bool(v),
        MontyObject::Int(v) => JsonValue::Number(Number::from(v)),
        MontyObject::BigInt(v) => json!({ "$bigint": v.to_string() }),
        MontyObject::Float(v) => Number::from_f64(v)
            .map(JsonValue::Number)
            .unwrap_or_else(|| json!({ "$float": v.to_string() })),
        MontyObject::String(v) => JsonValue::String(v),
        MontyObject::Bytes(v) => json!({ "$bytes": v }),
        MontyObject::List(v) => JsonValue::Array(v.into_iter().map(monty_to_json).collect()),
        MontyObject::Tuple(v) => json!({ "$tuple": v.into_iter().map(monty_to_json).collect::<Vec<_>>() }),
        MontyObject::NamedTuple {
            type_name,
            field_names,
            values
        } => {
            json!({
                "$namedTuple": {
                    "typeName": type_name,
                    "fieldNames": field_names,
                    "values": values.into_iter().map(monty_to_json).collect::<Vec<_>>()
                }
            })
        }
        MontyObject::Dict(v) => {
            let mut obj = Map::new();
            let mut fallback_pairs = Vec::new();
            let mut only_string_keys = true;

            for (k, val) in v {
                match k {
                    MontyObject::String(key) => {
                        obj.insert(key, monty_to_json(val));
                    }
                    _ => {
                        only_string_keys = false;
                        fallback_pairs.push(JsonValue::Array(vec![monty_to_json(k), monty_to_json(val)]));
                    }
                }
            }

            if only_string_keys {
                JsonValue::Object(obj)
            } else {
                json!({ "$dictPairs": fallback_pairs })
            }
        }
        MontyObject::Set(v) => json!({ "$set": v.into_iter().map(monty_to_json).collect::<Vec<_>>() }),
        MontyObject::FrozenSet(v) => json!({ "$frozenSet": v.into_iter().map(monty_to_json).collect::<Vec<_>>() }),
        MontyObject::Exception { exc_type, arg } => {
            json!({
                "$exception": {
                    "typeName": exc_type.to_string(),
                    "message": arg
                }
            })
        }
        MontyObject::Type(v) => json!({ "$type": v.to_string() }),
        MontyObject::BuiltinFunction(v) => json!({ "$builtinFunction": v.to_string() }),
        MontyObject::Path(v) => json!({ "$path": v }),
        MontyObject::Dataclass {
            name,
            type_id,
            field_names,
            attrs,
            frozen
        } => {
            json!({
                "$dataclass": {
                    "name": name,
                    "typeId": type_id,
                    "fieldNames": field_names,
                    "attrs": monty_to_json(MontyObject::Dict(attrs)),
                    "frozen": frozen
                }
            })
        }
        MontyObject::Function { name, docstring } => json!({
            "$function": {
                "name": name,
                "docstring": docstring
            }
        }),
        MontyObject::Repr(v) => json!({ "$repr": v }),
        MontyObject::Cycle(id, placeholder) => json!({
            "$cycle": {
                "id": id,
                "placeholder": placeholder
            }
        })
    }
}

fn exception_to_json(exception: MontyException) -> JsonValue {
    let type_name = exception.exc_type().to_string();
    let message = exception.message().unwrap_or_default().to_owned();
    let traceback = exception
        .traceback()
        .iter()
        .map(|frame| {
            json!({
                "filename": frame.filename,
                "line": frame.start.line,
                "column": frame.start.column,
                "endLine": frame.end.line,
                "endColumn": frame.end.column,
                "functionName": frame.frame_name,
                "sourceLine": frame.preview_line
            })
        })
        .collect::<Vec<_>>();

    json!({
        "ok": false,
        "error": {
            "typeName": type_name,
            "message": message,
            "traceback": traceback
        }
    })
}

fn run_monty(code: &str, run_options_json: Option<String>, monty_options_json: Option<String>) -> JsonValue {
    let run_options = parse_json_or_default::<RunOptionsInput>(run_options_json);
    let monty_options = parse_json_or_default::<MontyOptionsInput>(monty_options_json);

    let script_name = monty_options.script_name.unwrap_or_else(|| "main.py".to_owned());
    let input_names = monty_options.inputs.unwrap_or_default();
    let inputs_map = run_options.inputs.unwrap_or_default();

    let mut ordered_inputs = Vec::with_capacity(input_names.len());
    for name in &input_names {
        if let Some(raw_value) = inputs_map.get(name) {
            match json_to_monty(raw_value) {
                Ok(value) => ordered_inputs.push(value),
                Err(err) => {
                    return json!({
                        "ok": false,
                        "error": {
                            "typeName": "TypeError",
                            "message": format!("Invalid input '{name}': {err}"),
                            "traceback": []
                        }
                    });
                }
            }
        } else {
            ordered_inputs.push(MontyObject::None);
        }
    }

    let runner = match MontyRun::new(code.to_owned(), &script_name, input_names) {
        Ok(runner) => runner,
        Err(exception) => return exception_to_json(exception)
    };

    match runner.run_no_limits(ordered_inputs) {
        Ok(output) => json!({
            "ok": true,
            "output": monty_to_json(output)
        }),
        Err(exception) => exception_to_json(exception)
    }
}

fn run_and_serialize(code: *const c_char, run_options_json: *const c_char, monty_options_json: *const c_char) -> String {
    if code.is_null() {
        return json!({
            "ok": false,
            "error": {
                "typeName": "TypeError",
                "message": "code is null",
                "traceback": []
            }
        })
        .to_string();
    }

    let code_string = c_char_ptr_to_string(code).unwrap_or_default();
    let run_options = c_char_ptr_to_string(run_options_json);
    let monty_options = c_char_ptr_to_string(monty_options_json);
    run_monty(&code_string, run_options, monty_options).to_string()
}

#[no_mangle]
pub extern "C" fn monty_expo_run_json(
    code: *const c_char,
    run_options_json: *const c_char,
    monty_options_json: *const c_char,
) -> *mut c_char {
    let output = run_and_serialize(code, run_options_json, monty_options_json);
    match CString::new(output) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => CString::new(
            json!({
                "ok": false,
                "error": {
                    "typeName": "RuntimeError",
                    "message": "failed to encode output",
                    "traceback": []
                }
            })
            .to_string(),
        )
        .expect("static string to cstring")
        .into_raw()
    }
}

#[no_mangle]
pub extern "C" fn monty_expo_string_free(ptr: *mut c_char) {
    if ptr.is_null() {
        return;
    }
    unsafe {
        drop(CString::from_raw(ptr));
    }
}

#[cfg(feature = "android")]
mod android {
    use std::ffi::CString;

    use jni::{
        JNIEnv,
        objects::{JClass, JObject, JString},
        sys::jstring
    };

    use crate::run_monty;

    fn jstring_to_option_string(env: &mut JNIEnv<'_>, value: JObject<'_>) -> Option<String> {
        if value.is_null() {
            return None;
        }
        let j_string = JString::from(value);
        env.get_string(&j_string).ok().map(|s| s.to_string_lossy().into_owned())
    }

    #[no_mangle]
    pub extern "system" fn Java_com_montyexpo_MontyRustBridge_nativeRun(
        mut env: JNIEnv<'_>,
        _class: JClass<'_>,
        code: JString<'_>,
        run_options_json: JObject<'_>,
        monty_options_json: JObject<'_>,
    ) -> jstring {
        let code_string = match env.get_string(&code) {
            Ok(v) => v.to_string_lossy().into_owned(),
            Err(_) => String::new()
        };
        let run_options = jstring_to_option_string(&mut env, run_options_json);
        let monty_options = jstring_to_option_string(&mut env, monty_options_json);
        let output = run_monty(&code_string, run_options, monty_options).to_string();
        let c_string = CString::new(output).unwrap_or_else(|_| {
            CString::new(
                "{\"ok\":false,\"error\":{\"typeName\":\"RuntimeError\",\"message\":\"jni encoding failed\",\"traceback\":[]}}",
            )
            .expect("static fallback string to cstring")
        });
        match env.new_string(c_string.to_string_lossy().as_ref()) {
            Ok(v) => v.into_raw(),
            Err(_) => std::ptr::null_mut()
        }
    }
}
