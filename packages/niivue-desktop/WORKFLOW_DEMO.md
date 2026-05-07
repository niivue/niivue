# Workflow Designer Demo

## Overview

NiiVue Desktop now includes a visual workflow designer that lets users build neuroimaging pipelines by composing tool blocks. Workflows can be saved, shared, and run with a step-by-step wizard.

## Demo: Building a DICOM-to-BIDS Pipeline from Scratch

### Step 1: Open the Designer

1. From the menu bar: **Workflows > Create Workflow...** (or Cmd+Shift+N)
2. Click **Start from Scratch** in the template gallery

### Step 2: Name Your Workflow

At the top of the designer, fill in:
- **Workflow**: `my-dicom-to-bids`
- **Description**: `Convert DICOMs to a BIDS-compliant dataset`
- **Dataset**: `My Dataset`

### Step 3: Add Blocks

Click **+ Add Tool** at the bottom to open the block palette. Add these blocks in order:

| # | Block | Category | What it does |
|---|-------|----------|-------------|
| 1 | **Import DICOMs** | Import | Converts DICOM files to NIfTI using dcm2niix |
| 2 | **Subject Selection** | Processing | Detect and select/exclude subjects |
| 3 | **Classify for BIDS** | Processing | Auto-classify series into BIDS datatypes |
| 4 | **Participants & Sessions** | Processing | Edit subject labels and demographics |
| 5 | **Preview Images** | Processing | Review images before writing |
| 6 | **Write BIDS Dataset** | Output | Write the final BIDS dataset to disk |

### Step 4: Review the Pipeline

Each card shows three zones:
- **Inputs** (violet) — where data comes from. Dropdowns show available sources from prior steps or "Ask user at runtime"
- **-> Context** (teal) — what the tool produces, automatically available to downstream steps
- The context spine on the left shows all accumulated data

Key things to notice:
- **Import DICOMs** needs `dicom_dir` — this will be asked at runtime
- **Classify for BIDS** auto-wires `sidecars` from Import DICOMs (shown as "import_dicoms_0 -> sidecars")
- **Write BIDS Dataset** needs `output_dir` — set the dropdown to "Ask user at runtime"

### Step 5: Save the Workflow

Click **Save**. The workflow:
- Appears in the **Workflows** menu immediately
- Is stored in your user data directory
- Can be edited, deleted, or run at any time

### Step 6: Run the Workflow

From the menu: **Workflows > Convert DICOMs to a BIDS-compliant dataset > Run...**

The wizard walks through each step:

#### Step 6a: Import DICOMs
- Browse for a folder containing DICOM files
- Click **Next** — dcm2niix runs and converts the files

#### Step 6b: Subject Selection
- See all detected subjects from DICOM headers
- Uncheck any subjects to exclude from the dataset
- Click **Next**

#### Step 6c: Classify for BIDS
- Review the auto-detected BIDS classification for each series
- Excluded subjects' series are already marked as excluded
- Adjust datatype, suffix, or task labels as needed
- Click **Next**

#### Step 6d: Participants & Sessions
- Only included subjects are shown
- Edit subject labels, session names, age, sex
- Click **Next**

#### Step 6e: Preview Images
- Review the proposed dataset structure
- Open any image in the viewer to inspect
- Click **Next**

#### Step 6f: Write BIDS Dataset
- Enter a dataset name
- Browse for an output directory
- Click **Write BIDS**

The wizard writes the BIDS-compliant dataset to disk.

## Key Features

### Context-Driven Data Flow
Every tool's outputs flow into a shared context. Downstream tools automatically find compatible data from prior steps — no manual wiring needed.

### Subject Exclusion Propagation
Excluding a subject in the Subject Selection step automatically:
- Marks their series as excluded in the classification table
- Hides them from the session editor
- Excludes them from the final BIDS output

### Headless and UI Parity
The same validation runs in both modes:
- **UI**: Missing required fields disable the Next button and show inline forms
- **Headless**: Missing fields produce a clear error listing what's needed

### User Workflow Management
- **Save** custom workflows from the designer
- **Edit** saved workflows at any time
- **Delete** with confirmation
- **Built-in workflows** are protected — use "Use as Template" to create a copy
- Saved workflows appear in the Workflows menu immediately

### NiiMath Integration
NiiMath is available as a processing block for:
- Smoothing, thresholding, masking
- Math operations (add, subtract, multiply, divide)
- Statistical operations (mean, std, max, min)
- And 30+ other operations

Add it between any steps that produce NIfTI volumes.

## Architecture

```
Context Spine (left)          Tool Cards (right)
┌──────────────┐
│ Import       │              ┌─────────────────────┐
│  volumes     │              │ Import DICOMs     1 │
│  sidecars    │              │ INPUTS              │
│              │              │   dicom_dir: [...]   │
│ Classify     │              │ -> CONTEXT           │
│  mappings    │              │   NIfTI volumes      │
│  subjects    │              │   Sidecar JSON       │
│              │              └─────────────────────┘
│ ...          │              ┌─────────────────────┐
└──────────────┘              │ Classify for BIDS 3 │
                              │ ...                  │
                              └─────────────────────┘
```

Tools read from context and write back to it. The designer shows this flow visually with color-coded input/output sections on each card.
