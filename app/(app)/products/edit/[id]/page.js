"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { LoadError } from "@/components/ui";
import { PRODUCT_API } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// Edit Product — opened from Edit on the Products list. Loads the product
// (POST /api/admin/products/details) so the page also works when opened
// directly or refreshed; after saving or cancelling, back to the list.
export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();
  const product = useApiData(PRODUCT_API.details, { id });
  const backToList = () => router.push("/products");

  return (
    <div>
      <div className="wf-crumb">
        Masters / <Link href="/products">Products</Link>
      </div>
      <h1 className="wf-h1">Edit Product{product.data ? ` — ${product.data.product_name}` : ""}</h1>
      <p className="wf-sub">Change the product&apos;s category, subcategory and specs.</p>

      <LoadError error={product.error} onRetry={product.reload} />

      {product.data ? (
        <ProductForm key={product.data.id} product={product.data} onSaved={backToList} onCancel={backToList} />
      ) : (
        !product.error && <div className="wf-empty">Loading product…</div>
      )}
    </div>
  );
}
