import React, { useEffect, useRef, useState } from "react";
import { useUserData } from "./useUserData";

import { Address } from "./types";

import styles from "./newAddress.module.css"
import './App.css';

import { prefectures } from "./addressData"

type NewAddressProps = {
  addressKey: number | null;
  setShowNewAddress: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function NewAddress({ addressKey, setShowNewAddress }: NewAddressProps) {
  const { user, addAddress } = useUserData();
  const [postalCode, setPostalCode] = useState<string>("");
  const [displayedPostalCode, setDisplayedPostalCode] = useState<string>("");
  const postalCodeRef = useRef(null);
  const [address, setAddress] = useState<Address>({});
  const [fetchingAddress, setFetchingAddress] = useState<Boolean>(false);

  const currentAddress = addressKey ? user?.addresses.find(address => address.addressKey === addressKey) : null;


  // If there is a current address (i.e. editing, not adding), display it on load
  useEffect(() => {
    if (currentAddress) {
      setAddress(currentAddress);
      PostalCodeFormatter(currentAddress.postalCode?.toString())
    }
  }, [currentAddress]);


  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') { setShowNewAddress(false); }
    };

    // Add event listener for the escape key
    document.addEventListener('keydown', handleEsc);

    // Clean up the event listener when the component unmounts
    return () => { document.removeEventListener('keydown', handleEsc); };
  }, [setShowNewAddress]); 


  // Fetch address data from postal code
  async function fetchAddressData(fetchPostalCode: string) {
    try {
      // Make the API request
      setFetchingAddress(true);
      const fetchUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${fetchPostalCode}`;
      const response = await fetch(fetchUrl);
      const data = await response.json();

      // Check if the response is successful
      if (data.status === 200) {

        // Successful fetch of data, but no results found. Empty the address fields. TODO should not do this if user has edited the fields.
        if(data.results === null || data.results.length === 0) {
          setAddress( (previousAddress: Address) => ({ ...previousAddress, pref: "", city: "", ward: "" }) );
          return;
        }

        const result = data.results[0];
        //console.log(result);

        if (result.prefcode) { setAddress( (previousAddress: Address) => ({ ...previousAddress, pref: result.prefcode }) ); }
        if (result.address2) { setAddress( (previousAddress: Address) => ({ ...previousAddress, city: result.address2 }) ); }
        if (result.address3) { setAddress( (previousAddress: Address) => ({ ...previousAddress, ward: result.address3 }) ); }

      } else {
        // Handle invalid response or no results
        console.error(`Error ${data.status} returned fetching address data`);
      }
    } catch (error) {
      console.error("Error fetching address data:", error);
    } finally {
      setFetchingAddress(false);
    }
  }


  // Event handler for postal code input change
  function handlePostalCodeChange(e: React.ChangeEvent<HTMLInputElement>) {

    // Get the values currently in the input
    const currentValue = e.target.value;
    const currentDigits = currentValue.replace(/\D/g, '');

    // If longer than 9 characters (7 digits), set back to what we just had and get out
    if(currentValue.length > 9) { setDisplayedPostalCode(displayedPostalCode); return; }

    // We want to check if the user deleted just the dash. This happens if all the following are true:
    // 1) The input currently has 4 or more characters
    // 2) There is no dash
    // 3) The length of what's currently in the input is exactly one shorter than "displayedPostalCode"
    // In this case, delete the 4rd character from displayedPostalCode
    let dashDeleted = false;
    if(
      (currentValue.length >= 4) &&  // At least "〒123"
      (currentValue.indexOf("-") === -1) && // No "-" found
      (currentValue.length === displayedPostalCode.length -1) // The text is one character shorter than before
    ) {
      dashDeleted = true;
    }

    const newPostalCode = dashDeleted ? currentDigits.slice(0, 2) + currentDigits.slice(3, 7) : currentDigits.slice(0, 7);
    //console.log(`currentValue: ${currentValue}, currentValue.length: ${currentValue.length}, currentValue.indexOf("-"): ${currentValue.indexOf("-")}, displayedPostalCode.length: ${displayedPostalCode.length}, postalCode.length: ${postalCode.length}, dashDeleted: ${dashDeleted}, currentDigits: ${currentDigits}, newPostalCode: ${newPostalCode}`)

    setPostalCode(() => {
      PostalCodeFormatter(newPostalCode);
      return newPostalCode;
    });

    // Change the address object to contain the postal code, since the address object is sent to the server
    handleAddressChange("postalCode", newPostalCode);

    // Check if the postal code is complete (7 digits) and fetch address data
    if (newPostalCode.length === 7 && /^\d+$/.test(newPostalCode)) {
      fetchAddressData(newPostalCode);
    }
  };


  function handleAddressChange(field: string, newValue: string | boolean) {
    setAddress( (previousAddress: Address) => ({ ...previousAddress, [field]: newValue }) );
  }


  // Adds 〒 and - as needed to format postal code correctly
  function PostalCodeFormatter(newPostalCode?:string) {

    // If no new postal code is specified, format the existing one.
    if(newPostalCode === undefined) { newPostalCode = postalCode; }

    // Format for an empty string depends on focus or not.
    // When focused, start with the "〒"
    // When not focused, set as empty to display placeholder text
    if(newPostalCode.length === 0) {
      if(postalCodeRef.current === document.activeElement) setDisplayedPostalCode("〒");
      else setDisplayedPostalCode("");
      return;
    }

    if(newPostalCode.length  <  3) {
      setDisplayedPostalCode(`〒${newPostalCode}`);
      return;
    }
    
    const postalCodeStart = newPostalCode.slice(0, 3);
    const postalCodeEnd   = newPostalCode.slice(3, 7);
    setDisplayedPostalCode(`〒${postalCodeStart}-${postalCodeEnd}`);
  }


  async function sendAddress(e: React.FormEvent) {
    e.preventDefault();

    const addressData = {
      ...address,
      customerKey: user?.customerKey,
      addressKey: addressKey,
    };

    await addAddress(addressData);
  }

  return (
    <>
      <div className={styles.newAddressContent}>
        <span className={styles.newAddressX} onClick={() => { setShowNewAddress(false); }}>✖</span>
        <span className="topHeader">新しい住所を追加</span>
        <form className={styles.newAddressForm}>
          <div>
            <span className={styles.subheader}>名前を入力してください<span className={styles.red}>必須</span></span>
            <div className={styles.inputsRow}>
              <input type="text" value={address?.lastName  || ""} placeholder="姓" onChange={(e) => handleAddressChange("lastName", e.target.value)} />
              <input type="text" value={address?.firstName || ""} placeholder="名" onChange={(e) => handleAddressChange("firstName", e.target.value)} />
            </div>
          </div>

          <span className={styles.subheader}>住所<span className={styles.red}>必須</span></span>
          <div className={styles.labeledInput}>
            <input type="text" value={displayedPostalCode} placeholder="〒100-8111" ref={postalCodeRef} onChange={handlePostalCodeChange} onFocus={() => PostalCodeFormatter()} onBlur={() => PostalCodeFormatter()} />
            <span className={styles.inputLabel}>郵便番号</span>
          </div>
          <div className={styles.labeledInput}>
            <select className={fetchingAddress ? styles.shimmering : ""} value={address?.pref || ""} onChange={(e) => handleAddressChange("pref", e.target.value)}>
              <option value="" disabled selected></option>
              {prefectures.map((prefecture) => (
                <option key={prefecture.code} value={prefecture.code}>
                  {prefecture.name}
                </option>
              ))}
            </select>
            <span className={styles.inputLabel}>都道府県</span>
          </div>
          <div className={styles.labeledInput}>
            <input type="text" className={fetchingAddress ? styles.shimmering : ""} placeholder="横浜市" value={address?.city || ""} onChange={(e) => handleAddressChange("city", e.target.value)} />
            <span className={styles.inputLabel}>市区町村</span>
          </div>
          <div>
            <input type="text" className={fetchingAddress ? styles.shimmering : ""} placeholder="港北区新横浜3-8-11" value={address?.ward || ""} onChange={(e) => handleAddressChange("ward", e.target.value)} />
          </div>
          <div>
            <input type="text" className={fetchingAddress ? styles.shimmering : ""} placeholder="メットライフ新横浜ビル" value={address?.address2 || ""} onChange={(e) => handleAddressChange("address2", e.target.value)} />
          </div>
          <div className={styles.inputRow}>
            <span className={styles.subheader}>電話番号</span>
            <input type="text" className={fetchingAddress ? styles.shimmering : ""} placeholder="080-1234-5678" value={address?.phoneNumber || ""} onChange={(e) => handleAddressChange("phoneNumber", e.target.value)} />
          </div>

          <div className="customCheckbox">
            <label className="customCheckbox">
              <input type="checkbox" id="customCheckbox" onChange={(e) => handleAddressChange("defaultAddress", (address.defaultAddress ? false : true))} checked={address.defaultAddress}/>
              <span className="customCheckbox">✓</span>
              デフォルトの住所として設定する
            </label>
          </div>

          <button className={styles.newAddress} onClick={sendAddress}>住所を追加する</button>
          <span className={styles.cancelNewAddress} onClick={() => { setShowNewAddress(false); }}>キャンセルする</span>
        </form>
      </div>
    </>
  );
  }
