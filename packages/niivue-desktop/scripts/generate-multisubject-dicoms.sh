#!/usr/bin/env bash
#
# Generate a multi-subject DICOM test directory from a single-subject source.
# Uses dcmodify to stamp different PatientID/PatientName values and unique
# StudyInstanceUID/SeriesInstanceUID per copy so dcm2niix treats them as
# separate subjects rather than merging duplicates.
#
# Usage:
#   ./generate-multisubject-dicoms.sh [SOURCE_DIR] [OUTPUT_DIR]
#
# Defaults:
#   SOURCE_DIR = ~/20260205150203
#   OUTPUT_DIR = ~/multisubject-dicoms
#
set -euo pipefail

SOURCE_DIR="${1:-$HOME/20260205150203}"
OUTPUT_DIR="${2:-$HOME/multisubject-dicoms}"

# Series folders to copy (relative to SOURCE_DIR)
SERIES_DIRS=(
  "3_anat_T1w"
  "4_Rest_fMRI_AP"
  "5_RestSE_AP"
  "6_RestSErev_PA"
)

# Subject definitions: label|PatientID|PatientName|PatientAge|PatientSex
SUBJECTS=(
  "sub01|SUBJ001|Doe^John|030Y|M"
  "sub02|SUBJ002|Smith^Jane|025Y|F"
  "sub03|SUBJ003|Brown^Alex|042Y|M"
)

if ! command -v dcmodify &>/dev/null; then
  echo "Error: dcmodify not found. Install dcmtk (brew install dcmtk)." >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Error: Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

subj_num=0
for subj_def in "${SUBJECTS[@]}"; do
  IFS='|' read -r label patient_id patient_name age sex <<< "$subj_def"
  subj_num=$((subj_num + 1))
  echo "Creating $label (PatientID=$patient_id) ..."

  # Generate a unique StudyInstanceUID per subject
  study_uid="1.2.826.0.1.3680043.8.1055.1.20260205.${subj_num}.1"

  series_num=0
  for series in "${SERIES_DIRS[@]}"; do
    src="$SOURCE_DIR/$series"
    if [[ ! -d "$src" ]]; then
      echo "  Warning: series folder not found, skipping: $src" >&2
      continue
    fi

    series_num=$((series_num + 1))
    dest="$OUTPUT_DIR/${label}_${series}"
    cp -r "$src" "$dest"

    # Generate a unique SeriesInstanceUID per subject+series
    series_uid="1.2.826.0.1.3680043.8.1055.1.20260205.${subj_num}.${series_num}"

    # Modify all DICOM files in the copied series
    find "$dest" -type f | while read -r dcm; do
      dcmodify -nb \
        -ma "(0010,0020)=$patient_id" \
        -ma "(0010,0010)=$patient_name" \
        -ma "(0010,1010)=$age" \
        -ma "(0010,0040)=$sex" \
        -ma "(0020,000D)=$study_uid" \
        -ma "(0020,000E)=$series_uid" \
        "$dcm" 2>/dev/null || true
    done
  done
done

echo ""
echo "Done. Multi-subject DICOMs written to: $OUTPUT_DIR"
echo "Subjects created: ${#SUBJECTS[@]}"
echo ""
echo "Point the NiiVue BIDS workflow at this directory to test multi-subject detection."
