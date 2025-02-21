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
                </tr>
              </thead>
              <tbody>
                {searchResults.map((coupon) => (
                  <tr key={coupon.couponKey}>
                    <td>{coupon.couponKey}</td>
                    <td>{coupon.code || "N/A"}</td>
                    <td>{coupon.productKey ?? "N/A"}</td>
                    <td>{coupon.type}</td>
                    <td>{coupon.target}</td>
                    <td>{coupon.reward}</td>
                    <td>{coupon.maxUses}</td>
                    <td>{coupon.used}</td>
                    <td>{coupon.lastUsed ? new Date(coupon.lastUsed).toLocaleString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
