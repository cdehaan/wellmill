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
  codeStem: "WMCoupon-",
  isCodePrefixed: true,
  jumbleLength: 0,
  isUnambiguous: true,
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
  const [csvCodes, setCsvCodes] = useState<string>("");
  const [quantityMemory, setQuantityMemory] = useState<number>(1);

  const couponGroups = adminData?.couponGroups;
  const products = adminData?.products;

  const reasonableTextRegex = /^[0-9a-zA-Z\s\-%.!$&()*+,\/:;<=>?@[\]^_{|}~]+$/;

  if (!couponGroups || !products) return <span>Loading coupon groups and products...</span>;

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

  const handleCSVChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const trimValue = event.target.value.replace(/\s+/g, '').replace(/,/g, ', ');
    setCsvCodes(trimValue);
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = (event.target?.result as string).replace(/\s+/g, '').replace(/,/g, ', '); // remove all spaces, except one after a comma
      if(!reasonableTextRegex.test(contents)) {
        console.error("Invalid CSV file contents");
        return;
      }

      if (csvCodes && window.confirm('The text input already has content. Do you want to overwrite it?')) {
        setCsvCodes(contents);
      } else if (!csvCodes) {
        setCsvCodes(contents);
      }
    }
    reader.readAsText(file);
  };

  const handleStemLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (newCouponGroup) {
      setNewCouponGroup({...newCouponGroup, isCodePrefixed: value === "before"});
    } else {
      setNewCouponGroup({...emptyCouponGroup, isCodePrefixed: value === "before"});
    }
  }


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

  const requiredCombinations = ((newCouponGroup?.quantity || 1) * ((newCouponGroup?.quantity || 1) - 1)) / (2 * 0.01);
  const suggestedJumbleLength = Math.max(5, Math.ceil(Math.log(requiredCombinations) / Math.log(56)));
  const exampleCodes = Array.from({length: 3}, (_, i) => {
    const code = `${newCouponGroup.isCodePrefixed ? newCouponGroup.codeStem : ""}${"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9".substring(i*6, suggestedJumbleLength+i*6)}${newCouponGroup.isCodePrefixed ? "" : newCouponGroup.codeStem}`;
    return code;
  });

  const csvCouponQuantity = csvCodes.split(',').map(code => code.trim()).filter(code => code.length > 0).length;
  const productSelectDisabled = parseInt((document.getElementById("couponTypeSelect") as HTMLInputElement)?.value ?? 0) !== 3;

  const numberInputStyle = {
    height: "4rem",
    boxsizing: "border-box",
    margin: "0 0.5rem",
    fontSize: "1.25rem",
    padding: "0 1rem",
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
      <div style={{display:"flex", flexDirection:"column", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxHeight:"90%", overflow:"scroll", backgroundColor: "#fff", padding: "1rem", borderRadius: "0.5rem"}}>
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
          <div style={{display: "flex", flexDirection:"column", flexGrow: 1}}>
            <div style={{padding: "0.25rem", background: newCouponGroup.maxUses === null ? "#ccc" : "#fff", color: newCouponGroup.maxUses === null ? "#888" : "#000"}}>
              <input type="radio" id="limitedUses" name="couponUsage" value="limited" defaultChecked onClick={() => {
                if (newCouponGroup.maxUses === null) {
                  setNewCouponGroup(prev => {
                    return {...prev, maxUses: quantityMemory}
                  });
                }
              }} style={{ marginRight: '0.5rem' }} />
              <input type="number" id="maxUses" disabled={newCouponGroup.maxUses === null} style={numberInputSmallStyle} onChange={handleNewCouponGroupChange} value={newCouponGroup?.maxUses || quantityMemory} name="maxUses" />
              <label>{getText("couponGroupMaxUsesSuffix", language)}</label>
            </div>
            <div style={{padding: "0.25rem", background: newCouponGroup.maxUses === null ? "#fff" : "#ccc", color: newCouponGroup.maxUses === null ? "#000" : "#888"}}>
              <input type="radio" id="unlimitedUses" name="couponUsage" value="unlimited" onClick={() => {setQuantityMemory(parseInt((document.getElementById("maxUses") as HTMLInputElement).value)); setNewCouponGroup(prev => { return {...prev, maxUses: null}})}} style={{ marginRight: '0.5rem' }} />
              <label>{getText("couponGroupMaxUsesSuffix", language)}</label>
            </div>
          </div>
        </div>

        <div style={{...questionDivStyle, flexDirection:"column", alignItems: "start", gap:"1rem", width: "100%"}}>
          <label>{getText("couponGroupCodeSource", language)}</label>

          <div style={{width:"100%", padding: "0.5rem", background: codeSourceRadioValue === "csv" ? "#fff": "#ccc", color: codeSourceRadioValue === "csv" ? "#000": "#888" }}>
            <input type="radio" id="csv" name="codeSource" value="csv" onChange={handleRadioChange} style={{ marginRight: '0.5rem' }} defaultChecked />
            <label>{getText("couponGroupCodesProvided", language)}</label>
            <textarea disabled={codeSourceRadioValue !== "csv"} style={{width: "100%", height: "5rem", margin: 0, padding:"0.5rem", fontSize:"1rem", background:"rgba(255,255,255,0.5"}} onChange={handleCSVChange} value={csvCodes} placeholder="coupon123, coupon321, coupon278" />
            <div>
              <input disabled={codeSourceRadioValue !== "csv"} type="file" accept=".csv,.txt" onChange={handleCsvFileChange} />
              <span style={{fontSize:"0.75rem"}}>{getText("couponGroupUploadExplanation", language)}</span>
            </div>
          </div>

          <div style={{width:"100%", padding: "0.5rem", background: codeSourceRadioValue === "generated" ? "#fff": "#ccc", color: codeSourceRadioValue === "generated" ? "#000": "#888" }}>
            <input type="radio" id="generated" name="codeSource" value="generated" onChange={handleRadioChange} style={{ marginRight: '0.5rem' }} />
            <label>{getText("couponGroupCodesGenerated", language)}</label>
            <div style={{display:"flex", alignItems:"center"}}>
              <label>{getText("couponGroupStemPrefix", language)}</label>
              <select disabled={codeSourceRadioValue !== "generated"} onChange={handleStemLocationChange} style={{padding:"0.5rem", width:"unset", fontSize:"unset", margin: 0, marginLeft: "0.5rem", color: codeSourceRadioValue === "generated" ? "#000": "#888" }}>
                <option value="before">{getText("couponGroupStemBefore", language)}</option>
                <option value="after">{getText("couponGroupStemAfter", language)}</option>
              </select>
              <input disabled={codeSourceRadioValue !== "generated"} type="text" style={{...numberInputSmallStyle, width:"10rem"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.codeStem || ""} name="codeStem" />
              <label>{getText("couponGroupStemSuffix", language)}</label>
            </div>
            <label>{getText("couponGroupGeneratedExamples", language)}</label>
            <ul>
              {exampleCodes.map((code, i) => <li key={i}>{code}</li>)}
            </ul>
          </div>
        </div>


        <div style={{display:"grid", gridTemplateColumns:"33% 33% 34%"}}>
          <div style={{display: "flex", flexDirection:"column"}}>
          <label>{getText("couponType", language)}</label>
            <select id="couponTypeSelect" onChange={handleNewCouponGroupChange} value={newCouponGroup?.type || 1} name="type" style={{marginTop: 0}}>
              <option value={1}>{getText("couponYenDiscount", language)}</option>
              <option value={2}>{getText("couponPercentDiscount", language)}</option>
              <option value={3}>{getText("couponProductDiscount", language)}</option>
            </select>
          </div>
          <div style={{display: "flex", flexDirection:"column"}}>
            <label>{getText("couponTarget", language)}</label>
            <input type="number" style={numberInputStyle} onChange={handleNewCouponGroupChange} value={newCouponGroup?.target || 0} name="target" />
          </div>
          <div style={{display: "flex", flexDirection:"column"}}>
            <label>{getText("couponReward", language)}</label>
            <input type="number" style={numberInputStyle} onChange={handleNewCouponGroupChange} value={newCouponGroup?.reward || 0} name="reward"/>
          </div>
        </div>
        <label>{getText("couponProduct", language)}</label>
        <select disabled={productSelectDisabled} onChange={handleNewCouponGroupChange} value={newCouponGroup?.productKey || ""} name="productKey" style={{marginTop: 0, background: productSelectDisabled ? "#ccc" : "#fff"}}>
          {products.map((product) => <option key={product.productKey} value={product.productKey}>{product.title}</option>)}
        </select>
        <button onClick={() => {setShowAddCouponGroup(false)}}>{getText("cancel", language)}</button>
      </div>
    </div>
  );

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