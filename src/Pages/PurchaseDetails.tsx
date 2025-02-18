import React, { useContext, useState } from "react";

import { UserContext } from "../Contexts/UserContext";
import { useUserData } from "../Hooks/useUserData";
import { useProducts } from "../Contexts/ProductContext";

import '../App.css';
import styles from "./purchaseDetails.module.css"
import Header from "./Header";
import Footer from "./Footer";
import { useNavigate, useParams } from "react-router-dom";
import { Address } from "../types";
import { Helmet } from "react-helmet";

const breadcrumbs = [
  { text: "ホーム", url: "/" },
  { text: "マイページ", url: "/account" },
  { text: "購入履歴", url: "/order-list" },
];

export default function PurchaseDetails() {
  const { user, userLoading } = useContext(UserContext);
  const { cancelPurchase, printReceipt } = useUserData();
  const { products, /*isLoading: productsLoading, error: productsError*/ } = useProducts();
  const purchaseKey = (parseInt(useParams().purchaseKey || ""));
  const [cancelError, setCancelError] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const navigate = useNavigate();

  const purchase = user?.purchases.find(pur => {return pur.purchaseKey === purchaseKey});
  if(!purchase) return <span>Loading purchases</span>;

  const lineItems = purchase.lineItems;
  if(lineItems.length === 0) return <span>Loading purchases</span>;

  // Can cancel if nothing is shipped or canceled
  const canCancel = !(lineItems?.some(item => {return item.shippingStatus === "shipped" || item.shippingStatus === "canceled" }));
  const isCanceled = lineItems?.every(item => {return item.shippingStatus === "canceled" });

  const purchaseShippingStatuses = Array.from(new Set(lineItems?.map(item => item.shippingStatus)));
  const shippingStatus =
    (purchaseShippingStatuses.length === 0) ? "不明" :
    (purchaseShippingStatuses.length > 1) ? "一部発送済み" :
    (purchaseShippingStatuses[0] === null) ? "発送前" :
    (purchaseShippingStatuses[0] === "shipped") ? "発送済み" :
    (purchaseShippingStatuses[0] === "canceled") ? "キャンセル済み" :
    (purchaseShippingStatuses[0]) ? purchaseShippingStatuses[0] : "不明";


  console.log("lineItems");
  console.log(lineItems);
  console.log("user");
  console.dir(user, { depth: null, colors: true });


  const purchaseHeader = (
    <div className={styles.detailsHeader}>
      <span>商品</span>
      <span className={styles.alignCenter}>価格</span>
      <span className={styles.alignCenter}>数量</span>
      <span className={styles.alignCenter}>合計</span>
    </div>
  )

  const lineItemRows = lineItems?.map(line => {
    const product = products?.find(product => {return (line.productKey === product.productKey)});
    if(product === undefined) return null;
    const quantity = line.quantity;
    const unitCost = Math.round(line.unitPrice * (1+line.taxRate));
    const lineCost = unitCost * line.quantity;

    return(
      <div className={styles.lineItem}>
        <span>{product.title}</span>
        <span className={styles.alignCenter}>{unitCost}</span>
        <span className={styles.alignCenter}>{quantity}</span>
        <span className={styles.alignEnd}>{lineCost.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span>
      </div>
    )
  });

  const subtotal = Math.round(lineItems?.reduce((total, item) => {
    const itemTotal = item.unitPrice * (1 + item.taxRate) * item.quantity;
    return total + itemTotal;
  }, 0));

  const shipping = 0;

  const totalCost = (subtotal || 0) + shipping;

  const purchaseFooter = (
    <div className={styles.detailsFooter}>
      <div className={styles.detailsFooters}><span className={`${styles.thirdColumn} ${styles.alignEnd}`}>小計</span><span className={styles.alignEnd}>{subtotal?.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
      <div className={styles.detailsFooters}><span className={`${styles.thirdColumn} ${styles.alignEnd}`}>配送</span><span className={styles.alignEnd}>{shipping?.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
      <div className={styles.detailsFooters}><span className={`${styles.thirdColumn} ${styles.alignEnd}`}>合計</span><span className={styles.alignEnd}>{totalCost?.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span></div>
      <div className={styles.cancelFooter}><span className={styles.cancelOrder} onClick={HandlePrintReceipt}>(領収書をダウンロードする)</span></div>
      {canCancel     && <div className={styles.cancelFooter}><span className={styles.cancelOrder} onClick={HandleCancelOrder}>(注文キャンセルする)</span></div>}
      {isCanceled    && <div className={styles.cancelFooter}><span className={styles.cancelMessage}>(キャンセル済み)</span></div>}
      {userLoading   && <div className={styles.cancelFooter}><span className={styles.cancelSpinner}><img src="spinner.svg" className={styles.cancelSpinner} alt="Spinner" /></span></div>}
      {cancelMessage && <div className={styles.cancelFooter}><span className={styles.cancelMessage}>{cancelMessage}</span></div>}
      {cancelError   && <div className={styles.cancelFooter}><span className={styles.cancelError}>{cancelError}</span></div>}
    </div>
  )

  const lineItemsGrid = (
    <div className={styles.lineItemsGrid}>
        {purchaseHeader}
        {lineItemRows}
        {purchaseFooter}
    </div>
  )


  async function HandleCancelOrder() {
    if(!user) { return null; }
    if(!user.customerKey) { return null; }
    if(!user.token) { return null; }
    if(userLoading) { return null; }

    const purchase = user.purchases.find(pur => {return pur.purchaseKey === purchaseKey});
    if(!purchase) { return null; }

    if(purchase.lineItems.length === 0) { return null; }
    if(purchase.lineItems.length > 1) {
      if(!window.confirm("複数の商品を含むご注文をキャンセルすると、すべての商品がキャンセルされます。 続く？")) { return null; }
    }

    const returnedCustomer = await cancelPurchase(purchaseKey);
    console.log("Customer returned after canceling order:");
    console.log(returnedCustomer);
    if(returnedCustomer.error) {
      setCancelMessage("");
      setCancelError(returnedCustomer.error);
      return;
    }

    setCancelError("");
    setCancelMessage("注文が削除されました - お待ちください");

    setTimeout(() => {
      navigate('/order-list');
    }, 1500);
  }

  async function HandlePrintReceipt() {
    if(!user) { return null; }
    if(!user.customerKey) { return null; }
    if(!user.token) { return null; }
    if(userLoading) { return null; }

    const purchase = user.purchases.find(pur => {return pur.purchaseKey === purchaseKey});
    if(!purchase) { return null; }
    if(purchase.lineItems.length === 0) { return null; }
    const printReceiptReply = await printReceipt(purchaseKey);
    console.log("Reply after printing receipt:");
    console.log(printReceiptReply);
    if(printReceiptReply.error) {
      setCancelMessage("");
      setCancelError(printReceiptReply.error);
      return;
    }
  }

  const uniqueAddresses:Address[] = [];
  const seen = new Set();
  lineItems.forEach(line => {
    const addressKey = [ line.firstName, line.lastName, line.postalCode, line.prefCode, line.pref, line.city, line.ward, line.address2, line.phoneNumber].join('|');
    if (!seen.has(addressKey)) {
      seen.add(addressKey);
      uniqueAddresses.push({ firstName: line.firstName || undefined, lastName: line.lastName || undefined, postalCode: line.postalCode || undefined, prefCode: line.prefCode || undefined, pref: line.pref || undefined, city: line.city || undefined, ward: line.ward || undefined, address2: line.address2 || undefined, phoneNumber: line.phoneNumber || undefined});
    }
  });

  const addressBoxes = uniqueAddresses?.map(address => {
    return(
      <div className={styles.addressBox}>
        <span>{address.lastName} {address.firstName}</span>
        <span>{address.postalCode}</span>
        <span>{address.pref}{address.city}{address.ward}{address.address2}</span>
        <span>{address.phoneNumber}</span>
      </div>
    );
  });

  const addressesBox = (
   <div className={styles.addressesBox}>
    {addressBoxes}
   </div>
  )


  return(
    <>
      <Helmet>
        <link rel="preload" href="spinner.svg" as="image" />
      </Helmet>
      <div className="topDots" />
      <Header breadcrumbs={breadcrumbs} />
      <span className="topHeader">購入履歴</span>
      <div className={styles.contentWrapper}>
        <span className={styles.purchaseKey}>#{purchaseKey}</span>
        <span>{shippingStatus}</span>
        {lineItemsGrid}
        <span className={styles.shippingAddress}>配送先住所</span>
        {addressesBox}
      </div>
      <Footer />
    </>
  )
}