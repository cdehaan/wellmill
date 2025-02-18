import { useEffect, useState } from "react";
import { AdminDataType } from "../../types";
import { LanguageType, getText } from "./translations";
import CouponUsageChart from "../../Components/CouponUsageChart";
import CallAPI from "../../Utilities/CallAPI";
import csvIcon from "../../assets/images/csv-icon.png";
import excelIcon from "../../assets/images/excel-icon.png";

type CouponGroupsProps = {
  adminData: AdminDataType | null;
  loadAdminData: () => void;
  isLoading: boolean;
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
const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

//const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

export default function CouponGroups({ adminData, loadAdminData, language }: CouponGroupsProps) {
  const [showAddCouponGroup, setShowAddCouponGroup] = useState<boolean>(false);   
  const [newCouponGroup, setNewCouponGroup] = useState<CouponGroupFields>(defaultCouponGroup);
  const [codeSourceRadioValue, setCodeSourceRadioValue] = useState<string>("generated"); // old value: "csv"
  const [csvCodes, setCsvCodes] = useState<string>("");
  const [quantityMemory, setQuantityMemory] = useState<number>(1);

  const [codeTextareaError, setCodeTextareaError] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [updatingGroups, setUpdatingGroups] = useState<number[]>([]);

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
    //console.log(`Setting ${key} to ${value}`);
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

  async function handleGroupCreate() {
    if(!newCouponGroup?.name) {
      window.alert(getText("couponGroupNameRequired", language));
      return;
    }


    const requestBody = {
      token: token,
      couponGroup: {
        ...newCouponGroup,
        couponQuantity: newCouponGroup.quantity,
      },
    };

    console.log("requestBody");
    console.log(requestBody);

    setUpdatingGroups([...updatingGroups, -1]);
    const responseData = await CallAPI(requestBody, "adminCouponGroupCreate");
    console.log(responseData);
    setTimeout(() => {
      setUpdatingGroups(updatingGroups.filter(key => key !== -1));
      loadAdminData();
    }, 500);
  }

  async function handleGroupAppend(couponGroupKey: number) {
    // Use window.prompt to ask the user for a number
    const input = window.prompt(getText("couponGroupAppendPrompt", language), "100");

    // If the user cancels, input will be null
    if (input === null) {
      return; // User cancelled the prompt
    }

    // Convert the input to a number
    const count = parseInt(input, 10);

    // Validate the input
    if (isNaN(count)) {
      window.alert(getText("couponGroupAppendInvalid", language));
      return;
    }

    const requestBody = {
      token: token,
      couponGroupKey: couponGroupKey,
      couponQuantity: count,  
    };

    setUpdatingGroups([...updatingGroups, couponGroupKey]);
    const responseData = await CallAPI(requestBody, "adminCouponGroupAppend");
    console.log(responseData);
    setTimeout(() => {
      setUpdatingGroups(updatingGroups.filter(key => key !== couponGroupKey));
      loadAdminData();
    }, 500);
  }


  async function handleGroupActivate(couponGroupKey: number, activate: boolean) {
    const confirmed = window.confirm(activate ? getText("couponGroupActivateConfirmation", language) : getText("couponGroupDeactivateConfirmation", language));

    if (!confirmed) {
      return;
    }

    const requestBody = {
      token: token,
      couponGroupKey: couponGroupKey,
      activate: activate,
    };

    setUpdatingGroups([...updatingGroups, couponGroupKey]);
    const responseData = await CallAPI(requestBody, "adminCouponGroupActivate");
    console.log(responseData);
    setTimeout(() => {
      setUpdatingGroups(updatingGroups.filter(key => key !== couponGroupKey));
      loadAdminData();
    }, 500);
  }
  

  async function handleGroupDelete(couponGroupKey: number) {
    // Show a confirmation dialog to the user
    const confirmed = window.confirm(getText("couponGroupDeleteConfirmation", language));
    
    // If the user clicks "Cancel" (i.e., confirmed is false), exit the function
    if (!confirmed) {
      return;
    }

    const requestBody = {
      token: token,
      couponGroupKey: couponGroupKey,
    };

    setUpdatingGroups([...updatingGroups, couponGroupKey]);
    const responseData = await CallAPI(requestBody, "adminCouponGroupDelete");
    console.log(responseData);
    setTimeout(() => {
      setUpdatingGroups(updatingGroups.filter(key => key !== couponGroupKey));
      loadAdminData();
    }, 500);
  }

  async function handleGroupExport(couponGroupKey: number, format: "csv" | "xlsx") {
    try {
      const requestBody = {
        token: token,
        couponGroupKey: couponGroupKey,
        format: format,
      }
      await CallAPI(requestBody, "adminCouponGroupExport", `Group ${couponGroupKey} Coupon Codes.${format}`);
    } catch (error) {
      console.error(error);
    }
  }

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

  const couponDescription = couponTypeDescription(newCouponGroup.type, newCouponGroup.target, newCouponGroup.reward, newCouponGroup.productKey, language);

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
    },

    tableRow: {
      display: "grid",
      gridTemplateColumns: "4rem 8rem 10rem 10rem 6rem 10rem 8rem 8rem 1fr",
      borderTop: "2px solid #888",
      alignItems: "center",
      paddingTop: "0.5rem",
      marginTop: "0.5rem",
    },
    exportButton: {
      height: "3rem",
      width: "3rem",
      cursor: "pointer",
    },
    actionSpan: {
      padding: "0.25rem",
      margin: "0.5rem 0",
      border: "1px solid #888",
      borderRadius: "0.5rem",
      cursor: "pointer",
      boxShadow: "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
    },
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
          <input type="number" style={{...style.numberInputSmall, width:"8rem"}} onChange={handleNewCouponGroupChange} value={newCouponGroup?.quantity || 1} max={1_000_000} min={1} name="quantity" />
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
              <input type="number" id="maxUses" disabled={newCouponGroup.maxUses === null} style={style.numberInputSmall} onChange={handleNewCouponGroupChange} value={newCouponGroup?.maxUses || quantityMemory} min={1} max={10_000_000} name="maxUses" />
              <label>{getText("couponGroupMaxUsesSuffix", language)}</label>
            </div>
            <div style={{padding: "0.25rem", background: newCouponGroup.maxUses === null ? "#fff" : "#ccc", color: newCouponGroup.maxUses === null ? "#000" : "#888"}}>
              <input type="radio" id="unlimitedUses" name="couponUsage" value="unlimited" onClick={() => {setQuantityMemory(parseInt((document.getElementById("maxUses") as HTMLInputElement).value)); setNewCouponGroup(prev => { return {...prev, maxUses: null}})}} style={{ marginRight: '0.5rem' }} />
              <label>{getText("couponGroupUnlimitedUsesSuffix", language)}</label>
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
                <label>{getText("couponGroupJumbleLengthSuffix", language)} (Min: {minimumJumbleLength})</label>
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
        <div style={{display: "flex", justifyContent: "space-evenly", marginTop: "1rem"}}>
          <button onClick={() => {setNewCouponGroup(defaultCouponGroup); setShowAddCouponGroup(false)}}>{getText("cancel", language)}</button>
          <button onClick={handleGroupCreate}>{getText("generateCouponGroup", language)}</button>
        </div>
      </div>
    </div>
  );

  const activeGroupElement = (<span style={{color: "#4caf50", fontWeight: "bold"}}>{getText("couponGroupActive",language)}</span>);
  const inactiveGroupElement = (<span style={{color: "#f44336", fontWeight: "bold"}}>{getText("couponGroupInactive",language)}</span>);

  const totalCoupons = couponGroups.reduce((acc, group) => acc + group.count, 0);

  const couponGroupRows = couponGroups.map((couponGroup, i) => {
    const couponCount = couponGroup.count;
    const unusedCount = couponGroup.unusedCount;
    const usedupCount = couponGroup.usedupCount;
    const usedCount = couponCount - unusedCount - usedupCount;
    const active = couponGroup.active; // can be 1 or 0, thanks MySQL

    const groupActions = (
      <div style={{display: "flex", gap: "0.5rem"}}>
        <span style={style.actionSpan} onClick={() => {handleGroupAppend(couponGroup.couponGroupKey)}}>{getText("addCoupons", language)}</span>
        {active ? <span style={style.actionSpan} onClick={() => {handleGroupActivate(couponGroup.couponGroupKey, false)}}>{getText("deactivateCouponGroup", language)}</span> : <span style={style.actionSpan} onClick={() => {handleGroupActivate(couponGroup.couponGroupKey, true)}}>{getText("activateCouponGroup", language)}</span>}
        <span style={style.actionSpan} onClick={() => {handleGroupDelete(couponGroup.couponGroupKey)}}>{getText("deleteCouponGroup", language)}</span>
      </div>
    );

    const exportButtons = (
      <div>
        <img src={csvIcon} alt="Export CSV" style={style.exportButton} onClick={() => {handleGroupExport(couponGroup.couponGroupKey, "csv")}} />
        <img src={excelIcon} alt="Export Excel" style={style.exportButton} onClick={() => {handleGroupExport(couponGroup.couponGroupKey, "xlsx")}} />
      </div>
    );
  
    const usedText = (
      <div style={{display: "grid", alignItems:"end", gridTemplateColumns:"1fr 3rem", gap: "0rem"}}>
        <span style={{color: "#4caf50", textAlign: "end", fontWeight: "bold"}}>{getText("unused", language)}:</span><span>{unusedCount}</span>
        <span style={{color: "#ff9800", textAlign: "end", fontWeight: "bold"}}>{getText("partiallyUsed", language)}:</span><span>{usedCount}</span>
        <span style={{color: "#f44336", textAlign: "end", fontWeight: "bold"}}>{getText("fullyUsed", language)}:</span><span>{usedupCount}</span>
      </div>
    )  

    return (
      <div key={i} style={{position: "relative"}}>
        <div style={style.tableRow}>
          <span>{couponGroup.couponGroupKey}</span>
          <span>{couponGroup.active ? activeGroupElement : inactiveGroupElement}</span>
          <span>{couponGroup.name}</span>
          <span>{couponGroup.codeStem}</span>
          <span>{couponCount}</span>
          {usedText}
          <CouponUsageChart total={couponCount} unused={unusedCount} usedup={usedupCount} scale={0.5} />
          {exportButtons}
          {groupActions}
        </div>
        <span><span style={{fontWeight:"bold"}}>{couponTypeName(couponGroup.type, language)}</span> - {couponTypeDescription(couponGroup.type, couponGroup.target, couponGroup.reward, couponGroup.productKey, language)} - {getText("maxUses", language)}: {couponGroup.maxUses}</span>
        <div style={{display: updatingGroups.includes(couponGroup.couponGroupKey) ? undefined : "none", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5"}}></div>
      </div>
    );
  });

  const couponGroupTable = (
    <div style={{display: "flex", flexDirection:"column", margin: "1rem 0", paddingBottom: "0.5rem", borderBottom: "2px solid #888"}}>
      <div style={style.tableRow}>
        <span>{getText("couponGroupKey", language)}</span>
        <span>{getText("couponGroupStatus", language)}</span>
        <span>{getText("couponGroupName", language)}</span>
        <span>{getText("couponGroupCodeStem", language)}</span>
        <span>{getText("couponGroupCount", language)}</span>
        <span style={{textAlign: "end"}}>{getText("couponGroupUseText", language)}</span>
        <span>{getText("couponGroupUseChart", language)}</span>
        <span>{getText("export", language)}</span>
        <span>{getText("actions", language)}</span>
      </div>
      {couponGroupRows}
    </div>
  );

  return (
    <div style={{padding: "0 1rem"}}>
      {showAddCouponGroup ? addCouponGroupModal : null}
      <h2>{getText("coupongroups", language)}</h2>
      {language === "jp" ? couponExplanationJp : language === "en" ? couponExplanationEn : "Unknown language"}
      <br />
      {addCouponGroupButton}
      <br />
      <span>{getText("totalCoupons", language)}: {totalCoupons}</span>
      {couponGroupTable}
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
