import { useEffect, useState } from "react";
import CallAPI from "../../Utilities/CallAPI";
import { AdminDataType } from "../../types";
import Customers from "./Customers";
import Addresses from "./Addresses";
import Images from "./Images";

export default function Admin() {
  const [adminData, setAdminData] = useState<AdminDataType | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>("");

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    let token;
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      token = params.get('token') || "";
    }

    const dev = false;

    if(dev === true as boolean) {
      const response = await fetch('/admin.json');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setAdminData(data);  
    } else {
      const credentials = {
        token: token,
      };  
      const APIResponse = await CallAPI(credentials, "adminFetch");
      console.log("APIResponse in Admin");
      console.log(APIResponse);
      if (!APIResponse) return;
      setAdminData(APIResponse.data);  
    }
  }

  const guests = adminData?.customers.filter(c => c.guest) || [];
  const registeredCustomers = adminData?.customers.filter(c => !c.guest) || [];

  const numGuests = guests.length;
  const numRegisteredCustomers = registeredCustomers.length;
  const dashboard = (
    <div style={{margin: "2rem"}}>
      <h1>Admin</h1>
      <span style={{display: "flex"}}>Number of guests: {numGuests}</span>
      <span style={{display: "flex"}}>Number of registered customers: {numRegisteredCustomers}</span>
    </div>
  )

  let currentElement;

  switch(currentScreen) {
    case "Dashboard":
      currentElement = dashboard
      break;
    case "Customers":
      currentElement = <Customers adminData={adminData} loadAdminData={loadAdminData} />
      break;
    case "Addresses":
      currentElement = <Addresses adminData={adminData} loadAdminData={loadAdminData} />
      break;
    //case "Purchases":
    //  currentElement = <Purchases adminData={adminData} loadAdminData={loadAdminData} />
    //  break;
    //case "LineItems":
    //  currentElement = <LineItems adminData={adminData} loadAdminData={loadAdminData} />
    //  break;
    //case "Products":
    //  currentElement = <Products adminData={adminData} loadAdminData={loadAdminData} />
    //  break;
    case "Images":
      currentElement = <Images adminData={adminData} loadAdminData={loadAdminData} />
      break;
    //case "Coupons":
    //  currentElement = <Coupons adminData={adminData} loadAdminData={loadAdminData} />
    //  break;
    default:
      currentElement = dashboard;
  }

  return (
    <div style={{position: "absolute", top: 0, bottom: 0, display: "flex", flexDirection:"row", justifyContent: "flex-start", width:"100%"}}>
      <div style={{display: "flex", flexDirection:"column", width: "10rem", padding:"2rem", backgroundColor:"#eee", fontSize: "1.5rem"}}>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Dashboard")}}>Dashboard</span>
        <hr style={{width: "8rem"}} />
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Customers")}}>Customers</span>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Addresses")}}> › Addresses</span>
        <span style={{color: "#888"}}> › Purchases</span>
        <span style={{color: "#888"}}> › › Line Items</span>
        <hr style={{width: "8rem"}} />
        <span style={{color: "#888"}}>Products</span>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Images")}}> › Images</span>
        <span style={{color: "#888"}}> › Coupons</span>
      </div>
      <div style={{height: "100%", overflowY: "auto", width: "100%"}}>
        {currentElement}
      </div>
    </div>
  )
}