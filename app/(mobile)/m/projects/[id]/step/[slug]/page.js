"use client";

import { useParams } from "next/navigation";
import StageForm from "@/components/StageForm";

export default function MobileStepPage() {
  const { id, slug } = useParams();
  return <StageForm id={id} slug={slug} basePath="/m/projects" />;
}
