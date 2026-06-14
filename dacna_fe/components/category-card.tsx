import { Category } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_BASE_URL } from "@/lib/api";

interface CategoryCardProps {
  category: Category;
}

/**
 * CategoryCard component (Compact Design)
 */
function CategoryCard({ category }: CategoryCardProps) {
  const imageUrl = category.image_url
    ? `${IMAGE_BASE_URL}${category.image_url}`
    : `${IMAGE_BASE_URL}/placeholder.svg`;

  return (
    <Link
      href={`categories/${category.slug}`}
      className="flex flex-col items-center text-center gap-2 group"
    >
      {/* Khung ảnh (thay thế Card) */}
      <div className="aspect-square w-full relative overflow-hidden rounded-md border bg-white">
        <Image
          src={imageUrl}
          alt={category.name}
          fill
          // Dùng 'object-contain' và 'p-4' (padding) để icon nằm gọn
          className="object-contain p-4 transition-transform group-hover:scale-105"
        />
      </div>
      {/* Tên danh mục */}
      <h3 className="font-medium text-sm group-hover:text-primary">
        {category.name}
      </h3>
    </Link>
  );
}

export default CategoryCard;
