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
 * Note: Java requires a specific class structure
 */
function generateJavaWrapper(
  userCode: string,
  _functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Check if user code already has a class definition
  const hasClass = /class\s+\w+/.test(userCode);

  if (hasClass) {
    // User provided a full class, we need to create a Main wrapper
    return `import java.util.*;
import java.io.*;

${userCode}

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
            // Note: Java execution requires custom parsing per problem
            // This is a simplified version
            System.out.println(input);
        } catch (Exception e) {
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}
`;
  }

  // User provided just a method, wrap in Solution class
  return `import java.util.*;
import java.io.*;

class Solution {
    ${userCode}
}

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
            Solution solution = new Solution();
            // Note: Actual invocation depends on method signature
            System.out.println("Java execution requires problem-specific parsing");
        } catch (Exception e) {
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}
`;
}

/**
 * Go test harness
 */
function generateGoWrapper(
  userCode: string,
  _functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

${userCode}

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

	var input []interface{}
	if err := json.Unmarshal([]byte(inputStr), &input); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	// Note: Go execution requires problem-specific type conversion
	fmt.Println("Go execution requires problem-specific parsing")
}
`;
}

/**
 * Rust test harness
 */
function generateRustWrapper(
  userCode: string,
  _functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `use std::io::{self, Read};

${userCode}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap_or_default();

    let input = input.trim();
    let input = if input.is_empty() {
        "${escapedInput}"
    } else {
        input
    };

    // Note: Rust execution requires problem-specific type parsing
    // Using serde_json would require external dependency
    println!("Rust execution requires problem-specific parsing");
}
`;
}

/**
 * C++ test harness
 */
function generateCppWrapper(
  userCode: string,
  _functionName: string,
  inputJson: string
): string {
  const escapedInput = inputJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

${userCode}

int main() {
    string input;
    stringstream buffer;
    buffer << cin.rdbuf();
    input = buffer.str();

    // Trim whitespace
    size_t start = input.find_first_not_of(" \\n\\r\\t");
    size_t end = input.find_last_not_of(" \\n\\r\\t");

    if (start == string::npos) {
        input = "${escapedInput}";
    } else {
        input = input.substr(start, end - start + 1);
    }

    // Note: C++ execution requires problem-specific parsing
    // JSON parsing would require external library
    cout << "C++ execution requires problem-specific parsing" << endl;

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
// These expect stdin to be in a language-specific format

function generateJavaDirectWrapper(
  userCode: string,
  _functionName: string,
  _formattedInput: string
): string {
  const hasClass = /class\s+Solution/.test(userCode);

  if (hasClass) {
    return `import java.util.*;
import java.io.*;

${userCode}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Solution sol = new Solution();
        // Problem-specific input parsing and function call needed
        sc.close();
    }
}
`;
  }

  return `import java.util.*;
import java.io.*;

public class Main {
    ${userCode}

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Problem-specific input parsing and function call needed
        sc.close();
    }
}
`;
}

function generateGoDirectWrapper(
  userCode: string,
  _functionName: string,
  _formattedInput: string
): string {
  // Check if user code already has package main
  if (userCode.includes('package main')) {
    return userCode;
  }

  return `package main

import (
	"fmt"
)

${userCode}

func main() {
	// Problem-specific input parsing and function call needed
	fmt.Println("Ready")
}
`;
}

function generateRustDirectWrapper(
  userCode: string,
  _functionName: string,
  _formattedInput: string
): string {
  // Check if user code already has fn main
  if (userCode.includes('fn main()')) {
    return userCode;
  }

  return `use std::io::{self, BufRead};

${userCode}

fn main() {
    let stdin = io::stdin();
    let _handle = stdin.lock();
    // Problem-specific input parsing and function call needed
    println!("Ready");
}
`;
}

function generateCppDirectWrapper(
  userCode: string,
  _functionName: string,
  _formattedInput: string
): string {
  // Check if user code already has int main
  if (userCode.includes('int main(')) {
    return userCode;
  }

  return `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

${userCode}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    // Problem-specific input parsing and function call needed
    return 0;
}
`;
}
