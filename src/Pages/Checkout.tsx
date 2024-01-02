import React, { useContext, useEffect, useState } from "react";
import { Helmet } from 'react-helmet';
import CheckoutForm from "./CheckoutForm";
import styles from './checkout.module.css';
import { Elements } from "@stripe/react-stripe-js";
import { Appearance, StripeElementsOptions, loadStripe } from "@stripe/stripe-js";
import { UserContext } from "../Contexts/UserContext";
import { LineItemAddressesArray } from "../types";


type CheckoutProps = {
  setDisplayCheckout: React.Dispatch<React.SetStateAction<boolean>>;
  addressesState: LineItemAddressesArray;
};

// This is our *publishable* test API key.
const stripePromise = loadStripe("pk_test_51OCbHTKyM0YoxbQ6sRQnZdL8bJ5MCtdXPgiCv9uBngab4fOvROINeb3EV8nqXf5pyOT9ZTF8mKTzOcCgNK2rODhI00MmDWIyQ6");

function Checkout({ setDisplayCheckout, addressesState }: CheckoutProps) {
  console.log("Rendering Checkout")
  const { user, local } = useContext(UserContext);
  const [clientSecret, setClientSecret] = useState("");

  function hideCheckout(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (event.target === event.currentTarget) {
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
    if(!user) return;

    // From here, a customer cannot set item-specific addresses.
    // If an item-specific address (including mailing address and addressKey) is set, use that.
    // If not, use the default address. (Existing site can't do this. Should we?)

    const cartLines = user.cart.lines;
    const requestBody = {data: { customerKey: user.customerKey, token: user.token, cartLines: cartLines, addressesState: addressesState }};

    async function fetchData() {
      try {
        const response = await fetch("https://cdehaan.ca/wellmill/api/createPaymentIntent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
  
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  
    // Call fetchData
    fetchData();
  }, [user?.customerKey]);


  const StripeElements = clientSecret ? (
    <Elements options={options} stripe={stripePromise}>
      <div className={styles.checkoutWrapper} onClick={hideCheckout}>
        <CheckoutForm setDisplayCheckout={setDisplayCheckout}/>
      </div>
    </Elements>) : null;

  return (
    <>
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
      {StripeElements}
    </>
  );
}

export default Checkout;