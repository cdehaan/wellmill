import { useCallback, useEffect, useState } from "react";
import CallAPI from "../../Utilities/CallAPI";
import { AdminDataType } from "../../types";
import Customers from "./Customers";
import Addresses from "./Addresses";
import Images from "./Images";
import Coupons from "./Coupons";
import Products from "./Products";
import Login from "./Login";
import { LanguageType, getText } from "./translations";
import CouponGroups from "./CouponGroups";

const registeredEmails = [
  "wellmill@reprocelljp.com",
];

export default function Admin() {
  const [adminData, setAdminData] = useState<AdminDataType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<string>("");
  const [language, setLanguage] = useState<LanguageType>("jp"); // en or jp
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  //function checkAuthentication(email?: string, token?: string) {
  const checkAuthentication = useCallback(async (email?: string, token?: string) => {
    if(!email) {
      email = localStorage.getItem('email') || undefined;
    }
    if(!email) return;

    if(!token) {
      const params = new URLSearchParams(window.location.search);
      const tokenFromQuery = params.get('token');
      token = tokenFromQuery || localStorage.getItem('token') || undefined;
    }
    if(!token) return;

    if (registeredEmails.includes(email)) {
      setEmail(email);
      setIsAuthenticated(true);
      setIsLoading(true);
      await loadAdminData(token);
      setIsLoading(false);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  const handleLogin = (email: string, token: string) => {
    checkAuthentication(email, token);
  };

  function handleLogout() {
    localStorage.removeItem('email');
    localStorage.removeItem('token');
    setEmail("");
    setError("");
    setIsAuthenticated(false);
  }

  async function loadAdminData(token?: string) {
    if (!token) {
      const params = new URLSearchParams(window.location.search);
      const tokenFromQuery = params.get('token');
      token = tokenFromQuery || localStorage.getItem('token') || undefined;
    }
    if(!token) return;

    const dev = false;

    if(dev === true as boolean) {
      setIsLoading(true);
      const response = await fetch('/admin.json');
      if (!response.ok) {
        setIsLoading(false);
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setAdminData(data);
      setIsLoading(false);
    } else {
      const credentials = {
        token: token,
      };
      setIsLoading(true);
      const APIResponse = await CallAPI(credentials, "adminFetch");
      //console.log("APIResponse in Admin");
      //console.log(APIResponse);
      if(APIResponse.error) {
        setError(APIResponse.error);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      if (!APIResponse) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setAdminData(APIResponse.data);
      setIsLoading(false);
    }
  }

  const guests = adminData?.customers.filter(c => c.guest) || [];
  const registeredCustomers = adminData?.customers.filter(c => !c.guest) || [];

  const numGuests = guests.length;
  const numRegisteredCustomers = registeredCustomers.length;
  const dashboard = (
    <div style={{margin: "2rem"}}>
      <h1>{getText("admin", language)}</h1>
      <span style={{display: "flex"}}>{getText("totalCustomers", language)}: {numRegisteredCustomers}</span>
      <span style={{display: "flex"}}>{getText("numberOfGuests", language)}: {numGuests}</span>
    </div>
  )

  let currentElement;

  switch(currentScreen) {
    case "Dashboard":
      currentElement = dashboard
      break;
    case "Customers":
      currentElement = <Customers adminData={adminData} loadAdminData={loadAdminData} isLoading={isLoading} language={language} />
      break;
    case "Addresses":
      currentElement = <Addresses adminData={adminData} loadAdminData={loadAdminData} isLoading={isLoading} language={language} />
      break;
    case "Products":
      currentElement = <Products adminData={adminData} loadAdminData={loadAdminData} isLoading={isLoading} language={language} />
      break;
    case "Images":
      currentElement = <Images adminData={adminData} loadAdminData={loadAdminData} isLoading={isLoading} language={language} />
      break;
    case "Coupons":
      currentElement = <Coupons adminData={adminData} loadAdminData={loadAdminData} isLoading={isLoading} language={language} />
      break;
    case "CouponGroups":
      currentElement = <CouponGroups adminData={adminData} loadAdminData={loadAdminData} isLoading={isLoading} language={language} />
      break;
    default:
      currentElement = dashboard;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} registeredEmails={registeredEmails} errorMessage={error} />;
  }

  return (
    <div style={{position: "absolute", top: 0, bottom: 0, display: "flex", flexDirection:"row", justifyContent: "flex-start", width:"100%"}}>
      <div style={{display: "flex", flexDirection:"column", width: "14rem", padding:"2rem", backgroundColor:"#eee", fontSize: "1.5rem"}}>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Dashboard")}}>{getText("dashboard", language)}</span>
        <hr style={{width: "12rem"}} />
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Customers")}}>{getText("customers", language)}</span>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Addresses")}}> › {getText("addresses", language)}</span>
        <hr style={{width: "12rem"}} />
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Products")}}>{getText("products", language)}</span>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Images")}}> › {getText("images", language)}</span>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("Coupons")}}> › {getText("coupons", language)}</span>
        <span style={{color: "#369"}} onClick={() => {setCurrentScreen("CouponGroups")}}> › {getText("coupongroups", language)}</span>
        <hr style={{width: "12rem"}} />
        <select value={language} onChange={(e) => setLanguage(e.target.value as LanguageType)}>
          <option value="jp">▼ 日本語</option>
          <option value="en">▼ English</option>
        </select>
        <hr style={{width: "12rem"}} />
        <span style={{fontFamily: "mono", fontSize: "0.6rem"}}>{email}</span><br/><span style={{ width: "1rem", height: "1rem", border: "1px solid #800", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0.25rem", background: "rgba(255,128,128,0.5)", fontSize: "0.8rem", }} onClick={handleLogout}>X</span>
        <div style={{fontSize: "0.8rem", textAlign: "end"}}><span onClick={() => {setCurrentScreen("CouponGroups")}}>©</span><span> 2025</span></div>
      </div>
      <div style={{height: "100%", overflowY: "auto", width: "100%"}}>
        {currentElement}
      </div>
      <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: isLoading ? undefined : "none", backgroundColor: "rgba(0,0,0,0.5"}}></div>
    </div>
  )
}