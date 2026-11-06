import type { Metadata } from "next";
import CategoriesManager from "./categories-manager";

export const metadata: Metadata = {
  title: "الفئات — متجري",
};

export default function CategoriesPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الفئات</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          إدارة فئات المنتجات. كل فئة في مستوى واحد، وكل منتج سينتمي لفئة واحدة.
        </p>
      </div>
      <CategoriesManager />
    </main>
  );
}
