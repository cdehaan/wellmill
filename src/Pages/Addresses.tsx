import React, { useContext, useEffect, useState } from "react";

import { UserContext } from "../Contexts/UserContext";
import { useUserData } from "../Hooks/useUserData";

import '../App.css';
import styles from "./addresses.module.css"
import Header from "./Header";
import Footer from "./Footer";
import NewAddress from "./NewAddress";

import { AddressType } from "../types";
import { prefectures } from "../Utilities/addressData"
import { Link } from "react-router-dom";


const breadcrumbs = [
  { text: "ホーム", url: "/" },
  { text: "マイページ", url: "/account" },
  { text: "お届け先住所", url: "/address" },
];

function Addresses() {
  const { user, userLoading } = useContext(UserContext);
  const { deleteAddress } = useUserData();
  const addresses = user ? user.addresses : [];

  const [showNewAddress, setShowNewAddress] = useState(false);
  const [selectedAddressKey, setSelectedAddressKey] = useState<number | null>(null);

  // Prevents scrolling while the Checkout modal is open
  useEffect(() => {
    function disableBodyScroll() { document.body.classList.add('no-scroll');    };
    function enableBodyScroll()  { document.body.classList.remove('no-scroll'); };

    if (showNewAddress) { disableBodyScroll(); }
    else                { enableBodyScroll(); }

    // Allow scrolling when the component is unmounted
    return () => { enableBodyScroll(); };
  }, [showNewAddress]);

  

  function GenerateAddressBox(address: AddressType | undefined) {
    if(address === undefined) return null;
    const prefectureName = prefectures.find(prefecture => prefecture.code.toString() === address.pref)?.name;
    const addressKey = (address?.addressKey !== undefined) ? address.addressKey : null;
    const editButton = addressKey ? <span className={styles.addressAction} onClick={() => { setShowNewAddress(true); setSelectedAddressKey(addressKey); }}>変更する</span> : null;
    // eslint-disable-next-line no-restricted-globals
    const deleteButton = addressKey ? <span className={`${styles.addressAction} ${styles.deleteAddress}`} onClick={() => { if(confirm("このアドレスを削除しますか?")) {deleteAddress(addressKey)} }}>削除する</span> : null;
    return(
      <div className={styles.addressBox}>
        <span>{address.lastName} {address.firstName}</span>
        <span>〒{address.postalCode?.toString().slice(0,3)}-{address.postalCode?.toString().slice(3,7)}</span>
        <span>{prefectureName} {address.city} {address.ward} {address.address2}</span>
        <div className={styles.addressActions}>{editButton}{deleteButton}</div>
      </div>
    )
  }

  const loadingAddressesMessage = (
    <span className={styles.listMessage}>住所を読み込んでいます</span>
  )

  const noAddressesMessage = (
    <span className={styles.listMessage}>登録されている住所はありません</span>
  )

  const defaultAddress = user?.addresses?.find(address => {return address.defaultAddress === true});
  const defaultAddressBox = GenerateAddressBox(defaultAddress);
  const defaultAddressContent = (
    <>
    <span className={styles.header}>デフォルトの住所</span>
    {defaultAddressBox}
    </>
  )

  const otherAddresses = user?.addresses?.filter(address => address.defaultAddress === false) || [];
  const otherAddressesBoxes = otherAddresses.map(address => { return GenerateAddressBox(address); });
  const otherAddressesContent = (
    <>
      <div className={styles.otherAddresses}>他の住所</div>
      {otherAddressesBoxes}
    </>
  )

  const subdomain = window.location.hostname.split('.')[0];
  const keyName = subdomain === 'stage' ? 'sampleIDStage' : 'sampleID';
  const sampleId = localStorage.getItem(keyName);
  const suggestRegister = (sampleId && user && user.addresses.length > 0 && false);
  const suggestRegisterMessage = (
    <div className={styles.registerMessage}>
      <span>サンプルを登録することができます。</span>
      <Link to="/sample-registration"><button>サンプル登録</button></Link>
    </div>
  )

  return(
    <>
      {showNewAddress && <NewAddress addressKey={selectedAddressKey} setShowNewAddress={setShowNewAddress} />}
      <div className="topDots" />
      <Header breadcrumbs={breadcrumbs} />
      <span className="topHeader">お届け先住所</span>
      {suggestRegister ? suggestRegisterMessage : null}
      {userLoading === false && (<button onClick={() => {setSelectedAddressKey(null); setShowNewAddress(true)}}>新しい住所を追加</button>)}
      <div className={styles.contentWrapper}>
        {userLoading === true && loadingAddressesMessage}
        {userLoading === false && addresses?.length === 0 && noAddressesMessage}
        {(addresses?.length || 0)  >  0 && defaultAddressContent}
        {(addresses?.length || 0)  >  1 && otherAddressesContent}
      </div>
      <Footer />
    </>
  )
}

export default Addresses;