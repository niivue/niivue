#!/usr/bin/env python3
"""
Generate a synthetic multi-series DICOM dataset for exercising the
DICOM → BIDS workflow — specifically the `bids-fix-sidecars` tool.

What it produces:
    * One subject, one study
    * Four MR series, each a small 3D stack of classic MR Image Storage
      instances (enough for dcm2niix to convert cleanly):
        1. T1w MPRAGE                 — classifies as anat/T1w (complete)
        2. T2w SPACE                  — classifies as anat/T2w (complete)
        3. fMRI rest BOLD             — classifies as func/bold (missing TaskName)
        4. task-nback fMRI BOLD       — classifies as func/bold (missing TaskName)

    The two BOLD series deliberately lack TaskName in their sidecars
    (dcm2niix never writes TaskName — it's a BIDS-specific field). After
    `bids-write` emits `sub-01_task-rest_bold.json` and
    `sub-01_task-nback_bold.json`, the `bids-fix-sidecars` tool will
    auto-populate TaskName from the filename.

Usage:
    python3 generate-synthetic-dicom.py [OUTPUT_DIR]

    Default OUTPUT_DIR is /tmp/synthetic-dicom-bids.

Requirements:
    pydicom, numpy. FSL's Python has both:
        /Users/chrisdrake/fsl/bin/python generate-synthetic-dicom.py
"""

import os
import sys
import shutil
import datetime

import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
from pydicom.uid import generate_uid, ExplicitVRLittleEndian, MRImageStorage


PATIENT_ID = "SYNTH001"
PATIENT_NAME = "Synthetic^Test"
PATIENT_SEX = "F"
PATIENT_BIRTH = "19900101"
PATIENT_AGE = "034Y"

STUDY_DATE = datetime.date.today().strftime("%Y%m%d")
STUDY_TIME = "120000.000000"

ROWS = 64
COLS = 64
N_SLICES = 8
SLICE_THICKNESS = 2.0
PIXEL_SPACING = (2.0, 2.0)


def make_file_meta(sop_instance_uid: str) -> FileMetaDataset:
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = MRImageStorage
    file_meta.MediaStorageSOPInstanceUID = sop_instance_uid
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = generate_uid()
    file_meta.ImplementationVersionName = "niivue-synth 1.0"
    return file_meta


def make_slice(
    series_uid: str,
    study_uid: str,
    series_number: int,
    instance_number: int,
    series_description: str,
    protocol_name: str,
    repetition_time: float,
    echo_time: float,
    flip_angle: float,
    image_type: list,
    pixel_array: np.ndarray,
    slice_position_z: float,
) -> FileDataset:
    sop_instance_uid = generate_uid()
    file_meta = make_file_meta(sop_instance_uid)

    ds = FileDataset("", {}, file_meta=file_meta, preamble=b"\0" * 128)

    # Patient
    ds.PatientName = PATIENT_NAME
    ds.PatientID = PATIENT_ID
    ds.PatientBirthDate = PATIENT_BIRTH
    ds.PatientSex = PATIENT_SEX
    ds.PatientAge = PATIENT_AGE

    # Study
    ds.StudyInstanceUID = study_uid
    ds.StudyDate = STUDY_DATE
    ds.StudyTime = STUDY_TIME
    ds.StudyID = "1"
    ds.AccessionNumber = ""
    ds.ReferringPhysicianName = ""

    # Series
    ds.SeriesInstanceUID = series_uid
    ds.SeriesNumber = series_number
    ds.SeriesDescription = series_description
    ds.ProtocolName = protocol_name
    ds.SeriesDate = STUDY_DATE
    ds.SeriesTime = STUDY_TIME
    ds.Modality = "MR"
    ds.Manufacturer = "SIEMENS"
    ds.ManufacturerModelName = "NiivueSynth"

    # SOP
    ds.SOPClassUID = MRImageStorage
    ds.SOPInstanceUID = sop_instance_uid
    ds.InstanceNumber = instance_number
    ds.InstanceCreationDate = STUDY_DATE
    ds.InstanceCreationTime = STUDY_TIME

    # MR
    ds.MagneticFieldStrength = 3.0
    ds.RepetitionTime = repetition_time * 1000.0  # ms in DICOM
    ds.EchoTime = echo_time * 1000.0  # ms in DICOM
    ds.FlipAngle = flip_angle
    ds.ScanningSequence = "GR"
    ds.SequenceVariant = "SP"
    ds.MRAcquisitionType = "3D"
    ds.EchoTrainLength = 1
    ds.NumberOfAverages = 1
    ds.PercentSampling = 100
    ds.PercentPhaseFieldOfView = 100
    ds.PixelBandwidth = 200
    ds.ImagedNucleus = "1H"
    ds.ImageType = image_type
    ds.BodyPartExamined = "BRAIN"

    # Geometry
    ds.SliceThickness = SLICE_THICKNESS
    ds.SpacingBetweenSlices = SLICE_THICKNESS
    ds.PixelSpacing = list(PIXEL_SPACING)
    ds.ImageOrientationPatient = [1, 0, 0, 0, 1, 0]
    ds.ImagePositionPatient = [0.0, 0.0, float(slice_position_z)]
    ds.SliceLocation = float(slice_position_z)
    ds.PatientPosition = "HFS"
    ds.PositionReferenceIndicator = ""
    ds.FrameOfReferenceUID = series_uid  # same across the series

    # Pixel
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.Rows = pixel_array.shape[0]
    ds.Columns = pixel_array.shape[1]
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.WindowCenter = 1024
    ds.WindowWidth = 2048
    ds.RescaleIntercept = 0
    ds.RescaleSlope = 1
    ds.PixelData = pixel_array.astype(np.uint16).tobytes()

    ds.is_little_endian = True
    ds.is_implicit_VR = False
    return ds


def make_volume(rows: int, cols: int, n_slices: int, seed: int) -> np.ndarray:
    """Tiny synthetic brain-like volume: a bright oval on dark background."""
    rng = np.random.default_rng(seed)
    vol = rng.integers(0, 200, size=(n_slices, rows, cols), dtype=np.uint16)
    yy, xx = np.ogrid[:rows, :cols]
    cy, cx = rows / 2, cols / 2
    ellipse = ((xx - cx) / (cols * 0.35)) ** 2 + ((yy - cy) / (rows * 0.4)) ** 2 <= 1
    for i in range(n_slices):
        fade = 1.0 - abs(i - n_slices / 2) / (n_slices / 2)
        vol[i][ellipse] += int(1500 * fade)
    return vol


def write_series(
    out_dir: str,
    series_number: int,
    series_description: str,
    protocol_name: str,
    repetition_time: float,
    echo_time: float,
    flip_angle: float,
    image_type: list,
    study_uid: str,
) -> None:
    series_dir = os.path.join(out_dir, f"series_{series_number:02d}_{protocol_name}")
    os.makedirs(series_dir, exist_ok=True)

    series_uid = generate_uid()
    vol = make_volume(ROWS, COLS, N_SLICES, seed=series_number)

    for i in range(N_SLICES):
        ds = make_slice(
            series_uid=series_uid,
            study_uid=study_uid,
            series_number=series_number,
            instance_number=i + 1,
            series_description=series_description,
            protocol_name=protocol_name,
            repetition_time=repetition_time,
            echo_time=echo_time,
            flip_angle=flip_angle,
            image_type=image_type,
            pixel_array=vol[i],
            slice_position_z=i * SLICE_THICKNESS,
        )
        path = os.path.join(series_dir, f"slice_{i + 1:03d}.dcm")
        pydicom.dcmwrite(path, ds, enforce_file_format=True)

    print(f"  [{series_number}] {series_description:<30} → {series_dir} ({N_SLICES} slices)")


def main() -> int:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/synthetic-dicom-bids"
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)

    study_uid = generate_uid()

    print(f"Writing synthetic DICOM dataset to: {out_dir}")
    write_series(
        out_dir,
        series_number=1,
        series_description="T1w_MPRAGE",
        protocol_name="T1w_MPRAGE",
        repetition_time=2.3,
        echo_time=0.00293,
        flip_angle=8,
        image_type=["ORIGINAL", "PRIMARY", "M", "ND", "NORM"],
        study_uid=study_uid,
    )
    write_series(
        out_dir,
        series_number=2,
        series_description="T2w_SPACE",
        protocol_name="T2w_SPACE",
        repetition_time=3.2,
        echo_time=0.563,
        flip_angle=120,
        image_type=["ORIGINAL", "PRIMARY", "M", "ND", "NORM"],
        study_uid=study_uid,
    )
    write_series(
        out_dir,
        series_number=3,
        series_description="fMRI_rest_BOLD",
        protocol_name="fMRI_rest_BOLD",
        repetition_time=0.8,
        echo_time=0.037,
        flip_angle=52,
        image_type=["ORIGINAL", "PRIMARY", "M", "ND"],
        study_uid=study_uid,
    )
    write_series(
        out_dir,
        series_number=4,
        series_description="task-nback_fMRI_BOLD",
        protocol_name="task-nback_fMRI_BOLD",
        repetition_time=0.8,
        echo_time=0.037,
        flip_angle=52,
        image_type=["ORIGINAL", "PRIMARY", "M", "ND"],
        study_uid=study_uid,
    )

    print()
    print("Done. Load this folder from NiiVue Desktop:")
    print("  File → Workflows → Import → 'import DICOM to BIDS and view'")
    print()
    print("Expected flow:")
    print("  • dcm2niix converts all 4 series")
    print("  • bids-classify labels T1w, T2w, and two BOLD runs (task=rest, task=nback)")
    print("  • bids-write produces sub-01_task-rest_bold.json / sub-01_task-nback_bold.json")
    print("  • bids-fix-sidecars auto-populates TaskName in both BOLD sidecars")
    return 0


if __name__ == "__main__":
    sys.exit(main())
