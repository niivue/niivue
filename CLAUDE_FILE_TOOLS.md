# Claude Code File Analysis Techniques

This document describes the bash commands and techniques used to analyze large codebases when files exceed Claude's context window. These techniques were used to analyze the 15,945-line `niivue/index.ts` file and create the modularization plan.

## Problem Statement

When dealing with very large files (>2000 lines), you cannot read the entire file into Claude's context window. You need to use command-line tools to extract structural information about the code before reading specific sections.

---

## Core Analysis Techniques

### 1. Get Basic File Statistics

Start by understanding the scope of the file:

```bash
# Count total lines
wc -l /path/to/file.ts

# Get file size in human-readable format
du -h /path/to/file.ts
```

**Example output:**
```
15945 /Users/taylor/github/niivue/niivue/packages/niivue/src/niivue/index.ts
552K  /Users/taylor/github/niivue/niivue/packages/niivue/src/niivue/index.ts
```

**Use case:** Quickly determine if you need to use extraction techniques (files >2000 lines or >100KB).

---

### 2. Extract Method Definitions with Line Numbers

Find all method definitions and their line numbers:

```bash
# Extract TypeScript method definitions
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" /path/to/file.ts | \
  sed 's/^\([0-9]*\):\s*\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\1:\2/'
```

**What this does:**
- `grep -n`: Show line numbers
- `^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(`: Match method names
- `sed`: Extract just line number and method name

**Example output:**
```
941:cleanup
1135:syncWith
1168:doSync3d
1178:doSync2d
```

**Use case:** Get a map of where all methods are located in the file.

---

### 3. Extract Unique Method Names

Get a sorted list of all unique method names:

```bash
# Extract and sort unique method names
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" /path/to/file.ts | \
  sed 's/^\([0-9]*\):\s*\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\2/' | \
  sort | uniq > /tmp/all_methods.txt

# Count unique methods
wc -l /tmp/all_methods.txt
```

**Example output:**
```
280 /tmp/all_methods.txt
```

**Use case:** Understand the total number of methods in the class.

---

### 4. Count Total Method Definitions (Including Duplicates)

Count all method-like patterns:

```bash
# Count all function/method definitions
grep -n "^\s*\(public\|private\|protected\)\?\s*\(static\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" /path/to/file.ts | wc -l
```

**Example output:**
```
1790
```

**Use case:** This includes all function calls inside methods, giving you a sense of code density.

---

### 5. Categorize Methods by Keyword

Count methods related to specific functionality areas:

```bash
# Event/input handling methods
grep -n "^\s*\(public\|private\|protected\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" /path/to/file.ts | \
  grep -E "(mouse|touch|key|event|listener|gesture)" | wc -l

# Rendering/drawing methods
grep -n "^\s*\(public\|private\|protected\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" /path/to/file.ts | \
  grep -E "(draw|render|shader|gl|webgl)" | wc -l

# Data loading/management methods
grep -n "^\s*\(public\|private\|protected\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" /path/to/file.ts | \
  grep -E "(volume|mesh|image|load)" | wc -l

# Coordinate/navigation methods
grep -n "^\s*\(public\|private\|protected\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" /path/to/file.ts | \
  grep -E "(slice|crosshair|frac|vox|mm|screen|canvas)" | wc -l

# Colormap methods
grep -n "^\s*\(public\|private\|protected\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" /path/to/file.ts | \
  grep -E "(colormap|color|palette)" | wc -l
```

**Example outputs:**
```
52   # event handling
179  # rendering
151  # data management
52   # navigation
33   # colormap
```

**Use case:** Understand the distribution of functionality and identify major areas for modularization.

---

### 6. Filter Methods by Category

Extract specific method names for a category:

```bash
# Get all event-related method names
grep -E "(mouse|touch|key|event|listener|gesture)" /tmp/all_methods.txt
```

**Example output:**
```
checkMultitouch
dragEnterListener
dragOverListener
handleMouseAction
keyDownListener
keyUpListener
mouseClick
mouseContextMenuListener
mouseDownListener
mouseLeaveListener
mouseMoveListener
mouseUpListener
touchEndListener
touchMoveListener
touchStartListener
wheelListener
```

**Use case:** Create focused lists of methods to group into specific modules.

---

### 7. Extract Property Definitions

Find all class properties:

```bash
# Extract properties (TypeScript style)
grep -n "^\s*\(public\|private\|protected\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:]" /path/to/file.ts
```

**Example output:**
```
151:  distanceRange: number
152:  size: number
378:  canvas: HTMLCanvasElement | null = null
379:  _gl: WebGL2RenderingContext | null = null
380:  isBusy = false
```

**Use case:** Identify state variables that need to be distributed across modules.

---

### 8. Search for Specific Patterns

Use Grep tool for content search with context:

```bash
# Search for shader-related code
grep -n "shader" /path/to/file.ts -A 2 -B 2
```

**Claude Code Grep tool usage:**
```typescript
Grep({
  pattern: "shader",
  path: "/path/to/file.ts",
  output_mode: "content",
  "-n": true,
  "-A": 2,
  "-B": 2
})
```

**Use case:** Find related code blocks to understand dependencies.

---

### 9. Read Specific File Sections

Once you have line numbers, read targeted sections:

```bash
# Read lines 100-200 using sed
sed -n '100,200p' /path/to/file.ts
```

**Claude Code Read tool usage:**
```typescript
Read({
  file_path: "/path/to/file.ts",
  offset: 100,  // start at line 100
  limit: 100    // read 100 lines
})
```

**Use case:** Deep-dive into specific methods or code sections after identifying their location.

---

### 10. Extract Method Signatures

Get full method signatures with parameters and return types:

```bash
# Extract method signatures (more verbose)
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)" /path/to/file.ts | head -n 50
```

**Use case:** Understand method interfaces for creating module APIs.

---

### 11. Chain Commands for Complex Analysis

Combine multiple commands to extract specific insights:

```bash
# Get first 200 method definitions
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" /path/to/file.ts | head -n 200

# Get last 200 method definitions
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" /path/to/file.ts | tail -n 200

# Skip first 200 and get next 200
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" /path/to/file.ts | tail -n +200 | head -n 200
```

**Use case:** Systematically analyze methods in chunks.

---

### 12. Find Dependencies and Imports

Analyze what the file imports:

```bash
# Extract all import statements
grep "^import" /path/to/file.ts

# Count imports
grep "^import" /path/to/file.ts | wc -l

# Find specific imports
grep "^import.*gl-matrix" /path/to/file.ts
```

**Use case:** Understand external dependencies for module planning.

---

### 13. Extract Callbacks and Event Handlers

Find callback definitions:

```bash
# Find callback property definitions
grep -n "^\s*on[A-Z][a-zA-Z]*:" /path/to/file.ts
```

**Example output:**
```
649:  onMouseUp: (dragReleaseParams: DragReleaseParams) => void = () => {}
656:  onLocationChange: (data: NiiVueLocationValue) => void = () => {}
801:  onMeshAdded: () => void = () => {}
```

**Use case:** Identify event system architecture.

---

### 14. Find TODO and FIXME Comments

Identify technical debt:

```bash
# Find TODOs
grep -n "TODO" /path/to/file.ts

# Find FIXMEs
grep -n "FIXME" /path/to/file.ts
```

**Use case:** Understand known issues to address during refactoring.

---

## Complete Analysis Workflow

Here's the recommended order for analyzing a large file:

### Step 1: Initial Assessment
```bash
# Get file statistics
wc -l /path/to/file.ts
du -h /path/to/file.ts
```

### Step 2: Extract Structure
```bash
# Get all methods with line numbers
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" /path/to/file.ts | \
  sed 's/^\([0-9]*\):\s*\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\1:\2/' > /tmp/methods_with_lines.txt

# Get unique method names
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" /path/to/file.ts | \
  sed 's/^\([0-9]*\):\s*\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\2/' | \
  sort | uniq > /tmp/all_methods.txt

# Count methods
wc -l /tmp/all_methods.txt
```

### Step 3: Categorize Methods
```bash
# Event handlers
grep -E "(mouse|touch|key|event|listener|gesture)" /tmp/all_methods.txt > /tmp/event_methods.txt

# Rendering
grep -E "(draw|render|shader|gl|webgl|texture)" /tmp/all_methods.txt > /tmp/render_methods.txt

# Data management
grep -E "(volume|mesh|image|load|add|remove|set|get)" /tmp/all_methods.txt > /tmp/data_methods.txt

# Navigation
grep -E "(slice|crosshair|frac|vox|mm|screen|canvas)" /tmp/all_methods.txt > /tmp/nav_methods.txt

# Count each category
wc -l /tmp/*_methods.txt
```

### Step 4: Read Strategic Sections
```bash
# Read imports and class definition (first 200 lines)
# Use Claude Code Read tool with offset=0, limit=200

# Read property definitions (around line 350-550)
# Use Claude Code Read tool with offset=350, limit=200

# Read specific method groups based on line numbers
# Use Claude Code Read tool with targeted offset/limit
```

### Step 5: Analyze Dependencies
```bash
# Extract imports
grep "^import" /path/to/file.ts > /tmp/imports.txt

# Find internal dependencies
grep -E "(this\.[a-zA-Z_$][a-zA-Z0-9_$]*)" /path/to/file.ts | head -n 100
```

---

## Pro Tips

### 1. Working with macOS/BSD grep

macOS uses BSD grep which doesn't support `-P` (Perl regex). Use basic or extended regex instead:

```bash
# ❌ Won't work on macOS
grep -P "(?<=pattern)" file.ts

# ✅ Use basic extended regex instead
grep -E "pattern" file.ts

# ✅ Or use awk for complex extraction
awk '/pattern/ {print $1}' file.ts
```

### 2. Using sed for Extraction

```bash
# Extract just the method name from a line
echo "941:  cleanup(): void {" | sed 's/^\([0-9]*\):\s*\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\2/'
# Output: cleanup
```

### 3. Combining Tools

```bash
# Find methods, sort by line number, get top 50
grep -n "method_pattern" file.ts | sort -n | head -n 50

# Find methods containing specific keyword in name
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" file.ts | grep "draw"
```

### 4. Save Intermediate Results

Always save extraction results to temp files for reuse:

```bash
grep -n "pattern" file.ts > /tmp/extracted_data.txt
# Now you can manipulate /tmp/extracted_data.txt multiple times
```

### 5. Count Before Reading

Always count results before reading them to avoid overwhelming output:

```bash
# First count
grep "pattern" file.ts | wc -l

# If reasonable number, then view
grep "pattern" file.ts
```

---

## Claude Code Tool Integration

When using Claude Code, prefer these tools over bash for better integration:

### Grep Tool
```typescript
// Instead of: grep -n "pattern" file.ts
Grep({
  pattern: "pattern",
  path: "/path/to/file.ts",
  output_mode: "content",
  "-n": true
})
```

### Read Tool
```typescript
// Instead of: sed -n '100,200p' file.ts
Read({
  file_path: "/path/to/file.ts",
  offset: 100,
  limit: 100
})
```

### Glob Tool
```typescript
// Instead of: find . -name "*.ts"
Glob({
  pattern: "**/*.ts",
  path: "/path/to/search"
})
```

---

## Real-World Example: Niivue Analysis

Here's the actual sequence used to analyze `niivue/index.ts`:

```bash
# 1. Check size
wc -l packages/niivue/src/niivue/index.ts
# Output: 15945

du -h packages/niivue/src/niivue/index.ts
# Output: 552K

# 2. Count total methods
grep -n "^\s*\(public\|private\|protected\)\?\s*\(static\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*(" packages/niivue/src/niivue/index.ts | wc -l
# Output: 1790

# 3. Extract unique methods
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" packages/niivue/src/niivue/index.ts | \
  sed 's/^\([0-9]*\):\s*\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\2/' | \
  sort | uniq > /tmp/all_methods.txt

wc -l /tmp/all_methods.txt
# Output: 280

# 4. Categorize by area
grep -E "(mouse|touch|key|event|listener|gesture)" /tmp/all_methods.txt | wc -l
# Output: 22

grep -E "(draw|render|shader|gl|webgl|texture)" /tmp/all_methods.txt | wc -l
# Output: 54

grep -E "(volume|mesh|image|load|add|remove|set|get)" /tmp/all_methods.txt | wc -l
# Output: 106

# 5. Read specific sections with Claude Read tool
# Read lines 0-200 (imports and class definition)
# Read lines 350-550 (property definitions)
# Read lines 800-900 (callbacks)
# etc.

# 6. Create method map with line numbers
grep -n "^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*([^)]*)\s*:\s*[^{]*{" packages/niivue/src/niivue/index.ts | \
  sed 's/^\([0-9]*\):\s*\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\1:\2/' > /tmp/methods_with_lines.txt

# 7. Display first 200 methods
head -n 200 /tmp/methods_with_lines.txt
```

This systematic approach allowed analysis of a 15,945-line file that couldn't fit in the context window.

---

## Pattern Library

Common regex patterns for code analysis:

```bash
# TypeScript method definitions
^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*:\s*[^{]*{

# Property definitions
^\s*\(public\|private\|protected\)\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:]

# Import statements
^import.*from

# Callback definitions
^\s*on[A-Z][a-zA-Z]*:

# Class definitions
^\s*\(export\s*\)\?class\s*[a-zA-Z_$][a-zA-Z0-9_$]*

# Interface definitions
^\s*\(export\s*\)\?interface\s*[a-zA-Z_$][a-zA-Z0-9_$]*

# Type definitions
^\s*\(export\s*\)\?type\s*[a-zA-Z_$][a-zA-Z0-9_$]*

# Enum definitions
^\s*\(export\s*\)\?enum\s*[a-zA-Z_$][a-zA-Z0-9_$]*

# Comments
^\s*//\|^\s*/\*

# JSDoc comments
^\s*/\*\*
```

---

## Conclusion

These techniques allow you to analyze files of any size by:

1. **Extracting structure** without reading the entire file
2. **Categorizing code** by functionality
3. **Mapping locations** to read specific sections
4. **Understanding scope** before detailed analysis
5. **Planning refactoring** based on data-driven insights

The key principle: **Use command-line tools to create a map, then use Claude Code's Read tool to explore specific areas.**

By combining bash extraction with targeted file reading, you can analyze codebases of any size and create comprehensive refactoring plans.
