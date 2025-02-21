import React, { useEffect } from 'react';
import { createContext, useContext, useState, ReactNode } from 'react';
import { CouponType, ProductType } from '../types';

type ProductContextType = {
  products: ProductType[] | undefined;
  setProducts: React.Dispatch<React.SetStateAction<ProductType[] | undefined>>;
  isLoading: boolean;
  error: string | null;
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function useProducts(): ProductContextType {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}

type ProductProviderProps = {
  children: ReactNode;
};

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<ProductType[] | undefined>(undefined);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      if (products !== undefined) { return } // Fetch only if products are not already fetched
      setLoading(true);
      setError(null);
      try {
        const productsFilename = window.location.hostname.split('.')[0] === 'stage' ? '/productsStage.json' : '/products.json';
        const response = await fetch(productsFilename);
        //const response = await fetch('/products.json');
        if (!response.ok) { throw new Error(`HTTP Status: ${response.status}`); }
        const rawResponse = await response.json();

        // Data might come back as a top-level array, or within an object, and the field value is "products"
        const rawProducts = (Array.isArray(rawResponse) ? rawResponse : (rawResponse.products && Array.isArray(rawResponse.products)) ? rawResponse.products : [])

        // Values within products are all strings, convert to numbers and bools
        const fetchedProducts = transformProductData(rawProducts);

        if (isMounted) {
          setProducts(fetchedProducts);
        }
      } catch (err) {
        if (isMounted) {
          setError("-");
          //setError(err instanceof Error ? err.message : 'An error occurred while fetching products.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }


      try {
        const couponsFilename = window.location.hostname.split('.')[0] === 'stage' ? 'couponsStage.json' : 'coupons.json';
        const response = await fetch(couponsFilename);
        if (!response.ok) { throw new Error(`HTTP Status: ${response.status}`); }
        const rawResponse = await response.json();

        // Data might come back as a top-level array, or within an object, and the field value is "products"
        const rawCouponss = (Array.isArray(rawResponse) ? rawResponse : (rawResponse.products && Array.isArray(rawResponse.products)) ? rawResponse.products : [])

        // Values within products are all strings, convert to numbers and bools
        const fetchedCoupons = transformCoupons(rawCouponss);
        //console.log("fetchedCoupons");
        //console.log(fetchedCoupons);
        const subdomain = window.location.hostname.split('.')[0];
        const keyName = subdomain === 'stage' ? 'couponsStage' : 'coupons';
        localStorage.setItem(keyName, JSON.stringify(fetchedCoupons));
      } catch (err) {
          setError("-");
          //setError(err instanceof Error ? err.message : 'An error occurred while fetching coupons.');
      }
    }

    fetchProducts();


    // Cleanup function to set isMounted to false when component unmounts
    return () => { isMounted = false; };
  }, [products]); // Only used to check if it already exists. If yes, don't download data again.

  function transformProductData(rawData: any[]): ProductType[] {
    return rawData.map((rawProduct) => {
      const product: ProductType = {
        productKey: Number(rawProduct.productKey) || 0,
        id: String(rawProduct.id),
        title: String(rawProduct.title),
        description: String(rawProduct.description),
        available: Boolean(rawProduct.available),
        stock: Number(rawProduct.stock) || 0,
        price: Number(rawProduct.price) || 0,
        taxRate: Number(rawProduct.taxRate) || 0,
        discountRate: Number(rawProduct.discountRate) || 0,
        discountValue: Number(rawProduct.discountValue) || 0,
        type: Number(rawProduct.type) || 0,
        images: Array.isArray(rawProduct.images) ? rawProduct.images : [],
        productOrder: Number(rawProduct.productOrder) || 0,
      };
  
      return product;
    });
  }

  function transformCoupons(rawData: any[]): CouponType[] {
    return rawData.map((rawCoupon) => {
      const coupon: CouponType = {
        couponKey: Number(rawCoupon.couponKey),
        productKey: Number(rawCoupon.productKey),
        hash: String(rawCoupon.hash),
        type: Number(rawCoupon.type),
        target: Number(rawCoupon.target),
        reward: Number(rawCoupon.reward),
        maxUses: rawCoupon.maxUses ? Number(rawCoupon.maxUses) : 0,
        used: rawCoupon.used ? Number(rawCoupon.used) : 0,
        lastUsed: rawCoupon.lastUsed ? String(rawCoupon.lastUsed) : "",
      };

      return coupon;
    });
  }

  return (
    <ProductContext.Provider value={{ products, setProducts, isLoading, error }}>
      {children}
    </ProductContext.Provider>
  );
}

