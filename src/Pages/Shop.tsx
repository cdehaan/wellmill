import React from 'react';
import './App.css';
import styles from './shop.module.css'

import { useProducts } from '../Contexts/ProductContext';
import Header from './Header';
import ProductTile from './ProductTile';
import Footer from './Footer';

const breadcrumbs = [
  { text: "ホーム", url: "/" },
  { text: "SHOP", url: "/shop" },
];

function Shop() {
  const { products, isLoading: productsLoading, error: productsError } = useProducts();
  //console.log(products);

  return (
    <>
      <div className={styles.shopRoot}>
        <div className="topDots" />
        <Header breadcrumbs={breadcrumbs} />
        <span className="topHeader">SHOP</span>
        <span className={styles.shoppingDescription} >検査キット到着後、専用アプリにて検査項目を自由に選べます。ご購入の際は、検査する項目数だけ選んでください。</span>
        {productsLoading && <p>Loading...</p>}
        {productsError && <p>Error: {productsError}</p>}
        <div className={styles.productGrid}>
          {products?.map(product => (
            <div key={product.productKey}>
              <ProductTile Product={product} />
            </div>
          ))}
        </div>
      </div>
      <Footer/>
    </>
  );
}

export default Shop;