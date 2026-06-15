"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Category } from "@/lib/types";


interface FilterSidebarProps {
  categories: Category[];
  selectedCategories: string[];
  priceRange: [number, number];
  minPrice: number;
  maxPrice: number;
  selectedTags: { trending?: boolean; bestseller?: boolean; toprated?: boolean };
  onCategoryChange: (category: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onTagChange: (tag: "trending" | "bestseller" | "toprated") => void;
  onClearFilters: () => void;
}

/**
 * The FilterSidebar component displays a list of categories, product tags (trending,
 * bestseller, toprated), and a price range filter with apply button. The component
 * also has a "Clear All Filters" button.
 *
 * @param categories - An array of categories to display.
 * @param selectedCategories - An array of selected categories.
 * @param selectedTags - Object with trending, bestseller, toprated boolean flags.
 * @param priceRange - The currently selected price range.
 * @param minPrice - The minimum price of the price range.
 * @param maxPrice - The maximum price of the price range.
 * @param onCategoryChange - A function to call when a category is checked or unchecked.
 * @param onTagChange - A function to call when a product tag is toggled.
 * @param onPriceChange - A function to call when the price filter is applied.
 * @param onClearFilters - A function to call when the "Clear All Filters" button is clicked.
 */
function FilterSidebar({
  categories,
  selectedCategories,
  selectedTags,
  priceRange,
  minPrice,
  maxPrice,
  onCategoryChange,
  onPriceChange,
  onTagChange,
  onClearFilters,
}: FilterSidebarProps) {
  const [tempPriceRange, setTempPriceRange] = useState<[number, number]>(priceRange);

  // Sync tempPriceRange with priceRange prop when it changes
  useEffect(() => {
    setTempPriceRange(priceRange);
  }, [priceRange]);

  // Apply price filter when button is clicked
  const handleApplyPriceFilter = () => {
    onPriceChange(tempPriceRange);
  };

  // Handle price slider change - only update temp state (no flickering)
  const handleSliderChange = (value: [number, number]) => {
    setTempPriceRange(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Filters</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full"
        >
          Clear All Filters
        </Button>
      </div>

      <Separator />

      <Accordion
        type="multiple"
        defaultValue={["tags", "categories", "price"]}
        className="w-full"
      >
        {/* Product Tags Filter */}
        <AccordionItem value="tags">
          <AccordionTrigger>Product Tags</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trending-tag"
                  checked={selectedTags.trending || false}
                  onCheckedChange={() => onTagChange("trending")}
                />
                <Label
                  htmlFor="trending-tag"
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  🔥 Trending
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bestseller-tag"
                  checked={selectedTags.bestseller || false}
                  onCheckedChange={() => onTagChange("bestseller")}
                />
                <Label
                  htmlFor="bestseller-tag"
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  ⭐ Best Seller
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toprated-tag"
                  checked={selectedTags.toprated || false}
                  onCheckedChange={() => onTagChange("toprated")}
                />
                <Label
                  htmlFor="toprated-tag"
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  🏆 Top Rated
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Categories Filter */}
        <AccordionItem value="categories">
          <AccordionTrigger>Categories</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.name)}
                    onCheckedChange={() => onCategoryChange(category.name)}
                  />
                  <Label
                    htmlFor={`category-${category.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range Filter with Apply Button */}
        <AccordionItem value="price">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Slider
                defaultValue={tempPriceRange}
                min={minPrice}
                max={maxPrice}
                step={1}
                value={tempPriceRange}
                onValueChange={handleSliderChange}
                className="mt-6"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="border rounded-md px-2 py-1 flex-1 text-center">
                  ${tempPriceRange[0]}
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="border rounded-md px-2 py-1 flex-1 text-center">
                  ${tempPriceRange[1]}
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyPriceFilter}
                className="w-full"
              >
                Apply Price Filter
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default FilterSidebar;