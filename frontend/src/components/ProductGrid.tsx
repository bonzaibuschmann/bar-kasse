import { useState } from "react";
import { Category, Product } from "../types";

interface Props {
  categories: Category[];
  addToCart: (product: Product) => void;
}

export default function ProductGrid({ categories, addToCart }: Props) {
  const products = categories.flatMap((c) => c.products).filter((p) => !p.isDeposit);

  return (
    <div>
      {/* Product grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {products.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-bar-mid hover:bg-gray-600 rounded-xl p-3 text-center touch-button transition-all flex flex-col items-center justify-center min-h-[100px] relative"
            >
              {product.deposit && (
                <span className="absolute top-1 right-1 text-xs bg-yellow-700 text-yellow-100 px-1.5 py-0.5 rounded-full">
                  +{product.deposit.price.toFixed(2)}€
                </span>
              )}
              <span className="font-semibold text-sm leading-tight">{product.name}</span>
              <span className="text-bar-green font-bold mt-1">
                {product.price.toFixed(2).replace(".", ",")} €
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
