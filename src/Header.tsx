import React, { useState } from "react";
import './App.css';
import styles from './header.module.css'
import { Link } from "react-router-dom";
import { useUserData } from "./useUserData";
import { Breadcrumb } from "./types";

// Specify the prop type for the Header component
interface HeaderProps {
    breadcrumbs: Breadcrumb[];
    onHomeClick?: () => void;
}

function Header({ breadcrumbs, onHomeClick }: HeaderProps) {
    const [showMenu, setShowMenu] = useState(false);

    const {user, cartLoading} = useUserData();
    const cart = user ? user.cart : undefined;
    const cartQuantity = cart?.lines ? cart.lines.reduce((total, lineItem) => { return total + lineItem.quantity; }, 0) : 0;
    //const cartCost = cart?.lines ? cart.lines.reduce((total, lineItem) => { return total + lineItem.unitPrice * (1+lineItem.taxRate) * lineItem.quantity; }, 0) : 0;

    const spinner = <img className={styles.cartDotSpinnerSpinner} src="spinner.svg" alt="Spinner"/>;
    const cartDotContent = cartLoading ? spinner : cartQuantity;
    const cartDot = (cartQuantity && cartQuantity > 0) ? <span className={styles.cartDot}>{cartDotContent}</span> : null
    const headerButtonLink = (
        user === null ? <Link to="/login">ログイン</Link> : <Link to="/account">マイページ</Link>
    )

    const handleHomeClick = () => {
        if (onHomeClick) { onHomeClick(); }
    };

    const hamburgerIcon = (
        <div className={styles.hamburger} onClick={() => {setShowMenu(prev => {return !prev;});}}>
            <svg className={styles.hamburger} viewBox="0 40 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path className={styles.topLine}    d={showMenu ? "M50 150L150 50" : "M20 50L180 50"}   stroke="#000" stroke-width="18" stroke-linecap="round"/>
                <path className={styles.middleLine} d={showMenu ? "M99 100H101"    : "M20 100H180"}     stroke="#000" stroke-width="18" stroke-linecap="round"/>
                <path className={styles.bottomLine} d={showMenu ? "M50 50L150 150" : "M20 150L180 150"} stroke="#000" stroke-width="18" stroke-linecap="round"/>
            </svg>
            <span className={styles.hamburger}>{showMenu ? "close" : "menu"}</span>
        </div>
    )    

    const mainMenu = (
        <div className={styles.mainMenu} style={{transform: showMenu ? "translateX(0)" : "translateX(100vw)"}}>
            <span className={styles.mainMenu}><Link to="/">ホーム</Link></span>
            <span className={styles.mainMenu}><Link to="/remote-examination">リモート検査とは？</Link></span>
            <span className={styles.mainMenu}><Link to="/shop">SHOP</Link></span>
            <span className={styles.mainMenu}><Link to="/contact">お問い合わせ</Link></span>
            {user === null ?
            <span className={styles.mainMenu}><Link to="/login">ログイン</Link></span> :
            <span className={styles.mainMenu}><Link to="/account">マイページ</Link></span>
            }
        </div>          
    )

    return (
        <>
            <div className={styles.header}>
                <div className={styles.headerLogo}><Link to="/" onClick={handleHomeClick}><img src="logo.svg" alt="Logo" /></Link>
                </div>
                <div className={styles.navItems}>
                    <div className={styles.navItem}><Link to="/remote-examination">モータリング検索は?</Link></div>
                    <div className={styles.navItem} style={{fontSize: "1.2rem"}}><Link to="/shop">SHOP</Link></div>
                    <div className={styles.navItem}><Link to="/contact">お問い合わせ</Link></div>
                    <div className={[styles.navItem, styles.loginButton].join(' ')}>{headerButtonLink}</div>
                    <div className={[styles.navItem, styles.cart].join(' ')}>
                        <Link to="/cart"><img className={styles.cart} src="cart.png" alt="Cart" />{cartDot}</Link>
                    </div>
                    {hamburgerIcon}
                </div>
            </div>
            <div className={styles.breadcrumbs}>
                {breadcrumbs.map((breadcrumb, index) => (
                    <span key={index}>
                        <Link to={breadcrumb.url}>{breadcrumb.text}</Link>
                        {index < breadcrumbs.length - 1 && " ›› "}
                    </span>
                ))}
            </div>
            {mainMenu}
        </>
    )
}

export default Header