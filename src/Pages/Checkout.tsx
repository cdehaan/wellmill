import React, { useContext, useEffect, useState } from "react";
import { Helmet } from 'react-helmet';
import CheckoutForm from "./CheckoutForm";
import styles from './checkout.module.css';
import { Elements } from "@stripe/react-stripe-js";
import { Appearance, StripeElementsOptions, loadStripe } from "@stripe/stripe-js";
import { UserContext } from "../Contexts/UserContext";
import { useUserData } from "../Hooks/useUserData";
import { CartLineType, LineItemAddressesArray } from "../types";


type CheckoutProps = {
  setDisplayCheckout: React.Dispatch<React.SetStateAction<boolean>>;
  addressesState: LineItemAddressesArray;
};

// This is our *publishable* test API key.
//const stripePromise = loadStripe("pk_test_51OCbHTKyM0YoxbQ6sRQnZdL8bJ5MCtdXPgiCv9uBngab4fOvROINeb3EV8nqXf5pyOT9ZTF8mKTzOcCgNK2rODhI00MmDWIyQ6");

// This is our *publishable* production API key.
//const stripePromise = loadStripe("pk_live_51OZRPgKbzugMLft3UUXVWuMLrYnM0IkDU7Y8c5FqTOsRycYXzVx9fZcLn0nLViTsqG6vfUkAOX3UitSRwvrbsesw00FljV7keZ");

function Checkout({ setDisplayCheckout, addressesState }: CheckoutProps) {
  const { user } = useContext(UserContext);
  const { createPaymentIntent } = useUserData();
  const [clientSecret, setClientSecret] = useState("");

  const subdomain = window.location.hostname.split('.')[0];
  const stripePromise = subdomain === 'stage' ? loadStripe("pk_test_51OCbHTKyM0YoxbQ6sRQnZdL8bJ5MCtdXPgiCv9uBngab4fOvROINeb3EV8nqXf5pyOT9ZTF8mKTzOcCgNK2rODhI00MmDWIyQ6") : loadStripe("pk_live_51OZRPgKbzugMLft3UUXVWuMLrYnM0IkDU7Y8c5FqTOsRycYXzVx9fZcLn0nLViTsqG6vfUkAOX3UitSRwvrbsesw00FljV7keZ");

  //console.log("Rendering Checkout")
  //console.log(user)

  function hideCheckout(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (event.target === event.currentTarget) {
      console.log("setDisplayCheckout(false) 1")
      setDisplayCheckout(false);
    }
  }

  const appearance: Appearance = {
    theme: 'stripe',

    variables: {
      //spacingUnit: '2px',
    },
  };
  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
  };

  useEffect(() => {
    if(!user) {
      console.log("return on no user");
      return;
    }

    // From here, a customer cannot set item-specific addresses.
    // If an item-specific address (including mailing address and addressKey) is set, use that.
    // If not, use the default address. (Existing site can't do this. Should we?)

    const cartLines = user.cart.lines;
    const purchases = user.purchases;

    // Every item in the cart is already within some payment
    const paymentIntentExists = cartLines.every(cartLine =>
      purchases.some(purchase =>
        purchase.lineItems.some(item => item.lineItemKey === cartLine.lineItemKey)
      )
    );

    if(!paymentIntentExists || true) {
      console.log("paymentIntentExists: " + paymentIntentExists ? "true" : "false");
      createPaymentIntentFunction(cartLines, addressesState);
    }

    async function createPaymentIntentFunction(cartLines: CartLineType[], addressesState: LineItemAddressesArray) {
      const response = await createPaymentIntent(cartLines, addressesState);
      if(response.error) {
        console.log("Error in createPaymentIntentFunction: " + response.error);
      } else {
        console.log("Created Payment Intent:");
        console.log(response.data);
        if(response.data.clientSecret) {
          setClientSecret(response.data.clientSecret);
        }
      }
    }
  }, [user?.customerKey]);


  const StripeElements = clientSecret ? (
    <Elements options={options} stripe={stripePromise}>
      <div className={styles.checkoutWrapper} onClick={hideCheckout}>
        <CheckoutForm setDisplayCheckout={setDisplayCheckout} addressesState={addressesState}/>
      </div>
    </Elements>) : null;

  const oldHelmet = (
    <Helmet>
      <meta
        http-equiv="Content-Security-Policy"
        content="
          default-src 'self' https://zipcloud.ibsnet.co.jp; 
          script-src 'self' 'unsafe-inline' https://js.stripe.com; 
          style-src 'self' 'unsafe-inline'; 
          frame-src https://js.stripe.com;
          connect-src 'self' https://zipcloud.ibsnet.co.jp;
        "
      />
    </Helmet>
  )

  return (
    <>
      {StripeElements}
    </>
  );
}

export default Checkout;