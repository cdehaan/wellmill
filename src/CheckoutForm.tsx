import React, { useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StripePaymentElementOptions } from "@stripe/stripe-js";

import { useUserData } from "./useUserData";
import { useProducts } from "./ProductContext";

import { prefectures } from "./addressData"
import styles from './checkoutForm.module.css';

type CheckoutFormProps = {
  selectedAddressKey: number | null;
  setSelectedAddressKey: React.Dispatch<React.SetStateAction<number | null>>;
  setShowNewAddress: React.Dispatch<React.SetStateAction<boolean>>;
};


export default function CheckoutForm({ selectedAddressKey, setSelectedAddressKey, setShowNewAddress }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const { user, userLoading, cartLoading } = useUserData();
  const { products, isLoading: productsLoading, error: productsError } = useProducts();
  const addresses = user?.addresses || [];

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddressSelect, setShowAddressSelect] = useState(false);
  
  const cart = user ? user.cart : undefined;

  // The current address is the default one unless another address key has been set
  const address = user ? user.addresses.find(address => {
    return (selectedAddressKey === null) ?
    address.defaultAddress === true : 
    address.addressKey === selectedAddressKey;
  }) : null;


  // Set payment message pulled from Stripe
  useEffect(() => {
    if (!stripe) { setMessage("Loading Stripe."); return; }

    const clientSecret = new URLSearchParams(window.location.search).get( "payment_intent_client_secret" );
    if (!clientSecret) { setMessage(null); return; }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Stripe.js hasn't yet loaded. Disable form submission until Stripe.js has loaded.
    if (!stripe || !elements) { return; }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: "http://localhost:3000",
      },
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error?.type === "card_error" || error?.type === "validation_error") {
      setMessage(error.message ? error.message : "Unknown error returned from confirmPayment");
    } else {
      setMessage("An unexpected error occurred during confirmPayment.");
    }

    setIsLoading(false);
  };

  function ToYen(value: number | undefined) {
    if(value === undefined) return null;
    return value.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })
  }

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs"
  }

  const headings = (
    <div className={styles.headings}>
      <span>商品</span>
      <span>数量</span>
      <span style={{textAlign: "center"}}>合計</span>
    </div>
  );


  const checkoutLines = cart ? (
    <div className={styles.checkoutLines}>
      {cart.lines.map(line => {
        const product = products?.find(product => {return (product.productKey === line.productKey)});
        if (!product) return null;
        const lineUnitCost = line.unitPrice * (1+line.taxRate);
        const lineCost = lineUnitCost * line.quantity;
        return(
          <div className={styles.checkoutLine}>
            <img className={styles.checkoutLine} src={product.images[0].url} />
            <div className={styles.lineText}>
              <span className={styles.lineDescription}>{product.title}</span>
              <span className={styles.lineUnitCost}>{lineUnitCost.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span>
            </div>
            <span className={styles.lineQuantity}>✖ {line.quantity}</span>
            <span className={styles.lineCost}>{lineCost.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span>
          </div>
        )
      })}
    </div>
  ) : null;

  //console.log(cart)
  const checkoutTotals = cart ? (
    <div className={styles.checkoutTotals}>
      <div className={styles.checkoutTotal}><span>Subtotal:</span><span>{ToYen(cart.cost)}</span></div>
      <div className={styles.checkoutTotal}><span>Tax (included):</span><span>{ToYen(cart.includedTax)}</span></div>
      <div className={styles.checkoutTotal}><span>Shipping:</span><span>{ToYen(0)}</span></div>
      <div className={styles.checkoutTotal}><span>Total:</span><span>{ToYen(cart.cost)}</span></div>
    </div>
  ) : null;



  const addressKey = (address?.addressKey !== undefined) ? address.addressKey : null;
  const editButton = addressKey ? <span className={styles.addressAction} onClick={() => { setShowNewAddress(true); setSelectedAddressKey(addressKey); }}>住所を編集する</span> : null;
  const createButton = <span className={styles.addressAction} onClick={() => { setShowNewAddress(true); }}>住所を作成する</span>;
  //const changeButton = addressKey ? <span className={styles.addressAction} onClick={() => {  }}>別の住所を選択する</span> : null;
  //const addressOptions = addresses.map(address => {return (<option></option>)});
  //const addressSelect = (<select></select>)
  const prefectureName = prefectures.find(prefecture => prefecture.code.toString() === address?.pref)?.name;

  const addressCard = (address) ? (
    <div className={styles.addressCard}>
      <span>{address.lastName} {address.firstName}</span>
      <span>〒{address.postalCode?.toString().slice(0,3)}-{address.postalCode?.toString().slice(3,7)}</span>
      <span>{prefectureName} {address.city}</span>
      <span>{address.ward} {address.address2}</span>
      <div className={styles.addressActions}>{editButton}</div>
    </div>
  ) : (
    <div className={styles.addressCard} style={{alignItems: "center"}}>
      <span>住所が見つかりません。</span>
      <span>住所を入力してください。</span>
      {createButton}
    </div>
  );


  return (
    <div className={styles.checkoutFormWrapper}>
      <img src="logo.svg" alt="Logo" />
      <span className={styles.checkoutHeader}>Checkout</span>
      <div className={styles.checkoutFormContent}>
        <form id="payment-form" onSubmit={handleSubmit}>
          <PaymentElement id="payment-element" options={paymentElementOptions} />
          <button disabled={isLoading || !stripe || !elements} id="submit">
            <span id="button-text">
              {isLoading ? <div className="spinner" id="spinner"></div> : "今すぐ払う"}
            </span>
          </button>
          {/* Show any error or success messages */}
          {message && <div id="payment-message">{message}</div>}
        </form>
        <div className={styles.checkoutFormProducts}>
          {checkoutLines}
          {checkoutTotals}
          {addressCard}
        </div>
      </div>
    </div>
  );
}