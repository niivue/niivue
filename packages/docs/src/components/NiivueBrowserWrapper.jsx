import React from "react";
import { NiivueApp } from "../components/NiivueApp";

export default function NiivueDemo() {
  const images = [{ url: "/static/brain.nii.gz" }];
  const nvOpts = { backColor: [0, 0, 0, 1] };

  return <NiivueApp images={images} nvOpts={nvOpts} />;
}
