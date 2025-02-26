import { useState } from "react";
import { AdminDataType } from "../../types";
import CallAPI from "../../Utilities/CallAPI";
import { LanguageType, getText } from "./translations";

type CouponsProps = {
  adminData: AdminDataType | null;
  loadAdminData: () => void;
  isLoading: boolean;
  language: LanguageType;
};

type CouponFields = {
  couponKey?: number;
  productKey: number | null;
  code?: string; // this is a secret, never sent to the customer
  type: number;
  target: number;
  reward: number;
};

const emptyCoupon: CouponFields = {
  productKey: null,
  code: "",
  type: 1,
  target: 0,
  reward: 0,
};

type CouponFieldKey = keyof CouponFields;

const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

export default function Coupons({ adminData, loadAdminData, language }: CouponsProps) {
  const [showAddCoupon, setShowAddCoupon] = useState<boolean>(false);
  const [newCoupon, setNewCoupon] = useState<CouponFields>(emptyCoupon);

  const coupons = adminData?.coupons;
  const products = adminData?.products;
  if (!coupons || !products) return <span>Loading coupons and products...</span>;

  const couponTypes = [1, 2, 3, 5];
  const couponExplanationJp = (
    <div style={{display: "inline-flex", flexDirection:"column", border:"1px solid #888", borderRadius: "0.5rem", padding: "0.5rem", margin: "0.5rem"}}>
      <span style={{fontSize:"1.5rem"}}>クーポンタイプの説明:</span>
      <div style={{display: "grid", gridTemplateColumns: "10rem 1fr"}}>
        {couponTypes.map((type) => (<><span style={{textAlign:"end", marginRight:"0.5rem", fontWeight: "bold"}}>{couponTypeName(type, "jp")}: </span><span>{couponTypeDescription(type, "X", "Y", null, "jp")}</span></>))}
      </div>
    </div>
  );

  const couponExplanationEn = (
    <div style={{display: "inline-flex", flexDirection:"column", border:"1px solid #888", borderRadius: "0.5rem", padding: "0.5rem", margin: "0.5rem"}}>
      <span style={{fontSize:"1.5rem"}}>Coupon explanation:</span>
      <div style={{display: "grid", gridTemplateColumns: "10rem 1fr"}}>
        {couponTypes.map((type) => (<><span style={{textAlign:"end", marginRight:"0.5rem", fontWeight: "bold"}}>{couponTypeName(type, "en")}: </span><span>{couponTypeDescription(type, "X", "Y", null, "en")}</span></>))}
      </div>
    </div>
  );

  //#region Add coupon
  const addCouponButton = (
    <button onClick={() => {setNewCoupon(emptyCoupon); setShowAddCoupon(true)}}>{getText("addCoupon", language)}</button>
  )

  const numberInputStyle = {
    width: "10rem",
    margin: "1rem 0.5rem",
    fontSize: "1.25rem",
    padding: "1rem",
    backgroundColor: "#fff",
    borderRadius: "0.5rem",
    border: "1px solid #888",
  }

  const addCouponModal = (
    <div style={{position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100}}>
      <div style={{display:"flex", flexDirection:"column", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#fff", padding: "1rem", borderRadius: "0.5rem", minWidth: "50%", minHeight: "90%"}}>
        <h3>{getText("addCoupon", language)}</h3>
        <label>{getText("couponCode", language)}</label>
        <input type="text" placeholder="abc123Code" onChange={handleNewCouponChange} value={newCoupon?.code || ""} name="code" />
        <label>{getText("couponType", language)}</label>
        <select onChange={handleNewCouponChange} value={newCoupon?.type || 1} name="type">
          <option value={1}>{couponTypeName(1, language)}</option>
          <option value={2}>{couponTypeName(2, language)}</option>
          <option value={3}>{couponTypeName(3, language)}</option>
          <option value={5}>{couponTypeName(5, language)}</option>
        </select>
        <label style={{display: (newCoupon?.type == 3 || newCoupon?.type == 5) ? undefined : "none"}} >{getText("couponProduct", language)}</label>
        <select onChange={handleNewCouponChange} value={newCoupon?.productKey || ""} name="productKey" style={{display: newCoupon?.type == 3 ? undefined : "none"}}>
          {products.map((product) => <option key={product.productKey} value={product.productKey}>{product.title}</option>)}
        </select>
        <label>{getText("couponTarget", language)}</label>
        <input type="number" style={numberInputStyle} onChange={handleNewCouponChange} value={newCoupon?.target || 0} name="target" />
        <label>{getText("couponReward", language)}</label>
        <input type="number" style={numberInputStyle} onChange={handleNewCouponChange} value={newCoupon?.reward || 0} name="reward"/>
        <div style={{display:"flex", flexDirection:"row", justifyContent:"space-evenly"}}>
          <button onClick={() => {setShowAddCoupon(false)}}>{getText("cancel", language)}</button>
          <button onClick={() => {handleCouponSave()}}>{getText("create", language)}</button>
        </div>
      </div>
    </div>
  );

  function handleNewCouponChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const key = event.target.name as CouponFieldKey;
    const value = event.target.value;
    console.log(`Setting ${key} to ${value}`);
    if (newCoupon) {
      setNewCoupon({...newCoupon, [key]: value});
    }
  }

  async function handleCouponSave() {
    if (!newCoupon) return;
    const requestBody = {
      token: token,
      coupon: newCoupon,
    };

    const responseData = await CallAPI(requestBody, "adminCouponCreate");
    console.log(responseData);
    setTimeout(() => {
      setShowAddCoupon(false);
      loadAdminData();
    }, 500);
  }

  async function handleCouponDelete(couponKey: number) {
    const requestBody = {
      token: token,
      couponKey: couponKey,
    };

    const responseData = await CallAPI(requestBody, "adminCouponDelete");
    console.log(responseData);
    setTimeout(() => {
      loadAdminData();
    }, 500);
  }
  //#endregion Add coupon


  const couponListHeader = (
    <div style={{display: "flex", flexDirection:"row", backgroundColor:"#9cf", padding:"0.5rem"}}>
      <span style={{display:"flex", fontSize:"1.5rem", width:"30rem"}}>{getText("couponCode", language)}</span>
      <span style={{display:"flex", fontSize:"1.5rem", width:"12rem"}}>{getText("couponType", language)}</span>
      <span style={{display:"flex", fontSize:"1.5rem", width:"12rem"}}>{getText("couponTarget", language)}</span>
      <span style={{display:"flex", fontSize:"1.5rem", width: "6rem"}}>{getText("couponProduct", language)}</span>
      <span style={{display:"flex", fontSize:"1.5rem", width:"12rem"}}>{getText("couponReward", language)}</span>
    </div>
  );

  const couponList = coupons?.map((coupon: CouponFields, index) => {
    const backgroundColor = index % 2 === 0 ? "#bdf" : "#fff";
    return (
      <div key={coupon.couponKey} style={{backgroundColor: backgroundColor, padding:"0.5rem"}}>
        <div style={{display: "flex", flexDirection:"row"}}>
          <span style={{display:"flex", fontSize:"1.5rem", width:"30rem"}}>{coupon.code}</span>
          <span style={{display:"flex", fontSize:"1.5rem", width:"12rem"}}>{couponTypeName(coupon.type, language)}</span>
          <span style={{display:"flex", fontSize:"1.5rem", width:"12rem"}}>{coupon.target}</span>
          <span style={{display:"flex", fontSize:"1.5rem", width: "6rem"}}>{coupon.productKey || getText("none", language)}</span>
          <span style={{display:"flex", fontSize:"1.5rem", width:"12rem", flexGrow: 1}}>{coupon.reward}</span>
          <span style={{display:"flex", justifyContent:"center", alignItems:"center", color: "#800", backgroundColor:"#fbb", width:"2rem", height:"2rem", border:"1px solid #800", borderRadius:"0.5rem"}} onClick={() => {if(coupon.couponKey) handleCouponDelete(coupon.couponKey)}}>X</span>
        </div>
        <div>{getText("couponExplanation", language)}: <br/>{couponDataToExplanation(coupon)}</div>
      </div>
    )
  });

  function couponTypeName(type: number, language: "en" | "jp"): string {
    let typeName = "";
    switch (type) {
      case 1:
        typeName = language === "en" ? "Yen Discount" : language === "jp" ? "~~¥ 割引" : "Unknown language";
        break;
      case 2:
        typeName = language === "en" ? "Percent Discount" : language === "jp" ? "~~% 割引" : "Unknown language";
        break;
      case 3:
        typeName = language === "en" ? "Product Discount" : language === "jp" ? "製品 ~~¥ 割引" : "Unknown language";
        break;
      case 5:
        typeName = language === "en" ? "Quantity Discount" : language === "jp" ? "製品 ~~% 割引" : "Unknown language";
        break;
      default:
        typeName = "Unknown coupon type";
    }
    return typeName;
  }

  function couponTypeDescription(type: number, target: number | string, reward: number | string, productKey: number | null, language: "en" | "jp"): string {
    let couponDescription = "";
    switch (type) {
      case 1:
        couponDescription =
          language === "en" ? `If the customer spends at least ¥${target}, they will get a discount of ¥${reward}.` :
          language === "jp" ? `顧客が${target}円以上購入すると、${reward}円の割引が受けられます。` :
          "Unknown language";
        break;
      case 2:
        couponDescription =
          language === "en" ? `If the customer spends at least ¥${target}, they will get a discount of ${reward}%.` :
          language === "jp" ? `顧客が${target}円以上購入すると、${reward}%の割引が受けられます。` :
          "Unknown language";
        break;
      case 3:
        couponDescription =
          language === "en" ? `If the customer buys at least ${target} of product [${products?.find(product => product.productKey === productKey)?.title || " ? "}], they will get a discount of ¥${reward}.` :
          language === "jp" ? `顧客が「${products?.find(product => product.productKey === productKey)?.title || " (製品) "}」を${target}個以上購入すると、${reward}円の割引が受けられます。` :
          "Unknown language";
        break;
      case 5:
        couponDescription =
          language === "en" ? `For the ${target} most expensive products of any type that the customer buys, they will get a discount of ${reward}% off those items.` :
          language === "jp" ? `顧客が購入する商品の中で、最も高価な${target}個の商品に対して${reward}%の割引が適用されます。` :
          "Unknown language";
        break;
      default:
        couponDescription = "Unknown coupon type";
    }
    return couponDescription;
  }

  function couponDataToExplanation(coupon: CouponFields) {
    switch(coupon.type) {
      case 1:
        if (language === "jp") return `顧客が ${coupon.target} 円以上お買い上げの場合、 ${coupon.reward} 円割引となります。`;
        if (language === "en") return `If a customer spends ${coupon.target}円 or more, they get a discount of ${coupon.reward}円.`;
        return "Unknown language";
      case 2:
        if (language === "jp") return `顧客が ${coupon.target} 円以上お買い上げの場合、 ${coupon.reward} %割引となります。`;
        if (language === "en") return `If a customer spends ${coupon.target}円 or more, they get a discount of ${coupon.reward}%.`;
        return "Unknown language";
      case 3:
        const product = products?.find((product) => product.productKey === coupon.productKey) || {title: "Unknown product"};
        if (language === "jp") return `顧客が製品 ${coupon.productKey} を ${coupon.target} 個以上購入すると、 ${coupon.reward} 円の割引となります。製品 ${coupon.productKey} は: ${product.title} です。`;
        if (language === "en") return `If a customer buys ${coupon.target} or more of product ${coupon.productKey}, they get a discount of ${coupon.reward}円. Product ${coupon.productKey} is: ${product.title}.`;
        return "Unknown language";
      default:
        return "Unknown coupon type";
    }
  
  }

  return (
    <div>
      {showAddCoupon && addCouponModal}
      <h1>{getText("coupons", language)}</h1>
      {language === "jp" ? couponExplanationJp : language === "en" ? couponExplanationEn : "Unknown language"}
      <br />
      {addCouponButton}
      {couponListHeader}
      {couponList}
    </div>
  )
}