import { useEffect, useState } from "react";
import { AdminDataType, CustomerType } from "../../types";
import CallAPI from "../../Utilities/CallAPI";
import { LanguageType, getText } from "./translations";

type CustomersProps = {
  adminData: AdminDataType | null;
  loadAdminData: () => void;
  isLoading: boolean;
  language: LanguageType;
};

type CustomerFields = {
  customerKey: number;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  gender: string;
  birthday: string;
  email: string;
};

type CustomerFieldKey = keyof CustomerFields;

type customerSortField = {
  fieldName: keyof CustomerType; // eg: 'customerKey'
  desc: boolean;
};

const buttonStyle = {
  width: "calc(4rem - 2px)", 
  height: "1.5rem",
  backgroundColor: "#FAFBFC",
  border: "1px solid rgba(27, 31, 35, 0.15)",
  borderRadius: "6px",
  boxShadow: "rgba(27, 31, 35, 0.04) 0 1px 0, rgba(255, 255, 255, 0.25) 0 1px 0 inset",
  color: "#24292E",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: "14px",
  fontWeight: "500",
  lineHeight: "20px",
  listStyle: "none",
  marginRight: "2rem",
  verticalAlign: "flex-end",
  justifyContent: "center",
};

export default function Customers({ adminData, loadAdminData, language }: CustomersProps) {
  const [token , setToken] = useState<string>("");
  const [currentCustomerKey, setCurrentCustomerKey] = useState<number | null>(null);
  const [currentCustomerData, setCurrentCustomerData] = useState<any | null>(null);
  const [displayEdit, setDisplayEdit] = useState<boolean>(false);
  const [displayDelete, setDisplayDelete] = useState<boolean>(false);
  const [searchString, setSearchString] = useState<string>("");
  const [customerSortField, setCustomerSortField] = useState<customerSortField>({fieldName: 'customerKey', desc: true});

  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [expandedPurchases, setExpandedPurchases] = useState<Set<number>>(new Set());

  function handleSortClick(event: React.MouseEvent<HTMLSpanElement>) {
    if (!(event.target instanceof HTMLElement)) return;
    const fieldName = event.target.getAttribute('data-name') as keyof CustomerType;
    setCustomerSortField(prev => {
      if (prev.fieldName === fieldName) {
        return { ...prev, desc: !prev.desc };
      } else {
        return { fieldName, desc: true };
      }
    });
  }

  function toggleCustomerExpansion(customerKey: number) {
    setExpandedCustomers(prev => {
      const newExpandedCustomers = new Set(prev);
      if (newExpandedCustomers.has(customerKey)) {
        newExpandedCustomers.delete(customerKey);
      } else {
        newExpandedCustomers.add(customerKey);
      }
      return newExpandedCustomers;
    });
  };

  function togglePurchaseExpansion(purchaseKey: number) {
    setExpandedPurchases(prev => {
      const newExpandedPurchases = new Set(prev);
      if (newExpandedPurchases.has(purchaseKey)) {
        newExpandedPurchases.delete(purchaseKey);
      } else {
        newExpandedPurchases.add(purchaseKey);
      }
      return newExpandedPurchases;
    });
  }

  useEffect(() => {
    let queryStringToken = localStorage.getItem('token') || "";
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("token")) { queryStringToken = params.get('token') || ""; }
    }
    setToken(queryStringToken);
  }, []);

  useEffect(() => {
    if (!currentCustomerKey) setCurrentCustomerData(null);
    const currentCustomer = adminData?.customers.find(c => c.customerKey === currentCustomerKey);
    if(currentCustomer?.birthday) currentCustomer.birthday = currentCustomer?.birthday?.substring(0,10);
    setCurrentCustomerData(currentCustomer);
  }, [currentCustomerKey, adminData?.customers]);

  const customers = adminData?.customers;
  if (!customers) return <span>{getText("loading", language)}</span>;

  const customersSorted = customers.sort((a, b) => {
    const { fieldName, desc } = customerSortField;
    const aValue = a[fieldName];
    const bValue = b[fieldName];
  
    // Handle null or undefined values by placing them at the end
    if (aValue == null) return 1;
    if (bValue == null) return -1;
  
    // Compare values based on the field type
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return desc ? bValue - aValue : aValue - bValue;
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      return desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
    }
  
    return 0; // Default case (should not occur with valid data)
  });

  const customerHeader = (
    <div style={{display:"flex", padding: "0.5rem", backgroundColor:"#9cf"}}>
      <span style={{width:  "6rem"}}>{getText("purchaseNumber", language)}</span>
      <span style={{width:  "4rem"}} onClick={handleSortClick} data-name="customerKey">{customerSortField.fieldName === "customerKey" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("key", language)}</span>
      <span style={{width: "6rem"}} onClick={handleSortClick} data-name="firstName">{customerSortField.fieldName === "firstName" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("firstName", language)}</span>
      <span style={{width: "6rem"}} onClick={handleSortClick} data-name="lastName">{customerSortField.fieldName === "lastName" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("lastName", language)}</span>
      <span style={{width: "6rem"}} onClick={handleSortClick} data-name="firstNameKana">{customerSortField.fieldName === "firstNameKana" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("firstNameKana", language)}</span>
      <span style={{width: "6rem"}} onClick={handleSortClick} data-name="lastNameKana">{customerSortField.fieldName === "lastNameKana" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("lastNameKana", language)}</span>
      <span style={{width:  "6rem"}} onClick={handleSortClick} data-name="gender">{customerSortField.fieldName === "gender" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("gender", language)}</span>
      <span style={{width: "10rem"}} onClick={handleSortClick} data-name="birthday">{customerSortField.fieldName === "birthday" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("birthday", language)}</span>
      <span style={{width: "16rem"}} onClick={handleSortClick} data-name="email">{customerSortField.fieldName === "email" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }{getText("email", language)}</span>
      <span style={{width:  "6rem"}}>{getText("termsOfService", language)}</span>
      <span style={{width:  "8rem"}}>{getText("latestCouponCode", language)}</span>
      <span style={{width:  "6rem"}}>{getText("couponsUsed", language)}</span>
      <span style={{width:  "4rem"}}>{getText("couponDiscountsTotal", language)}</span>
    </div>
  )

  const purchaseHeader = (
    <div style={{display:"flex", padding: "0rem", backgroundColor:"#4bc387"}}>
      <span style={{width:  "6rem", backgroundColor:"rgba(0,0,0,0.1"}}>{getText("productsQuantity", language)}</span>
      <span style={{width: "20rem"}}>Stripe ID</span>
      <span style={{width: "15rem", backgroundColor:"rgba(0,0,0,0.1"}}>{getText("email", language)}</span>
      <span style={{width: "6rem"}}>{getText("paymentStatus", language)}</span>
      <span style={{width: "12rem", backgroundColor:"rgba(0,0,0,0.1"}}>{getText("firstAddedAt", language)}</span>
      <span style={{width: "12rem"}}>{getText("purchasedAt", language)}</span>
      <span style={{width: "12rem", backgroundColor:"rgba(0,0,0,0.1"}}>{getText("refundedAt", language)}</span>
      <span style={{width: "6rem"}}>{getText("purchaseTotal", language)}</span>
      <span style={{width: "7rem", backgroundColor:"rgba(0,0,0,0.1"}}>{getText("couponDiscount", language)}</span>
      <span style={{width: "6rem"}}>{getText("couponCode", language)}</span>
    </div>
  );

  const lineItemHeader = (
    <div style={{display:"flex", padding: "0.5rem", backgroundColor:"#ebeb47"}}>
      <span style={{width:  "6rem"}}>{getText("productKey", language)}</span>
      <span style={{width: "25rem"}}>{getText("productTitle", language)}</span>
      <span style={{width: "10rem"}}>{getText("productQuantity", language)}</span>
      <span style={{width: "10rem"}}>{getText("unitPrice", language)}</span>
      <span style={{width: "10rem"}}>{getText("shippingStatus", language)}</span>
    </div>
  );

  console.log(adminData);
  let colourToggle = 0;

  const customerList = customersSorted.map((customer, index) => {
    if (!customer.customerKey) return null;
    if (customer.customerKey <= 17) return null;

    let haystack = (customer.firstName || "") + (customer.lastName || "") + (customer.firstNameKana || "") + (customer.lastNameKana || "") + (customer.email || "");

    const defaultAddress = adminData.addresses.find(a => a.customerKey === customer.customerKey && a.defaultAddress);
    const defaultAddressElement = defaultAddress ? (<div style={{backgroundColor:"#def"}}>{getText("currentDefaultAddress", language)}: {(defaultAddress.firstName || "")} {(defaultAddress.lastName || "")} {(defaultAddress.postalCode || "")} {(defaultAddress.pref || "")} {(defaultAddress.city || "")} {(defaultAddress.ward || "")} {(defaultAddress.address2 || "")} {(defaultAddress.phoneNumber || "")}</div>) : null;
    haystack += (defaultAddress?.firstName || "") + (defaultAddress?.lastName || "") + (defaultAddress?.postalCode || "") + (defaultAddress?.pref || "") + (defaultAddress?.city || "") + (defaultAddress?.ward || "") + (defaultAddress?.address2 || "") + (defaultAddress?.phoneNumber || "");

    const purchases = adminData.purchases.filter(p => p.customerKey === customer.customerKey);
    if (purchases.length === 0 && customer.firstName === null && customer.lastName === null && customer.email === null) return null;

    for (const purchase of purchases) {
      const billingAddress = adminData.addresses.find(a => a.addressKey === purchase.addressKey);
      haystack = haystack + (purchase.email) + (purchase.couponCode) + (billingAddress?.firstName || "") + (billingAddress?.lastName || "") + (billingAddress?.postalCode || "") + (billingAddress?.pref || "") + (billingAddress?.city || "") + (billingAddress?.ward || "") + (billingAddress?.address2 || "") + (billingAddress?.phoneNumber || "");
      const lineItems = adminData.lineItems.filter(li => li.purchaseKey === purchase.purchaseKey);
      for (const lineItem of lineItems) {
        haystack = haystack + (lineItem.firstName || "") + (lineItem.lastName || "") + (lineItem.postalCode || "") + (lineItem.pref || "") + (lineItem.city || "") + (lineItem.ward || "") + (lineItem.address2 || "") + (lineItem.phoneNumber || "");
      }
    }

    if(searchString.length > 0 && !haystack.toLowerCase().includes(searchString.toLowerCase())) return null;

    let meaningfulPurchases = 0
    const purchaseList = purchases.map(purchase => {
      const lineItems = adminData.lineItems.filter(li => li.purchaseKey === purchase.purchaseKey);
      const meaningfulLineItems = lineItems.length;
      meaningfulPurchases = meaningfulPurchases + (meaningfulLineItems === 0 ? 0 : 1);

      const billingAddress = adminData.addresses.find(a => a.addressKey === purchase.addressKey);
      const billingAddressInfo = (!billingAddress || lineItems.length === 0) ? null : (
        <div style={{display:"flex", backgroundColor: "#dfe", padding: "0.5rem", margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>
          <span style={{marginRight: "1rem"}}>{getText("billingAddress", language)}:</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.firstName}</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.lastName}</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.postalCode}</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.pref}</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.city}</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.ward}</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.address2}</span>
          <span style={{display: "flex", alignItems: "flex-end", marginRight: "0.5rem"}}>{billingAddress.phoneNumber}</span>
        </div>
      )


      const lineItemList = lineItems.map(li => {
        const product = adminData.products.find(p => p.productKey === li.productKey);
        const itemShippingAddress = (!li.firstName && !li.lastName && !li.postalCode) ? null : <div style={{backgroundColor:"#ffa"}}>Shipping address: {(li.firstName || "")} {(li.lastName || "")} {(li.postalCode || "")} {(li.pref || "")} {(li.city || "")} {(li.ward || "")} {(li.address2 || "")} {(li.phoneNumber || "")}</div>;
        if(!product) return null;
        return (
          <>
            <div key={li.lineItemKey} style={{display:"flex", backgroundColor: "#ffa", padding: "0.5rem"}}>
              <span style={{width:  "6rem"}}>{product.productKey || "-"}</span>
              <span style={{width: "25rem"}}>{product.title || "-"}</span>
              <span style={{width: "10rem"}}>{li.quantity || "-"}</span>
              <span style={{width: "10rem"}}>{li.unitPrice || "-"}</span>
              <span style={{width: "10rem"}}>{getText(li.shippingStatus, language) || "-"}</span>
            </div>
            {itemShippingAddress}
          </>
        )
      });

      const allLineItemInfo = <div style={{margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>{lineItemHeader}{lineItemList}</div>
      const conditionalItemInfo = (lineItems.length === 0) ? <div style={{display:"flex", backgroundColor: "#ffa", padding: "0.5rem", margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>No line items</div> : allLineItemInfo;

      return (
        <>
          <div key={purchase.purchaseKey} style={{display:"flex", backgroundColor: "#dfe", padding: "0.0rem"}}>
            <span style={{...buttonStyle}} onClick={() => {togglePurchaseExpansion(purchase.purchaseKey || 0)}}>{lineItems.length} ⌄</span>
            <span style={{width: "20rem"}}>{purchase.paymentIntentId || "-"}</span>
            <span style={{width: "15rem", backgroundColor: "rgba(0,0,0,0.1)"}}>{purchase.email || "-"}</span>
            <span style={{width: "6rem"}}>{getText(purchase.status, language) || "-"}</span>
            <span style={{width: "12rem", backgroundColor: "rgba(0,0,0,0.1)"}}>{formatDateToJapanTimezone(purchase.creationTime)}</span>
            <span style={{width: "12rem"}}>{formatDateToJapanTimezone(purchase.purchaseTime)}</span>
            <span style={{width: "12rem", backgroundColor: "rgba(0,0,0,0.1)"}}>{formatDateToJapanTimezone(purchase.refundTime)}</span>
            <span style={{width: "6rem"}}>¥{purchase.amount || 0}</span>
            <span style={{width: "7rem", backgroundColor: "rgba(0,0,0,0.1)"}}>¥{purchase.couponDiscount || 0}</span>
            <span style={{width: "6rem"}}>{purchase.couponCode || "-"}</span>
          </div>
          {expandedPurchases.has(purchase.purchaseKey) ? (billingAddressInfo) : null}
          {expandedPurchases.has(purchase.purchaseKey) ? (conditionalItemInfo) : null}
        </>
      )
    });

    const allPurcahseInfo = <div style={{margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>{purchaseHeader}{purchaseList}</div>
    const conditionalPurchaseInfo = (purchases.length === 0) ? <div style={{display:"flex", backgroundColor: "#dfe", padding: "0.5rem", margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>No purchases</div> : allPurcahseInfo;
    const latestCouponCode = purchases.reduce((acc, purchase) => purchase.couponCode ? purchase.couponCode : acc, "");
    const couponsUsed = purchases.reduce((acc, purchase) => purchase.couponCode ? acc + 1 : acc, 0);
    const couponDiscountsTotal = purchases.reduce((acc, purchase) => acc + (purchase.couponDiscount || 0), 0);

    colourToggle++;
    const backgroundColor = (colourToggle%2 === 1) ? "#def" : "#def"; //"#fff";
    return (
      <div key={customer.customerKey} style={{border: "2px solid #000", marginTop: "0.5rem", padding: "0.5rem", borderRadius: "0.5rem"}}>
        {customerHeader}
        <div key={customer.customerKey} style={{display:"flex", backgroundColor: backgroundColor, padding: "0.5rem"}}>
          <span style={buttonStyle} onClick={() => {toggleCustomerExpansion(customer.customerKey || 0)}}>⌄ {meaningfulPurchases} <span style={{color: "#888", fontSize:"0.7rem", margin: "0 0.25rem"}}>({purchases.length})</span></span>
          <span style={{width:  "4rem"}}>{customer.customerKey}</span>
          <span style={{width: "6rem"}}>{customer.firstName}</span>
          <span style={{width: "6rem"}}>{customer.lastName}</span>
          <span style={{width: "6rem"}}>{customer.firstNameKana}</span>
          <span style={{width: "6rem"}}>{customer.lastNameKana}</span>
          <span style={{width:  "6rem"}}>{getText(customer.gender, language)}</span>
          <span style={{width: "10rem"}}>{customer.birthday?.substring(0,10)}</span>
          <span style={{width: "16rem"}}>{customer.email}</span>
          <span style={{width:  "6rem"}}><input type="checkbox" checked={meaningfulPurchases > 0} disabled={true} /></span>
          <span style={{width:  "8rem"}}>{latestCouponCode || "-"}</span>
          <span style={{width:  "6rem"}}>{couponsUsed}</span>
          <span style={{width:  "4rem", flexGrow: 1}}>¥{couponDiscountsTotal}</span>
          <span onClick={() => {setCurrentCustomerKey(customer.customerKey || null); setDisplayEdit(true)}} style={{width: "2rem"}}>✏️</span>
          <span onClick={() => {setCurrentCustomerKey(customer.customerKey || null); setDisplayDelete(true)}} style={{width: "2rem"}}>🗑️</span>
        </div>
        {defaultAddressElement}
        {expandedCustomers.has(customer.customerKey) ? conditionalPurchaseInfo : null}
      </div>
    )
  });

  const rowStyle = {display: "flex", alignItems: "center"};
  const spanStyle = {display: "flex", justifyContent: "flex-end", width: "10rem"};
  const fieldStyle = {width: "40rem", height: "2rem", margin: "0.5rem"};

  const editModal = (
    <div style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)"}}>
      <div style={{display: "flex", flexDirection: "column", backgroundColor: "#fff", padding: "2rem", width: "60rem", alignItems: "center"}}>
        <span>Editing customer {currentCustomerKey}</span>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("firstName", language)}:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("firstName", event.target.value)}} value={currentCustomerData?.firstName || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("lastName", language)}:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("lastName", event.target.value)}} value={currentCustomerData?.lastName || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("firstNameKana", language)}:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("firstNameKana", event.target.value)}} value={currentCustomerData?.firstNameKana || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("lastNameKana", language)}:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("lastNameKana", event.target.value)}} value={currentCustomerData?.lastNameKana || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("gender", language)}:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("gender", event.target.value)}} value={currentCustomerData?.gender || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("birthday", language)}:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("birthday", event.target.value)}} value={currentCustomerData?.birthday?.substring(0,10) || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>{getText("email", language)}:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("email", event.target.value)}} value={currentCustomerData?.email || ""} />
        </div>
        <button onClick={() => {setDisplayEdit(false)}}>{getText("cancel", language)}</button>
        <button onClick={() => {handleCustomerUpdate()}}>{getText("save", language)}</button>
      </div>
    </div>
  )

  function handleFieldChange(fieldName: CustomerFieldKey, fieldValue: string) {
    if (!currentCustomerKey) return;
    const newCustomers = customers?.map(cust => {
      if (cust.customerKey === currentCustomerKey) {
        return { ...cust, [fieldName]: fieldValue };
      }
      return cust;
    });
    setCurrentCustomerData(newCustomers?.find(c => c.customerKey === currentCustomerKey) || null);
    console.log(newCustomers);
  }

  async function handleCustomerUpdate() {
    console.log("Updating customer", currentCustomerKey);
    if(!currentCustomerData) return;

    const requestData = {...currentCustomerData, token: token}
    const responseData = await CallAPI(requestData, "adminCustomerUpdate");
    console.log(responseData);
    setTimeout(() => {
      setDisplayEdit(false);
      loadAdminData();
    }, 500);
  }

  const deleteModal = (
    <div style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)"}}>
      <div style={{display: "flex", flexDirection: "column", backgroundColor: "#fff", padding: "2rem"}}>
        <span>{getText("confirmDeleteCustomer", language)}</span>
        <button onClick={() => {setDisplayDelete(false)}}>{getText("cancel", language)}</button>
        <button onClick={() => {handleCustomerDelete()}}>{getText("delete", language)}</button>
      </div>
    </div>
  )

  function handleCustomerDelete() {
    console.log("Deleting customer", currentCustomerKey);
    if(!currentCustomerKey) return;

    const requestData = {customerKey: currentCustomerKey, token: token}
    CallAPI(requestData, "adminCustomerDelete");
    setTimeout(() => {
      setDisplayDelete(false);
      loadAdminData();
    }, 500);
  }

  return (
    <div>
      <div style={{display:"flex", flexDirection:"column", margin: "2rem"}}>
        <h1>{getText("customers", language)}</h1>
        {getText("search", language)}: <input type="text" value={searchString} onChange={(event) => {setSearchString(event.target.value)}} />
        {customerList}
        {displayEdit ? editModal : null}
        {displayDelete ? deleteModal : null}
      </div>
    </div>
  )
}

const formatDateToJapanTimezone = (dateString: string | null): string => {
  if (!dateString) return '-';

  // Parse the input date string to a Date object
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

  // Adjust the time to Japan's timezone (UTC+9)
  const japanTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  // Extract the date components
  const year = japanTime.getUTCFullYear();
  const month = String(japanTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(japanTime.getUTCDate()).padStart(2, '0');
  const hours = String(japanTime.getUTCHours()).padStart(2, '0');
  const minutes = String(japanTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(japanTime.getUTCSeconds()).padStart(2, '0');

  // Format the date to the desired format
  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  return formattedDate;
};