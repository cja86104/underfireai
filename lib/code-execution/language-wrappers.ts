/**
 * UnderFireAI - Language-Specific Test Harness Generators
 *
 * Judge0 executes raw code. We need to wrap the user's function
 * with a test harness that:
 * 1. Parses JSON input from stdin
 * 2. Calls the user's function with the input
 * 3. Outputs the result as JSON to stdout
 *
 * Each language has its own wrapper template.
 */

import type { ProgrammingLanguage } from '@/types/coding';

/**
 * Generate a test harness that wraps user code for execution
 */
export function generateTestHarness(
  userCode: string,
  language: ProgrammingLanguage,
  functionName: string,
  inputJson: string
): string {
  const generator = LANGUAGE_GENERATORS[language];
  if (!generator) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return generator(userCode, functionName, inputJson);
}

/**
 * Extract the function name from starter code
 * Looks for common function definition patterns
 */
export function extractFunctionName(code: string, language: ProgrammingLanguage): string | null {
  const patterns: Record<ProgrammingLanguage, RegExp[]> = {
    javascript: [
      /function\s+(\w+)\s*\(/,
      /const\s+(\w+)\s*=\s*(?:async\s*)?\(/,
      /const\s+(\w+)\s*=\s*(?:async\s*)?function/,
      /let\s+(\w+)\s*=\s*(?:async\s*)?\(/,
      /var\s+(\w+)\s*=\s*(?:async\s*)?\(/,
    ],
    typescript: [
      /function\s+(\w+)\s*[<(]/,
      /const\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\(/,
      /const\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?function/,
    ],
    python: [
      /def\s+(\w+)\s*\(/,
    ],
    java: [
      /public\s+(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/,
      /private\s+(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/,
    ],
    go: [
      /func\s+(\w+)\s*\(/,
    ],
    rust: [
      /fn\s+(\w+)\s*[<(]/,
      /pub\s+fn\s+(\w+)\s*[<(]/,
    ],
    cpp: [
      /(?:[\w<>]+\s+)+(\w+)\s*\([^)]*\)\s*\{/,
    ],
  };

  const languagePatterns = patterns[language] || [];
  for (const pattern of languagePatterns) {
    const match = code.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

// ===========================================
// LANGUAGE-SPECIFIC GENERATORS
// ===========================================

type WrapperGenerator = (userCode: string, functionName: string, inputJson: string) => string;

const LANGUAGE_GENERATORS: Record<ProgrammingLanguage, WrapperGenerator> = {
  javascript: generateJavaScriptWrapper,
  typescript: generateTypeScriptWrapper,
  python: generatePythonWrapper,
  java: generateJavaWrapper,
  go: generateGoWrapper,
  rust: generateRustWrapper,
  cpp: generateCppWrapper,
};

/**
 * JavaScript test harness
 */
function generateJavaScriptWrapper(
  userCode: string,
  functionName: string,
  inputJson: string
): string {
  // Escape the input JSON for embedding in a string literal
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `${userCode}

// Test harness - auto-generated
const __readline = require('readline');
const __rl = __readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let __inputData = '';

__rl.on('line', (line) => {
  __inputData += line;
});

__rl.on('close', () => {
  try {
    const __input = __inputData.trim() ? JSON.parse(__inputData) : JSON.parse('${escapedInput}');
    const __result = ${functionName}(...__input);
    console.log(JSON.stringify(__result));
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
});
`;
}

/**
 * TypeScript test harness
 * Note: Judge0 TypeScript runs via ts-node, so we can use similar patterns to JS
 */
function generateTypeScriptWrapper(
  userCode: string,
  functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `${userCode}

// Test harness - auto-generated
import * as readline from 'readline';

const __rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let __inputData = '';

__rl.on('line', (line: string) => {
  __inputData += line;
});

__rl.on('close', () => {
  try {
    const __input = __inputData.trim() ? JSON.parse(__inputData) : JSON.parse('${escapedInput}');
    const __result = ${functionName}(...__input);
    console.log(JSON.stringify(__result));
  } catch (e: unknown) {
    const error = e as Error;
    console.error(error.message || e);
    process.exit(1);
  }
});
`;
}

/**
 * Python test harness
 */
function generatePythonWrapper(
  userCode: string,
  functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `import sys
import json

${userCode}

if __name__ == "__main__":
    try:
        __input_data = sys.stdin.read().strip()
        if __input_data:
            __input = json.loads(__input_data)
        else:
            __input = json.loads('${escapedInput}')
        __result = ${functionName}(*__input)
        print(json.dumps(__result))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
`;
}

/**
 * Java test harness
 * Uses reflection to dynamically invoke the user's method
 */
function generateJavaWrapper(
  userCode: string,
  functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Check if user code already has a class definition
  const hasClass = /class\s+Solution/.test(userCode);
  const hasSolutionClass = hasClass;

  // Extract method signature to determine parameter types
  const methodMatch = new RegExp(`(?:public\\s+)?(?:static\\s+)?([\\w<>\\[\\]]+)\\s+${functionName}\\s*\\(([^)]*)\\)`).exec(userCode);

  const returnType = methodMatch?.[1] ?? 'Object';
  const paramsStr = methodMatch?.[2] ?? '';

  // Parse parameter types
  const params = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const paramTypes = params.map(p => {
    const parts = p.split(/\s+/);
    return parts[0]; // Get type
  });

  // Generate argument parsing code based on parameter types
  const argParsing = paramTypes.map((type, i) => {
    if (type === 'int' || type === 'Integer') {
      return `        int arg${i} = ((Number) args.get(${i})).intValue();`;
    } else if (type === 'long' || type === 'Long') {
      return `        long arg${i} = ((Number) args.get(${i})).longValue();`;
    } else if (type === 'double' || type === 'Double') {
      return `        double arg${i} = ((Number) args.get(${i})).doubleValue();`;
    } else if (type === 'boolean' || type === 'Boolean') {
      return `        boolean arg${i} = (Boolean) args.get(${i});`;
    } else if (type === 'String') {
      return `        String arg${i} = (String) args.get(${i});`;
    } else if (type === 'int[]') {
      return `        int[] arg${i} = toIntArray((List<?>) args.get(${i}));`;
    } else if (type === 'String[]') {
      return `        String[] arg${i} = toStringArray((List<?>) args.get(${i}));`;
    } else if (type.startsWith('List<Integer>') || type === 'List<Integer>') {
      return `        List<Integer> arg${i} = toIntegerList((List<?>) args.get(${i}));`;
    } else if (type.startsWith('List<String>') || type === 'List<String>') {
      return `        List<String> arg${i} = toStringList((List<?>) args.get(${i}));`;
    } else {
      return `        Object arg${i} = args.get(${i});`;
    }
  }).join('\n');

  // Generate function call
  const argList = paramTypes.map((_, i) => `arg${i}`).join(', ');
  const isStatic = userCode.includes(`static`) && userCode.includes(functionName);

  const solutionCode = hasSolutionClass ? userCode : `class Solution {\n    ${userCode}\n}`;

  return `import java.util.*;
import java.io.*;

${solutionCode}

public class Main {
    public static void main(String[] args) {
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            String input = sb.toString().trim();
            if (input.isEmpty()) {
                input = "${escapedInput}";
            }

            List<Object> args_list = parseJsonArray(input);
${argParsing}

            ${isStatic ? '' : 'Solution solution = new Solution();'}
            ${returnType} result = ${isStatic ? 'Solution.' : 'solution.'}${functionName}(${argList});
            System.out.println(toJson(result));
        } catch (Exception e) {
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }

    static List<Object> parseJsonArray(String json) {
        List<Object> result = new ArrayList<>();
        json = json.trim();
        if (!json.startsWith("[") || !json.endsWith("]")) return result;
        json = json.substring(1, json.length() - 1).trim();
        if (json.isEmpty()) return result;

        int depth = 0;
        StringBuilder current = new StringBuilder();
        boolean inString = false;

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '"' && (i == 0 || json.charAt(i-1) != '\\\\')) {
                inString = !inString;
                current.append(c);
            } else if (!inString && (c == '[' || c == '{')) {
                depth++;
                current.append(c);
            } else if (!inString && (c == ']' || c == '}')) {
                depth--;
                current.append(c);
            } else if (!inString && c == ',' && depth == 0) {
                result.add(parseJsonValue(current.toString().trim()));
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        if (current.length() > 0) {
            result.add(parseJsonValue(current.toString().trim()));
        }
        return result;
    }

    static Object parseJsonValue(String val) {
        val = val.trim();
        if (val.equals("null")) return null;
        if (val.equals("true")) return true;
        if (val.equals("false")) return false;
        if (val.startsWith("\\"") && val.endsWith("\\"")) {
            return val.substring(1, val.length() - 1).replace("\\\\\\\\", "\\\\").replace("\\\\n", "\\n").replace("\\\\t", "\\t");
        }
        if (val.startsWith("[")) return parseJsonArray(val);
        try {
            if (val.contains(".")) return Double.parseDouble(val);
            return Long.parseLong(val);
        } catch (NumberFormatException e) {
            return val;
        }
    }

    static int[] toIntArray(List<?> list) {
        int[] arr = new int[list.size()];
        for (int i = 0; i < list.size(); i++) {
            arr[i] = ((Number) list.get(i)).intValue();
        }
        return arr;
    }

    static String[] toStringArray(List<?> list) {
        String[] arr = new String[list.size()];
        for (int i = 0; i < list.size(); i++) {
            arr[i] = (String) list.get(i);
        }
        return arr;
    }

    static List<Integer> toIntegerList(List<?> list) {
        List<Integer> result = new ArrayList<>();
        for (Object o : list) result.add(((Number) o).intValue());
        return result;
    }

    static List<String> toStringList(List<?> list) {
        List<String> result = new ArrayList<>();
        for (Object o : list) result.add((String) o);
        return result;
    }

    static String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof Boolean) return obj.toString();
        if (obj instanceof Number) return obj.toString();
        if (obj instanceof String) return "\\"" + ((String)obj).replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"").replace("\\n", "\\\\n") + "\\"";
        if (obj instanceof int[]) {
            int[] arr = (int[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(arr[i]);
            }
            return sb.append("]").toString();
        }
        if (obj instanceof String[]) {
            String[] arr = (String[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(toJson(arr[i]));
            }
            return sb.append("]").toString();
        }
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(toJson(list.get(i)));
            }
            return sb.append("]").toString();
        }
        return obj.toString();
    }
}
`;
}

/**
 * Go test harness
 * Uses encoding/json for parsing and reflection-like approach via generics
 */
function generateGoWrapper(
  userCode: string,
  functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Extract function signature to determine parameter types
  const funcMatch = new RegExp(`func\\s+${functionName}\\s*\\(([^)]*)\\)\\s*([^{]+)?`).exec(userCode);

  const paramsStr = funcMatch?.[1] ?? '';
  // Return type extracted for potential future use
  const _returnType = funcMatch?.[2]?.trim() ?? '';

  // Parse parameter types
  const params = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const paramInfo = params.map(p => {
    const parts = p.split(/\s+/);
    const name = parts[0];
    const type = parts.slice(1).join(' ');
    return { name, type };
  });

  // Generate argument parsing code based on parameter types
  const argDeclarations = paramInfo.map((param, i) => {
    const { name, type } = param;
    if (type === 'int' || type === 'int64') {
      return `\tvar ${name} ${type}\n\tif v, ok := args[${i}].(float64); ok { ${name} = ${type}(v) }`;
    } else if (type === '[]int') {
      return `\t${name} := toIntSlice(args[${i}])`;
    } else if (type === '[]string') {
      return `\t${name} := toStringSlice(args[${i}])`;
    } else if (type === '[][]int') {
      return `\t${name} := toInt2DSlice(args[${i}])`;
    } else if (type === 'string') {
      return `\t${name}, _ := args[${i}].(string)`;
    } else if (type === 'bool') {
      return `\t${name}, _ := args[${i}].(bool)`;
    } else if (type === 'float64') {
      return `\t${name}, _ := args[${i}].(float64)`;
    } else {
      return `\t${name} := args[${i}]`;
    }
  }).join('\n');

  // Generate function call
  const argNames = paramInfo.map(p => p.name).join(', ');

  return `package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

${userCode}

func toIntSlice(v interface{}) []int {
	if arr, ok := v.([]interface{}); ok {
		result := make([]int, len(arr))
		for i, val := range arr {
			if num, ok := val.(float64); ok {
				result[i] = int(num)
			}
		}
		return result
	}
	return nil
}

func toStringSlice(v interface{}) []string {
	if arr, ok := v.([]interface{}); ok {
		result := make([]string, len(arr))
		for i, val := range arr {
			if str, ok := val.(string); ok {
				result[i] = str
			}
		}
		return result
	}
	return nil
}

func toInt2DSlice(v interface{}) [][]int {
	if arr, ok := v.([]interface{}); ok {
		result := make([][]int, len(arr))
		for i, row := range arr {
			result[i] = toIntSlice(row)
		}
		return result
	}
	return nil
}

func main() {
	reader := bufio.NewReader(os.Stdin)
	var inputBuilder strings.Builder
	for {
		line, err := reader.ReadString('\\n')
		inputBuilder.WriteString(line)
		if err != nil {
			break
		}
	}

	inputStr := strings.TrimSpace(inputBuilder.String())
	if inputStr == "" {
		inputStr = "${escapedInput}"
	}

	var args []interface{}
	if err := json.Unmarshal([]byte(inputStr), &args); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

${argDeclarations}

	result := ${functionName}(${argNames})

	output, err := json.Marshal(result)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
	fmt.Println(string(output))
}
`;
}

/**
 * Rust test harness
 * Implements minimal JSON parsing without external dependencies
 */
function generateRustWrapper(
  userCode: string,
  functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Extract function signature to determine parameter types
  const funcMatch = new RegExp(`(?:pub\\s+)?fn\\s+${functionName}\\s*(?:<[^>]*>)?\\s*\\(([^)]*)\\)\\s*(?:->\\s*([^{]+))?`).exec(userCode);

  const paramsStr = funcMatch?.[1] ?? '';
  const returnType = funcMatch?.[2]?.trim() ?? '()';

  // Parse parameter types
  const params = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const paramInfo = params.map(p => {
    // Handle patterns like "nums: Vec<i32>" or "target: i32"
    const colonIdx = p.indexOf(':');
    if (colonIdx === -1) return { name: p, type: 'i32' };
    const name = p.substring(0, colonIdx).trim();
    const type = p.substring(colonIdx + 1).trim();
    return { name, type };
  });

  // Generate argument parsing code
  const argDeclarations = paramInfo.map((param, i) => {
    const { name, type } = param;
    if (type === 'i32' || type === 'i64') {
      return `    let ${name}: ${type} = parse_int(&args[${i}]);`;
    } else if (type === 'Vec<i32>') {
      return `    let ${name}: Vec<i32> = parse_int_vec(&args[${i}]);`;
    } else if (type === 'Vec<Vec<i32>>') {
      return `    let ${name}: Vec<Vec<i32>> = parse_int_2d_vec(&args[${i}]);`;
    } else if (type === 'Vec<String>' || type === 'Vec<&str>') {
      return `    let ${name}: Vec<String> = parse_string_vec(&args[${i}]);`;
    } else if (type === 'String' || type === '&str') {
      return `    let ${name}: String = parse_string(&args[${i}]);`;
    } else if (type === 'bool') {
      return `    let ${name}: bool = parse_bool(&args[${i}]);`;
    } else if (type === 'f64') {
      return `    let ${name}: f64 = parse_float(&args[${i}]);`;
    } else {
      // Default to string parsing
      return `    let ${name} = parse_string(&args[${i}]);`;
    }
  }).join('\n');

  // Generate function call arguments (handle &str conversion)
  const argNames = paramInfo.map(p => {
    if (p.type === '&str') return `&${p.name}`;
    return p.name.replace(/^&/, '');
  }).join(', ');

  // Generate output serialization based on return type
  let outputCode = 'println!("{}", to_json(&result));';
  if (returnType === 'i32' || returnType === 'i64' || returnType === 'usize') {
    outputCode = 'println!("{}", result);';
  } else if (returnType === 'bool') {
    outputCode = 'println!("{}", if result { "true" } else { "false" });';
  } else if (returnType === 'String' || returnType === '&str') {
    outputCode = 'println!("\\"{}\\"", result.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\""));';
  }

  return `use std::io::{self, Read};

${userCode}

fn parse_json_array(s: &str) -> Vec<String> {
    let s = s.trim();
    if !s.starts_with('[') || !s.ends_with(']') { return vec![]; }
    let inner = &s[1..s.len()-1];
    if inner.trim().is_empty() { return vec![]; }

    let mut result = Vec::new();
    let mut depth = 0;
    let mut in_string = false;
    let mut current = String::new();
    let chars: Vec<char> = inner.chars().collect();

    for i in 0..chars.len() {
        let c = chars[i];
        if c == '"' && (i == 0 || chars[i-1] != '\\\\') {
            in_string = !in_string;
            current.push(c);
        } else if !in_string && (c == '[' || c == '{') {
            depth += 1;
            current.push(c);
        } else if !in_string && (c == ']' || c == '}') {
            depth -= 1;
            current.push(c);
        } else if !in_string && c == ',' && depth == 0 {
            result.push(current.trim().to_string());
            current = String::new();
        } else {
            current.push(c);
        }
    }
    if !current.trim().is_empty() {
        result.push(current.trim().to_string());
    }
    result
}

fn parse_int(s: &str) -> i32 {
    s.trim().parse().unwrap_or(0)
}

fn parse_float(s: &str) -> f64 {
    s.trim().parse().unwrap_or(0.0)
}

fn parse_bool(s: &str) -> bool {
    s.trim() == "true"
}

fn parse_string(s: &str) -> String {
    let s = s.trim();
    if s.starts_with('"') && s.ends_with('"') {
        s[1..s.len()-1].replace("\\\\n", "\\n").replace("\\\\t", "\\t").replace("\\\\\\\\", "\\\\")
    } else {
        s.to_string()
    }
}

fn parse_int_vec(s: &str) -> Vec<i32> {
    parse_json_array(s).iter().map(|x| parse_int(x)).collect()
}

fn parse_int_2d_vec(s: &str) -> Vec<Vec<i32>> {
    parse_json_array(s).iter().map(|x| parse_int_vec(x)).collect()
}

fn parse_string_vec(s: &str) -> Vec<String> {
    parse_json_array(s).iter().map(|x| parse_string(x)).collect()
}

fn to_json<T: ToJson>(val: &T) -> String {
    val.to_json()
}

trait ToJson {
    fn to_json(&self) -> String;
}

impl ToJson for i32 {
    fn to_json(&self) -> String { self.to_string() }
}

impl ToJson for i64 {
    fn to_json(&self) -> String { self.to_string() }
}

impl ToJson for bool {
    fn to_json(&self) -> String { if *self { "true" } else { "false" }.to_string() }
}

impl ToJson for String {
    fn to_json(&self) -> String {
        format!("\\"{}\\"", self.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"").replace("\\n", "\\\\n"))
    }
}

impl<T: ToJson> ToJson for Vec<T> {
    fn to_json(&self) -> String {
        let items: Vec<String> = self.iter().map(|x| x.to_json()).collect();
        format!("[{}]", items.join(","))
    }
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap_or_default();

    let input_str = input.trim();
    let input_str = if input_str.is_empty() {
        "${escapedInput}"
    } else {
        input_str
    };

    let args = parse_json_array(input_str);

${argDeclarations}

    let result = ${functionName}(${argNames});
    ${outputCode}
}
`;
}

/**
 * C++ test harness
 * Implements minimal JSON parsing without external dependencies
 */
function generateCppWrapper(
  userCode: string,
  functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Extract function signature to determine parameter types
  const funcMatch = new RegExp(`(?:[\\w<>:]+\\s+)+${functionName}\\s*\\(([^)]*)\\)`).exec(userCode);

  const paramsStr = funcMatch?.[1] ?? '';

  // Parse parameter types (C++ style: "vector<int>& nums, int target")
  const params = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const paramInfo = params.map(p => {
    // Remove reference/pointer markers for parsing
    const cleaned = p.replace(/[&*]/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = cleaned.split(' ');
    const name = parts[parts.length - 1];
    const type = parts.slice(0, -1).join(' ');
    return { name, type: type || 'int' };
  });

  // Generate argument parsing code
  const argDeclarations = paramInfo.map((param, i) => {
    const { name, type } = param;
    if (type === 'int' || type === 'long' || type === 'long long') {
      return `    ${type} ${name} = parseInt(args[${i}]);`;
    } else if (type === 'vector<int>') {
      return `    vector<int> ${name} = parseIntVector(args[${i}]);`;
    } else if (type === 'vector<vector<int>>') {
      return `    vector<vector<int>> ${name} = parseInt2DVector(args[${i}]);`;
    } else if (type === 'vector<string>') {
      return `    vector<string> ${name} = parseStringVector(args[${i}]);`;
    } else if (type === 'string') {
      return `    string ${name} = parseString(args[${i}]);`;
    } else if (type === 'bool') {
      return `    bool ${name} = parseBool(args[${i}]);`;
    } else if (type === 'double' || type === 'float') {
      return `    ${type} ${name} = parseDouble(args[${i}]);`;
    } else {
      return `    auto ${name} = args[${i}];`;
    }
  }).join('\n');

  // Generate function call
  const argNames = paramInfo.map(p => p.name).join(', ');

  // Determine return type for proper serialization
  const returnMatch = new RegExp(`([\\w<>:]+)\\s+${functionName}\\s*\\(`).exec(userCode);
  const returnType = returnMatch?.[1] ?? 'int';

  let outputCode = 'cout << toJson(result) << endl;';
  if (returnType === 'int' || returnType === 'long' || returnType === 'long long') {
    outputCode = 'cout << result << endl;';
  } else if (returnType === 'bool') {
    outputCode = 'cout << (result ? "true" : "false") << endl;';
  }

  return `#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

${userCode}

vector<string> parseJsonArray(const string& s) {
    vector<string> result;
    string trimmed = s;
    size_t start = trimmed.find_first_not_of(" \\n\\r\\t");
    size_t end = trimmed.find_last_not_of(" \\n\\r\\t");
    if (start == string::npos) return result;
    trimmed = trimmed.substr(start, end - start + 1);

    if (trimmed.empty() || trimmed[0] != '[' || trimmed.back() != ']') return result;
    string inner = trimmed.substr(1, trimmed.length() - 2);
    if (inner.find_first_not_of(" \\n\\r\\t") == string::npos) return result;

    int depth = 0;
    bool inString = false;
    string current;

    for (size_t i = 0; i < inner.length(); i++) {
        char c = inner[i];
        if (c == '"' && (i == 0 || inner[i-1] != '\\\\')) {
            inString = !inString;
            current += c;
        } else if (!inString && (c == '[' || c == '{')) {
            depth++;
            current += c;
        } else if (!inString && (c == ']' || c == '}')) {
            depth--;
            current += c;
        } else if (!inString && c == ',' && depth == 0) {
            size_t s = current.find_first_not_of(" \\n\\r\\t");
            size_t e = current.find_last_not_of(" \\n\\r\\t");
            if (s != string::npos) result.push_back(current.substr(s, e - s + 1));
            current.clear();
        } else {
            current += c;
        }
    }
    if (!current.empty()) {
        size_t s = current.find_first_not_of(" \\n\\r\\t");
        size_t e = current.find_last_not_of(" \\n\\r\\t");
        if (s != string::npos) result.push_back(current.substr(s, e - s + 1));
    }
    return result;
}

int parseInt(const string& s) {
    string trimmed = s;
    size_t start = trimmed.find_first_not_of(" \\n\\r\\t");
    if (start == string::npos) return 0;
    return stoi(trimmed.substr(start));
}

double parseDouble(const string& s) {
    string trimmed = s;
    size_t start = trimmed.find_first_not_of(" \\n\\r\\t");
    if (start == string::npos) return 0.0;
    return stod(trimmed.substr(start));
}

bool parseBool(const string& s) {
    return s.find("true") != string::npos;
}

string parseString(const string& s) {
    string trimmed = s;
    size_t start = trimmed.find_first_not_of(" \\n\\r\\t");
    size_t end = trimmed.find_last_not_of(" \\n\\r\\t");
    if (start == string::npos) return "";
    trimmed = trimmed.substr(start, end - start + 1);
    if (trimmed.length() >= 2 && trimmed[0] == '"' && trimmed.back() == '"') {
        return trimmed.substr(1, trimmed.length() - 2);
    }
    return trimmed;
}

vector<int> parseIntVector(const string& s) {
    vector<string> arr = parseJsonArray(s);
    vector<int> result;
    for (const auto& x : arr) result.push_back(parseInt(x));
    return result;
}

vector<vector<int>> parseInt2DVector(const string& s) {
    vector<string> arr = parseJsonArray(s);
    vector<vector<int>> result;
    for (const auto& x : arr) result.push_back(parseIntVector(x));
    return result;
}

vector<string> parseStringVector(const string& s) {
    vector<string> arr = parseJsonArray(s);
    vector<string> result;
    for (const auto& x : arr) result.push_back(parseString(x));
    return result;
}

string toJson(int val) { return to_string(val); }
string toJson(long val) { return to_string(val); }
string toJson(long long val) { return to_string(val); }
string toJson(bool val) { return val ? "true" : "false"; }
string toJson(double val) { return to_string(val); }
string toJson(const string& val) {
    string escaped;
    escaped += '"';
    for (char c : val) {
        if (c == '"') escaped += "\\\\\\\"";
        else if (c == '\\\\') escaped += "\\\\\\\\";
        else if (c == '\\n') escaped += "\\\\n";
        else escaped += c;
    }
    escaped += '"';
    return escaped;
}

template<typename T>
string toJson(const vector<T>& vec) {
    string result = "[";
    for (size_t i = 0; i < vec.size(); i++) {
        if (i > 0) result += ",";
        result += toJson(vec[i]);
    }
    result += "]";
    return result;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    stringstream buffer;
    buffer << cin.rdbuf();
    string input = buffer.str();

    size_t start = input.find_first_not_of(" \\n\\r\\t");
    size_t end = input.find_last_not_of(" \\n\\r\\t");

    if (start == string::npos) {
        input = "${escapedInput}";
    } else {
        input = input.substr(start, end - start + 1);
    }

    vector<string> args = parseJsonArray(input);

${argDeclarations}

    auto result = ${functionName}(${argNames});
    ${outputCode}

    return 0;
}
`;
}

// ===========================================
// SIMPLIFIED WRAPPERS FOR COMMON CASES
// ===========================================

/**
 * Generate a simple wrapper for languages with good JSON support
 * (JavaScript, TypeScript, Python)
 */
export function generateSimpleWrapper(
  userCode: string,
  language: ProgrammingLanguage,
  functionName: string,
  inputArgs: unknown[]
): string {
  const inputJson = JSON.stringify(inputArgs);
  return generateTestHarness(userCode, language, functionName, inputJson);
}

/**
 * Check if a language has good JSON support for automatic wrapping
 */
export function hasNativeJsonSupport(language: ProgrammingLanguage): boolean {
  return ['javascript', 'typescript', 'python'].includes(language);
}

/**
 * For languages without native JSON support, we generate simpler wrappers
 * that expect pre-parsed input format
 */
export function generateDirectInputWrapper(
  userCode: string,
  language: ProgrammingLanguage,
  functionName: string,
  formattedInput: string
): string {
  switch (language) {
    case 'java':
      return generateJavaDirectWrapper(userCode, functionName, formattedInput);
    case 'go':
      return generateGoDirectWrapper(userCode, functionName, formattedInput);
    case 'rust':
      return generateRustDirectWrapper(userCode, functionName, formattedInput);
    case 'cpp':
      return generateCppDirectWrapper(userCode, functionName, formattedInput);
    default:
      return generateTestHarness(userCode, language, functionName, formattedInput);
  }
}

// Direct input wrappers for compiled languages
// These are used when generateDirectInputWrapper is called
// They use the same logic as the main wrappers

function generateJavaDirectWrapper(
  userCode: string,
  functionName: string,
  formattedInput: string
): string {
  // Delegate to the main wrapper
  return generateJavaWrapper(userCode, functionName, formattedInput);
}

function generateGoDirectWrapper(
  userCode: string,
  functionName: string,
  formattedInput: string
): string {
  // If user code has package main and fn main, return as-is
  if (userCode.includes('package main') && userCode.includes('func main()')) {
    return userCode;
  }
  // Otherwise delegate to the main wrapper
  return generateGoWrapper(userCode, functionName, formattedInput);
}

function generateRustDirectWrapper(
  userCode: string,
  functionName: string,
  formattedInput: string
): string {
  // If user code already has fn main, return as-is
  if (userCode.includes('fn main()')) {
    return userCode;
  }
  // Otherwise delegate to the main wrapper
  return generateRustWrapper(userCode, functionName, formattedInput);
}

function generateCppDirectWrapper(
  userCode: string,
  functionName: string,
  formattedInput: string
): string {
  // If user code already has int main, return as-is
  if (userCode.includes('int main(')) {
    return userCode;
  }
  // Otherwise delegate to the main wrapper
  return generateCppWrapper(userCode, functionName, formattedInput);
}

// ===========================================
// FALLBACK FUNCTION NAME EXTRACTION
// ===========================================

/**
 * Attempt to extract any callable function name from code
 * Used as fallback when extractFunctionName returns null
 */
export function extractAnyFunctionName(code: string, language: ProgrammingLanguage): string | null {
  // Generic patterns that work across languages
  const genericPatterns: RegExp[] = [
    // Most common: function keyword or def
    /function\s+(\w+)/,
    /def\s+(\w+)/,
    /fn\s+(\w+)/,
    /func\s+(\w+)/,
    // Method in class (Java/C++)
    /(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/,
    // Arrow functions assigned to const/let/var
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/,
    // C++ style
    /(?:int|void|bool|string|vector|auto)\s+(\w+)\s*\(/,
  ];

  for (const pattern of genericPatterns) {
    const match = code.match(pattern);
    if (match?.[1]) {
      // Skip common non-function matches
      const name = match[1];
      if (!['main', 'Main', 'if', 'for', 'while', 'switch', 'catch'].includes(name)) {
        return name;
      }
    }
  }

  // Language-specific fallback
  return extractFunctionName(code, language);
}

/**
 * Get a suggested function name based on common coding challenge conventions
 */
export function getDefaultFunctionName(language: ProgrammingLanguage): string {
  // Common function names used in coding challenges
  const defaults: Record<ProgrammingLanguage, string> = {
    javascript: 'solution',
    typescript: 'solution',
    python: 'solution',
    java: 'solution',
    go: 'solution',
    rust: 'solution',
    cpp: 'solution',
  };
  return defaults[language] ?? 'solution';
}
