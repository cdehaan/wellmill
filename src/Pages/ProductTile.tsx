import React from "react";
import styles from './productTile.module.css'
import { Link } from "react-router-dom";
import { ProductType } from "../types";

interface ProductTileProps { Product: ProductType; }

function ProductTile({ Product: product }: ProductTileProps) {
    if(!product) { return null; }

    // Full price = Base price * (1 + tax rate)
    const priceWithoutTax = product.price ? Math.round(product.price) : 0;
    const taxIncludedPrice = product.price ? Math.round(product.price * (1+product.taxRate)) : 0;
    const discountRate = product.discountRate ? product.discountRate : 0;
    const regularPriceWithoutTax = Math.round(priceWithoutTax / (1 - discountRate));
    const regularTaxIncludedPrice = Math.round(taxIncludedPrice / (1 - discountRate));

    //Find the image with the lowest displayOrder value's URL (Works, but the next way is easier for me to understand)
    //const topImageUrl = product.images.reduce((prev, current) => { return (prev.displayOrder < current.displayOrder) ? prev : current; }).url;

    // Sort the images array on displayOrder
    const topImage = product.images.sort((a, b) => a.displayOrder - b.displayOrder)[0];

    const noTaxText = discountRate === 0 ?
        <span className={styles.productPriceNoTax}>{priceWithoutTax.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })} (税抜)</span> :
        <div><span className={styles.productPriceNoTaxStrikeout}>{regularPriceWithoutTax.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span><span className={styles.productPriceNoTax}>{priceWithoutTax.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })} (税抜)</span></div>;

    const withTaxText = discountRate === 0 ?
        <span className={styles.productPriceWithTax}>{taxIncludedPrice.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })} (税込)</span> : 
        <div><span className={styles.productPriceWithTaxStrikeout}>{regularTaxIncludedPrice.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span><span className={styles.productPriceWithTax}>{taxIncludedPrice.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })} (税込)</span></div>;

    return(
        <Link to={`/shop/${product.productKey}`}>
            <div className={styles.product}>
                <img className={styles.productImage} src={topImage?.url ? `/${topImage.url}` : undefined} alt={`Product #${product.productKey}`} />
                <span className={styles.productDescription}>{product.title}</span>
                {noTaxText}
                {withTaxText}
            </div>
        </Link>
    )
}

export default ProductTile