import { useEffect, useState } from "react";
import { AdminDataType } from "../../types";
import { LanguageType, getText } from "./translations";
import { text } from "stream/consumers";

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

const defaultCouponGroup: CouponGroupFields = {
  productKey: null,
  name: "",
  quantity: 10,
  codeStem: "WMCoupon-",
  isCodePrefixed: true,
  jumbleLength: 5,
  isUnambiguous: true,
  type: 1,
  target: 100,
  reward: 10,
  maxUses: 1,
};

const supportManualCodeEntry = false;

//const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

export default function CouponGroups({ adminData, loadAdminData, language }: CouponGroupsProps) {
  const [showAddCouponGroup, setShowAddCouponGroup] = useState<boolean>(false);   
  const [newCouponGroup, setNewCouponGroup] = useState<CouponGroupFields>(defaultCouponGroup);
  const [codeSourceRadioValue, setCodeSourceRadioValue] = useState<string>("generated"); // old value: "csv"
  const [csvCodes, setCsvCodes] = useState<string>("");
  const [quantityMemory, setQuantityMemory] = useState<number>(1);

  const [codeTextareaError, setCodeTextareaError] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const couponGroups = adminData?.couponGroups;
  const products = adminData?.products;

  //const reasonableTextRegex = /[^\w!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?\s]/;
  const reasonableTextRegex = /^[0-9a-zA-Z\s\-%.!$&()*+,/:;<=>?@[\]^_{|}~]+$/;

  function handleToggleDetails () {
    if (codeSourceRadioValue !== "generated" || isDetailsOpen) setIsDetailsOpen(false);
  }

  useEffect(() => {
    if (codeSourceRadioValue !== "generated") {
      setIsDetailsOpen(false);
    }
  }, [codeSourceRadioValue]);

  if (!couponGroups || !products) return <span>Loading coupon groups and products...</span>;


  // This accepts a new value for any field in newCouponGroup
  // If the field is "quantity", it will also update the jumbleLength field
  // If the field needs to be a number, it is converted to a number
  const numberValues = ["productKey", "quantity", "jumbleLength", "type", "target", "reward", "maxUses"];
  function handleNewCouponGroupChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const key = event.target.name as keyof CouponGroupFields;
    let value: string | number = event.target.value;
    console.log(`Setting ${key} to ${value}`);
    if (key === "quantity") {
      const couponQuantity = parseInt(value);
      if (!Number.isInteger(couponQuantity) || couponQuantity < 1) {
        console.log("Invalid quantity");
        return;
      }
      const minimumJumbleLength = calculateMinimumJumbleLength(couponQuantity);
      if (newCouponGroup) {
        setNewCouponGroup({...newCouponGroup, quantity: couponQuantity, jumbleLength: Math.max(newCouponGroup.jumbleLength || 5, minimumJumbleLength)});
      } else {
        setNewCouponGroup({...defaultCouponGroup, quantity: couponQuantity, jumbleLength: minimumJumbleLength});
      }
    } else {
      if (numberValues.includes(key)) {
        value = Number(value);
        if (isNaN(value)) {
          console.log("Invalid number");
          return;
        }
      }
      if (newCouponGroup) {
        setNewCouponGroup({...newCouponGroup, [key]: value});
      } else {
        setNewCouponGroup({...defaultCouponGroup, [key]: value});
      }  
    }
  }


  function handleRadioChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCodeSourceRadioValue(event.target.value);
  };

  const handleCSVChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if(event.target.value.length > 10000000) {
      setCodeTextareaError("Code error, too many codes entered into textarea.");
      return;
    }

    // doing validation on the fly is likely to annoy users, or cause unrepairable errors
    //const trimValue = event.target.value.replace(/\s+/g, '').replace(/,/g, ', ');
    //Check if content is valid csv and sets error message if needed
    //if (!validateCsvText(trimValue)) { return };

    setCsvCodes(event.target.value);
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCodeTextareaError("Error opening file.");
      return;
    }

    // Check if file size exceeds 100 MB
    if (file.size > 100 * 1024 * 1024) {
      setCodeTextareaError("File size exceeds 100 MB, too large to process.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      // remove all spaces, then add one after each comma
      let contents = (event.target?.result as string).replace(/\s+/g, '').replace(/,/g, ', ');

      // Check if content is valid csv and sets error message if needed
      if (!validateCsvText(contents)) { return };

      if (csvCodes && window.confirm('The text input already has content. Do you want to overwrite it?')) {
        setCsvCodes(contents);
      } else if (!csvCodes) {
        setCsvCodes(contents);
      }
    }
    reader.readAsText(file);
  };

  const validateCsvText = (text: string) => {
    const lines = text.split('\n');
    const seenValues = new Set<string>();
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const values = line.split(',');

      for (let columnIndex = 0; columnIndex < values.length; columnIndex++) {
        const value = values[columnIndex].trim();

        // Check for invalid characters
        if (!reasonableTextRegex.test(value)) {
          setCodeTextareaError(`Code error, found an invalid value in "${value}" at line ${lineIndex + 1}, code ${columnIndex + 1}`);
          return false;
        }

        // Check for overly long values
        if (value.length > 50) {
          setCodeTextareaError(`Code error, found a long code ${value.substring(0, 50)} at line ${lineIndex + 1}, column ${columnIndex + 1}`);
          return false;
        }

        // Check for duplicate values
        if (seenValues.has(value)) {
          setCodeTextareaError(`Code error, found duplicate code ${value} at line ${lineIndex + 1}, column ${columnIndex + 1}`);
          return false;
        }

        seenValues.add(value);
      }
    }
    return true;
  }

  const handleStemLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (newCouponGroup) {
      setNewCouponGroup({...newCouponGroup, isCodePrefixed: value === "before"});
    } else {
      setNewCouponGroup({...defaultCouponGroup, isCodePrefixed: value === "before"});
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

  const minimumJumbleLength = calculateMinimumJumbleLength(newCouponGroup.quantity);
  const exampleCodes = Array.from({length: 3}, (_, i) => {
    const code = `${newCouponGroup.isCodePrefixed ? newCouponGroup.codeStem : ""}${"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9".substring(i*6, (Number(newCouponGroup?.jumbleLength) || 5)+i*6)}${newCouponGroup.isCodePrefixed ? "" : newCouponGroup.codeStem}`;
    return code;
  });

  const csvCouponQuantity = csvCodes ? csvCodes.split(',').map(code => code.trim()).filter(code => code.length > 0).length : 0;
  const productSelectDisabled = parseInt((document.getElementById("couponTypeSelect") as HTMLInputElement)?.value ?? 0) !== 3;

  let couponDescription = "";
  switch (newCouponGroup.type) {
    case 1:
      couponDescription =
        language === "en" ? `If the customer spends at least ¥${newCouponGroup.target}, they will get a discount of ¥${newCouponGroup.reward}.` :
        language === "jp" ? `顧客が${newCouponGroup.target}円以上購入すると、${newCouponGroup.reward}円の割引が受けられます。` :
        "Unknown language";
      break;
    case 2:
      couponDescription =
        language === "en" ? `If the customer spends at least ¥${newCouponGroup.target}, they will get a discount of ${newCouponGroup.reward}%.` :
        language === "jp" ? `顧客が${newCouponGroup.target}円以上購入すると、${newCouponGroup.reward}%の割引が受けられます。` :
        "Unknown language";
      break;
    case 3:
      couponDescription =
        language === "en" ? `If the customer buys at least ${newCouponGroup.target} of product [${products.find(product => product.productKey === newCouponGroup.productKey)?.title || " ? "}], they will get a discount of ¥${newCouponGroup.reward}.` :
        language === "jp" ? `顧客が「${products.find(product => product.productKey === newCouponGroup.productKey)?.title || " ? "}」を${newCouponGroup.target}個以上購入すると、${newCouponGroup.reward}円の割引が受けられます。` :
        "Unknown language";
      break;
    case 5:
      couponDescription =
        language === "en" ? `For the ${newCouponGroup.target} most expensive products of any type that the customer buys, they will get a discount of ${newCouponGroup.reward}% off those items.` :
        language === "jp" ? `顧客が購入する商品の中で、最も高価な${newCouponGroup.target}個の商品に対して${newCouponGroup.reward}%の割引が適用されます。` :
        "Unknown language";
      break;
    default:
      couponDescription = "Unknown coupon type";
  }

  const style = {
    numberInput: {
      height: "4rem",
      boxSizing: "border-box", 
      margin: "0 0.5rem",
      fontSize: "1.25rem",
      padding: "0 1rem",
      backgroundColor: "#fff",
      borderRadius: "0.5rem",
      border: "1px solid #888",
    }, 
    numberInputSmall: {
      width: "4rem",
      height: "2rem",
      backgroundColor: "#fff",
      borderRadius: "0.5rem",
      border: "1px solid #888",
      padding: "0 0.2rem",
      fontSize: "1.25rem",
      margin: "0 0.5rem",
    }, 
    questionDiv: {
      display: "flex",
      alignItems: "center",
      padding: "0.5rem 0",
      borderBottom: "1px dotted #888",
    }, 
    questionLabel: {
      minWidth: "8rem",
    }, 
    couponFunctionalityHeader: {
      fontSize: "1rem",
      padding: "0 1rem",
    }
  };

  const addCouponGroupModal = (
    <div style={{position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.80)", zIndex: 100}}>
      <div style={{display:"flex", flexDirection:"column", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", height:"90%", width:"50%", overflow:"scroll", backgroundColor: "#fff", padding: "1rem", borderRadius: "0.5rem"}}>
        <h3>{getText("addCouponGroup", language)}</h3>

        <div style={style.questionDiv}>
          <label style={style.questionLabel}>{getText("couponGroupName", language)}</label>
          <input type="text" style={{...style.numberInputSmall, width:"10rem"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.name || ""} name="name" />
          <span style={{fontSize: "0.75rem"}}>{getText("couponGroupNameRules", language)}</span>
        </div>

        <div style={style.questionDiv}>
          <label style={style.questionLabel}>{getText("couponGroupQuantityPrefix", language)}</label>
          <input type="number" style={{...style.numberInputSmall, width:"8rem"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.quantity || 1} name="quantity" />
          <label>{getText("couponGroupQuantitySuffix", language)}</label>
        </div>

        <div style={style.questionDiv}>
          <label style={style.questionLabel}>{getText("couponGroupMaxUsesPrefix", language)}</label>
          <div style={{display: "flex", flexDirection:"column", flexGrow: 1}}>
            <div style={{padding: "0.25rem", background: newCouponGroup.maxUses === null ? "#ccc" : "#fff", color: newCouponGroup.maxUses === null ? "#888" : "#000"}}>
              <input type="radio" id="limitedUses" name="couponUsage" value="limited" defaultChecked onClick={() => {
                if (newCouponGroup.maxUses === null) {
                  setNewCouponGroup(prev => {
                    return {...prev, maxUses: quantityMemory}
                  });
                }
              }} style={{ marginRight: '0.5rem' }} />
              <input type="number" id="maxUses" disabled={newCouponGroup.maxUses === null} style={style.numberInputSmall} onChange={handleNewCouponGroupChange} value={newCouponGroup?.maxUses || quantityMemory} name="maxUses" />
              <label>{getText("couponGroupMaxUsesSuffix", language)}</label>
            </div>
            <div style={{padding: "0.25rem", background: newCouponGroup.maxUses === null ? "#fff" : "#ccc", color: newCouponGroup.maxUses === null ? "#000" : "#888"}}>
              <input type="radio" id="unlimitedUses" name="couponUsage" value="unlimited" onClick={() => {setQuantityMemory(parseInt((document.getElementById("maxUses") as HTMLInputElement).value)); setNewCouponGroup(prev => { return {...prev, maxUses: null}})}} style={{ marginRight: '0.5rem' }} />
              <label>{getText("couponGroupMaxUsesSuffix", language)}</label>
            </div>
          </div>
        </div>

        <div style={{...style.questionDiv, flexDirection:"column", alignItems: "start", gap:"1rem", width: "100%"}}>
          <label style={{display: supportManualCodeEntry ? undefined : "none"}}>{getText("couponGroupCodeSource", language)}</label>

          <div style={{display: supportManualCodeEntry ? undefined : "none", width:"100%", padding: "0.5rem 0", background: codeSourceRadioValue === "csv" ? "#fff": "#ccc", color: codeSourceRadioValue === "csv" ? "#000": "#888" }}>
            <div style={{display:"flex", justifyContent: "space-between"}}>
              <div>
                <input type="radio" id="csv" name="codeSource" value="csv" onChange={handleRadioChange} style={{ marginRight: '0.5rem' }} defaultChecked />
                <label>{getText("couponGroupCodesProvided", language)}</label>
              </div>
              <span>{getText("couponCount", language)}{csvCouponQuantity}</span>
            </div>
            <textarea disabled={codeSourceRadioValue !== "csv" || csvCodes.length > 100000} style={{width: "100%", height: "5rem", margin: 0, padding:"0.5rem", fontSize:"1rem", background:csvCodes.length > 100000 ? "rgba(224,204,204,1" : "rgba(255,255,255,0.5"}} onChange={handleCSVChange} value={csvCodes.substring(0,100000)} placeholder="coupon123, coupon321, coupon278" />
            <div>
              <input disabled={codeSourceRadioValue !== "csv"} type="file" accept=".csv,.txt" onChange={handleCsvFileChange} />
              <span style={{fontSize:"0.75rem", display:"none"}}>{getText("couponGroupUploadExplanation", language)}</span>
            </div>
            <span>{csvCodes.length === 100000 ? getText("couponGroupTextareaFull", language) : csvCodes.length > 100000 ? `${csvCodes.length - 100000} ${getText("couponGroupTextareaOverflow", language)}`: null}</span>
            <span>{codeTextareaError}</span>
          </div>

          <div style={{width:"100%", padding: "0.5rem", background: codeSourceRadioValue === "generated" ? "#fff": "#ccc", color: codeSourceRadioValue === "generated" ? "#000": "#888" }}>
            <input type="radio" id="generated" name="codeSource" value="generated" onChange={handleRadioChange} style={{display: supportManualCodeEntry ? undefined : "none", marginRight: '0.5rem' }} />
            <label style={{display: supportManualCodeEntry ? undefined : "none"}}>{getText("couponGroupCodesGenerated", language)}</label>
            <div style={{display:"flex", alignItems:"center"}}>
              <label>{getText("couponGroupStemPrefix", language)}</label>
              <select disabled={codeSourceRadioValue !== "generated"} onChange={handleStemLocationChange} style={{padding:"0 0.5rem", width:"unset", height: "2rem", fontSize:"unset", margin: 0, marginLeft: "0.5rem", color: codeSourceRadioValue === "generated" ? "#000": "#888" }}>
                <option value="before">{getText("couponGroupStemBefore", language)}</option>
                <option value="after">{getText("couponGroupStemAfter", language)}</option>
              </select>
              <input disabled={codeSourceRadioValue !== "generated"} type="text" style={{...style.numberInputSmall, width:"10rem"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.codeStem || ""} name="codeStem" />
              <label>{getText("couponGroupStemSuffix", language)}</label>
            </div>
            <details style={{margin: 0}} open={isDetailsOpen && codeSourceRadioValue === "generated"} onToggle={handleToggleDetails}>
              <summary className="no-style">{getText("advancedOptions", language)}</summary>
              <div style={{display:"flex", alignItems:"center"}}>
                <label>{getText("couponGroupJumbleLength", language)}</label>
                <input disabled={codeSourceRadioValue !== "generated"} type="number" min={minimumJumbleLength} style={style.numberInputSmall} onChange={handleNewCouponGroupChange} value={newCouponGroup?.jumbleLength || minimumJumbleLength} name="jumbleLength" />
                <label>{getText("couponGroupJumbleLengthSuffix", language)}</label>
                <label>Min: {minimumJumbleLength}</label>
              </div>
              <div style={{display:"flex", alignItems:"center"}}>
                <input disabled={codeSourceRadioValue !== "generated"} type="checkbox" id="unambiguous" name="unambiguous" onChange={handleNewCouponGroupChange} checked={newCouponGroup?.isUnambiguous || true} />
                <label>{getText("couponGroupUnambiguous", language)}</label>
              </div>
            </details>
            <label style={{display:"flex", marginTop: "1rem"}}>{getText("couponGroupGeneratedExamples", language)}</label>
            <ul>
              {exampleCodes.map((code, i) => <li key={i}>{code}</li>)}
            </ul>
          </div>
        </div>


        <div style={{display:"grid", gridTemplateColumns:"33% 33% 34%"}}>
          <div style={{display: "flex", flexDirection:"column"}}>
          <label style={style.couponFunctionalityHeader}>{getText("couponType", language)}</label>
            <select id="couponTypeSelect" onChange={handleNewCouponGroupChange} value={newCouponGroup?.type || 1} name="type" style={{marginTop: 0, height: "4rem"}}>
              <option value={1}>{getText("couponYenDiscount", language)}</option>
              <option value={2}>{getText("couponPercentDiscount", language)}</option>
              <option value={3}>{getText("couponProductDiscount", language)}</option>
              <option value={5}>{getText("couponProductPercentDiscount", language)}</option>
            </select>
          </div>
          <div style={{display: "flex", flexDirection:"column"}}>
            <label>{getText("couponTarget", language)}</label>
            <input type="number" style={{...style.numberInput, boxSizing: "border-box"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.target || 0} name="target" />
          </div>
          <div style={{display: "flex", flexDirection:"column"}}>
            <label>{getText("couponReward", language)}</label>
            <input type="number" style={{...style.numberInput, boxSizing: "border-box"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.reward || 0} name="reward"/>
          </div>
        </div>
        <label style={{display: productSelectDisabled ? "none" : undefined}}>{getText("couponProduct", language)}</label>
        <select disabled={productSelectDisabled} onChange={handleNewCouponGroupChange} value={newCouponGroup?.productKey || ""} name="productKey" style={{display: productSelectDisabled ? "none" : undefined, marginTop: 0, background: productSelectDisabled ? "#ccc" : "#fff"}}>
          <option value={0}>{getText("selectProduct", language)}</option>
          {products.map((product) => <option key={product.productKey} value={product.productKey}>{product.title}</option>)}
        </select>
        <span style={{textDecoration: "underline"}}>{getText("couponDescriptionHeader", language)}</span>
        <span style={{borderBottom: "1px dotted #888"}}>{couponDescription}</span>
        <button onClick={() => {setNewCouponGroup(defaultCouponGroup); setShowAddCouponGroup(false)}}>{getText("cancel", language)}</button>
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

const calculateMinimumJumbleLength = (quantity: number) => {
  quantity = Math.max(1, quantity);
  if (!Number.isInteger(quantity)) {
    return 5;
  }
  const requiredCombinations = ((quantity) * ((quantity) - 1)) / (2 * 0.01);
  const minimumJumbleLength = Math.max(5, Math.ceil(Math.log(requiredCombinations) / Math.log(56)));
  return minimumJumbleLength;
}

