import React, { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../Contexts/UserContext";
import { useUserData } from "../Hooks/useUserData";
import { useProducts } from "../Contexts/ProductContext";
import { Elements, useStripe } from "@stripe/react-stripe-js";

import '../App.css';
import Header from "./Header";
import Footer from "./Footer";

import styles from "./postpurchase.module.css"
import { StripeElementsOptions, loadStripe } from "@stripe/stripe-js";

const breadcrumbs = [
  { text: "ホーム", url: "/" },
  { text: "カートを見る", url: "/cart" },
  { text: "支払い確認", url: "/post-purchase" },
];

// This is our *publishable* test API key.
const stripePromise = loadStripe("pk_test_51OCbHTKyM0YoxbQ6sRQnZdL8bJ5MCtdXPgiCv9uBngab4fOvROINeb3EV8nqXf5pyOT9ZTF8mKTzOcCgNK2rODhI00MmDWIyQ6");



export default function PostPurchase() {
  const parsedUrl = new URL(window.location.href);
  const params = new URLSearchParams(parsedUrl.search);
  const paymentIntentClientSecret = params.get("payment_intent_client_secret");

  const options: StripeElementsOptions = {
    clientSecret: paymentIntentClientSecret || undefined,
  };

  return (
    <Elements stripe={stripePromise}>
      <PostPurchaseContent />
    </Elements>
  );
}

function PostPurchaseContent() {
  const { user, setUser } = useContext(UserContext);
  const { finalizePurchase } = useUserData();
  const { products, isLoading: productsLoading, error: productsError } = useProducts();
  const prevCustomerKey = useRef<number | undefined | null>(undefined); // Guest customerKey is null

  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [stripeMessage, setStripeMessage] = useState<string | null>(null);

  const stripe = useStripe();

  // Get params from the current URL query string
  const parsedUrl = new URL(window.location.href);
  const params = new URLSearchParams(parsedUrl.search);

  const paymentIntentId = params.get("payment_intent");
  const paymentIntentClientSecret = params.get("payment_intent_client_secret");
  const redirectStatus = params.get("redirect_status");
  const billingAddressKey = parseInt(params.get("ak") || "");

  const email = decodeURIComponent(params.get("email") || '');
  let guest: boolean;

  const header = (redirectStatus === "succeeded") ? <span className={styles.received}>ご注文を承りました</span> : <span>There was an error</span>
  const paymentInProgress = <span className={styles.wait}>お支払い処理中です、少々お待ちください</span>
  const PaymentSuccess = <span className={styles.success}>ご注文が完了しました</span>
  const serverReply = <span className={styles.message}>サーバーからのメッセージ: {paymentStatus}</span>

  
  

  // Set payment message pulled from Stripe
  useEffect(() => {
    const clientSecret = new URLSearchParams(window.location.search).get( "payment_intent_client_secret" );
    if (!clientSecret) { setStripeMessage(null); return; }

    retrievePaymentIntentFunction(clientSecret);

    async function retrievePaymentIntentFunction(clientSecret:string) {
      if (!stripe) { setStripeMessage("Loading Stripe."); return; }

      const paymentIntent = (await stripe.retrievePaymentIntent(clientSecret)).paymentIntent;
      setPaymentStatus(paymentIntent?.status || null);

      switch (paymentIntent?.status) {
        case "succeeded":               setStripeMessage("Payment succeeded!"); break;
        case "processing":              setStripeMessage("Your payment is processing."); break;
        case "requires_payment_method": setStripeMessage("Your payment was not successful, please try again."); break;
        default:                        setStripeMessage("Something went wrong."); break;
      }
    }
  }, [stripe]);
  

  // Tell server to check payment status
  useEffect(() => {
    if(!user) { console.log("No User"); return; }
    if(!products) { console.log("No products"); return; }
    if(!paymentStatus) { console.log("No paymentStatus"); return; }
    if(!paymentIntentId) { console.log("No paymentIntentId"); return; }

    const customerKey = user.customerKey;

    if(customerKey === prevCustomerKey.current) { console.log("Don't verify on re-render"); return; }
    prevCustomerKey.current = customerKey;

    asyncFinalizePurchase(paymentIntentId, email, billingAddressKey);

    async function asyncFinalizePurchase(paymentIntentId: string, email: string, billingAddressKey: number) {
      const finalizeReply = await finalizePurchase(paymentIntentId, email, billingAddressKey);
      if(finalizeReply.error) {
        console.log("Error in asyncFinalizePurchase in PostPurchase:");
        console.log(finalizeReply);
        return;
      }
      console.log(finalizeReply);
    }

  }, [user, products, paymentStatus, billingAddressKey, email, paymentIntentId, paymentIntentClientSecret]);

  
  return (
    <>
      <div className="topDots" />
      <Header breadcrumbs={breadcrumbs} />
      <span className="topHeader">カートを見る</span>

      {header}
      {false && <span>Stripe message:{stripeMessage}</span>}
      {(paymentStatus === null) && paymentInProgress}
      {paymentStatus === "succeeded" && PaymentSuccess}
      {paymentStatus !== null && paymentStatus !== "succeeded" && serverReply}
      <Footer />
    </>
  );
}