import React, { useContext, useState } from "react";
import Header from "./Pages/Header";
import { Breadcrumb } from "./types";
import { UserContext } from "./Contexts/UserContext";
import styles from './home.module.css'
import { Link } from "react-router-dom";

const breadcrumbs: Breadcrumb[] = [
  //{ text: "ホーム", url: "/" },
];

function Home() {
  const [showMenu, setShowMenu] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("https://well-mill.com/");
  const resetIframe = () => {
    setIframeSrc(`https://well-mill.com/?datetime=${new Date().getTime()}`);
  };

  const { user } = useContext(UserContext);

  const hamburgerIcon = (
    <div className={`${styles.hamburgerWrapper} ${showMenu ? styles.invertChildren : null}`}>
      <div className={styles.hamburger} onClick={() => {setShowMenu(prev => {return !prev;});}}>
        <svg className={styles.hamburger} viewBox="0 40 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path className={styles.topLine}    d={showMenu ? "M50 150L150 50" : "M20 50L180 50"}   stroke="#000" stroke-width="18" stroke-linecap="round"/>
          <path className={styles.middleLine} d={showMenu ? "M99 100H101"    : "M20 100H180"}     stroke="#000" stroke-width="18" stroke-linecap="round"/>
          <path className={styles.bottomLine} d={showMenu ? "M50 50L150 150" : "M20 150L180 150"} stroke="#000" stroke-width="18" stroke-linecap="round"/>
        </svg>
        <span className={styles.hamburger}>{showMenu ? "close" : "menu"}</span>
      </div>
    </div>
  )

  const mainMenu = (
    <div className={styles.mainMenu}>
      <span className={styles.mainMenu}><Link to="/remote-examination">リモート検査とは？</Link></span>
      <span className={styles.mainMenu}><Link to="/contact">お問い合わせ</Link></span>
      {user === null ?
        <span className={styles.mainMenu}><Link to="/login">ログイン</Link></span> :
        <span className={styles.mainMenu}><Link to="/account">マイページ</Link></span>
      }
    </div>
  )

  return(
    <>
      <div className={styles.homeHeader}>
        <div className={styles.homeHeaderLogo} onClick={resetIframe} style={{opacity: (showMenu ? 0 : 1)}}><img className={styles.homeHeaderLogo} src="/logo.svg" alt="Logo" /></div>
        {hamburgerIcon}
      </div>
      <div className={styles.headerWrapper}>
        <Header breadcrumbs={breadcrumbs} onHomeClick={resetIframe} />
      </div>
      {showMenu ? mainMenu : null}
      <iframe 
        src={iframeSrc}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          border: "none",
        }} 
        title="WordPress HomePage"
      />
    </>
  )
}

export default Home

//      <span style={{display: "flex", width: "80%", maxWidth: "80rem", marginTop: "3rem", fontSize: "1.5rem"}}>Place holder for the home page. The home page will be controled by WordPress. Click the header links to explore.</span>
