import { useEffect, useState } from "react";
import { AdminDataType, Customer } from "../../types";
import CallAPI from "../../Utilities/CallAPI";

type CustomersProps = {
  adminData: AdminDataType | null;
  loadAdminData: () => void;
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
  fieldName: keyof Customer; // eg: 'customerKey'
  desc: boolean;
};

const buttonStyle = {
  width: "4rem", 
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

export default function Customers({ adminData, loadAdminData }: CustomersProps) {
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
    const fieldName = event.target.getAttribute('data-name') as keyof Customer;
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
  }, [currentCustomerKey]);

  const customers = adminData?.customers;
  if (!customers) return <span>Loading...</span>;

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
      <span style={{width:  "6rem"}}>購入数</span>
      <span style={{width:  "4rem"}} onClick={handleSortClick} data-name="customerKey">{customerSortField.fieldName === "customerKey" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }Key</span>
      <span style={{width: "10rem"}} onClick={handleSortClick} data-name="firstName">{customerSortField.fieldName === "firstName" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }firstName</span>
      <span style={{width: "10rem"}} onClick={handleSortClick} data-name="lastName">{customerSortField.fieldName === "lastName" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }lastName</span>
      <span style={{width: "10rem"}} onClick={handleSortClick} data-name="firstNameKana">{customerSortField.fieldName === "firstNameKana" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }firstNameKana</span>
      <span style={{width: "10rem"}} onClick={handleSortClick} data-name="lastNameKana">{customerSortField.fieldName === "lastNameKana" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }lastNameKana</span>
      <span style={{width:  "6rem"}} onClick={handleSortClick} data-name="gender">{customerSortField.fieldName === "gender" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }gender</span>
      <span style={{width: "10rem"}} onClick={handleSortClick} data-name="birthday">{customerSortField.fieldName === "birthday" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }birthday</span>
      <span style={{width: "20rem"}} onClick={handleSortClick} data-name="email">{customerSortField.fieldName === "email" ? customerSortField.desc === true ? "▲ " : "▼ " : "■ " }email</span>
      <span style={{width:  "4rem"}}>terms</span>
    </div>
  )

  const purchaseHeader = (
    <div style={{display:"flex", padding: "0.5rem", backgroundColor:"#4bc387"}}>
      <span style={{width:  "6rem"}}>商品の数量</span>
      <span style={{width: "20rem"}}>Stripe ID</span>
      <span style={{width: "15rem"}}>Email</span>
      <span style={{width: "10rem"}}>Payment Status</span>
      <span style={{width: "10rem"}}>First Add</span>
      <span style={{width: "10rem"}}>Purchased</span>
      <span style={{width: "10rem"}}>Refunded</span>
      <span style={{width: "10rem"}}>Total</span>
      <span style={{width: "10rem"}}>Coupon discount</span>
    </div>
  );

  const lineItemHeader = (
    <div style={{display:"flex", padding: "0.5rem", backgroundColor:"#ebeb47"}}>
      <span style={{width:  "6rem"}}>Product</span>
      <span style={{width: "25rem"}}>Title</span>
      <span style={{width: "10rem"}}>Quantity</span>
      <span style={{width: "10rem"}}>Unit Price</span>
      <span style={{width: "10rem"}}>Shipping Status</span>
    </div>
  );

  console.log(adminData);
  let colourToggle = 0;

  const customerList = customersSorted.map((customer, index) => {
    if (!customer.customerKey) return null;
    if (customer.customerKey <= 17) return null;

    let haystack = (customer.firstName || "") + (customer.lastName || "") + (customer.firstNameKana || "") + (customer.lastNameKana || "") + (customer.email || "");

    const defaultAddress = adminData.addresses.find(a => a.customerKey === customer.customerKey && a.defaultAddress);
    const defaultAddressElement = defaultAddress ? (<div style={{backgroundColor:"#def"}}>Current default address: {(defaultAddress.firstName || "")} {(defaultAddress.lastName || "")} {(defaultAddress.postalCode || "")} {(defaultAddress.pref || "")} {(defaultAddress.city || "")} {(defaultAddress.ward || "")} {(defaultAddress.address2 || "")} {(defaultAddress.phoneNumber || "")}</div>) : null;
    haystack += (defaultAddress?.firstName || "") + (defaultAddress?.lastName || "") + (defaultAddress?.postalCode || "") + (defaultAddress?.pref || "") + (defaultAddress?.city || "") + (defaultAddress?.ward || "") + (defaultAddress?.address2 || "") + (defaultAddress?.phoneNumber || "");

    const purchases = adminData.purchases.filter(p => p.customerKey === customer.customerKey);
    if (purchases.length === 0 && customer.firstName === null && customer.lastName === null && customer.email === null) return null;

    for (const purchase of purchases) {
      const billingAddress = adminData.addresses.find(a => a.addressKey === purchase.addressKey);
      haystack = haystack + (purchase.email) + (billingAddress?.firstName || "") + (billingAddress?.lastName || "") + (billingAddress?.postalCode || "") + (billingAddress?.pref || "") + (billingAddress?.city || "") + (billingAddress?.ward || "") + (billingAddress?.address2 || "") + (billingAddress?.phoneNumber || "");
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
          <span style={{marginRight: "1rem"}}>Billing address: </span>
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
              <span style={{width: "10rem"}}>{li.shippingStatus || "-"}</span>
            </div>
            {itemShippingAddress}
          </>
        )
      });

      const allLineItemInfo = <div style={{margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>{lineItemHeader}{lineItemList}</div>
      const conditionalItemInfo = (lineItems.length === 0) ? <div style={{display:"flex", backgroundColor: "#ffa", padding: "0.5rem", margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>No line items</div> : allLineItemInfo;

      return (
        <>
          <div key={purchase.purchaseKey} style={{display:"flex", backgroundColor: "#dfe", padding: "0.5rem"}}>
            <span style={buttonStyle} onClick={() => {togglePurchaseExpansion(purchase.purchaseKey || 0)}}>{lineItems.length} ⌄</span>
            <span style={{width: "20rem"}}>{purchase.paymentIntentId || "-"}</span>
            <span style={{width: "15rem"}}>{purchase.email || "-"}</span>
            <span style={{width: "10rem"}}>{purchase.status || "-"}</span>
            <span style={{width: "10rem"}}>{formatDateToJapanTimezone(purchase.creationTime)}</span>
            <span style={{width: "10rem"}}>{formatDateToJapanTimezone(purchase.purchaseTime)}</span>
            <span style={{width: "10rem"}}>{formatDateToJapanTimezone(purchase.refundTime)}</span>
            <span style={{width: "10rem"}}>¥{purchase.amount || 0}</span>
            <span style={{width: "10rem"}}>¥{purchase.couponDiscount || 0}</span>
          </div>
          {expandedPurchases.has(purchase.purchaseKey) ? (billingAddressInfo) : null}
          {expandedPurchases.has(purchase.purchaseKey) ? (conditionalItemInfo) : null}
        </>
      )
    });

    const allPurcahseInfo = <div style={{margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>{purchaseHeader}{purchaseList}</div>
    const conditionalPurchaseInfo = (purchases.length === 0) ? <div style={{display:"flex", backgroundColor: "#dfe", padding: "0.5rem", margin: "1.5rem", marginTop: 0, marginBottom:"0.5rem"}}>No purchases</div> : allPurcahseInfo;

    colourToggle++;
    const backgroundColor = (colourToggle%2 === 1) ? "#def" : "#def"; //"#fff";
    return (
      <div key={customer.customerKey} style={{border: "2px solid #000", marginTop: "0.5rem", padding: "0.5rem", borderRadius: "0.5rem"}}>
        {customerHeader}
        <div key={customer.customerKey} style={{display:"flex", backgroundColor: backgroundColor, padding: "0.5rem"}}>
          <span style={buttonStyle} onClick={() => {toggleCustomerExpansion(customer.customerKey || 0)}}>⌄ {meaningfulPurchases} <span style={{color: "#888", fontSize:"0.7rem", margin: "0 0.25rem"}}>({purchases.length})</span></span>
          <span style={{width:  "4rem"}}>{customer.customerKey}</span>
          <span style={{width: "10rem"}}>{customer.firstName}</span>
          <span style={{width: "10rem"}}>{customer.lastName}</span>
          <span style={{width: "10rem"}}>{customer.firstNameKana}</span>
          <span style={{width: "10rem"}}>{customer.lastNameKana}</span>
          <span style={{width:  "6rem"}}>{customer.gender}</span>
          <span style={{width: "10rem"}}>{customer.birthday?.substring(0,10)}</span>
          <span style={{width: "20rem"}}>{customer.email}</span>
          <span style={{width:  "4rem", flexGrow: 1}}><input type="checkbox" checked={meaningfulPurchases > 0} disabled={true} /></span>
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
          <span style={spanStyle}>First Name:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("firstName", event.target.value)}} value={currentCustomerData?.firstName || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>Last Name:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("lastName", event.target.value)}} value={currentCustomerData?.lastName || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>First Name Kana:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("firstNameKana", event.target.value)}} value={currentCustomerData?.firstNameKana || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>Last Name Kana:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("lastNameKana", event.target.value)}} value={currentCustomerData?.lastNameKana || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>Gender</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("gender", event.target.value)}} value={currentCustomerData?.gender || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>Birthday:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("birthday", event.target.value)}} value={currentCustomerData?.birthday?.substring(0,10) || ""} />
        </div>
        <div style={rowStyle}>
          <span style={spanStyle}>Email:</span>
          <input type="text" style={fieldStyle} onChange={(event) => {handleFieldChange("email", event.target.value)}} value={currentCustomerData?.email || ""} />
        </div>
        <button onClick={() => {setDisplayEdit(false)}}>Cancel</button>
        <button onClick={() => {handleCustomerUpdate()}}>Save</button>
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
        <span>Are you sure you want to delete this customer?</span>
        <button onClick={() => {setDisplayDelete(false)}}>Cancel</button>
        <button onClick={() => {handleCustomerDelete()}}>Delete</button>
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
        <h1>Customers</h1>
        Search: <input type="text" value={searchString} onChange={(event) => {setSearchString(event.target.value)}} />
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