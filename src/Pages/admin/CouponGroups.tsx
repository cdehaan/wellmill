import { useState } from "react";
import { AdminDataType } from "../../types";
import CallAPI from "../../Utilities/CallAPI";
import { LanguageType, getText } from "./translations";

type CouponGroupsProps = {
  adminData: AdminDataType | null;
  loadAdminData: () => void;
  language: LanguageType;
};

type CouponGroupFields = {
  productKey: number | null,
  name: string,
  quantity: number,
  codeStem: string | null,
  isCodePrefixed: boolean | null,
  jumbleLength: number | null,
  isUnambiguous: boolean | null,
  type: number,
  target: number,
  reward: number,
  maxUses: number | null,
};

const emptyCouponGroup: CouponGroupFields = {
  productKey: null,
  name: "",
  quantity: 1,
  codeStem: "",
  isCodePrefixed: false,
  jumbleLength: 0,
  isUnambiguous: false,
  type: 1,
  target: 0,
  reward: 0,
  maxUses: 1,
};

type CouponGroupFieldKey = keyof CouponGroupFields;

const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

export default function CouponGroups({ adminData, loadAdminData, language }: CouponGroupsProps) {
  const [showAddCouponGroup, setShowAddCouponGroup] = useState<boolean>(false);   
  const [newCouponGroup, setNewCouponGroup] = useState<CouponGroupFields>(emptyCouponGroup);
  const [codeSourceRadioValue, setCodeSourceRadioValue] = useState<string>("csv");

  const couponGroups = adminData?.couponGroups;
  const products = adminData?.products;
  if (!couponGroups || !products) return <span>Loading coupon groups and products...</span>;

  const couponExplanationJp = (
    <div style={{display: "inline-flex", flexDirection:"column", border:"1px solid #888", borderRadius: "0.5rem", padding: "0.5rem", margin: "0.5rem"}}>
      <span style={{fontSize:"1.5rem"}}>クーポンタイプの説明:</span>
      <div><span> - クーポンタイプ 1: </span><span> 顧客が X 円以上お買い上げの場合、 Y 円割引となります。</span></div>
      <div><span> - クーポンタイプ 2: </span><span> 顧客が X 円以上お買い上げの場合、 Y %割引となります。</span></div>
      <div><span> - クーポンタイプ 3: </span><span> 顧客が製品 A を B 個以上購入すると、C 円の割引となります</span></div>
    </div>
  );

  const couponExplanationEn = (
    <div style={{display: "inline-flex", flexDirection:"column", border:"1px solid #888", borderRadius: "0.5rem", padding: "0.5rem", margin: "0.5rem"}}>
      <span style={{fontSize:"1.5rem"}}>Coupon type explanation:</span>
      <div><span> - Coupon type 1: </span><span> If a customer spends X yen or more, they get a discount of Y yen.</span></div>
      <div><span> - Coupon type 2: </span><span> If a customer spends X yen or more, they get a discount of Y%.</span></div>
      <div><span> - Coupon type 3: </span><span> If a customer buys B or more of product A, they get a discount of C yen.</span></div>
    </div>
  );

  //#region Add coupon group
  const addCouponGroupButton = (
    <button onClick={() => setShowAddCouponGroup(true)}>{getText("addCouponGroup", language)}</button>
  );

  const numberInputStyle = {
    width: "10rem",
    margin: "0 0.5rem",
    fontSize: "1.25rem",
    padding: "1rem",
    backgroundColor: "#fff",
    borderRadius: "0.5rem",
    border: "1px solid #888",
  }
  const numberInputSmallStyle = {
    width: "4rem",
    backgroundColor: "#fff",
    borderRadius: "0.5rem",
    border: "1px solid #888",
    padding: "0.2rem",
    fontSize: "1.25rem",
    margin: "0 0.5rem",
  }
  const questionDivStyle = {
    display: "flex",
    alignItems: "center",
    padding: "0.5rem 0",
    borderBottom: "1px dotted #888",
  }

  const addCouponGroupModal = (
    <div style={{position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100}}>
      <div style={{display:"flex", flexDirection:"column", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#fff", padding: "1rem", borderRadius: "0.5rem"}}>
        <h3>{getText("addCouponGroup", language)}</h3>

        <div style={questionDivStyle}>
          <label>{getText("couponGroupName", language)}</label>
          <input type="text" style={{...numberInputSmallStyle, width:"10rem"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.name || ""} name="name" />
          <span style={{fontSize: "0.75rem"}}>{getText("couponGroupNameRules", language)}</span>
        </div>

        <div style={questionDivStyle}>
          <label>{getText("couponGroupQuantityPrefix", language)}</label>
          <input type="number" style={numberInputSmallStyle} onChange={handleNewCouponGroupChange} value={newCouponGroup?.quantity || 1} name="quantity" />
          <label>{getText("couponGroupQuantitySuffix", language)}</label>
        </div>

        <div style={questionDivStyle}>
          <label>{getText("couponGroupMaxUsesPrefix", language)}</label>
          <div>
            <div>
              <input type="radio" id="limitedUses" name="couponUsage" value="limited" defaultChecked onChange={handleNewCouponGroupChange} style={{ marginRight: '0.5rem' }} />
              <input type="number" style={numberInputSmallStyle} onChange={handleNewCouponGroupChange} value={newCouponGroup?.maxUses || 1} name="maxUses" />
              <label>{getText("couponGroupMaxUsesSuffix", language)}</label>
            </div>
            <div>
              <input type="radio" id="unlimitedUses" name="couponUsage" value="unlimited" onChange={handleNewCouponGroupChange} style={{ marginRight: '0.5rem' }} />
              <label>{getText("couponGroupMaxUsesSuffix", language)}</label>
            </div>
          </div>
        </div>

        <div style={{...questionDivStyle, flexDirection:"column", alignItems: "start"}}>
          <label>{getText("couponGroupCodeSource", language)}</label>

          <div style={codeSourceRadioValue === "csv" ? {background: "#fff"} : {background: "#ccc"}}>
            <input type="radio" id="csv" name="codeSource" value="csv" onChange={handleRadioChange} style={{ marginRight: '0.5rem' }} defaultChecked />
            <label>{getText("couponGroupCodesProvided", language)}</label>
          </div>

          <div style={codeSourceRadioValue === "generated" ? {background: "#fff"} : {background: "#ccc"}}>
            <input type="radio" id="generated" name="codeSource" value="generated" onChange={handleRadioChange} style={{ marginRight: '0.5rem' }} />
            <label>{getText("couponGroupCodesGenerated", language)}</label>
          </div>
        </div>


        <label>{getText("couponProduct", language)}</label>
        <select onChange={handleNewCouponGroupChange} value={newCouponGroup?.productKey || ""} name="productKey" style={{marginTop: 0}}>
          {products.map((product) => <option key={product.productKey} value={product.productKey}>{product.title}</option>)}
        </select>
        <label>{getText("couponType", language)}</label>
        <select onChange={handleNewCouponGroupChange} value={newCouponGroup?.type || 1} name="type" style={{marginTop: 0}}>
          <option value={1}>{getText("couponYenDiscount", language)}</option>
          <option value={2}>{getText("couponPercentDiscount", language)}</option>
          <option value={3}>{getText("couponProductDiscount", language)}</option>
        </select>
        <div style={{display:"grid", gridTemplateColumns:"50% 50%"}}>
          <div style={{display: "flex", flexDirection:"column"}}>
            <label>{getText("couponTarget", language)}</label>
            <input type="number" style={numberInputStyle} onChange={handleNewCouponGroupChange} value={newCouponGroup?.target || 0} name="target" />
          </div>
          <div style={{display: "flex", flexDirection:"column"}}>
            <label>{getText("couponReward", language)}</label>
            <input type="number" style={numberInputStyle} onChange={handleNewCouponGroupChange} value={newCouponGroup?.reward || 0} name="reward"/>
          </div>
        </div>
        <button onClick={() => {setShowAddCouponGroup(false)}}>{getText("cancel", language)}</button>
      </div>
    </div>
  );

  function handleNewCouponGroupChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const key = event.target.name as CouponGroupFieldKey;
    const value = event.target.value;
    console.log(`Setting ${key} to ${value}`);
    if (newCouponGroup) {
      setNewCouponGroup({...newCouponGroup, [key]: value});
    } else {
      setNewCouponGroup({...emptyCouponGroup, [key]: value});
    }
  }

  function handleRadioChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCodeSourceRadioValue(event.target.value);
  };

  return (
    <div>
      {showAddCouponGroup ? addCouponGroupModal : null}
      <h2>{getText("coupongroups", language)}</h2>
      {language === "jp" ? couponExplanationJp : language === "en" ? couponExplanationEn : "Unknown language"}
      <br />
      {addCouponGroupButton}
    </div>
  );
}