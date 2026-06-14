import { Category } from "@/lib/types";
import CategoryCard from "./category-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoriesProps {
  categories: Category[];
}

/** Horizontal carousel displaying product categories */
function Categories({ categories }: CategoriesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight mb-0">
          Shop by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-2">
            {categories.map((category) => (
              <CarouselItem
                key={category.id}
                className="basis-1/3 sm:basis-1/4 md:basis-1/6 lg:basis-1/8 xl:basis-1/10 pl-2"
              >
                <div className="p-1 h-full">
                  <CategoryCard category={category} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex left-2" />
          <CarouselNext className="hidden md:flex right-2" />
        </Carousel>
      </CardContent>
    </Card>
  );
}

export default Categories;
