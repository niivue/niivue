#!/bin/bash
# Generate a synthetic DICOM-like test dataset for BIDS wizard validation testing.
# Reuses NIfTI data from dcm_qa but creates varied series types with intentionally
# missing sidecar fields to exercise the wizard's field-editing UI.
#
# Usage: ./scripts/generate-synthetic-bids-test.sh [dcm_qa_dir] [output_dir]

set -e

DCM_QA_DIR="${1:-$(dirname "$0")/../../../dcm_qa/In/TotalReadoutTime}"
OUTPUT_DIR="${2:-/tmp/synthetic-bids-test}"

if [ ! -d "$DCM_QA_DIR" ]; then
  echo "Error: dcm_qa directory not found: $DCM_QA_DIR"
  echo "Usage: $0 <dcm_qa_dir> [output_dir]"
  exit 1
fi

echo "Converting DICOMs from: $DCM_QA_DIR"
echo "Output directory: $OUTPUT_DIR"

# Step 1: Convert DICOMs to get NIfTI files
CONV_DIR=$(mktemp -d /tmp/dcm2niix-conv-XXXXX)
dcm2niix -b y -z y -f "%p_%s" -o "$CONV_DIR" "$DCM_QA_DIR" > /dev/null 2>&1
echo "Converted $(ls "$CONV_DIR"/*.nii.gz 2>/dev/null | wc -l | tr -d ' ') NIfTI files"

# Pick source files (just need a few different ones)
NIFTIS=("$CONV_DIR"/*.nii.gz)
SRC_A="${NIFTIS[0]}"  # Will be T1w
SRC_B="${NIFTIS[1]}"  # Will be T2w
SRC_C="${NIFTIS[2]}"  # Will be BOLD
SRC_D="${NIFTIS[3]}"  # Will be BOLD run 2
SRC_E="${NIFTIS[4]}"  # Will be DWI
SRC_F="${NIFTIS[5]}"  # Will be fmap AP
SRC_G="${NIFTIS[6]}"  # Will be fmap PA

# Step 2: Create synthetic DICOM-like directory structure
# The wizard expects a flat directory of DICOMs, but we'll create a structure
# that dcm2niix can convert. Instead, we'll create pre-converted output
# that simulates what the wizard would produce after conversion.
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# -- T1w: missing nothing (good baseline) --
echo "Creating T1w series..."
mkdir -p "$OUTPUT_DIR/series_01_t1w"
cp "$SRC_A" "$OUTPUT_DIR/series_01_t1w/image.nii.gz"
cat > "$OUTPUT_DIR/series_01_t1w/image.json" << 'SIDECAR'
{
  "Modality": "MR",
  "MagneticFieldStrength": 3,
  "Manufacturer": "Siemens",
  "ManufacturersModelName": "Prisma",
  "SeriesDescription": "T1w_MPRAGE",
  "SeriesNumber": 3,
  "RepetitionTime": 2.3,
  "EchoTime": 0.00293,
  "InversionTime": 0.9,
  "FlipAngle": 8,
  "ImageType": ["ORIGINAL", "PRIMARY", "M", "ND", "NORM"]
}
SIDECAR

# -- T2w: missing RepetitionTime --
echo "Creating T2w series (missing RepetitionTime)..."
mkdir -p "$OUTPUT_DIR/series_02_t2w"
cp "$SRC_B" "$OUTPUT_DIR/series_02_t2w/image.nii.gz"
cat > "$OUTPUT_DIR/series_02_t2w/image.json" << 'SIDECAR'
{
  "Modality": "MR",
  "MagneticFieldStrength": 3,
  "Manufacturer": "Siemens",
  "ManufacturersModelName": "Prisma",
  "SeriesDescription": "T2w_SPACE",
  "SeriesNumber": 4,
  "EchoTime": 0.563,
  "FlipAngle": 120,
  "ImageType": ["ORIGINAL", "PRIMARY", "M", "ND", "NORM"]
}
SIDECAR

# -- BOLD run 1: missing TaskName (validator requires it for func) --
echo "Creating BOLD run 1 (missing TaskName)..."
mkdir -p "$OUTPUT_DIR/series_03_bold1"
cp "$SRC_C" "$OUTPUT_DIR/series_03_bold1/image.nii.gz"
cat > "$OUTPUT_DIR/series_03_bold1/image.json" << 'SIDECAR'
{
  "Modality": "MR",
  "MagneticFieldStrength": 3,
  "Manufacturer": "Siemens",
  "ManufacturersModelName": "Prisma",
  "SeriesDescription": "fMRI_rest_run1_AP",
  "SeriesNumber": 5,
  "RepetitionTime": 0.8,
  "EchoTime": 0.037,
  "FlipAngle": 52,
  "PhaseEncodingDirection": "j-",
  "TotalReadoutTime": 0.0525111,
  "MultibandAccelerationFactor": 8,
  "SliceTiming": [0, 0.4, 0.04, 0.44, 0.08, 0.48, 0.12, 0.52],
  "ImageType": ["ORIGINAL", "PRIMARY", "M", "MB", "ND", "MOSAIC"]
}
SIDECAR

# -- BOLD run 2: missing TaskName AND PhaseEncodingDirection --
echo "Creating BOLD run 2 (missing TaskName, PhaseEncodingDirection)..."
mkdir -p "$OUTPUT_DIR/series_04_bold2"
cp "$SRC_D" "$OUTPUT_DIR/series_04_bold2/image.nii.gz"
cat > "$OUTPUT_DIR/series_04_bold2/image.json" << 'SIDECAR'
{
  "Modality": "MR",
  "MagneticFieldStrength": 3,
  "Manufacturer": "Siemens",
  "ManufacturersModelName": "Prisma",
  "SeriesDescription": "fMRI_rest_run2_AP",
  "SeriesNumber": 6,
  "RepetitionTime": 0.8,
  "EchoTime": 0.037,
  "FlipAngle": 52,
  "TotalReadoutTime": 0.0525111,
  "MultibandAccelerationFactor": 8,
  "ImageType": ["ORIGINAL", "PRIMARY", "M", "MB", "ND", "MOSAIC"]
}
SIDECAR

# -- DWI: missing TotalReadoutTime (needed for distortion correction) --
echo "Creating DWI series (missing TotalReadoutTime)..."
mkdir -p "$OUTPUT_DIR/series_05_dwi"
cp "$SRC_E" "$OUTPUT_DIR/series_05_dwi/image.nii.gz"
cat > "$OUTPUT_DIR/series_05_dwi/image.json" << 'SIDECAR'
{
  "Modality": "MR",
  "MagneticFieldStrength": 3,
  "Manufacturer": "Siemens",
  "ManufacturersModelName": "Prisma",
  "SeriesDescription": "DWI_b1000_AP",
  "SeriesNumber": 7,
  "RepetitionTime": 3.2,
  "EchoTime": 0.089,
  "FlipAngle": 78,
  "PhaseEncodingDirection": "j-",
  "ImageType": ["ORIGINAL", "PRIMARY", "DIFFUSION", "NONE", "MB", "ND", "MOSAIC"]
}
SIDECAR

# -- Fieldmap AP: missing EchoTime --
echo "Creating fieldmap AP (missing EchoTime)..."
mkdir -p "$OUTPUT_DIR/series_06_fmap_ap"
cp "$SRC_F" "$OUTPUT_DIR/series_06_fmap_ap/image.nii.gz"
cat > "$OUTPUT_DIR/series_06_fmap_ap/image.json" << 'SIDECAR'
{
  "Modality": "MR",
  "MagneticFieldStrength": 3,
  "Manufacturer": "Siemens",
  "ManufacturersModelName": "Prisma",
  "SeriesDescription": "SpinEchoFieldMap_AP",
  "SeriesNumber": 8,
  "RepetitionTime": 8,
  "FlipAngle": 90,
  "PhaseEncodingDirection": "j-",
  "TotalReadoutTime": 0.0525111,
  "ImageType": ["ORIGINAL", "PRIMARY", "M", "ND", "MOSAIC"]
}
SIDECAR

# -- Fieldmap PA: complete (no missing fields) --
echo "Creating fieldmap PA (complete)..."
mkdir -p "$OUTPUT_DIR/series_07_fmap_pa"
cp "$SRC_G" "$OUTPUT_DIR/series_07_fmap_pa/image.nii.gz"
cat > "$OUTPUT_DIR/series_07_fmap_pa/image.json" << 'SIDECAR'
{
  "Modality": "MR",
  "MagneticFieldStrength": 3,
  "Manufacturer": "Siemens",
  "ManufacturersModelName": "Prisma",
  "SeriesDescription": "SpinEchoFieldMap_PA",
  "SeriesNumber": 9,
  "RepetitionTime": 8,
  "EchoTime": 0.058,
  "FlipAngle": 90,
  "PhaseEncodingDirection": "j",
  "TotalReadoutTime": 0.0525111,
  "ImageType": ["ORIGINAL", "PRIMARY", "M", "ND", "MOSAIC"]
}
SIDECAR

# Clean up conversion temp dir
rm -rf "$CONV_DIR"

echo ""
echo "Synthetic test dataset created at: $OUTPUT_DIR"
echo ""
echo "Series and their intentionally missing fields:"
echo "  1. T1w_MPRAGE          - complete (baseline)"
echo "  2. T2w_SPACE            - missing RepetitionTime"
echo "  3. fMRI_rest_run1_AP    - missing TaskName"
echo "  4. fMRI_rest_run2_AP    - missing TaskName, PhaseEncodingDirection"
echo "  5. DWI_b1000_AP         - missing TotalReadoutTime"
echo "  6. SpinEchoFieldMap_AP  - missing EchoTime"
echo "  7. SpinEchoFieldMap_PA  - complete (baseline)"
echo ""
echo "To test: Open NiiVue Desktop > BIDS Wizard > point to $OUTPUT_DIR"
