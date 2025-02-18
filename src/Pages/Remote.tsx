import React from "react";
import '../App.css';
import styles from './remote.module.css'

import Header from "./Header";
import Footer from "./Footer";

function Remote() {
  const breadcrumbs = [
    { text: "ホーム", url: "/" },
    { text: "リモート検査とは？", url: "/remote-examination" },
  ];

  return(
    <>
      <div className="topDots" />
      <Header breadcrumbs={breadcrumbs}/>
      <span className="topHeader" style={{whiteSpace: "nowrap"}}>リモート検査<span className={styles.blackHeader}>とは？</span></span>
      <div className={styles.content}>
        <div className={styles.colorImgGrid}>
          <img className={styles.colorImgMobile} src="remote-01-mobile.png" alt="doctor showing data on a computer screen"/>
          <img className={styles.colorImgMobile} src="remote-02-mobile.png" alt="2 women speaking"/>
        </div>
          <span className={styles.subHeader}>ウェルミルを使うと何が分かる？どんな検査？</span>
          <div className={styles.colorBox} style={{backgroundColor: "#f9f0f7"}}>
            <div className={styles.colorContent}>
                <div>
                    <span className={styles.orange}>ウェルミルは、様々な検査項目を好きな時にいつでも検査できるサービスです。男性ホルモン（テストステロン）や女性ホルモン（エストラジオール）、ストレスホルモン（コルチゾール）といった各種ホルモンに関する「カラダ数値」を定期的にモニタリングすることで、日々のセルフケアに役立てていただくことが可能です。</span>
                    <span className={styles.colorContent}>
                        オンラインショップでお好きな検査項目のキットを選んで購入すると、自宅のポス<br />
                        トに検査キットが届きます。(複数キットご購入の場合は、通常宅配便で届きます)<br />
                        ご都合のよいタイミングで検体を採取して、返送用封筒で送ります。<br />
                        検体を採取した日などの検体情報は、検査キットに同封されている依頼書のQRコー<br />
                        ドを読み込んで、マイページで登録します。<br />
                        当社に検体が到着後、約2週間以内に検査結果(PDF)をお送りします。
                      </span>
                </div>
                <img className={styles.colorImgDesktop} src="remote-1.png" alt="People collecting online results" />
            </div>
          </div>

          <div className={styles.colorImgGrid}>
            <img className={styles.colorImgMobile} src="remote-03-mobile.png" alt="a lab worker running tests"/>
            <img className={styles.colorImgMobile} src="remote-04-mobile.png" alt="a woman checking her mobile phone on the couch"/>
          </div>
          <span className={styles.subHeader}>検体採取って？</span>
          <div className={styles.colorBox} style={{backgroundColor: "#fdf2d8"}}>
            <div className={styles.colorContent}>
                <div>
                    <span className={styles.orange}>採血キット（管理医療機器）やだ液採取キットを使用して簡便に検体の採取が可能です。</span>
                    <span className={styles.colorContent}>
                      ウェルミルのリモート検査は、ご自身で血液やだ液を採取していただいております。<br />
                      だ液採取では、スポンジを口に含んでしみ込ませるだけなので、簡便に採取できます。<br />
                      血液採取では、自己採血専用の、使い捨ての小さな針を使って、指から採血します。<br />
                      少量の血液のみでOKなので、身体への負担も最小限に抑えられます。
                    </span>
                </div>
                <img className={styles.colorImgDesktop} src="remote-2.png" alt="A woman at home checking lab results on her phone" />
            </div>
          </div>


          <div className={styles.colorImgGrid}>
            <img className={styles.colorImgMobile} src="remote-05-mobile.png" alt="a doctor speaking to a patient"/>
            <img className={styles.colorImgMobile} src="remote-06-mobile.png" alt="a man petting a cat"/>
          </div>
          <span className={styles.subHeader}>リモート検査のメリット</span>
          <div className={styles.colorBox} style={{backgroundColor: "#f9f0f7"}}>
            <div className={styles.colorContent}>
                <div>
                    <span className={styles.orange}>自身のカラダ数値を、自分のタイミングで知る。</span>
                    <span className={styles.colorContent}>
                      ウェルミルのリモート検査を活用することで、身体の状態をいつでも自宅で気軽に<br />
                      プレチェックすることができます。<br />
                      ※検査結果は診断ではありません。<br />
                      検査結果数値はプレチェックとしてご利用いただき、体調に不安などがある場合は、<br />
                      かかりつけの病院など医療機関を受診するようお願いいたします。
                    </span>
                </div>
                <img className={styles.colorImgDesktop} src="remote-3.png" alt="A man considering a doctor's appointment" />
            </div>
          </div>


          <span className={styles.subHeader}>検査の流れ</span>
          <div className={styles.colorBox} style={{backgroundColor: "#fcc24c"}}>
            <div className={styles.bubbleWrapper}>

              <div className={styles.bubble}>
                <span className={styles.bubbleNumber}>1</span>
                <div className={styles.bubbleContent}>
                  <span className={styles.bubbleHeader}>キットを購入</span>
                  <span className={styles.bubbleText}>SHOPでお好きなキットを選んで購入します。</span>
                </div>
                <img className={styles.bubbleImg} src="remote-foot-1.png" alt="A shopping cart"/>
              </div>

              <div className={styles.bubble} style={{alignSelf: "flex-end"}}>
                <span className={styles.bubbleNumber}>2</span>
                <div className={styles.bubbleContent}>
                  <span className={styles.bubbleHeader}>郵便受けにキットが届く</span>
                  <span className={styles.bubbleText}>※1個の注文時のみ<br/>
                    複数個注文された場合は、通常の宅配便となります。</span>
                </div>
                <img className={styles.bubbleImg} src="remote-foot-2.png" alt="Blood collection steps"/>
              </div>

              <div className={styles.bubble}>
                <span className={styles.bubbleNumber}>3</span>
                <div className={styles.bubbleContent}>
                  <span className={styles.bubbleHeader}>検体の採取・マイページでID登録</span>
                  <span className={styles.bubbleText}>手順に沿って検体を採取します。マイページで検体ID登録をします。</span>
                </div>
                <img className={styles.bubbleImg} src="remote-foot-3.png" alt="Collecting blood from a finger"/>
              </div>

              <div className={styles.bubble} style={{alignSelf: "flex-end"}}>
                <span className={styles.bubbleNumber}>4</span>
                <div className={styles.bubbleContent}>
                  <span className={styles.bubbleHeader}>検体を郵便で返送</span>
                  <span className={styles.bubbleText}>採取した検体は、ポスト投函またはお近くの郵便局に提出して返送できます。</span>
                </div>
                <img className={styles.bubbleImg} src="remote-foot-4.png" alt="A postbox"/>
              </div>

              <div className={styles.bubble}>
                <span className={styles.bubbleNumber}>5</span>
                <div className={styles.bubbleContent}>
                  <span className={styles.bubbleHeader}>メールで結果確認</span>
                  <span className={styles.bubbleText}>検査が完了しましたらメールに検査結果データ(PDF)が届きます。</span>
                </div>
                <img className={styles.bubbleImg} src="remote-foot-5.png" alt="Generic test results"/>
              </div>

            </div>
          </div>
      </div>
      <Footer />
    </>
  )
}

export default Remote