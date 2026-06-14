"use client";

import Link from "next/link";
import { Button } from "./ui/button";

/**
 * Component HeroBanner (Banner "Doorbusters")
 * Mô phỏng theo Best Buy.
 */
export default function HeroBanner() {
  return (
    // Nền vàng, full-width
    <section className="w-full bg-yellow-400 rounded-lg overflow-hidden">
      {/* Container để căn giữa nội dung */}
      <div className="container mx-auto px-4 py-8 md:px-8">
        {/* Dùng flex để chia 2 cột (trái/phải) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* CỘT TRÁI: Nội dung chính */}
          <div className="space-y-2 text-center md:text-left">
            <p className="font-semibold text-blue-900">
              Early Black Friday Deals
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-blue-900">
              Doorbusters are here
            </h1>
            <p className="text-blue-900/80">
              Don't wait. These Doorbusters won't last long.
            </p>
            {/* Nút bấm nhỏ (click được) */}
            <Button
              asChild
              variant="default"
              size="sm"
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              <Link href="/products">Shop now</Link>
            </Button>
          </div>

          {/* CỘT PHẢI: Chữ "ENDS TODAY" */}
          <div className="text-center md:text-right">
            <h2 className="text-3xl font-bold text-blue-900">ENDS TODAY</h2>
            <p className="text-xs text-blue-900/80 max-w-xs">
              Limited quantities. No rainchecks. Exclusions apply.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
