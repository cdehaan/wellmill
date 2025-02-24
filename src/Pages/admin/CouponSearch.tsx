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
          />
          <span className='searchButton' onClick={handleSearch}>
            {isLoading ? getText("searching...", language) : getText("search", language)}
          </span>
        </div>
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
                      <td><NumberInput value={activeCoupon?.productKey ?? coupon.productKey ?? "N/A"} field="productKey" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={couponTypeName(activeCoupon?.type ?? coupon.type, language)} field="type" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.target ?? coupon.target} field="target" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.reward ?? coupon.reward} field="reward" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.maxUses ?? coupon.maxUses} field="maxUses" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.used ?? coupon.used} field="used" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td>{coupon.lastUsed ? new Date(coupon.lastUsed).toLocaleString() : "-"}</td>
                      <td>
                        {isInactive ? null : isActive ? (
                          <div className='recordButton' onClick={handleSaveClick}>Save</div>
                        ) : (
                          <span onClick={() => handleEditClick(coupon)} style={{ display:"flex", justifyContent:"center", cursor: 'pointer' }}>✏️</span>
                        )}
                      </td>
                      <td>
                        {isInactive ? null : isActive ? (
                          <div className='recordButton' onClick={handleCancelClick}>Cancel</div>
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
