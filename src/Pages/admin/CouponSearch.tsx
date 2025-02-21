import { useState } from 'react';
import './CouponSearchStyle.css';
import { CouponType } from '../../types';

const token = window.location.search ? new URLSearchParams(window.location.search).get('token') || "" : localStorage.getItem('token') || "";

type CouponSearchProps = {
  language: string;
  setShowSearchCoupons: (showSearchCoupons: boolean) => void;
};

export default function CouponSearch({language, setShowSearchCoupons}: CouponSearchProps) {
  const [searchText, setSearchText] = useState<string>("");
  const [searchResults, setSearchResults] = useState<CouponType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [coupon, setCoupon] = useState<CouponType | null>(null);
  return (
    <div className="couponSearchCover">
      <div className='couponSearchModal'>
        <h1>Coupon Search</h1>
        <div className='couponSearchInput'>
          <input type="text" placeholder="Enter coupon code" />
          <span className='searchButton'>Search</span>
        </div>
        <button onClick={() => setShowSearchCoupons(false)}>Back</button>
      </div>
    </div>
  );
}