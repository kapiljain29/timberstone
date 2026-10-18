"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";

// Add Product — opened from + Add Product on the Products list; after
// saving or cancelling, back to the list.
export default function NewProductPage() {
  const router = useRouter();
  const backToList = () => router.push("/products");

  return (
    <div>
      <div className="wf-crumb">
        Masters / <Link href="/products">Products</Link>
      </div>
      <h1 className="wf-h1">Add Product</h1>
      <p className="wf-sub">Set the product&apos;s category and subcategory, and its coverage and size specs.</p>

      <ProductForm onSaved={backToList} onCancel={backToList} />
    </div>
  );
}
