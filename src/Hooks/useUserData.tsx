import { useContext, useCallback } from 'react';
import Cookies from 'js-cookie';

import { UserContext } from '../Contexts/UserContext';
import { useBackupDB } from "../Hooks/useBackupDB";
import { useProducts } from "../Contexts/ProductContext";

import CallAPI from '../Utilities/CallAPI';

import { Customer, UserCredentials, Cart, CartLine, Address, Product, LineItemAddressesArray, LineItem, Purchase, Image, emptyCustomer } from '../types';
import ProcessCustomer from '../Utilities/ProcessCustomer';
import { prefectures } from '../Utilities/addressData';

//#region Type definitions
type APIResponse = {
  data: any | null;
  error: string | null;
};

type UseUserDataReturnType = {
  createUser: (userData: Customer) => Promise<APIResponse>;
  updateUser: (userData: Customer) => Promise<APIResponse>;
  registerGuest: () => Promise<APIResponse>;
  loginUser: (credentials: UserCredentials) => Promise<APIResponse>;
  logoutUser: () => boolean;
  addAddress: (address: Address) => Promise<APIResponse>;
  deleteAddress: (addressKey: number) => Promise<APIResponse>;  

  addToCart: (productKey: number, quantity: number, explicitUser? : Customer) => Promise<APIResponse>;
  updateCartQuantity: (lineItemKey: number, quantity: number) => Promise<APIResponse>;
  deleteFromCart: (lineItemKey: number) => Promise<APIResponse>;

  createPaymentIntent: (cartLines: CartLine[], addressesState: LineItemAddressesArray) => Promise<APIResponse>;
  finalizePurchase: (paymentIntentId: string, email: string, billingAddressKey: number) => Promise<APIResponse>;
  cancelPurchase: (purchaseKey: number) => Promise<APIResponse>;
  printReceipt: (purchaseKey: number) => Promise<APIResponse>;
};
//#endregion Type definitions


export const useUserData = (): UseUserDataReturnType => {
  const context = useContext(UserContext);
  if (!context) { throw new Error('useUserData must be used within a UserProvider'); }

  const { user, setUser, setCartLoading, setUserLoading, guest } = context;
  const { products, isLoading: productsLoading, error: productsError } = useProducts();
  const {backupCustomerData, data: customerBackupData, error: customerBackupError} = useBackupDB<any>();

  const createUser = async (userData: Customer): Promise<APIResponse> => {
    setUserLoading(true);
    const APIResponse = await CallAPI(userData, "createUser");
    //console.log("APIResponse after create API call:");
    //console.log(APIResponse);

    if(APIResponse.error) {
      console.log(APIResponse);
      //console.log(APIResponse.error);
      return { data: null, error: APIResponse.error };
    }

    if(!APIResponse.data.token) {
      console.log("No token returned on user create");
      return { data: null, error: "No token returned on user create" };
    }

    if(!APIResponse.data.code) {
      console.log("No code returned on user create");
      return { data: null, error: "No code returned on user create" };
    }

    userData.token = APIResponse.data.token;
    userData.code = APIResponse.data.code;
    delete userData.password;
    setUser(userData);
    setUserLoading(false);
    return { data: APIResponse.data, error: null };  
  };

  const updateUser = async (userData: Customer): Promise<APIResponse> => {
    setUserLoading(true);
    const APIResponse = await CallAPI({...userData, customerKey: user?.customerKey, token: user?.token}, "updateUser");

    if(APIResponse.error) {
      console.log(APIResponse.error);
      return { data: null, error: APIResponse.error };
    }

    if(!APIResponse.data.code) {
      console.log("No code returned on user create");
      return { data: null, error: "No code returned on user create" };
    }

    delete userData.password;

    // If the update is partial, keep existing data that isn't overwritten
    setUser(prev => {
      const newUserData = {...prev, ...userData}
      return newUserData
    });

    setUserLoading(false);
    return { data: APIResponse.data, error: null };  
  };

  const loginUser = async (credentials: UserCredentials): Promise<APIResponse> => {
    setUserLoading(true);
    const APIResponse = await CallAPI(credentials, "login");
    //console.log(`APIResponse after login API call with credentials ${credentials}:`);
    //console.log(APIResponse);

    if(APIResponse.error) {
      console.log("Login error:");
      console.log(APIResponse.error);
      return { data: null, error: APIResponse.error };
    }

    //console.log("Set user after login:");
    //console.log(APIResponse.data.customerData);

    UpdateUser(APIResponse.data.customerData)
    setUserLoading(false);
    return{ data: APIResponse.data.customerData, error: null };
  };

  function logoutUser() {
    const subdomain = window.location.hostname.split('.')[0];
    const variableSuffix = subdomain === 'stage' ? 'Stage' : '';

    const cookieName = 'WellMillToken' + variableSuffix;
    Cookies.remove(cookieName);

    const localStorageKeys = ["userLocal", "user", "couponDiscount", "coupons", "sampleID", "paymentIntentId"]
    localStorageKeys.forEach(key => {
      localStorage.removeItem(key + variableSuffix);
    });

    setUser(emptyCustomer);
    return true;
  }

  async function registerGuest() {
    const APIResponse = await CallAPI({}, "registerGuest");    

    if(APIResponse.error) {
      console.log(APIResponse.error);
      return { data: null, error: APIResponse.error };
    }

    if(!APIResponse.data.code) {
      console.log("No code returned on user create");
      return { data: null, error: "No code returned on user create" };
    }

    if (APIResponse.data?.token) {
      const subdomain = window.location.hostname.split('.')[0];
      const cookieName = subdomain === 'stage' ? 'WellMillTokenStage' : 'WellMillToken';
      Cookies.set(cookieName, APIResponse.data.token, { expires: 31, sameSite: 'Lax' });
    }

    setUser((prev) => {
      const newUser = {...prev, ...APIResponse.data}
      return newUser;
    });

    return { data: {...user, ...APIResponse.data}, error: null };  
  }




  //#region Add address
  // Add can also be used to update, if an addressKey is present in the address data
  async function addAddress(address: Address) {
    setUserLoading(true);
    const addAddressResults = addAddressFunction(address);
    setUserLoading(false);
    return addAddressResults;

    async function addAddressFunction(address: Address) {
      if(!user?.customerKey) {
        return addAddressLocal(address);
      }

      if(!user)             return { data: null, error: "No user data available when adding remote address" };
      if(!user.customerKey) return { data: null, error: "No customerKey available when adding remote address" };
      if(!user.token)       return { data: null, error: "No token available when adding remote address" };

      const APIResponse = await CallAPI({...address, customerKey: user.customerKey, token: user.token}, "addAddress");

      // Error returned in response
      if(APIResponse.error) {
        console.log("APIResponse error in addAddress:")
        console.log(APIResponse.error);
        return { data: null, error: APIResponse.error };
      }

      // Got a reply, but no addresses data
      if(!APIResponse.data?.addresses) {
        console.log("No address data returned after editing customer addresses. Error message: ")
        console.log(APIResponse.error);
        return { data: null, error: APIResponse.error };
      }

      // Update the user's address data, then store the user's data
      const freshUser = { ...user, addresses: APIResponse.data.addresses }
      UpdateUser(freshUser);
      return { data: freshUser, error: null };  
    }
  }

  const addAddressLocal = useCallback((address: Address) => {
    if(!user) return { data: null, error: "No user data available when adding local address" };

    // Take the prefecture's code, a number, and fill in the text
    const prefCode = address?.prefCode || NaN;
    if(!isNaN(prefCode)) { address.pref = prefectures.find(pref => pref.code === prefCode)?.name }

    // if new address's defaultAddress come in unset, undefined, null, etc should be "false", otherwise "true"
    if(!address.defaultAddress) address.defaultAddress = false;
    else                        address.defaultAddress = true;

    // If this is the only address, it must be default
    if(user.addresses.length === 0) {
      address.defaultAddress = true;
    }

    // If all other addresses are not default, it must be default
    if(!user.addresses.find(addr => {return (addr.defaultAddress === true && addr.addressKey !== address.addressKey)})) {
      address.defaultAddress = true;
    }

    // If the new address is default, all others must not be
    if(address.defaultAddress === true) {
      user.addresses.forEach(addr => {
        if(addr.addressKey !== address.addressKey) addr.defaultAddress = false;
      });
    }

    const addressesClone = [ ...user.addresses ];

    const existingIndex = addressesClone.findIndex(ads => ads.addressKey === address.addressKey);

    if (existingIndex !== -1) {
      // If an address with the same key exists, update that
      addressesClone[existingIndex] = { ...address, addressKey: addressesClone[existingIndex].addressKey };
    } else {
      // If no address with the same key exists, add a new address
      // Random addressKey (more than a million, so I can see at a glance in the database) while it's stored locally
      const addressKeyLocal = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1000002) + 1000001);
      addressesClone.push({ ...address, addressKey: addressKeyLocal });
    }

    const userClone = { ...user, addresses: addressesClone};
    UpdateUser(userClone);
    localStorage.setItem('userLocal', JSON.stringify(userClone));
    return { data: userClone, error: null };
  }, [user]);
  //#endregion


  //#region Delete address
  async function deleteAddress(addressKey: number) {
    setUserLoading(true);
    const deleteAddressResults = deleteAddressFunction(addressKey);
    setUserLoading(false);
    return deleteAddressResults;

    async function deleteAddressFunction(addressKey: number) {
      if(!user?.customerKey) {
        return deleteAddressLocal(addressKey);
      }

      if(!user)             return { data: null, error: "No user data available when deleting address" };
      if(!user.customerKey) return { data: null, error: "No customerKey available when deleting address" };
      if(!user.token)       return { data: null, error: "No token available when deleting address" };

      const APIResponse = await CallAPI({addressKey: addressKey, customerKey: user.customerKey, token: user.token}, "deleteAddress");

      // Error returned in response
      if(APIResponse.error) {
        const errorMessage = "APIResponse error: " + APIResponse.error
        console.log(errorMessage);
        return { data: null, error: errorMessage };
      }

      // Got a reply, but no addresses data
      if(!APIResponse.data?.addresses) {
        const errorMessage = "No address data returned after deleting customer addresses. Error message: " + APIResponse.error;
        console.log(errorMessage);
        return { data: null, error: errorMessage };
      }

      // Update the user's address data, then store the user's data
      const freshUser = { ...user, addresses: APIResponse.data.addresses }
      UpdateUser(freshUser);
      return { data: freshUser, error: null };
    }
  }

  const deleteAddressLocal = useCallback((addressKey: number) => {
    if(!user) return { data: null, error: "No user data available when deleting local address" };

    const addressesClone = user.addresses.filter(ads => {return ads.addressKey !== addressKey});
    const userClone = { ...user, addresses: addressesClone};
    UpdateUser(userClone);
    localStorage.setItem('userLocal', JSON.stringify(userClone));
    return { data: userClone, error: null };
  }, [user]);
  //#endregion





  //#region Add to cart
  const addToCart = useCallback(async (productKey: number, quantity: number, explicitUser? : Customer ) => {
    setCartLoading(true);
    if(explicitUser) {
      //console.log("Explicit user in addToCart in useUserData:");
      //console.log(explicitUser);
    }
    const currentUser = explicitUser || user || null;
    const updatedCart = await addToCartFunction(productKey, quantity, currentUser);
    setCartLoading(false);
    return updatedCart;

    async function addToCartFunction(productKey: number, quantity: number, currentUser: Customer | null) {
      if(!currentUser) return { data: null, error: "No user data available when adding to cart" };
      const product = products?.find(product => {return product.productKey === productKey});
      if(!product) {
        console.log(`Error in addToCart in useUserData - product not found. productKey: ${productKey}, products:`);
        console.log(products);
        return { data: null, error: "Product not found" };
      }
  
      if(!currentUser?.customerKey) {
        console.log("No customer key available when adding to cart, so adding to local cart.");
        return addToCartLocal(product, quantity);
      }
  
      // currentUser must be used because when a guest adds to cart, the guest will be registered (given a customerKey and token) but this update might not be reflected in the user state yet
      if(!currentUser)             return { data: null, error: "No customer key available when adding to remote cart" };
      if(!currentUser.customerKey) return { data: null, error: "No customer key available when adding to remote cart" };
      if(!currentUser.token)       return { data: null, error: "No token available when adding to remote cart" };
      const requestBody = {productKey: productKey, customerKey: currentUser.customerKey, token: currentUser.token, unitPrice: product.price, taxRate: product.taxRate, quantity: quantity};
      const APIResponse = await CallAPI(requestBody, "addToCart");

      if(APIResponse.error) {
        console.log("Error in addToCart in useUserData:");
        console.log(APIResponse);
        return { data: null, error: APIResponse.error };
      }
  
      console.log("Updating user in addToCart in useUserData:");
      console.log(APIResponse.data);
      UpdateUser(APIResponse.data);
      return { data: APIResponse.data, error: null };
    }
  }, [products, guest, user]);

  const addToCartLocal = useCallback((product: Product, quantity: number) => {
    // No cart or no lines is ok for add to cart
    if(!user) return { data: null, error: "No user data available when adding to local cart" };

    const cartClone = { ...user.cart };
    const linesClone = cartClone.lines;

    // If an identical item is already in the cart, add to its quantity
    // If no identical item is found, make a new line item
    const existingLineItem = linesClone.find(line => {
      return (
        line.productKey === product.productKey &&
        line.unitPrice === product.price &&
        line.taxRate === product.taxRate
      )
    });
    if(existingLineItem) {
      existingLineItem.quantity += quantity;
    }
    else {
      // random (more than a million, so I can see at a glance in the database) lineItemKey while it's stored locally
      const lineItemKeyLocal = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER -1000002) +1000001)
      linesClone.push({type: 'cartLine',lineItemKey: lineItemKeyLocal, productKey: product.productKey, unitPrice: product.price, taxRate: product.taxRate, quantity})
    }

    // Update cart meta-data
    const updatedCart = UpdateCartMetadata(cartClone)

    const userClone = { ...user, cart: updatedCart};
    UpdateUser(userClone);
    localStorage.setItem('userLocal', JSON.stringify(userClone));
    return { data: updatedCart, error: null };
  }, [user]);
  //#endregion


  //#region Update cart quantity
  const updateCartQuantity = useCallback(async (lineItemKey: number, quantity: number) => {
    setCartLoading(true);
    const updatedCart = await updateCartQuantityFunction(lineItemKey, quantity);
    setCartLoading(false);
    return updatedCart;

    async function updateCartQuantityFunction(lineItemKey: number, quantity: number) {
      if(!user?.customerKey) {
        return updateCartQuantityLocal(lineItemKey, quantity); // { data: xxx, error: yyy }
      }
  
      if(!user)             return { data: null, error: "No user data available when updating remote cart quantity" };
      if(!user.customerKey) return { data: null, error: "No customer key available when updating remote cart quantity" };
      if(!user.token)       return { data: null, error: "No token available when updating remote cart quantity" };
      const requestBody = {customerKey: user.customerKey, token: user.token, lineItemKey: lineItemKey, quantity: quantity};
      const APIResponse = await CallAPI(requestBody, "updateCartQuantity");

      if(APIResponse.error) {
        console.log("Error in updateCartQuantity in useUserData:");
        console.log(APIResponse);
        return { data: null, error: APIResponse.error };
      }

      UpdateUser(APIResponse.data);
      return {data: APIResponse.data, error: null };
    }
  }, [guest, user])

  const updateCartQuantityLocal = useCallback((lineItemKey: number, quantity: number) => {
    if(!user)            return { data: null, error: "No user data available when updating local cart quantity" };
    if(!user.cart)       return { data: null, error: "No cart data available when updating local cart quantity" };
    if(!user.cart.lines) return { data: null, error: "No cart lineitem data available when updating local cart quantity" };

    const cartClone = { ...user.cart };
    const linesClone = cartClone.lines;

    const existingLineItem = linesClone.find(line => {return line.lineItemKey === lineItemKey});
    if(!existingLineItem) return { data: null, error: "Item not found when updating local cart quantity" };
    existingLineItem.quantity = quantity;

    // Update cart meta-data
    const updatedCart = UpdateCartMetadata(cartClone);

    const userClone = { ...user, cart: updatedCart};
    UpdateUser(userClone);
    localStorage.setItem('userLocal', JSON.stringify(userClone));
    return {data: updatedCart, error: null };
  }, [user]);
  //#endregion


  //#region Delete from cart
  const deleteFromCart = useCallback(async (lineItemKey: number) => {
    setCartLoading(true);
    const updatedCart = await deleteFromCartFunction(lineItemKey);
    setCartLoading(false);
    return updatedCart;

    async function deleteFromCartFunction(lineItemKey: number) {
      if(!user?.customerKey) {
        return deleteFromCartLocal(lineItemKey); // { data: xxx, error: yyy }
      }

      if(!user)             return { data: null, error: "No user data available when deleting from remote cart" };
      if(!user.customerKey) return { data: null, error: "No customer key available when deleting from remote cart" };
      if(!user.token)       return { data: null, error: "No token available when deleting from remote cart" };
      const requestBody = {customerKey: user.customerKey, token: user.token, lineItemKey: lineItemKey};
      const APIResponse = await CallAPI(requestBody, "deleteFromCart");

      if(APIResponse.error) {
        console.log("Error in deleteFromCart in useUserData:");
        console.log(APIResponse);
        return { data: null, error: APIResponse.error };
      }
  
      UpdateUser(APIResponse.data);
      return { data: APIResponse.data, error: null };
    }
  }, [guest, user])

  const deleteFromCartLocal = useCallback((lineItemKey: number) => {
    if(!user)            return { data: null, error: "No user data available when deleting from local cart" };
    if(!user.cart)       return { data: null, error: "No cart data available when deleting from local cart" };
    if(!user.cart.lines) return { data: null, error: "No cart lineitem data available when deleting from local cart" };

    const cartClone = { ...user.cart };
    cartClone.lines = cartClone.lines.filter(line => {return line.lineItemKey !== lineItemKey});

    // Update cart meta-data
    const updatedCart = UpdateCartMetadata(cartClone)

    const userClone = { ...user, cart: updatedCart};
    UpdateUser(userClone);
    localStorage.setItem('userLocal', JSON.stringify(userClone));
    return {data: updatedCart, error: null};
  }, [user]);
  //#endregion


  function UpdateCartMetadata(cart: Cart) {
    const newCart = {...cart};
    const lines = newCart.lines;
    if(!lines) return cart;

    const cartQuantity = Math.round(lines.reduce((sum, lineItem) => sum + lineItem.quantity, 0));
    const cartCost = Math.round(lines.reduce((sum, lineItem) => sum + (lineItem.unitPrice * (1+lineItem.taxRate) * lineItem.quantity), 0));
    const cartTax = Math.round(lines.reduce((sum, lineItem) => sum + (lineItem.unitPrice * (lineItem.taxRate) * lineItem.quantity), 0));
    newCart.quantity = cartQuantity;
    newCart.cost = cartCost;
    newCart.includedTax = cartTax;

    return newCart;
  }






  const createPaymentIntent = useCallback(async (cartLines: CartLine[], addressesState: LineItemAddressesArray) => {
    setCartLoading(true);
    const subdomain = window.location.hostname.split('.')[0];
    const keyName = subdomain === 'stage' ? 'paymentIntentIdStage' : 'paymentIntentId';

    const paymentIntent = await createPaymentIntentFunction(cartLines, addressesState);
    localStorage.setItem(keyName, paymentIntent.data.paymentIntentId);

    setCartLoading(false);
    return paymentIntent;

    // let APIResponse;
    // let purchaseKey: number;

    async function createPaymentIntentFunction(cartLines: CartLine[], addressesState: LineItemAddressesArray) {
      let APIResponse;
      let purchaseKey: number;

      if(!user?.customerKey) {
        if(!user)            return { data: null, error: "No user data available when creating payment intent locally" };
        if(!user.cart)       return { data: null, error: "No cart data available when creating payment intent locally" };
        if(!user.cart.lines) return { data: null, error: "No cart lineitem data available when creating payment intent locally" };
    
        APIResponse = await createPaymentIntentLocal(cartLines, addressesState); // { data: xxx, error: yyy }

        if(APIResponse.error) {
          console.log("Error in createPaymentIntent as guest in useUserData:");
          console.log(APIResponse);
          return APIResponse;
        }  

        purchaseKey = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER -1000002) +1000001)
    
      } else {
        if(!user)              return { data: null, error: "No user data available when creating payment intent" };
        if(!user?.customerKey) return { data: null, error: "No customer key available when creating payment intent" };
        if(!user?.token)       return { data: null, error: "No token available when creating payment intent" };
        const requestBody = {customerKey: user.customerKey, token: user.token, cartLines: cartLines, addressesState: addressesState, guest: guest };
        //console.log("requestBody in createPaymentIntent in useUserData:");
        //console.log(requestBody);

        APIResponse = await CallAPI(requestBody, "createPaymentIntent");
  
        if(APIResponse.error) {
          console.log("Error in createPaymentIntent as non-guest in useUserData:");
          console.log(APIResponse);
          return APIResponse;
        }  

        purchaseKey = parseInt(APIResponse.data.purchaseKey);
      }

      const paymentIntentId = APIResponse.data.paymentIntentId;
      const clientSecret = APIResponse.data.clientSecret;
      const defaultAddress = user.addresses.find(addr => {return addr.defaultAddress === true}) || (user.addresses.length > 0 && user.addresses[0]) || null;


      const lineItems: LineItem[] = [];
      cartLines.forEach(cartLine => {
        const addressData = addressesState.find(addrSt => {return addrSt.lineItemKey === cartLine.lineItemKey});
        if(!addressData) { return {data: null, error: `addressData for lineItemKey: ${cartLine.lineItemKey} not found`}; }

        // Addresses for this item are not split up
        if(addressData.addresses === null) {
          //if(!defaultAddress || !defaultAddress.addressKey) { return {data: null, error: `No default address and no specific address for lineItemKey: ${cartLine.lineItemKey}`}; }
          const newLineItem: LineItem = {
            type: "lineItem",
            lineItemKey: cartLine.lineItemKey,
            productKey: cartLine.productKey,
            customerKey: null,
            purchaseKey: purchaseKey,
            addressKey: defaultAddress?.addressKey || 0,
            quantity: cartLine.quantity,
            addedAt: new Date().toISOString().replace(/[T]/g, ' ').substring(0,19),
            unitPrice: cartLine.unitPrice,
            taxRate: cartLine.taxRate,
            firstName: defaultAddress?.firstName || null,
            lastName: defaultAddress?.lastName || null,
            postalCode: defaultAddress?.postalCode || null,
            prefCode: defaultAddress?.prefCode || null,
            pref: defaultAddress?.pref || null,
            city: defaultAddress?.city || null,
            ward: defaultAddress?.ward || null,
            address2: defaultAddress?.address2 || null,
            phoneNumber: defaultAddress?.phoneNumber || null,
          }
          lineItems.push(newLineItem);
        }

        // Addresses for this item are split up
        else {
          addressData.addresses.forEach(addrData => {
            const address = user.addresses.find(addr => {return addr.addressKey === addrData.addressKey })
            if(!address || !address.addressKey) { return {data: null, error: `address for addressData addressKey: ${addrData.addressKey} not found`}; }
            const newLineItem: LineItem = {
              type: "lineItem",
              lineItemKey: cartLine.lineItemKey,
              productKey: cartLine.productKey,
              customerKey: null,
              purchaseKey: purchaseKey,
              addressKey: address.addressKey,
              quantity: addrData.quantity,
              addedAt: new Date().toISOString().replace(/[T]/g, ' ').substring(0,19),
              unitPrice: cartLine.unitPrice,
              taxRate: cartLine.taxRate,
              firstName: address.firstName || null,
              lastName: address.lastName || null,
              postalCode: address.postalCode || null,
              prefCode: address.prefCode || null,
              pref: address.pref || null,
              city: address.city || null,
              ward: address.ward || null,
              address2: address.address2 || null,
              phoneNumber: address.phoneNumber || null,
            }
            lineItems.push(newLineItem);
          });
        }
      });

      // make purchase in user "purchase array, include my paymentIntentId + amount"
      const newPurchase: Purchase = {
        purchaseKey: purchaseKey,
        customerKey: null,
        status: "created",
        creationTime: new Date().toISOString().replace(/[T]/g, ' ').substring(0,19),
        purchaseTime: null,
        shippedTime: null,
        refundTime: null,
        paymentIntentId: paymentIntentId,
        note: null,
        amount: user.cart.cost,
        couponDiscount: 0,
        couponCode: null,
        email: null,
        newPurchaseJson: null,
        lineItems: lineItems,
        cartLines: [],
      }

      const userClone: Customer = JSON.parse(JSON.stringify(user));
      userClone.purchases.push(newPurchase);
      UpdateUser(userClone);
      localStorage.setItem('userLocal', JSON.stringify(userClone));

      //UpdateUser(APIResponse.data);
      return APIResponse;
    }
  }, [guest, user])

  const createPaymentIntentLocal = useCallback(async (cartLines: CartLine[], addressesState: LineItemAddressesArray) => {
    const requestBody = {cartLines: cartLines, addressesState: addressesState, guest: guest};
    const APIResponse = await CallAPI(requestBody, "createPaymentIntent");
    if(APIResponse.error) {
      console.log("Error in createPaymentIntentLocal in useUserData:");
      console.log(APIResponse);
      return APIResponse;
    }

    return APIResponse;
  }, [user]);






  const finalizePurchase = useCallback(async (paymentIntentId:string, email:string, billingAddressKey: number) => {
    if(!user?.customerKey) {
      return await finalizePurchaseLocal(paymentIntentId, email, billingAddressKey);
    }

    if(!user)              return { data: null, error: "No user data available when creating payment intent" };
    if(!user?.customerKey) return { data: null, error: "No customer key available when creating payment intent" };
    if(!user?.token)       return { data: null, error: "No token available when creating payment intent" };
    const requestBody = { customerKey: user.customerKey, token: user.token, billingAddressKey: billingAddressKey, email: email, paymentIntentId: paymentIntentId };
    const APIResponse = await CallAPI(requestBody, "finalizePurchase");

    if(APIResponse.error) {
      console.log("Error in createPaymentIntent in useUserData:");
      console.log(APIResponse);
      return APIResponse;
    }

    UpdateUser(APIResponse.data.customerData);
    return APIResponse;
  }, [guest, user, products]);

  const finalizePurchaseLocal = useCallback(async (paymentIntentId: string, email: string, billingAddressKey: number) => {
    if(!user) { console.log("No User!"); return { data: null, error: "No user" }; }
    if(!products) { console.log("No products!"); return { data: null, error: "No product" }; }
    if(!paymentIntentId) { console.log("No paymentIntentId!"); return { data: null, error: "No payment intent" }; }

    const addresses = user.addresses;
    const defaultAddress = addresses.find(addr => {return addr.addressKey === billingAddressKey}) || addresses.find(addr => {return addr.defaultAddress === true}) || (user.addresses.length > 0 && user.addresses[0]) || null;

    const purchase = user.purchases.find(pur => {return pur.paymentIntentId === paymentIntentId})
    if(!purchase) { return { data: null, error: "No purchase" }; }
    const subdomain = window.location.hostname.split('.')[0];
    const keyName = subdomain === 'stage' ? 'couponDiscountStage' : 'couponDiscount';
    const localCouponDiscount = parseInt(localStorage.getItem(keyName) || "0");
    purchase.couponDiscount = localCouponDiscount;

    const purchaseLineItems = purchase.lineItems;
    console.log("purchaseLineItems");
    console.log(purchaseLineItems);

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!emailRegex.test(email)) { return { data: null, error: "Malformed email" }; }
    purchase.email = email;

    purchase.addressKey = billingAddressKey;

    const purchaseKey = purchase.purchaseKey;


    const orderDetails = purchaseLineItems.map(lineItem => {
      const product = products.find(product => {return lineItem.productKey === product.productKey});
      return({
        "chumon_meisai_no": lineItem.lineItemKey,
        "shohin_code": product?.id,
        "shohin_name": product?.title,
        "suryo": lineItem.quantity,
        //"tanka": Number(lineItem.unitPrice),
        "tanka": Math.round(Number(lineItem.unitPrice) * (1+Number(lineItem.taxRate))),
        "kingaku": Math.round(Number(lineItem.unitPrice) * (1+Number(lineItem.taxRate))),
        "soryo": 0,
        "zei_ritsu": Number(lineItem.taxRate) * 100,
        "gokei_kingaku": Math.round(Number(lineItem.unitPrice) * (1+Number(lineItem.taxRate)) * lineItem.quantity)
      })
    });

    console.log("orderDetails");
    console.dir(orderDetails, { depth: null, colors: true });

    const uniqueAddressKeysSet = new Set();
    for (const item of purchaseLineItems) {
      uniqueAddressKeysSet.add(item.addressKey);
    }
    const uniqueAddressKeys = Array.from(uniqueAddressKeysSet);

    // grouped delivery JSON for the backup servers (they don't want this)
    /*
    //haiso
    const delivery = uniqueAddressKeys.map(addressKey => {
      const lineItems = purchaseLineItems.filter(lineItem => {return lineItem.addressKey === addressKey})
      const address = addresses.find(ad => {return ad.addressKey === addressKey}) || defaultAddress;
      if(!address) { return {}; }

      //haiso_meisai
      const deliveryDetails = lineItems.map(lineItem => {
        const product = products.find(product => {return lineItem.productKey === product.productKey});
        return {
          "haiso_meisai_no": lineItem.lineItemKey, // must be a number
          "shohin_code": product?.id,
          "shohin_name": product?.title,
          "suryo": lineItem.quantity,
          "chumon_meisai_no": lineItem.lineItemKey  
        }
      });

      return {
        "shuka_date": formatDate(purchase.purchaseTime),
        "haiso_name": `${address.lastName} ${address.firstName}`,
        "haiso_post_code": address.postalCode,
        "haiso_pref_code": address.prefCode,
        "haiso_pref": address.pref,
        "haiso_city": address.city,
        "haiso_address1": address.ward,
        "haiso_address2": address.address2,
        "haiso_renrakusaki": `${address.phoneNumber?.replace(/\D/g, '')}`,
        "haiso_meisai": deliveryDetails
      }
    })
    */

    const delivery = purchaseLineItems.map(purchaseLineItem => {
      const address = addresses.find(ad => {return ad.addressKey === purchaseLineItem.addressKey}) || defaultAddress;
      if(!address) { return {}; }

      const product = products.find(product => {return purchaseLineItem.productKey === product.productKey});

      //haiso_meisai
      const deliveryDetails = [{
        "haiso_meisai_no": purchaseLineItem.lineItemKey, // must be a number
        "shohin_code": product?.id || "",
        "shohin_name": product?.title || "",
        "suryo": purchaseLineItem.quantity,
        "chumon_meisai_no": purchaseLineItem.lineItemKey  
      }];

      return {
        "shuka_date": formatDate(purchase.purchaseTime),
        "haiso_name": `${address.lastName} ${address.firstName}` || "",
        "haiso_post_code": address.postalCode || "",
        "haiso_pref_code": address.prefCode || "",
        "haiso_pref": address.pref || "",
        "haiso_city": address.city || "",
        "haiso_address1": address.ward || "",
        "haiso_address2": address.address2 || "",
        "haiso_renrakusaki": `${address.phoneNumber?.replace(/\D/g, '')}` || "",
        "haiso_meisai": deliveryDetails,
      }
    });

    console.log("delivery");
    console.dir(delivery, { depth: null, colors: true });


    // Top level object
    const backupData = {
      "chumon_no": "NVP-" + purchase.purchaseKey,
      "chumon_no2": "NVP-" + purchase.purchaseKey,
      "chumon_date": formatDate(purchase.purchaseTime),
      "konyu_name": `${defaultAddress?.lastName || ""} ${defaultAddress?.firstName || ""}` || "",
      "nebiki": 0,
      "soryo": 0,
      "zei1": Math.round(purchase.amount * (1/1.1)),
      "zei_ritsu1": 10,
      "zei2": 0,
      "zei_ritsu2": 0,
      "zei3": 0,
      "zei_ritsu3": 0,
      "konyu_mail_address": email || "",
      "touroku_kbn": 0,
      "coupon_use_flg": purchase.couponDiscount > 0 ? 1 : 0,
      "chumon_meisai": orderDetails,
      "haiso": delivery
    }

    console.log("backupData (for order)");
    console.log(backupData);
    console.log("XXXXX");

    const backupResults = await CallAPI({endpoint: "chumon_renkei_api", paymentIntentId: paymentIntentId, inputData: backupData}, "storeBackupData");
    console.log("backupResults");
    console.log(backupResults);
    //#endregion


    //#region Order confirmation email
    /*
    // No need for uniqueness
    const uniqueImageUrls = new Set<string>();
    products.forEach(product => {
      product.images.forEach(image => {
        uniqueImageUrls.add(image.url);
      });
    });

    const images = Array.from(uniqueImageUrls).map(url => {
      const image = products.flatMap(product => product.images)
                     .find(image => image.url === url);
    });
    */

    const requestBody = {email: email, purchase: purchase, addresses: addresses, lineItems: purchase.lineItems, products: products};
    console.log("requestBody before sendOrderEmail");
    console.log(requestBody);

    const APIResponse = await CallAPI(requestBody, "sendOrderEmail");
    if(APIResponse.error) {
      console.log("Error in sendOrderEmail in useUserData:");
      console.log(APIResponse);
      return { data: null, error: APIResponse.error };
    }
    //#endregion


    const backupDataJSON = JSON.stringify(backupData);
    purchase.newPurchaseJson = backupDataJSON;

    // Now that the purchase is finished, the cart must be emptied.
    // Whatever was in the cart is represented in the purchase
    const userClone: Customer = JSON.parse(JSON.stringify(user));
    userClone.cart.lines = [];
    UpdateUser(userClone);
    localStorage.setItem('userLocal', JSON.stringify(userClone));

    return { data: userClone, error: null };
  }, [user, products]);







  const cancelPurchase = useCallback(async (purchaseKey: number) => {
    if(!user)              return { data: null, error: "No user data available when deleting from remote cart" };
    if(!user?.customerKey) return { data: null, error: "No customer key available when deleting from remote cart" };
    if(!user?.token)       return { data: null, error: "No token available when deleting from remote cart" };

    setUserLoading(true);
    const requestBody = {customerKey: user.customerKey, token: user.token, purchaseKey: purchaseKey};
    //console.log(requestBody); // Object { customerKey: 1, token: "e66...44c6", purchaseKey: 193 }
    const APIResponse = await CallAPI(requestBody, "cancelPurchase");
    if(APIResponse.error) {
      console.log("Error in cancelPurchase in useUserData:");
      console.log(APIResponse);
      return { data: null, error: APIResponse.error };
    }

    UpdateUser(APIResponse.data);
    setUserLoading(false);
    return { data: APIResponse.data, error: null };
  }, [user])

  const printReceipt = useCallback(async (purchaseKey: number) => {
    if(!user)              return { data: null, error: "No user data available when deleting from remote cart" };
    if(!user?.customerKey) return { data: null, error: "No customer key available when deleting from remote cart" };
    if(!user?.token)       return { data: null, error: "No token available when deleting from remote cart" };

    setUserLoading(true);
    const requestBody = {customerKey: user.customerKey, token: user.token, purchaseKey: purchaseKey};
    //console.log(requestBody); // Object { customerKey: 1, token: "e66...44c6", purchaseKey: 193 }
    const APIResponse = await CallAPI(requestBody, "generateReceipt");
    if(APIResponse.error) {
      console.log("Error in generateReceipt in useUserData:");
      console.log(APIResponse);
      return { data: null, error: APIResponse.error };
    }

    setUserLoading(false);
    return { data: APIResponse.data, error: null };
  }, [user])

  /**
   * Updates the user state based on the provided data.
   * The function can handle different types of input: Customer, Cart, or CartLine[].
   * Depending on the type of the input, the user's state is updated accordingly.
   * 
   * @param newData - The new data to update the user. This can be a Customer, a Cart, or an array of CartLine.
   */
  function UpdateUser(newData:(Customer | Cart | CartLine[])) {
    setUser((previousUser: Customer | null) => {

      let newUser: Customer;

      if (!Array.isArray(newData) && newData.type === 'customer') {
        newUser = {...newData};
      }

      else if (!Array.isArray(newData) && newData.type === "cart") {
        if(previousUser === null) { return null; } // Can't update the cart if there's no user
        const newCart = {...newData}
        newUser = {
          ...previousUser,
          cart: newCart
        };
      }

      else if (Array.isArray(newData) && newData.every(item => item.type === "cartLine")) {
        if(previousUser === null) { return null; } // Can't update the cart liens if there's no user
        const newCartLines = [...newData];
        newUser = {...previousUser, cart: {...previousUser.cart, lines: newCartLines}}
      }

      else {
        // Handle invalid input
        return null;
      }

      return ProcessCustomer(newUser);
    });
  }

  function formatDate(dateString: string | null) {
    if(dateString === null) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 because months are 0-indexed
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}年${month}月${day}日`;
    }

    const date = new Date(dateString);
  
    // Format the date components to be in YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 because months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
  
    return `${year}年${month}月${day}日`;
  }


  return {
    createUser, loginUser, logoutUser, updateUser, // Not available for non-registered customers
    registerGuest,
    addToCart, updateCartQuantity, deleteFromCart, 
    createPaymentIntent, finalizePurchase, cancelPurchase, printReceipt,
    addAddress, deleteAddress
  };

};