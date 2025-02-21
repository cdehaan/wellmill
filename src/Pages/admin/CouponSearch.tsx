import { useState } from 'react';
import './CouponSearchStyle.css';
import { CouponType } from '../../types';
import CallAPI from '../../Utilities/CallAPI';

const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

type CouponSearchProps = {
  language: string;
  setShowSearchCoupons: (showSearchCoupons: boolean) => void;
};

export default function CouponSearch({ language, setShowSearchCoupons }: CouponSearchProps) {
  const [searchString, setSearchString] = useState<string>("");
  const [searchResults, setSearchResults] = useState<CouponType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeCoupon, setActiveCoupon] = useState<CouponType | null>(null);

  async function handleSearch() {
    setIsLoading(true);
    setSearchResults([]);
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
    setActiveCoupon(activeCoupon?.couponKey === coupon.couponKey ? null : coupon);
  }

  function handleSaveClick() {
    console.log(activeCoupon);
  }

  function handleCancelClick() {
    setActiveCoupon(null);
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
        <h1>Coupon Search</h1>
        <div className='couponSearchInput'>
          <input
            type="text"
            placeholder="Enter coupon code"
            value={searchString}
            onChange={(e) => setSearchString(e.target.value)}
          />
          <span className='searchButton' onClick={handleSearch}>
            {isLoading ? "Searching..." : "Search"}
          </span>
        </div>
        <button onClick={() => setShowSearchCoupons(false)}>Back</button>

        {/* Results Table */}
        {searchResults.length > 0 && (
          <div className="resultsContainer">
            <table className="resultsTable">
              <thead>
                <tr>
                  <th>Coupon Key</th>
                  <th>Code</th>
                  <th>Product Key</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Reward</th>
                  <th>Max Uses</th>
                  <th>Used</th>
                  <th>Last Used</th>
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
                      <td><NumberInput value={activeCoupon?.type ?? coupon.type} field="type" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.target ?? coupon.target} field="target" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.reward ?? coupon.reward} field="reward" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.maxUses ?? coupon.maxUses} field="maxUses" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td><NumberInput value={activeCoupon?.used ?? coupon.used} field="used" active={activeCoupon?.couponKey === coupon.couponKey} /></td>
                      <td>{coupon.lastUsed ? new Date(coupon.lastUsed).toLocaleString() : "Never"}</td>
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
                          <span style={{display:"flex", justifyContent:"center", cursor: "pointer"}}>🗑️</span>
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
