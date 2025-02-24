import { useEffect, useState } from 'react';
import './CouponSearchStyle.css';
import { CouponType } from '../../types';
import CallAPI from '../../Utilities/CallAPI';
import { getText, LanguageType } from './translations';

const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

type CouponSearchProps = {
  language: LanguageType;
  setShowSearchCoupons: (showSearchCoupons: boolean) => void;
  code?: string;
};

export default function CouponSearch({ language, setShowSearchCoupons, code }: CouponSearchProps) {
  const initialCode = code || "";
  const [searchString, setSearchString] = useState<string>(initialCode);
  const [searchResults, setSearchResults] = useState<CouponType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubset, setIsSubset] = useState<boolean>(false);
  const [activeCoupon, setActiveCoupon] = useState<CouponType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (initialCode) {
      handleSearch();
    }
  }, [initialCode]);

  async function handleSearch() {
    setIsLoading(true);
    setSearchResults([]);
    setErrorMessage("");
    const requestBody = {
      token: token,
      searchString: searchString,
    };
    const responseData = await CallAPI(requestBody, 'adminCouponSearch');

    if (responseData?.data?.coupons) {
      setSearchResults(responseData.data.coupons);
    }
    if (responseData?.data?.count) {
      setIsSubset(responseData.data.count > 100);
    }
    
    setIsLoading(false);
  }

  function handleEditClick(coupon: CouponType) {
    setErrorMessage("");
    setActiveCoupon(activeCoupon?.couponKey === coupon.couponKey ? null : coupon);
  }

  function handleCancelClick() {
    setActiveCoupon(null);
  }

  async function handleSaveClick() {
    if (!activeCoupon) return;
    setErrorMessage("");
    setIsLoading(true);
    
    const requestBody = {
      token,
      coupon: {
        couponKey: activeCoupon.couponKey,
        code: activeCoupon.code,
        productKey: activeCoupon.productKey,
        type: activeCoupon.type,
        target: activeCoupon.target,
        reward: activeCoupon.reward,
        maxUses: activeCoupon.maxUses,
        used: activeCoupon.used,
      }
    };
    
    try {
      const response = await CallAPI(requestBody, 'adminCouponUpdate');
      if (response.error === null) {
        setActiveCoupon(null);
        await handleSearch();
      } else {
        setErrorMessage("Error updating coupon: " + response.error);
      }
    } catch (error) {
      setErrorMessage("Error updating coupon:" + error);
    }
    setIsLoading(false);
  }

  async function handleDeleteClick(couponKey: number) {
    const confirmed = window.confirm("Are you sure you want to delete this coupon?");
    if (!confirmed) return;

    setErrorMessage("");
    setIsLoading(true);

    const requestBody = {
      token,
      couponKey,
    };
    
    try {
      const response = await CallAPI(requestBody, 'adminCouponDelete');
      if (response.error === null) {
        await handleSearch();
      } else {
        setErrorMessage("Error deleting coupon: " + response.error);
      }
    } catch (error) {
      setErrorMessage("Error deleting coupon:" + error);
    }

    setIsLoading(false);
  }

  function handleActiveCouponChange(newValue: string | number, field: keyof CouponType) {
    if (activeCoupon) {
      setActiveCoupon({ ...activeCoupon, [field]: newValue });
    }
  }

  function NumberInput({ value, field, active }: { value: string | number, field: keyof CouponType, active: boolean }) {
    return active ? (
      <input
        type="number"
        value={value}
        className="activeCouponInput"
        onChange={(e) => handleActiveCouponChange(Number(e.target.value), field)}
      />
    ) : (
      <span>{value}</span>
    );
  }

  return (
    <div className="couponSearchCover">
      <div className='couponSearchModal'>
        <h1>{getText("couponSearch", language)}</h1>
        {errorMessage && <p className="errorMessage">{errorMessage}</p>}
        <div className='couponSearchInput'>
          <input
            type="text"
            placeholder={getText("enterCouponCode", language)}
            value={searchString}
            onChange={(e) => setSearchString(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { handleSearch(); } }}
          />
          <span
            className='searchButton'
            onClick={handleSearch}
            tabIndex={0} // Makes it focusable
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { handleSearch(); } }}
            role="button" // Improves accessibility
          >
            {isLoading ? getText("searching...", language) : getText("search", language)}
          </span>
        </div>
        {isSubset ? <span>{getText("100SubsetShown", language)}</span> : null}
        <button onClick={() => setShowSearchCoupons(false)}>{getText("close", language)}</button>

        {/* Results Table */}
        {searchResults.length > 0 && (
          <div className="resultsContainer">
            <table className="resultsTable">
              <thead>
                <tr>
                  <th>{getText("key", language)}</th>
                  <th>{getText("couponCode", language)}</th>
                  <th>{getText("productKey", language)}</th>
                  <th>{getText("type", language)}</th>
                  <th>{getText("couponTarget", language)}</th>
                  <th>{getText("couponReward", language)}</th>
                  <th>{getText("maxUses", language)}</th>
                  <th>{getText("couponsUsed", language)}</th>
                  <th>{getText("lastUsed", language)}</th>
                  <th style={{width: "4rem"}}></th>
                  <th style={{width: "4rem"}}></th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((coupon) => {
                  const isActive = activeCoupon?.couponKey === coupon.couponKey;
                  const isInactive = !isActive && activeCoupon !== null;
                  const typeSelect = (
                    <select id="couponTypeSelect" onChange={(e) => {handleActiveCouponChange(Number(e.target.value), "type")}} disabled={!isActive} value={isActive ? activeCoupon?.type ?? coupon.type ?? 1 : coupon.type ?? 1} name="type" style={{margin: "0 1rem", border: isActive ? undefined : "none", padding: isActive ? undefined : "0", background: isActive ? "#fff" : "transparent"}}>
                      <option value={1}>{getText("couponYenDiscount", language)}</option>
                      <option value={2}>{getText("couponPercentDiscount", language)}</option>
                      <option value={3}>{getText("couponProductDiscount", language)}</option>
                      <option value={5}>{getText("couponProductPercentDiscount", language)}</option>
                    </select>      
                  );
                  return (
                    <tr key={coupon.couponKey} style={{ backgroundColor: isInactive ? '#ccc' : isActive ? 'lightblue' : '#fff', color: isInactive ? "#888" : isActive ? 'black' : 'inherit' }}>
                      <td>{coupon.couponKey}</td>
                      <td>
                        {activeCoupon?.couponKey === coupon.couponKey ? (
                          <input type="text" value={activeCoupon.code || "N/A"} className="activeCouponInput" style={{margin: 0, width: "16rem"}} onChange={(e) => handleActiveCouponChange(e.target.value, 'code')} />
                        ) : (
                          <span>{coupon.code || "N/A"}</span>
                        )}
                      </td>
                      <td><NumberInput value={isActive ? activeCoupon?.productKey ?? coupon.productKey ?? "N/A" : coupon.productKey ?? "N/A"} field="productKey" active={isActive} /></td>
                      <td>{typeSelect}</td>
                      <td><NumberInput value={isActive ? activeCoupon?.target ?? coupon.target : coupon.target} field="target" active={isActive} /></td>
                      <td><NumberInput value={isActive ? activeCoupon?.reward ?? coupon.reward : coupon.reward} field="reward" active={isActive} /></td>
                      <td><NumberInput value={isActive ? activeCoupon?.maxUses ?? coupon.maxUses : coupon.maxUses} field="maxUses" active={isActive} /></td>
                      <td><NumberInput value={isActive ? activeCoupon?.used ?? coupon.used : coupon.used} field="used" active={isActive} /></td>
                      <td>{coupon.lastUsed ? new Date(coupon.lastUsed).toLocaleString() : "-"}</td>
                      <td>
                        {isInactive ? null : isActive ? (
                          <div className='recordButton' onClick={handleSaveClick}>{getText("save", language)}</div>
                        ) : (
                          <span onClick={() => handleEditClick(coupon)} style={{ display:"flex", justifyContent:"center", cursor: 'pointer' }}>✏️</span>
                        )}
                      </td>
                      <td>
                        {isInactive ? null : isActive ? (
                          <div className='recordButton' style={{width: "5rem"}} onClick={handleCancelClick}>{getText("cancel", language)}</div>
                        ) : (
                          <span style={{display:"flex", justifyContent:"center", cursor: "pointer"}} onClick={() => {handleDeleteClick(coupon.couponKey)}}>🗑️</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
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

//                       <td><NumberInput value={couponTypeName(activeCoupon?.type ?? coupon.type, language)} field="type" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
