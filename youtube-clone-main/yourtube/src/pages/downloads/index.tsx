import DownloadsContent from "@/components/DownloadsContent";
import { Suspense } from "react";

export default function DownloadsPage() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
          Downloads
        </h1>
        <Suspense fallback={<div>Loading downloads...</div>}>
          <DownloadsContent />
        </Suspense>
      </div>
    </main>
  );
}
