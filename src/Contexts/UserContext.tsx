import { createContext, useState, Dispatch, SetStateAction, useEffect } from 'react';
import { CartType, CustomerType, emptyCustomer } from '../types';
import CallAPI from '../Utilities/CallAPI';
import ProcessCustomer from '../Utilities/ProcessCustomer';
import Cookies from 'js-cookie';

//#region Type definitions
type UserProviderProps = {
    children: React.ReactNode;
};

type UserContextValue = {
  user: CustomerType | null;
  setUser: Dispatch<SetStateAction<CustomerType | null>>;
  cartLoading: boolean;
  setCartLoading: Dispatch<SetStateAction<boolean>>;
  userLoading: boolean;
  setUserLoading: Dispatch<SetStateAction<boolean>>;

  /**
   * `userMeaningful` indicates whether there is any meaningful data stored in the user object.
   * For example, an address, a first name, a cart object, or a purchase.
   * This variable is part of the context provided by [useUserData].
   */
  userMeaningful: boolean;
  setUserMeaningful: Dispatch<SetStateAction<boolean>>;
  guest: boolean | undefined;
  setGuest: Dispatch<SetStateAction<boolean | undefined>>;
}
//#endregion Type definitions


//#region create the context
// Initialize the context with default values
const defaultContextValue: UserContextValue = {
  user: null,
  setUser: () => {},
  cartLoading: false,
  setCartLoading: () => {},
  userLoading: true,
  setUserLoading: () => {},
  userMeaningful: false,
  setUserMeaningful: () => {},
  guest: undefined,
  setGuest: () => {},
};


// Create the context with the interface
export const UserContext = createContext<UserContextValue>(defaultContextValue);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<CustomerType | null>(null);
  const [cartLoading, setCartLoading] = useState<boolean>(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userMeaningful, setUserMeaningful] = useState(false);
  const [guest, setGuest] = useState<boolean | undefined>(undefined)


  // This effect runs once on mount to check for existing user data, first on the server, then locally
  useEffect(() => {
    if(user) { return } // Only run first time the site is loading / after refresh

    setUserLoading(true);
    initializeUserData().then(() => {
      setUserLoading(false);  
    });

    async function initializeUserData() {
      const subdomain = window.location.hostname.split('.')[0];
      const cookieName = subdomain === 'stage' ? 'WellMillTokenStage' : 'WellMillToken';
      const token = Cookies.get(cookieName);
      if (token) {
        try{
          await loginUserFromToken(token);
          setGuest(false);
        }
        catch(error) {
          console.error("Failed to fetch remote user data:", error);
          console.error("Falling back to local data");
          //pullUserLocal();
          setUser(emptyCustomer);
          setGuest(true);
        }
      } else {
        //pullUserLocal();
        setUser(emptyCustomer);
        setGuest(true);
      }
    }

    async function loginUserFromToken(token: string) {
      const APIResponse = await CallAPI({token: token}, "login");
      if(APIResponse.error) {
        console.log("Error in loginUserFromToken in useUserData:");
        throw new Error(APIResponse.error);
      }

      if (APIResponse.data?.token) {
        const subdomain = window.location.hostname.split('.')[0];
        const cookieName = subdomain === 'stage' ? 'WellMillTokenStage' : 'WellMillToken';    
        Cookies.set(cookieName, APIResponse.data.token, { expires: 31, sameSite: 'Lax' });
      }

      //console.log(APIResponse.data.customerData);

      setUser(ProcessCustomer(APIResponse.data.customerData))
    }

    function pullUserLocal() {
      const localStorageUser = localStorage.getItem('userLocal')
      let userLocal = (localStorageUser ? JSON.parse(localStorageUser) : emptyCustomer) as CustomerType;
      setUser(userLocal);
    }
  }, [user]);


  // Detect meaningful data when user changes
  useEffect(() => {
    setUserMeaningful(isMeaningfulData(user));

    function isMeaningfulData(obj: any): boolean {
      if (obj === null) return false;
  
      for (const key in obj) {
        if (key === 'type') continue; // Ignore fields named "type"
        const value = obj[key];
  
        if (Array.isArray(value)) {
          if (value.length > 0) { return true; }
        } else if (typeof value === 'object') {
          if (isMeaningfulData(value)) { return true; }
        } else if (typeof value === 'string' && value.trim() !== '') {
          return true;
        } else if (typeof value === 'number' && value !== null && value !== 0) {
          return true;
        } else if (typeof value === 'boolean' && value !== null && value !== undefined) {
          return true;
        }
      }
      return false;
    }  
  }, [user]);


  // Update cart metadata when cart changes
  useEffect(() => {
    if(!user) return;
    const cart = user.cart;
    const lines = cart.lines;

    const cartQuantity = Math.round(lines.reduce((sum, lineItem) => sum + lineItem.quantity, 0));
    const cartCost = Math.round(lines.reduce((sum, lineItem) => sum + (lineItem.unitPrice * (1+lineItem.taxRate) * lineItem.quantity), 0));
    const cartTax = Math.round(lines.reduce((sum, lineItem) => sum + (lineItem.unitPrice * (lineItem.taxRate) * lineItem.quantity), 0));

    if(cart.quantity !== cartQuantity || cart.cost !== cartCost || cart.includedTax !== cartTax) {
      const newCart: CartType = {
        type: "cart",
        quantity: cartQuantity,
        cost: cartCost,
        includedTax: cartTax,
        lines: lines
      }

      setUser(prev => {
        if(prev === null) return null;
        return {
          ...prev,
          cart: newCart
        }
      });
    }

  }, [user?.cart]);

  const value: UserContextValue = { user, setUser, cartLoading, setCartLoading, userLoading, setUserLoading, userMeaningful, setUserMeaningful, guest, setGuest };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
//#endregion