import { useState } from 'react';
import './CouponSearchStyle.css';
import { CouponType } from '../../types';
import CallAPI from '../../Utilities/CallAPI';

const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

type CouponSearchProps = {
  language: string;
  setShowSearchCoupons: (showSearchCoupons: boolean) => void;
};

export default function CouponSearch({language, setShowSearchCoupons}: CouponSearchProps) {
  const [searchString, setSearchString] = useState<string>("");
  const [searchResults, setSearchResults] = useState<CouponType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [coupon, setCoupon] = useState<CouponType | null>(null);

  async function handleSearch() {
    setIsLoading(true);
    setSearchResults([]);
    const requestBody = {
      token: token,
      searchString: searchString,
    };
    const responseData = await CallAPI(requestBody, 'adminCouponSearch');
    console.log(responseData);
    setIsLoading(false);
  }

  return (
    <div className="couponSearchCover">
      <div className='couponSearchModal'>
        <h1>Coupon Search</h1>
        <div className='couponSearchInput'>
          <input type="text" placeholder="Enter coupon code" value={searchString} onChange={(e) => setSearchString(e.target.value)} />
          <span className='searchButton' onClick={handleSearch}>Search</span>
        </div>
        <button onClick={() => setShowSearchCoupons(false)}>Back</button>
      </div>
    </div>
  );
}