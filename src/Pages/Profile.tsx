import React, { ChangeEvent, useContext, useEffect, useState } from "react";

import '../App.css';
import styles from "./profile.module.css"
import Header from "./Header";
import Footer from "./Footer";

import { UserContext } from "../Contexts/UserContext";
import { useUserData } from '../Hooks/useUserData';
import { useBackupDB } from "../Hooks/useBackupDB";
import { CustomerType } from "../types";
import Cookies from "js-cookie";

const breadcrumbs = [
  { text: "ホーム", url: "/" },
  { text: "マイページ", url: "/account" },
  { text: "アカウント情報", url: "/profile" },
];

// Define an interface for input fields
interface InputFields {
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  gender: string;
  birthday: string;
  email: string;
  password: string;
  agreement: boolean;
  existingPassword: string,
  newPassword1: string,
  newPassword2: string,
}

// Define an interface for input errors
interface InputErrors {
  lastName: boolean;
  firstName: boolean;
  lastNameKana: boolean;
  firstNameKana: boolean;
  gender: boolean;
  birthday: boolean;
  email: boolean;
  password: boolean;
  agreement: boolean;
  existingPassword: boolean,
  newPassword1: boolean,
  newPassword2: boolean,
}

function Profile() {
  const { user } = useContext(UserContext);
  const { loginUser, updateUser } = useUserData();
  const {backupCustomerData, data: customerBackupData, error: customerBackupError} = useBackupDB<any>();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputs, setInputs] = useState<InputFields>({
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    gender: '',
    birthday: '',
    email: '',
    password: '',
    agreement: false,
    existingPassword: "",
    newPassword1: "",
    newPassword2: "",  
  });

  const [inputErrors, setInputErrors] = useState<InputErrors>({
    lastName: false,
    firstName: false,
    lastNameKana: false,
    firstNameKana: false,
    gender: false,
    birthday: false,
    email: false,
    password: false,
    agreement: false,
    existingPassword: false,
    newPassword1: false,
    newPassword2: false,
  });

  // When user data becomes available, populate the fields with existing data. Also, on component load.
  // This will also fire when user data is saved, which is fine. (It's a good way to confirm, actually)
  useEffect(() => {
    if(!user) return;

    function PopulateFields() {
      if(!user) return;
      //console.dir(user, { depth: null, colors: true });
      setInputs(prevInputs => {
        return {
          ...prevInputs,
          firstName: user.firstName || prevInputs.firstName,
          lastName: user.lastName || prevInputs.lastName,
          lastNameKana: user.lastNameKana || prevInputs.lastNameKana,
          firstNameKana: user.firstNameKana || prevInputs.firstNameKana,
          gender: user.gender || prevInputs.gender,
          email: user.email || prevInputs.email,
          birthday: user.birthday ? user.birthday.split('T')[0] : prevInputs.birthday, // This cuts the time off
        };
      });
    }
  
    PopulateFields()
  }, [user]);

  function HandleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setInputs({
      ...inputs,
      [name]: newValue,
    });

    setInputErrors({
      ...inputErrors,
      [name]: false, // Reset error state when the user starts typing
    });
  }

  function HandleDateClick(event: React.PointerEvent<HTMLInputElement>) {
    if (event.target instanceof HTMLInputElement && typeof event.target.showPicker === 'function') {
      event.target.showPicker();
    }
  }

  async function HandleRegistrationClick() {
    //console.log("update time. user:")
    //console.dir(user, { depth: null, colors: true });

    // Can't do an update without existing user data
    if(!user) { return; }
    //console.log("ready to go")

    const requiredFields = ['lastName', 'firstName', 'lastNameKana', 'firstNameKana', 'gender', 'birthday'];
    let hasError = false;

    // Check if any required fields are empty
    for (const field of requiredFields) {
      if (inputs[field as keyof InputFields] === '') {
        setInputErrors(prevErrors => ({ ...prevErrors, [field]: true }));
        hasError = true;
      }
    }

    if (hasError) {
      alert('Please fill in all required fields.');
      return;
    }
    //console.log("got everything")

    const userData: CustomerType = {
      type: 'customer',
      lastName: inputs.lastName,
      firstName: inputs.firstName,
      lastNameKana: inputs.lastNameKana,
      firstNameKana: inputs.firstNameKana,
      gender: inputs.gender,
      birthday: inputs.birthday,
      email: inputs.email,
      cart: user.cart,
      addresses: user.addresses,
      purchases: user.purchases,
      coupons: user.coupons,
    };

    // This is my database update
    // A user code (i.e. NV-198) comes back after creating a user, but only a token is returned after an update
    //console.log("Update, with userData:")
    //console.dir(userData, { depth: null, colors: true });
    const response = await updateUser(userData);
    //console.log(response);  // { data: {token: 06...19 }}

    if(response.error) {
      console.log(`Create User Error: ${response.error}`);
      return;
    }

    // This shouldn't happen, it's not needed, so no token is sent back
    if(response.data.token) {
      loginUser({token: response.data.token});
      const subdomain = window.location.hostname.split('.')[0];
      const cookieName = subdomain === 'stage' ? 'WellMillTokenStage' : 'WellMillToken';  
      Cookies.set(cookieName, response.data.token, { expires: 31, sameSite: 'Lax' });
    }

    // Gender can pull from the input, or existing data. Azure wants 0, 1, or 9. 🤷
    const genderNumber = inputs.gender ?
      ((inputs.gender === "male") ? 0 : (inputs.gender === "female") ? 1 : 9) :
      ((user.gender   === "male") ? 0 : (user.gender   === "female") ? 1 : 9);

    // If the user object has addresses, look for the default one, but accept any address if there is no default.
    const address = (user.addresses && user.addresses.length > 0) ? user.addresses.find(address => address.defaultAddress === true) || user.addresses[0] : null;

    // This does the Azure backup. Take input data if available, or existing data, or blank
    backupCustomerData(user.customerKey || 0, user.token || "", `NV${user.customerKey}`, userData.lastName || user.lastName || "", userData.firstName || user.firstName || "", userData.lastNameKana || user.lastNameKana || "", userData.firstNameKana || user.firstNameKana || "", address?.postalCode?.toString() || "", address?.prefCode?.toString() || "", address?.pref || "", address?.city || "", address?.ward || "", address?.address2 || "", user.phoneNumber || "", userData.email || user.email || "", 1, genderNumber, userData.birthday || "");

    setTimeout(() => { window.location.reload(); }, 1000);    
  }

  async function HandlePasswordClick() {
    console.log("update password time. user:")
    console.dir(user, { depth: null, colors: true });

    // Can't do an update without existing user data
    if(!user) { return; }
    console.log("ready to go")

    const requiredFields = ['password', 'newPassword1', 'newPassword2', ];
    let hasError = false;

    // Check if any required fields are empty
    for (const field of requiredFields) {
      if (inputs[field as keyof InputFields] === '') {
        setInputErrors(prevErrors => ({ ...prevErrors, [field]: true }));
        hasError = true;
      }
    }
    console.log("got everything")

    if (hasError) {
      alert('Please fill in all required fields.');
      return;
    }

    // TODO need a better way to send password updates
    const userData: CustomerType = {
      type: 'customer',
      customerKey: user.customerKey,
      password: inputs.password,
      newPassword1: inputs.newPassword1,
      newPassword2: inputs.newPassword2,
      cart: user.cart,
      addresses: user.addresses,
      purchases: user.purchases,
      coupons: user.coupons,
    };

    // This is my database update
    // A user code (e.g. NV-198) comes back after creating a user, but only a token is returned after an update
    console.log("Update, with userData:")
    console.dir(userData, { depth: null, colors: true });
    const response = await updateUser(userData);
    console.log(response);  // { data: {token: 06...19 }}

    if(response.error) {
      console.log(`Create User Error: ${response.error}`);
      alert("旧パスワードが間違っています。")
      return;
    }

    // This shouldn't happen, it's not needed, so no token is sent back
    if(response.data.token) {
      loginUser({token: response.data.token});
      const subdomain = window.location.hostname.split('.')[0];
      const cookieName = subdomain === 'stage' ? 'WellMillTokenStage' : 'WellMillToken';  
      Cookies.set(cookieName, response.data.token, { expires: 31, sameSite: 'Lax' });
    }

    // Gender can pull from the input, or existing data. Azure wants 0, 1, or 9. 🤷
    const genderNumber = inputs.gender ?
      ((inputs.gender === "male") ? 0 : (inputs.gender === "female") ? 1 : 9) :
      ((user.gender   === "male") ? 0 : (user.gender   === "female") ? 1 : 9);

    // If the user object has addresses, look for the default one, but accept any address if there is no default.
    const address = (user.addresses && user.addresses.length > 0) ? user.addresses.find(address => address.defaultAddress === true) || user.addresses[0] : null;

    // This does the Azure backup. Take input data if available, or existing data, or blank
    backupCustomerData(user.customerKey || 0, user.token || "", `NV${user.customerKey}`, userData.lastName || user.lastName || "", userData.firstName || user.firstName || "", userData.lastNameKana || user.lastNameKana || "", userData.firstNameKana || user.firstNameKana || "", address?.postalCode?.toString() || "", address?.prefCode?.toString() || "", address?.pref || "", address?.city || "", address?.ward || "", address?.address2 || "", user.phoneNumber || "", userData.email || user.email || "", 1, genderNumber, userData.birthday || "");

    setTimeout(() => { window.location.reload(); }, 1000);    
  }

  const genderRadio = (
    <div className={styles.genderOptions}>
      <label>
        <input type="radio" name="gender" value="female" checked={inputs.gender === "female"} onChange={HandleInputChange}/>
        <span className={`${styles.radioCircle} ${inputErrors.gender ? styles.inputError : ''}`}></span>女性
      </label>
      <label>
        <input type="radio" name="gender" value="male" checked={inputs.gender === "male"} onChange={HandleInputChange}/>
        <span className={`${styles.radioCircle} ${inputErrors.gender ? styles.inputError : ''}`}></span>男性
      </label>
    </div>
  )

  function HandleModalClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      setShowPasswordModal(false);
    }
  }

  const passwordModal = (
    <div className={styles.passwordModalWrapper} onClick={HandleModalClick}>
      <div className={styles.passwordModalContent}>
        <span className={styles.passwordModalX} onClick={() => {setShowPasswordModal(false)}}>X</span>
        <span className={styles.passwordModalHeader}>パスワード変更</span>
        <span className={styles.passwordModalSubheader}>現在のパスワード</span>
        <input type="password" value={inputs.password} name="password" onChange={HandleInputChange} className={styles.passwordModalPassword} />
        <span className={styles.passwordModalSubheader}>新しいパスワード</span>
        <input type="password" value={inputs.newPassword1} name="newPassword1" onChange={HandleInputChange} className={styles.passwordModalPassword} />
        <span className={styles.passwordModalSubheader}>新しいパスワードの確認</span>
        <input type="password" value={inputs.newPassword2} name="newPassword2" onChange={HandleInputChange} className={styles.passwordModalPassword} />
        <span className={styles.passwordModalInfo}>パスワードは半角英数字で入力してください。</span>
        <span className={styles.passwordModalInfo}>8文字以で入力してください。</span>
        <button onClick={HandlePasswordClick} style={{maxWidth: "100%"}}>変更を保存</button>
      </div>
    </div>
  )

  //console.log("user");
  //console.log(user);

  return(
    <>
      {showPasswordModal && passwordModal}
      <div className="topDots" />
      <Header breadcrumbs={breadcrumbs} />
      <span className="topHeader">アカウント情報</span>
      <div className={styles.contentWrapper}>
        <div className={styles.form}>
          <span className={styles.subheader}>名前を入力してください<span className={styles.red}>必須</span></span>
          <div className={styles.doubleInput}>
            <input type="text" placeholder="姓" onChange={HandleInputChange} name="lastName" value={inputs.lastName} className={`${styles.signup} ${inputErrors.lastName ? styles.inputError : ''}`}></input>
            <input type="text" placeholder="名" onChange={HandleInputChange} name="firstName" value={inputs.firstName} className={`${styles.signup} ${inputErrors.firstName ? styles.inputError : ''}`}></input>
          </div>
          <span className={styles.subheader}>フリガナを入力してください<span className={styles.red}>必須</span></span>
          <div className={styles.doubleInput}>
            <input type="text" placeholder="セイ" onChange={HandleInputChange} name="lastNameKana" value={inputs.lastNameKana} className={`${styles.signup} ${inputErrors.lastNameKana ? styles.inputError : ''}`}></input>
            <input type="text" placeholder="メイ" onChange={HandleInputChange} name="firstNameKana" value={inputs.firstNameKana} className={`${styles.signup} ${inputErrors.firstNameKana ? styles.inputError : ''}`}></input>
          </div>
          <span className={styles.subheader}>性別<span className={styles.red}>必須</span></span>
          {genderRadio}
          <span className={styles.subheader}>生年月日<span className={styles.red}>必須</span></span>
          <input type="date" id="datePicker" onChange={HandleInputChange} onClick={HandleDateClick} name="birthday" value={inputs.birthday} className={`${styles.signup} ${inputErrors.birthday ? styles.inputError : ''}`}/>
          <span className={styles.subheader}>メールアドレス<span className={styles.red}>必須</span></span>
          <input type="email" placeholder="name@example.com" onChange={HandleInputChange} name="email" value={inputs.email} className={`${styles.signup} ${inputErrors.email ? styles.inputError : ''}`}></input>
          <span className={styles.subheader}>パスワード</span>
          <span onClick={() => {setShowPasswordModal(prev => {return !prev})}} style={{textDecoration: "underline", cursor: "pointer"}}>パスワードを変更する</span>
        </div>
        <button className={styles.register} style={{maxWidth: "100%"}} onClick={HandleRegistrationClick}>登録</button>
        {customerBackupData?.Status && false && (<span>{(customerBackupData?.Status === 200) ? "✔" : "Error"}</span>)}
        {customerBackupError && false && (<span>{JSON.stringify(customerBackupError)}</span>)}
      </div>
      <Footer />
    </>
  )
}

export default Profile;