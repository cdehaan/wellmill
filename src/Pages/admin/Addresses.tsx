import { useEffect, useState } from "react";
import { AdminDataType } from "../../types";
import CallAPI from "../../Utilities/CallAPI";
import { LanguageType, getText } from "./translations";

type AddressesProps = {
  adminData: AdminDataType | null;
  loadAdminData: () => void;
  isLoading: boolean;
  language: LanguageType;
};

type AddressFields = {
  addressKey: number;
  customerKey: number;
  defaultAddress: boolean;
  firstName: string;
  lastName: string;
  postalCode: string;
  prefCode: number;
  pref: string;
  city: string;
  ward: string;
  address2: string;
  phoneNumber: string;
};

type AddressFieldKey = keyof AddressFields;

const prefectureNames = [
  {code: 1 , name:"北海道"},
  {code: 2 , name:"青森県"},
  {code: 3 , name:"岩手県"},
  {code: 4 , name:"宮城県"},
  {code: 5 , name:"秋田県"},
  {code: 6 , name:"山形県"},
  {code: 7 , name:"福島県"},
  {code: 8 , name:"茨城県"},
  {code: 9 , name:"栃木県"},
  {code: 10, name:"群馬県"},
  {code: 11, name:"埼玉県"},
  {code: 12, name:"千葉県"},
  {code: 13, name:"東京都"},
  {code: 14, name:"神奈川県"},
  {code: 15, name:"新潟県"},
  {code: 16, name:"富山県"},
  {code: 17, name:"石川県"},
  {code: 18, name:"福井県"},
  {code: 19, name:"山梨県"},
  {code: 20, name:"長野県"},
  {code: 21, name:"岐阜県"},
  {code: 22, name:"静岡県"},
  {code: 23, name:"愛知県"},
  {code: 24, name:"三重県"},
  {code: 25, name:"滋賀県"},
  {code: 26, name:"京都府"},
  {code: 27, name:"大阪府"},
  {code: 28, name:"兵庫県"},
  {code: 29, name:"奈良県"},
  {code: 30, name:"和歌山県"},
  {code: 31, name:"鳥取県"},
  {code: 32, name:"島根県"},
  {code: 33, name:"岡山県"},
  {code: 34, name:"広島県"},
  {code: 35, name:"山口県"},
  {code: 36, name:"徳島県"},
  {code: 37, name:"香川県"},
  {code: 38, name:"愛媛県"},
  {code: 39, name:"高知県"},
  {code: 40, name:"福岡県"},
  {code: 41, name:"佐賀県"},
  {code: 42, name:"長崎県"},
  {code: 43, name:"熊本県"},
  {code: 44, name:"大分県"},
  {code: 45, name:"宮崎県"},
  {code: 46, name:"鹿児島県"},
  {code: 47, name:"沖縄県"},
]


export default function Addresses({ adminData, loadAdminData, language }: AddressesProps) {
  const [token , setToken] = useState<string>("");
  const [currentAddressKey, setCurrentAddressKey] = useState<number | null>(null);
  const [currentAddressData, setCurrentAddressData] = useState<any | null>(null);
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [displayDelete, setDisplayDelete] = useState<boolean>(false);
  const [searchString, setSearchString] = useState<string>("");


  useEffect(() => {
    let queryStringToken = localStorage.getItem('token') || "";
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('token')) { queryStringToken = params.get('token') || ""; }
    }
    setToken(queryStringToken || "");
  }, []);

  useEffect(() => {
    if (!currentAddressKey) {
      setCurrentAddressData(null);
      return;
    }
    const currentAddress = adminData?.addresses.find(c => c.addressKey === currentAddressKey);
    if(!currentAddress) return;
    currentAddress.prefCode = parseInt(currentAddress?.prefCode?.toString() || "13");
    setCurrentAddressData(currentAddress);
  }, [currentAddressKey, adminData?.addresses]);

  const addresses = adminData?.addresses;
  if (!addresses) return <span>{getText("loadingAddresses", language)}</span>;
  const purchases = adminData?.purchases;
  if (!purchases) return <span>{getText("loadingPurchases", language)}</span>;
  const lineItems = adminData?.lineItems
  if (!lineItems) return <span>{getText("loadingLineItems", language)}</span>;

  const succeededAddressKeys = new Set<number>();
  purchases.forEach(purchase => {
    if (purchase.status === "succeeded" && purchase.addressKey) {
      succeededAddressKeys.add(purchase.addressKey);
    }
  });

  lineItems.forEach(lineItem => {
    const purchase = purchases.find(p => p.purchaseKey === lineItem.purchaseKey);
    if (purchase && purchase.status === "succeeded") {
      succeededAddressKeys.add(lineItem.addressKey);
    }
  });

  const filteredAddresses = addresses.filter(address => {return (address.addressKey && succeededAddressKeys.has(address.addressKey))});

  // Sorting function
  const sortedAddresses = filteredAddresses.sort((a, b) => {
    if (!a.addressKey && !b.addressKey) {
      return 0;
    } else if (!a.addressKey) {
      return 1;
    } else if (!b.addressKey) {
      return -1;
    } else {
      return b.addressKey - a.addressKey;
    }
  });

  const customer = adminData?.customers.find(c => c.customerKey === currentAddressData?.customerKey);

  const header = (
    <div style={{display:"flex", padding: "0.5rem", backgroundColor:"#9cf"}}>
      <span style={{width:  "6rem"}}>{getText("addressKey", language)}</span>
      <span style={{width:  "6rem"}}>{getText("customerKey", language)}</span>
      <span style={{width: "10rem"}}>{getText("firstName", language)}</span>
      <span style={{width: "10rem"}}>{getText("lastName", language)}</span>
      <span style={{width:  "6rem"}}>{getText("postalCode", language)}</span>
      <span style={{width: "10rem"}}>{getText("pref", language)}</span>
      <span style={{width: "10rem"}}>{getText("ward", language)}</span>
      <span style={{width: "10rem"}}>{getText("city", language)}</span>
      <span style={{width: "20rem"}}>{getText("building", language)}</span>
      <span style={{width: "10rem"}}>{getText("phoneNumber", language)}</span>
    </div>
  )

  let colourToggle = 0;
  const addressList = sortedAddresses.map((address, index) => {
    let haystack = `${address.addressKey} ${address.customerKey} ${address.firstName} ${address.lastName} ${address.postalCode} ${address.pref} ${address.city} ${address.ward} ${address.address2} ${address.phoneNumber}`;
    if (searchString && !haystack.toLowerCase().includes(searchString.toLowerCase())) return null;

    colourToggle = 1 - colourToggle;
    const backgroundColor = colourToggle ? "#def" : "#fff";
    return (
      <div key={index} style={{display:"flex", padding: "0.5rem", backgroundColor}}>
        <span style={{width:  "6rem"}}>{address.addressKey}</span>
        <span style={{width:  "6rem"}}>{address.customerKey}</span>
        <span style={{width: "10rem"}}>{address.lastName}</span>
        <span style={{width: "10rem"}}>{address.firstName}</span>
        <span style={{width:  "6rem"}}>{address.postalCode}</span>
        <span style={{width: "10rem"}}>{address.pref}</span>
        <span style={{width: "10rem"}}>{address.ward}</span>
        <span style={{width: "10rem"}}>{address.city}</span>
        <span style={{width: "20rem"}}>{address.address2}</span>
        <span style={{width: "10rem", flexGrow: 1}}>{address.phoneNumber}</span>
        <span onClick={() => {setCurrentAddressKey(address.addressKey || null); setDisplayEdit(true)}} style={{width: "2rem"}}>✏️</span>
        <span onClick={() => {setCurrentAddressKey(address.addressKey || null); setDisplayDelete(true)}} style={{width: "2rem"}}>🗑️</span>
      </div>
    )
  })

  const rowStyle = {display: "flex", alignItems: "center"};
  const spanStyle = {display: "flex", justifyContent: "flex-end", width: "10rem"};
  const fieldStyle = {width: "40rem", height: "2rem", margin: "0.5rem"};
  const selectStyle = {width: "10rem", height: "2rem", margin: "0.5rem", padding: 0, paddingLeft: "1rem"};

  const prefSelect = (
    <select style={selectStyle} onChange={(event) => {handleFieldChange("prefCode", parseInt(event.target.value))}} value={currentAddressData?.prefCode || 13}>
      {prefectureNames.map(pref => <option key={pref.code} value={pref.code}>{pref.name}</option>)}
    </select>
  );

  const editModal = (
    <div style={{position: "fixed", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: displayEdit ? "block" : "none"}}>
      <div style={{position: "fixed", top: "10%", left: "10%", width: "80%", backgroundColor: "#fff", padding: "2rem"}}>
        <h2>{getText("editAddress", language)}</h2>
        <h3 style={spanStyle}>{getText("addressKey", language)}: {currentAddressData?.addressKey || "Unknown"}</h3>
        <span style={{display:"flex", marginLeft: "1rem", paddingBottom:"1rem"}}>{getText("customerKey",language)}: {customer?.customerKey || "Unknown"} {customer?.lastName || ""} {customer?.firstName || ""}</span>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("lastName", language)}:</span>
          <input style={fieldStyle} type="text" onChange={(event) => {handleFieldChange("lastName", event.target.value)}} value={currentAddressData?.lastName || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("firstName", language)}:</span>
          <input style={fieldStyle} type="text" onChange={(event) => {handleFieldChange("firstName", event.target.value)}} value={currentAddressData?.firstName || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("postalCode", language)}:</span>
          <input style={fieldStyle} type="text" onChange={(event) => {handleFieldChange("postalCode", event.target.value)}} value={currentAddressData?.postalCode || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("pref", language)}:</span>
          {prefSelect}
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("ward", language)}:</span>
          <input style={fieldStyle} type="text" onChange={(event) => {handleFieldChange("ward", event.target.value)}} value={currentAddressData?.ward || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("city", language)}:</span>
          <input style={fieldStyle} type="text" onChange={(event) => {handleFieldChange("city", event.target.value)}} value={currentAddressData?.city || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("building", language)}:</span>
          <input style={fieldStyle} type="text" onChange={(event) => {handleFieldChange("address2", event.target.value)}} value={currentAddressData?.address2 || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("phoneNumber", language)}:</span>
          <input style={fieldStyle} type="text" onChange={(event) => {handleFieldChange("phoneNumber", event.target.value)}} value={currentAddressData?.phoneNumber || ""} />
        </div>
        <div style={{display: "flex", justifyContent: "center", gap: "2rem"}}>
          <button onClick={() => setDisplayEdit(false)}>{getText("cancel", language)}</button>
          <button onClick={() => handleAddressUpdate()}>{getText("save", language)}</button>
        </div>
      </div>
    </div>
  );

  function handleFieldChange(fieldName: AddressFieldKey, fieldValue: string | number) {
    if (!currentAddressKey) return;
    if (fieldName === "prefCode" && typeof fieldValue === "string") {
      fieldValue = parseInt(fieldValue);
    }
    const newAddresses = addresses?.map(addr => {
      if (addr.addressKey === currentAddressKey) {
        return { ...addr, [fieldName]: fieldValue };
      }
      return addr;
    });
    setCurrentAddressData(newAddresses?.find(addr => addr.addressKey === currentAddressKey) || null);
    console.log(newAddresses);
  }

  async function handleAddressUpdate() {
    console.log("Updating address", currentAddressKey);
    if(!currentAddressData) return;

    const requestData = {...currentAddressData, token: token}
    const responseData = await CallAPI(requestData, "adminAddressUpdate");
    console.log(responseData);
    setTimeout(() => {
      setDisplayEdit(false);
      loadAdminData();
    }, 500);
  }

  const deleteModal = (
    <div style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)"}}>
      <div style={{display: "flex", flexDirection: "column", backgroundColor: "#fff", padding: "2rem"}}>
        <span>Are you sure you want to delete this address?</span>
        <button onClick={() => {setDisplayDelete(false)}}>Cancel</button>
        <button onClick={() => {handleAddressDelete()}}>Delete</button>
      </div>
    </div>
  )

  async function handleAddressDelete() {
    console.log("Deleting address", currentAddressKey);
    if(!currentAddressKey) return;

    const requestData = {addressKey: currentAddressKey, token: token}
    const responseData = await CallAPI(requestData, "adminAddressDelete");
    console.log(responseData);
    setTimeout(() => {
      setDisplayDelete(false);
      loadAdminData();
    }, 500);
  }




  return (
    <div style={{margin: "2rem"}}>
      <h1>{getText("addresses", language)}</h1>
      {getText("search", language)}: <input type="text" value={searchString} onChange={(event) => {setSearchString(event.target.value)}} />
      {header}
      {addressList}
      {displayEdit ? editModal : null}
      {displayDelete ? deleteModal : null}
    </div>
  )

}
