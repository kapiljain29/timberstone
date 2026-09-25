"use client";

import { useParams } from "next/navigation";
import StageForm from "@/components/StageForm";

export default function StagePage() {
  const { id, slug } = useParams();
  return <StageForm id={id} slug={slug} basePath="/projects" />;
}
