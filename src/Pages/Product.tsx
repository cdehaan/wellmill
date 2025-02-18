import React, { useContext, useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";
import { useProducts } from "../Contexts/ProductContext";
import Header from "./Header";

import '../App.css';
import styles from './product.module.css'
import Footer from "./Footer";
import ProductTile from "./ProductTile";
import { UserContext } from "../Contexts/UserContext";
import { useUserData } from "../Hooks/useUserData";

function Product() {
    const navigate = useNavigate();
    const { productId } = useParams<{ productId: string }>();
    const productIdNum = productId ? parseInt(productId) : undefined;
    const { products, isLoading: productsLoading, error: productsError } = useProducts();
    const { user, setGuest, cartLoading } = useContext(UserContext);
    const { addToCart, registerGuest, /*loginUser*/ } = useUserData();

    const [ productQuantity, setProductQuantity ] = useState(1);
    const [ showModal, setShowModal ] = useState(false);
    const [ addingToCart, setAddingToCart ] = useState(false);
    const [ productAddedToCart, setProductAddedToCart ] = useState(false);


    const currentProduct = products?.find(p => p.productKey === productIdNum);
    const otherProducts = products?.filter(p => p.productKey !== productIdNum);
    const priceWithoutTax = currentProduct ? Math.round(currentProduct.price) : 0;
    const taxIncludedPrice = currentProduct ? Math.round(currentProduct.price * (1+currentProduct.taxRate)) : 0;
    const discountRate = currentProduct?.discountRate ? currentProduct.discountRate : 0;
    const regularPriceWithoutTax = Math.round(priceWithoutTax / (1 - discountRate));
    const regularTaxIncludedPrice = Math.round(taxIncludedPrice / (1 - discountRate));

    console.log("discountRate");
    console.log(discountRate)

    // pre-loads spinner so it shows right away
    useEffect(() => {
      const image = new Image();
      image.src = 'spinner.svg';
    }, []);

    // run-once debugging code
    useEffect(() => {
      if(user) {
        //console.log(`User key in Product: ${user.customerKey}`);
        //console.log(`User guest status:`);
        //console.log(user.guest);
      }
    }, [user]);

    // run when user loads to see if this product is already in their cart
    useEffect(() => {
      if(user) {
        if(user.cart.lines.some(line => line.productKey === productIdNum)) {
          setProductAddedToCart(true);
        }
      }
    }, [user]);

    async function handleAddToCart() {
      if(!currentProduct) {
        console.log(`addToCart called without currentProduct (${currentProduct}).`);
        return;
      }
      if(!user) {
        console.log(`addToCart called without user (${user}).`);
        return;
      }

      setAddingToCart(true);
      if(!user.customerKey) {
        const newGuestUser = await registerGuest();
        setGuest(false);


        setTimeout(async () => {
          const returnedCart = await addToCart(currentProduct.productKey, productQuantity, newGuestUser.data);
          if(returnedCart.error) {
            console.log("Add to cart error: " + returnedCart.error);
            return;
          }
        }, 100);

        setTimeout(() => {
          window.location.reload();
        }, 900);
  
      } else {
        const returnedCart = await addToCart(currentProduct.productKey, productQuantity);
        if(returnedCart.error) {
          console.log("Add to cart error: " + returnedCart.error);
          return;
        }  
      }


      setTimeout(() => {
        setAddingToCart(false);
        setProductAddedToCart(true);
      }, 1000);
    };

    const breadcrumbs = [
      { text: "ホーム", url: "/" },
      { text: "SHOP", url: "/shop" },
      { text: currentProduct ? currentProduct.title : "", url: `/shop/${currentProduct?.productKey}` },
    ];

    const loginModal = (
      <div id="overlay" className={styles.overlay} onClick={() => {setShowModal(false)}}>
        <div className={styles.modal}>
          <span className={styles.modal}>カートに商品を追加するにはログインしてください。</span>
          <button className={styles.modal} onClick={() => {setShowModal(false)}}>Ok</button>
        </div>
      </div>
    );

    // Sort images by displayOrder
    if(currentProduct) { currentProduct.images = currentProduct.images.sort((a, b) => a.displayOrder - b.displayOrder); }

    const productImages = currentProduct?.images.map((image, index) => (
      <img
        key={image.imageKey}
        //src={image.url.replace(/\\/g, "")}
        src={`/${image.url}`}
        className={styles.productImage}
        alt={`Product ${index}`}
        style={index === 0 ? { gridColumn: 'span 2' } : {}}
      />
    ));

    const noTaxText = discountRate === 0 ?
      <span className={styles.productPriceWithoutTax}>¥{priceWithoutTax.toLocaleString('en-US')}（税抜）</span> :
      <div><span className={styles.productPriceWithoutTaxStrikeout}>¥{regularPriceWithoutTax.toLocaleString('en-US')}</span><span className={styles.productPriceWithoutTax}>¥{priceWithoutTax.toLocaleString('en-US')}（税抜）</span></div>;

    const withTaxText = discountRate === 0 ?
      <span className={styles.productPriceWithTax}>¥{taxIncludedPrice.toLocaleString('en-US')}（税込）</span> :
      <div style={{marginBottom: "2rem"}}><span className={styles.productPriceWithTaxStrikeout}>¥{regularTaxIncludedPrice.toLocaleString('en-US')}</span><span className={styles.productPriceWithTax}>¥{taxIncludedPrice.toLocaleString('en-US')}（税込）</span></div>;


    const quantityNode = (
      <>
        <div className={styles.quantityComponent}>
          <button className={styles.quantityButton} onClick={() => { if (productQuantity > 1) { setProductQuantity(prevQuantity => prevQuantity - 1); } }}>–</button>
          <input  className={styles.quantityInput} type="text" value={productQuantity} readOnly style={{ width: '50px', textAlign: 'center' }}/>
          <button className={styles.quantityButton} onClick={() => { if (productQuantity < 10) { setProductQuantity(prevQuantity => prevQuantity + 1); } }}>+</button>
        </div>
        {false && <span className={styles.quantityInfo}>※専用アプリにて検査項目を自由に選べます。ご購入の際は、検査する項目数だけ選んでください。</span>}
      </>
    )

    const spinner = <img className={styles.spinner} src="/spinner.svg" alt="Spinner"/>;
    const addToCartButtonContent = (cartLoading || addingToCart) ? spinner : "カートに入れる";
    const viewCartButtonContent = (cartLoading || addingToCart) ? spinner : "レジにすすむ"; //カートを見る
    const viewShopButtonContent = (cartLoading || addingToCart) ? spinner : "商品一覧に戻る";
  
//    const questionsNode = (
//      <div className={styles.productFaq}>
//        {currentProduct?.type === 1 && (
//          <>
//        <details>
//          <summary>医療機関と同等の精度</summary>
//          <p>血液を採取する採血キットは、管理医療機器として、国から承認を得たものをお送りします。そちらの採血キットを用いて、指先から少量の血液を採取します。通常の採血と異なり、採血量が少なく身体への負担が最小限に抑えることが可能です。検査は、大規模な病院や検査センターに設置されるものと同じ機器と、体外診断薬の承認を得た試薬を用いて行うため、高い精度での検査が可能です。</p>
//        </details>
//
//        <details>
//          <summary>採血の方法</summary>
//          <p>本検査の採血は、病院に行かず、ご自宅等ご都合のよい場所で行っていただくことが可能です。採血の時間については、お選びいただく検査項目によって異なるため、ご確認の上行ってください。採血キットには、指先から少量の血液を採取するために使用する、使い捨ての穿刺器具や、血液を集める採血管が含まれます。詳しい採血方法は、検査キットに同封されている「採血手順書」に記載されています。</p>
//        </details>
//
//        <details>
//          <summary>検査結果について</summary>
//          <p>本検査は、当社の検査センターに血液が届いてから7営業日以内に結果が出ます。検査結果は、お客様のマイページに反映されます。検査結果が反映されたタイミングで、メール通知もありますので、すぐに結果を確認いただくことが可能です。</p>
//        </details>
//
//        <details>
//          <summary>選べる検査項目一覧</summary>
//          <p>※検査項目の選択は、検査キットが届いてから行っていただきます。<br/>
//            商品購入の際に検査項目を選ぶことはできません。</p>
//            <ul>
//              <li>コルチゾール</li>
//              <li>エストラジオール(女性限定)</li>
//              <li>FSH(女性限定)</li>
//              <li>テストステロン</li>
//              <li>TSH</li>
//              <li>FT4</li>
//              <li>フェリチン</li>
//              <li>総IgE</li>
//            </ul>
//        </details>
//        </>
//        )}
//        {currentProduct?.type === 2 && (
//          <>
//            <details>
//              <summary>採血条件について</summary>
//              <ul>
//                <li>月経のあるある方は月経開始日を1日目として3～5日目の間に採血を行ってください。</li>
//                <li>月経の不安定な方、月経の無い方についてはいつでも採血可能です。</li>
//              </ul>
//            </details>
//            <details>
//              <summary>投薬による検査数値の影響</summary>
//              <p>本検査は、投薬していない成人データをもとに検査を行っております。そのため、低用量ピル等のホルモン剤を使用されていると、検査数値が基準範囲から逸脱する場合がございますのでご了承ください。</p>
//            </details>
//            <details>
//              <summary>検査結果について</summary>
//              <p>検査結果は、弊社に血液が届いてから2週間を目安メールにてお渡しいたします。検体の受付状況によっては多少日数が前後いたしますので、ご了承ください。もし検査結果のご連絡が届かない場合は迷惑メールボックス等をご確認いただいた上で、ウェルミルWEBサイトのお問い合わせフォーム(お問い合わせURL)よりご連絡ください。<br/>検査結果シートの郵送対応は行っておりません。</p>
//            </details>
//          </>
//        )}
//        {currentProduct?.type === 3 && (
//          <>
//          <details>
//            <summary>採血条件について</summary>
//            <p>採血条件は特にありません。<br/>※このキット大人の方を対象にした商品です。</p>
//          </details>
//          <details>
//            <summary>投薬による検査数値の影響</summary>
//            <p>本検査は、投薬していない成人データをもとに検査を行っております。そのため、日頃ご使用のお薬によっては検査数値に影響があるものもございますので、ご了承ください。</p>
//          </details>
//          <details>
//            <summary>検査結果について</summary>
//            <p>検査結果は、弊社に血液が届いてから2週間を目安メールにてお渡しいたします。検体の受付状況によっては多少日数が前後いたしますので、ご了承ください。もし検査結果のご連絡が届かない場合は迷惑メールボックス等をご確認いただいた上で、ウェルミルWEBサイトのお問い合わせフォーム(お問い合わせURL)よりご連絡ください。<br/>検査結果シートの郵送対応は行っておりません。</p>
//          </details>
//        </>
//        )}
//        {currentProduct?.type === 4 && (
//          <>
//            <details>
//              <summary>採血条件について</summary>
//              <p>月経開始日を1日目として、3～5日目の間に採血してください。</p>
//            </details>
//            <details>
//              <summary>投薬による検査数値の影響</summary>
//              <p>本検査は、投薬していない成人データをもとに検査を行っております。そのため、低用量ピル等のホルモン剤を使用されていると、検査数値が基準範囲から逸脱する場合がございますのでご了承ください。</p>
//            </details>
//            <details>
//              <summary>検査結果について</summary>
//              <p>検査結果は、弊社に血液が届いてから2週間を目安メールにてお渡しいたします。検体の受付状況によっては多少日数が前後いたしますので、ご了承ください。もし検査結果のご連絡が届かない場合は迷惑メールボックス等をご確認いただいた上で、ウェルミルWEBサイトのお問い合わせフォーム(お問い合わせURL)よりご連絡ください。<br/>検査結果シートの郵送対応は行っておりません。</p>
//            </details>
//          </>
//        )}
//        {currentProduct?.type === 5 && (
//          <>
//            <details>
//              <summary>唾液の採取条件について</summary>
//              <ul>
//                <li>唾液を採取する前30分間は、水やガムを含む飲食、喫煙、歯磨きなどを避けてください。</li>
//                <li>午前中(8-11時)に採取を行ってください。</li>
//              </ul>
//            </details>
//            <details>
//              <summary>投薬による検査数値の影響</summary>
//              <p>本検査は、投薬していない成人データをもとに検査を行っております。そのため、普段ご使用のお薬によっては検査数値に影響を及ぼすものもございますのでご了承ください。</p>
//            </details>
//            <details>
//              <summary>検査結果について</summary>
//              <p>検査結果は、弊社に唾液が届いてから2週間を目安メールにてお渡しいたします。検体の受付状況によっては多少日数が前後いたしますので、ご了承ください。もし検査結果のご連絡が届かない場合は迷惑メールボックス等をご確認いただいた上で、ウェルミルWEBサイトのお問い合わせフォーム(お問い合わせURL)よりご連絡ください。<br/>検査結果シートの郵送対応は行っておりません。</p>
//            </details>
//          </>
//        )}
//        {currentProduct?.type === 6 && (
//          <>
//            <details>
//              <summary>唾液の採取条件について</summary>
//              <ul>
//                <li>液を採取する前30分間は、水やガムを含む飲食、喫煙、歯磨きなどを避けてください</li>
//                <li>月経開始日を1日目として、3～5日目に唾液採取を行ってください。</li>
//                <li>月経が不安定な方、月経が無い方はいつでも採取いただけます。</li>
//              </ul>
//            </details>
//            <details>
//              <summary>投薬による検査数値の影響</summary>
//              <p>本検査は、投薬していない成人データをもとに検査を行っております。そのため、普段ご使用のお薬によっては検査数値に影響を及ぼすものもございますのでご了承ください。</p>
//            </details>
//            <details>
//              <summary>検査結果について</summary>
//              <p>検査結果は、弊社に唾液が届いてから2週間を目安メールにてお渡しいたします。検体の受付状況によっては多少日数が前後いたしますので、ご了承ください。もし検査結果のご連絡が届かない場合は迷惑メールボックス等をご確認いただいた上で、ウェルミルWEBサイトのお問い合わせフォーム(お問い合わせURL)よりご連絡ください。<br/>検査結果シートの郵送対応は行っておりません。</p>
//            </details>
//          </>
//        )}
//        {currentProduct?.type === 7 && (
//          <>
//            <details>
//              <summary>唾液の採取条件について</summary>
//              <ul>
//                <li>唾液を採取する前30分間は、水やガムを含む飲食、喫煙、歯磨きなどを避けてください。</li>
//                <li>午前中(8-11時)に採取を行ってください。</li>
//                <li>月経開始日を1日目として、3～5日目に採取を行ってください。</li>
//                <li>月経の無い方は、採取日についての指定はございません。</li>
//              </ul>
//            </details>
//            <details>
//              <summary>投薬による検査数値の影響</summary>
//              <p>本検査は、投薬していない成人データをもとに検査を行っております。そのため、普段ご使用のお薬によっては検査数値に影響を及ぼすものもございますのでご了承ください。</p>
//            </details>
//            <details>
//              <summary>検査結果について</summary>
//              <p>検査結果は、弊社に唾液が届いてから2週間を目安メールにてお渡しいたします。検体の受付状況によっては多少日数が前後いたしますので、ご了承ください。もし検査結果のご連絡が届かない場合は迷惑メールボックス等をご確認いただいた上で、ウェルミルWEBサイトのお問い合わせフォーム(お問い合わせURL)よりご連絡ください。<br/>検査結果シートの郵送対応は行っておりません。</p>
//            </details>
//          </>
//        )}
//
//      </div>
//    )

    const otherProductsList = (
      <div className={styles.otherProductsGrid}>
        {otherProducts
        ?.filter(product => product.available)
        .sort((a, b) => {
          // If both have the same type, or neither match the current product's type, maintain original order
          if ((a.type === currentProduct?.type) === (b.type === currentProduct?.type)) { return 0; }

          // If a matches the current product's type, it should come first
          if (a.type === currentProduct?.type) { return -1; }

          // If b matches the current product's type, it should come first
          return 1;
        })
        .slice(0, 3)
        .map(product => (
          <div key={product.id}>
            <ProductTile Product={product} />
          </div>
        ))}
      </div>
    )

    const actionButton = productAddedToCart ? (
      <>
        <Link to="/cart"><button className={`${styles.addToCart} ${styles.viewCart}`} onClick={undefined}>{viewCartButtonContent}</button></Link>
        <Link to="/shop"><button className={styles.addToCart} onClick={undefined}>{viewShopButtonContent}</button></Link>
      </>
    ) : (
      <button className={styles.addToCart} onClick={handleAddToCart}>{addToCartButtonContent}</button>
    );

    return (
      <>
      <div className={styles.productRoot}>
        <div className="topDots" />
        <Header breadcrumbs={breadcrumbs} />
        {showModal && loginModal}
        {productsLoading && (<span>Loading Product...</span>)}
        {productsError && false && (<span>Loading Product Error</span>)}
        <div className={styles.productGrid}>
          <div className={styles.imageGrid}>{productImages}</div>
          <div className={styles.productContent}>
            <span className={styles.productDescription}>{currentProduct?.title}</span>
            {noTaxText/*<span className={styles.productPriceWithoutTax}>¥{priceWithoutTax.toLocaleString('en-US')}（税抜）</span>*/}
            {withTaxText/*<span className={styles.productPriceWithTax}>¥{taxIncludedPrice.toLocaleString('en-US')}（税込）</span>*/}
            数量{quantityNode}
            {actionButton}
            <span className={styles.productLongDescription} dangerouslySetInnerHTML={{ __html: currentProduct?.description || '' }} />
            {/*questionsNode*/}
          </div>
        </div>
        <div className={styles.infoLinks}>
          <button className={styles.infoLink} onClick={() => navigate('/payment')}>お支払いについて</button>
          <button className={styles.infoLink} onClick={() => navigate('/delivery')}>配送について</button>
          <button className={styles.infoLink} onClick={() => navigate('/return-policy')}>返品について</button>
        </div>
        <span className={styles.otherHeader}>その他のおすすめキット</span>
        {otherProductsList}
      </div>
      <Footer />
      </>
    );
}

export default Product