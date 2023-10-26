import React, { useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { useProducts } from "./ProductContext";
import Header from "./Header";

import './App.css';
import styles from './product.module.css'
import Footer from "./Footer";
import ProductTile from "./ProductTile";

function Product() {
    const navigate = useNavigate();
    const { productId } = useParams<{ productId: string }>();
    const { products } = useProducts();
    console.log("Products in Product component:", products);

    const [productQuantity, setProductQuantity] = useState(1);

    // eslint-disable-next-line
    const product = products?.find(p => p.id == productId);

    // eslint-disable-next-line
    const otherProducts = products?.filter(p => p.id != productId);

    const breadcrumbs = [
      { text: "ホーム", url: "/" },
      { text: "SHOP", url: "/shop" },
      { text: product ? product.description : "", url: `/shop/${product?.id}` },
    ];

    const taxIncludedPrice = product ? Math.round(product.base_price * (1+ product.tax_rate)) : 0;

    const productImages = product?.images.map((imageUrl, index) => (
      <img
        key={imageUrl} // using imageUrl as a key assuming URLs are unique
        src={imageUrl}
        className={styles.productImage}
        alt={`Product ${index}`}
        style={index === 0 ? { gridColumn: 'span 2' } : {}}
      />
    ));

    const quantityNode = (
      <>
        <div className={styles.quantityComponent}>
          <button className={styles.quantityButton} onClick={() => { if (productQuantity > 1) { setProductQuantity(prevQuantity => prevQuantity - 1); } }}>–</button>
          <input  className={styles.quantityInput} type="text" value={productQuantity} readOnly style={{ width: '50px', textAlign: 'center' }}/>
          <button className={styles.quantityButton} onClick={() => { if (productQuantity < 10) { setProductQuantity(prevQuantity => prevQuantity + 1); } }}>+</button>
        </div>
        <span className={styles.quantityInfo}>※検査キット到着後、専用アプリにて検査項目を自由に選べます。ご購入の際は、検査する項目数だけ選んでください。</span>
      </>
    )

    const questionsNode = (
      <div className={styles.productFaq}>
        <details>
          <summary>医療機関と同等の精度</summary>
          <p>血液を採取する採血キットは、管理医療機器として、国から承認を得たものをお送りします。そちらの採血キットを用いて、指先から少量の血液を採取します。通常の採血と異なり、採血量が少なく身体への負担が最小限に抑えることが可能です。検査は、大規模な病院や検査センターに設置されるものと同じ機器と、体外診断薬の承認を得た試薬を用いて行うため、高い精度での検査が可能です。</p>
        </details>

        <details>
          <summary>採血の方法</summary>
          <p>本検査の採血は、病院に行かず、ご自宅等ご都合のよい場所で行っていただくことが可能です。採血の時間については、お選びいただく検査項目によって異なるため、ご確認の上行ってください。採血キットには、指先から少量の血液を採取するために使用する、使い捨ての穿刺器具や、血液を集める採血管が含まれます。詳しい採血方法は、検査キットに同封されている「採血手順書」に記載されています。</p>
        </details>

        <details>
          <summary>検査結果について</summary>
          <p>本検査は、当社の検査センターに血液が届いてから7営業日以内に結果が出ます。検査結果は、お客様のマイページに反映されます。検査結果が反映されたタイミングで、メール通知もありますので、すぐに結果を確認いただくことが可能です。</p>
        </details>

        <details>
          <summary>選べる検査項目一覧</summary>
          <p>※検査項目の選択は、検査キットが届いてから行っていただきます。<br/>
            商品購入の際に検査項目を選ぶことはできません。</p>
            <ul>
            <li>コルチゾール</li>
            <li>エストラジオール(女性限定)</li>
            <li>FSH(女性限定)</li>
            <li>テストステロン</li>
            <li>TSH</li>
            <li>FT4</li>
            <li>フェリチン</li>
            <li>総IgE</li>
            </ul>
        </details>
      </div>
    )

    const otherProductsList = (
      <div className={styles.otherProductsGrid}>
        {otherProducts?.map(product => (
          <div key={product.id}>
            <ProductTile Product={{
              id: product.id,
              description: product.description,
              long_description: product.description,
              base_price: product.base_price,
              tax_rate: product.tax_rate,
              images: product.images,
            }} />
          </div>
        ))}
      </div>
    )

    return (
      <div className={styles.productRoot}>
        <div className={styles.topDots} />
        <Header breadcrumbs={breadcrumbs} />
        <div className={styles.productGrid}>
          <div className={styles.imageGrid}>{productImages}</div>
          <div className={styles.productContent}>
            <span className={styles.productDescription}>{product?.description}</span>
            <span className={styles.productPrice}>¥{taxIncludedPrice.toLocaleString('en-US')}（税込）</span>
            数量{quantityNode}
            <button className={styles.addToCart}>カートに入れる</button>
            <span className={styles.productLongDescription}>{product?.long_description}</span>
            {product?.bloodTest ? questionsNode : null}
          </div>
        </div>
        <div className={styles.infoLinks}>
          <button className={styles.infoLink} onClick={() => navigate('/payment')}>お支払いについて</button>
          <button className={styles.infoLink} onClick={() => navigate('/delivery')}>配送について</button>
          <button className={styles.infoLink} onClick={() => navigate('/return-policy')}>返品について</button>
        </div>
        <span className={styles.otherHeader}>その他のおすすめキット</span>
        <div>
          {otherProductsList}
        </div>
        <Footer />
      </div>
    );
}

export default Product