import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';

import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
//import { StripePaymentElementOptions } from "@stripe/stripe-js";

import { UserContext } from "../Contexts/UserContext";
import { useProducts } from "../Contexts/ProductContext";

import { prefectures } from "../Utilities/addressData"
import styles from './checkoutForm.module.css';
import NewAddress from "./NewAddress";
import { CouponType, LineItemAddressesArray } from "../types";
import CallAPI from "../Utilities/CallAPI";

type CheckoutFormProps = {
  setDisplayCheckout: React.Dispatch<React.SetStateAction<boolean>>;
  addressesState: LineItemAddressesArray
};


export default function CheckoutForm({ setDisplayCheckout, addressesState }: CheckoutFormProps) {
  //console.log("Rendering CheckoutForm")
  const stripe = useStripe();
  const elements = useElements();

  const { user, setUser, setCartLoading } = useContext(UserContext);
  const { products, isLoading: productsLoading, error: productsError } = useProducts();
  const navigate = useNavigate();
  const subdomain = window.location.hostname.split('.')[0];

  //#region Addresses
  const addresses = (user?.addresses || []).sort((a, b) => {
    if (a.defaultAddress) return -1;
    if (b.defaultAddress) return 1;
    return 0;
  });

  const defaultAddressKey = addresses.find(address => {return address.defaultAddress === true})?.addressKey || null;
  //#endregion

  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string>(user?.email || "");
  const [emailError, setEmailError] = useState<boolean>(false); // undefined means user tried to submit as empty
  const [termsChecked, setTermsChecked] = useState<boolean>(false);
  const [termsGlow, setTermsGlow] = useState<boolean>(false);
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const [selectedAddressKey, setSelectedAddressKey] = useState<number | null>(defaultAddressKey);
  const [showNewAddress, setShowNewAddress] = useState(false);


  // The current address is the default one unless another address key has been set
  const address = addresses.find(address => {
    return (selectedAddressKey === null) ?
    address.defaultAddress === true : 
    address.addressKey === selectedAddressKey;
  });

  useEffect(() => {
    if(addresses.length === 0) {
      setShowNewAddress(true);
    }
  }, [addresses]);

  // Changes the cursor to wait for the whole page while sending payment
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'loading-cursor-style';
    style.textContent = 'body { cursor: wait; }';
    if (isSendingPayment) {
      document.head.appendChild(style);
    } else {
      const existingStyleTag = document.getElementById('loading-cursor-style');
      if (existingStyleTag) { existingStyleTag.remove(); }
    }
  }, [isSendingPayment]);


  // Set payment message pulled from Stripe
  useEffect(() => {
    if (!stripe) { setMessage("Loading Stripe."); return; }

    const clientSecret = new URLSearchParams(window.location.search).get( "payment_intent_client_secret" );
    if (!clientSecret) { setMessage(null); return; }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":               setMessage("Payment succeeded!"); break;
        case "processing":              setMessage("Your payment is processing."); break;
        case "requires_payment_method": setMessage("Your payment was not successful, please try again."); break;
        default:                        setMessage("Something went wrong."); break;
      }
    });
  }, [stripe]);

  async function HandleCouponClick() {
    if(!user) {
      console.log("User is not defined when trying to apply a coupon.");
      return;
    }

    const paymentIntentIdKeyName = subdomain === 'stage' ? 'paymentIntentIdStage' : 'paymentIntentId';
    const couponKeyName = subdomain === 'stage' ? 'couponDiscountStage' : 'couponDiscount';

    const paymentIntentId = localStorage.getItem(paymentIntentIdKeyName);
    if(!paymentIntentId) return;

    const purchase = user.purchases.find(purchase => {return purchase.paymentIntentId === paymentIntentId});
    if(!purchase) {
      console.log("Purchase not found in user.purchases.");
      console.log(user.purchases);
      return;
    }

    setCouponMessage(null);
    

                  // so much commented out because all this needs to be on the server now because there might be millions of coupons
//    const calculatedCouponDiscount = Math.round(await CalculateCouponDiscount());
//    const actualCouponDiscount = ((cart.cost - calculatedCouponDiscount) > 0 && (cart.cost - calculatedCouponDiscount) < 50) ? (cart.cost - 50) : calculatedCouponDiscount;
//    if(calculatedCouponDiscount !== actualCouponDiscount) {
//      setCouponMessage("最低支払額は50円です。");
//    }
//
//    setCouponDiscount(Math.min(actualCouponDiscount, cart.cost));
//    localStorage.setItem(couponKeyName, actualCouponDiscount.toString());
//
    const updateIntentData = {
      customerKey: user.customerKey,
      token: user.token,
      paymentIntentId: paymentIntentId,
      couponCode: couponCode,
      cartLines: user.cart.lines,
    }

//    const expectedNewTotal = cart.cost - actualCouponDiscount;
//    if(expectedNewTotal > 0 && expectedNewTotal < 50) {
//      console.log("Coupon cannot cause total cost to be 1yen to 49yen. New total: " + expectedNewTotal);
//      return;
//    }

    const CallAPIResponse = await CallAPI(updateIntentData, "updatePaymentIntent");
    if (CallAPIResponse.error) {
      console.error("API error:", CallAPIResponse.error);
      setCouponError(CallAPIResponse.error);
      return;
    }
    const couponDiscount = CallAPIResponse?.data?.couponDiscount || 0;
    setCouponDiscount(Math.min(couponDiscount, cart.cost));
    localStorage.setItem(couponKeyName, couponDiscount.toString());

//    if(CallAPIResponse.data.amount !== (expectedNewTotal)) {
//      console.log("Coupon discount did not match the expected amount.");
//      console.log("CallAPIResponse.data.amount: " + CallAPIResponse.data.amount + ", expectedNewTotal: " + (expectedNewTotal));
//    }
//
//    const returnedCouponDiscount = CallAPIResponse.data.couponDiscount;
//    if(returnedCouponDiscount !== actualCouponDiscount) {
//      console.log("Coupon discount did not match the expected amount.");
//      console.log("returnedCouponDiscount: " + returnedCouponDiscount + ", couponDiscount: " + actualCouponDiscount);
//    }

    setUser(prevUser => {
      if(!prevUser) return null;
      const newPurchases = prevUser.purchases.map(prch => {
        if(prch.paymentIntentId === paymentIntentId) { // Directly use paymentIntentId assuming it's available in this scope
          return {...prch, couponDiscount: couponDiscount};
        }
        return prch;
      });
      return {...prevUser, purchases: newPurchases};
    });
  }

  // this all must be done on the server, since we might have millions of coupons
  async function CalculateCouponDiscount() {
    if(!user) {
      console.log("User is not defined when trying to calculate a coupon value.");
      return 0;
      }
    if(!couponCode) {
      console.log("Coupon code is not defined when trying to calculate a coupon value.");
      return 0;
    }
    const couponCodeHash = await sha1(couponCode);

    const keyName = subdomain === 'stage' ? 'couponsStage' : 'coupons';
    const currentCoupons = user.coupons.length > 0 ? user.coupons : JSON.parse(localStorage.getItem(keyName) || "[]");
    const coupon = currentCoupons.find((coupon: CouponType) => {return coupon.hash === couponCodeHash});
    if(!coupon) {
      console.log("Coupon not found in currentCoupons.");
      console.log(currentCoupons);
      return 0;
    }

    const couponType = parseInt(coupon.type.toString());
    const couponTarget = parseInt(coupon.target.toString());
    const couponReward = parseInt(coupon.reward.toString());
    if(isNaN(couponType) || couponType < 0 || isNaN(couponTarget) || couponTarget < 0 || isNaN(couponReward) || couponReward < 0) {
      console.log("Coupon type, target, or reward is not a valid number.");
      return 0;
    }
  
    // This can be undefined for type 1 and 2
    const couponProductKey = parseInt(coupon.productKey?.toString() || "") || undefined;
  
    const productCount = user.cart.lines.reduce((acc, line) => {
      if (line.productKey === couponProductKey) {
        return acc + line.quantity;
      }
      return acc;
    }, 0) ?? 0;

    // Buy [$target] get [$reward] off
    if(couponType === 1) {
      return (cart.cost >= couponTarget) ? couponReward : 0;
    }

    // Buy [$target] get [reward%] off
    if(couponType === 2) {
      return (cart.cost >= couponTarget) ? (couponReward/100 * cart.cost) : 0;
    }

    // Buy [target] products get $y off
    if(couponType === 3) {
      if(productCount >= couponTarget) {
        return couponReward;
      }
    }

    if(couponType === 4) {
      if(productCount >= couponTarget) {
        return (couponReward/100 * cart.cost);
      }
    }

    console.log("Coupon type did not match any of the expected types.");
    return 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Stripe.js hasn't yet loaded. Disable form submission until Stripe.js has loaded.
    if (!stripe || !elements) { return; }

    // Already doing a purchase
    if(isSendingPayment) { return; }

    const stripeReturnURLSubdomain =
      subdomain === 'stage' ? 'stage' :
      //subdomain === 'dev' ? 'dev' :
      'shop';

    // If the email is not valid, set it as an error and return
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!regex.test(email)) {
      setEmailError(true);
      setMessage("正しいメールアドレスを入力してください。");
      return;
    }

    const blockedDomains = [
      "@docomo.ne.jp",
      "@softbank.ne.jp",
      "@i.softbank.jp",
      "@vodafone.ne.jp",
      "@ymobile.ne.jp",
      "@ezweb.ne.jp",
      "@au.com",
      "@kddi.com",
      "@rakuten.jp",
      "@willcom.com",
      "@emnet.ne.jp",
      "@emobile.ne.jp",
      "@ido.ne.jp",
    ]

    for (const domain of blockedDomains) {
      if (email.endsWith(domain)) {
        setEmailError(true);
        setMessage(`申し訳ございませんが、「${domain}」で終わるメールはご登録いただけません。`) //`Sorry, you cannot register with an email ending in ${domain}`
        return;
      }
    }

    const encodedEmail = encodeURIComponent(email);

    if(!address) {
      setMessage("住所を入力してください。");
      return;
    }

    if(subdomain === 'stage' && !termsChecked) {
      setTermsGlow(true);
      return;
    }

    if(!termsChecked) {
      setTermsGlow(true);
      return;
    }

    setIsSendingPayment(true);
    setMessage(null);

    const totalAfterCoupon = cart.cost - couponDiscount;
    if(totalAfterCoupon === 0) {
      navigate(`/post-purchase?ak=${selectedAddressKey}&email=${encodedEmail}&pass=true`);
    } else if (totalAfterCoupon >= 50) {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `https://${stripeReturnURLSubdomain}.well-mill.com/post-purchase?ak=${selectedAddressKey}&email=${encodedEmail}` },
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
    } else {
      console.log("Total cost is not zero but less than 50yen. Not sending payment.");
    }

    setIsSendingPayment(false);
  };


  function ToYen(value: number | undefined) {
    if(value === undefined) return null;
    return value.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })
  }


  // When typing in the email field, remove error status from the field
  function HandleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    setEmailError(false);
    setEmail(event.target.value);
  };


  if(!user) { return <span>Loading User...</span> }
  const cart = user.cart;

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
            <img className={styles.checkoutLine} src={"/" + product.images[0].url} />
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

  const checkoutTotals = cart ? (
    <div className={styles.checkoutTotals}>
      <div className={styles.checkoutTotal}><span>Subtotal:</span><span>{ToYen(cart.cost)}</span></div>
      <div className={styles.checkoutTotal}><span>Tax (included):</span><span>{ToYen(cart.includedTax)}</span></div>
      <div className={styles.checkoutTotal}><span>Shipping:</span><span>{ToYen(0)}</span></div>
      {couponDiscount > 0 ? <div className={styles.checkoutTotal}><span>Coupon:</span><span>-{ToYen(couponDiscount)}</span></div> : null}
      <div className={styles.checkoutTotal} style={{fontWeight: "bold"}}><span>Total:</span><span>{ToYen(cart.cost - couponDiscount)}</span></div>
    </div>
  ) : null;

  const couponDiv = cart ? (
    <>
    <span className={styles.couponMessage}>{couponMessage}</span>
    <div className={styles.couponDiv}>
      <span>クーポン</span>
      <input type="text" value={couponCode || ""} className={styles.couponInput} onChange={(e) => { setCouponCode(e.target.value) }} />
      <button className={styles.couponButton} onClick={HandleCouponClick}>適用</button>
    </div>
    </>
  ) : null;



  const addressKey = (address?.addressKey !== undefined) ? address.addressKey : null;
  const createButton = <span className={styles.addressAction} onClick={() => { setShowNewAddress(true); }}>住所を作成する</span>;
  const editButton = addressKey ? <span className={styles.addressAction} onClick={() => { setShowNewAddress(true); setSelectedAddressKey(addressKey); }}>この住所を編集する</span> : null;
  const changeButton = (addresses.length >= 2) ? <span className={styles.addressAction} onClick={() => { setSelectedAddressKey(null); }}>別の住所を選択する</span> : null;
  const prefectureName = prefectures.find(prefecture => prefecture.code.toString() === address?.pref)?.name;

  function generateAddressCard(addressKey: number) {
    if(!addressKey) return null;
    const currentAddress = addresses.find(address => {return address.addressKey === addressKey})
    if(!currentAddress) return null;

    return (
      <div className={styles.addressCard}>
        <span>{currentAddress.lastName} {currentAddress.firstName}</span>
        <span>〒{currentAddress.postalCode?.toString().slice(0,3)}-{currentAddress.postalCode?.toString().slice(3,7)}</span>
        <span>{prefectureName} {currentAddress.city}</span>
        <span>{currentAddress.ward} {currentAddress.address2}</span>
      </div>
    )
  }

//  const lineItemKeysInCart = cart.lines.map(line => line.lineItemKey);
//  for (const lineItemKey of lineItemKeysInCart) {
//    const lineItemAddresses = addressesState.find(addr => addr.lineItemKey === lineItemKey);
//    if (!lineItemAddresses || !lineItemAddresses.addresses || lineItemAddresses.addresses.length === 0) {
//      return false;
//    }
//    if(lineItemAddresses.addresses.some(addr => {return addr.addressKey === null})) {
//      return false;
//    }
//  }

  // If every item has an address set, we don't need to force one on the checkout screen
  const allAddressesSet = cart.lines.every(line => {
    const lineItemAddresses = addressesState.find(addr => addr.lineItemKey === line.lineItemKey);
  
    return (
      lineItemAddresses?.addresses &&
      lineItemAddresses.addresses.length > 0 &&
      !lineItemAddresses.addresses.some(addr => addr.addressKey === null)
    );
  });


  const addressCard = (selectedAddressKey) ? (
    <>
      <span className={styles.billingAddress}>請求先およびデフォルト配送先</span>
      {generateAddressCard(selectedAddressKey)}
      <div className={styles.addressActions}>
        {editButton}
        {changeButton}
      </div>
    </>
  ) :
//  (allAddressesSet) ?
//    <div className={styles.addressCard} style={{alignItems: "center"}}>
//      <span>すべてのアイテムには住所があります。</span>
//      <span>必要に応じて請求先住所を指定します。</span>
//      {createButton}
//    </div>
//  :
  (
    <>
      <span className={styles.billingAddress}>請求先およびデフォルト配送先</span>
      <div className={styles.addressCard} style={{alignItems: "center"}}>
        <span>住所が見つかりません。</span>
        <span>住所を入力してください。</span>
        {createButton}
      </div>
    </>
  );

  const addressCards = addresses.map((address, index) => {
    if(!address?.addressKey) return null;
    if(address.defaultAddress) {
      return (<div key={index} onClick={() => {setSelectedAddressKey(address.addressKey || null)}}><span className={styles.defaultAddressHeader}>デフォルトの住所</span><div className={styles.clickableAddress}>{generateAddressCard(address.addressKey)}</div></div>)
    }
    return (<div key={index} onClick={() => {setSelectedAddressKey(address.addressKey || null)}}><div className={styles.clickableAddress}>{generateAddressCard(address.addressKey)}</div></div>)
  });

  const selectAddressModal = (
    <div className={styles.selectAddressModal}>
      <div className={styles.selectAddressContent}>
        <span className={styles.selectAddressHeader}>住所を選択してください</span>
        {addressCards}
      </div>
    </div>
  );

  // const paymentElementOptions: StripePaymentElementOptions = { layout: "tabs" }

  if(selectedAddressKey === null && addresses.length === 1) {
    setSelectedAddressKey(addresses[0].addressKey || null)
  }

  return (
    <>
      {showNewAddress && <NewAddress addressKey={selectedAddressKey} setShowNewAddress={setShowNewAddress} />}
      {selectedAddressKey === null && addressCards.length > 0 && selectAddressModal}
      <div className={styles.checkoutModal}>
        <span className={styles.checkoutX} onClick={() => { console.log("setDisplayCheckout(false) 2"); setCartLoading(false); setDisplayCheckout(false); window.location.reload(); }}>✖</span>
          <div className={styles.checkoutFormWrapper}>
            <img src="logo.svg" alt="Logo" />
            <span className={styles.checkoutHeader}>Checkout</span>
            <div className={styles.checkoutFormContent}>
              <form className={styles.paymentForm} id="payment-form" onSubmit={handleSubmit}>
                <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
                <div className={styles.email}>
                  <span className={styles.email}>E-mail</span>
                  <input type="email" className={`${styles.email} ${(emailError && styles.emailError)}`} value={email} onChange={HandleEmailChange} />
                </div>
                {(subdomain === 'stage' || true) ? <div><label>
                  <input type="checkbox" style={{boxShadow: termsGlow ? "0px 0px 5px 2px rgba(128,0,0,0.5)" : "" }} checked={termsChecked} onChange={(event) => {setTermsChecked(event.target.checked); setTermsGlow(false)}} />
                  <span style={{fontSize: "0.9rem", borderBottom: termsGlow ? "1px solid #800" : ""}}><a style={{textDecoration: "underline", color:"#369"}} href="https://well-mill.com/terms-of-use/" target="_blank">利用規約</a>および<a style={{textDecoration: "underline", color:"#369"}} href="https://shop.well-mill.com/privacy-policy" target="_blank">プライバシーポリシー</a>に同意します</span></label></div>: null}
                <button disabled={isSendingPayment || !stripe || !elements} id="submit">
                  <span id="button-text">
                    {isSendingPayment ? <img className={styles.spinner} src="spinner.svg" alt="Spinner"/> : "今すぐ払う"}
                  </span>
                </button>
                <button style={{marginTop: 0}} onClick={() => { console.log("setDisplayCheckout(false) 3"); setCartLoading(false); setDisplayCheckout(false); window.location.reload(); }}>カートに戻る</button>
                {message && <div id="payment-message" className={styles.paymentMessage}>{message}</div>}
              </form>
              <div className={styles.checkoutFormProducts}>
                {checkoutLines}
                <div className={styles.checkoutSummary}>
                  {checkoutTotals}
                  {couponDiv}
                  {addressCard}
                </div>
              </div>
            </div>
          </div>
      </div>
    </>
  );
}

async function sha1(inputString: string) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-1', enc.encode(inputString));
  return Array.from(new Uint8Array(hash))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}