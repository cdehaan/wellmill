// types.ts

export type WellMillAzureAddress = {
    address_key?: number, // Given by MySQL
    default_address: boolean, // true
    kaiin_code?: string, //'NV001',
    kaiin_last_name: string, //"デハーン",
    kaiin_first_name: string, //"クリス",
    touroku_kbn: number, //0,   (登録区分): This term likely represents a registration category or type.
    kaiin_last_name_kana: string, //"デハーン",
    kaiin_first_name_kana: string, //"クリス",
    post_code: number, //"1234567",
    pref_code: string, //"JPHYG",
    pref: string, //"Hyogo",
    city: string, //"Kobe",
    ward: string, //"Chuoku",
    address2: string, //"Building 1",
    renrakusaki: string, //"08012348765",   (連絡先): This term translates to "contact information" i.e. phone number
    mail_address: string, //"Building 1",
    seibetsu: number, //1,   (性別): This term represents gender.
    seinengappi: string, //"2023/10/24",   (生年月日): This term represents the date of birth.
}



//#region Product
export type Product = {
    productKey: number,
    id: string,
    title: string,
    description: string,
    available: boolean,
    stock: number,
    price: number,
    taxRate: number,
    discountRate: number | null,
    discountValue: number | null,
    type: number,
    images: Image[],
    coupons?: Coupon[],
    productOrder: number,
}

export type Image = {
    imageKey: number,
    productKey: number,
    url: string,
    displayOrder: number,
    altText: string,
}
//#endregion



//#region Customer/User, Cart, Address
export const emptyCustomer:Customer = {
    type: 'customer',
    customerKey: null,
    cart: {
      type: 'cart',
      quantity: 0,
      cost: 0,
      includedTax: 0,
      lines: [],  
    },
    addresses: [],
    purchases: [],
    coupons: [],
}

export type Customer = {
    type: "customer",
    guest?: boolean,
    customerKey?: number | null, // For my MySQL database (null means its stored locally, undefined means not yet sent to server)
    code?: string,               // For the company Azure backup database
    email?: string,
    lastName?: string,
    firstName?: string,
    lastNameKana?: string,
    firstNameKana?: string,
    gender?: string,
    birthday?: string,
    phoneNumber?: string, 
    password?: string,
    newPassword1?: string, // TODO this should change or be removed, it's a poor way to do password updates
    newPassword2?: string,
    token?: string,
    cart: Cart,
    addresses: Address[],
    purchases: Purchase[],
    coupons: Coupon[],
}

export type Cart = {
    type: 'cart',
    quantity: number,
    cost: number,
    includedTax: number,
    lines: CartLine[],
}

export type CartLine = {
    type: 'cartLine',
    lineItemKey: number,
    productKey: number,
    unitPrice: number,
    taxRate: number,
    quantity: number,
    purchaseKey?: number, // On checkout screen, after paymentIntentId has been made
}

export type Coupon = {
    couponKey: number,
    productKey: number | null,
    hash: string,
    type: number,
    target: number,
    reward: number,
    code?: string, // This is a secret, never sent to the customer
}

export type CouponGroup = {
    name: string,
    couponGroupKey: number,
    active: boolean,
    codeStem: string,
    isCodePrefixed: boolean,
    jumbleLength: number,
    isUnambiguous: boolean,
    type: number,
    target: number,
    reward: number,
    productKey: number | null,
    maxUses: number,
    count: number,
    unusedCount: number,
    usedupCount: number,
}
//#endregion



//#region Address, Address state (used for multiple addresses for one type of item in a purchase)
// All are optional, if any one of them is missing, it's still a reasonable address (inside the system)
export type Address = {
    addressKey?: number | null, // Given by MySQL - null just means we're sure this address doesn't have a key yet
    customerKey?: number | null,
    lastName?: string, //"デハーン",
    firstName?: string, //"クリス",
    registrationType?: number, //0,   (登録区分): This term likely represents a registration category or type.
    postalCode?: number, // 1234567,
    prefCode?: number, // 7,
    pref?: string, //"Hyogo",
    city?: string, //"Kobe",
    ward?: string, //"Chuoku",
    address2?: string, //"Building 1",
    phoneNumber?: string, // 080-1234-5678
    defaultAddress?: boolean, // true
}

export type LineItemAddressesArray = LineItemAddresses[];

export type LineItemAddresses = {
    lineItemKey: number;
    quantity: number;
    addresses: LineItemAddress[] | null;
};

/**
 * Represents a line item address.
 *
 * @property {number | null} addressKey - The address key for this line item. Null means no address chosen yet.
 * @property {number} quantity - The quantity going to this address only.
 * @property {number} addressIndex - The order of the addresses in the array of addresses
 *   for split items from a lineItem that was originally a single entry. Not an address key.
 */
type LineItemAddress = {
    addressKey: number | null;
    quantity: number;
    addressIndex: number;
};
//#endregion



//#region Purchase and Line Item with address
export type Purchase = {
    purchaseKey: number,
    customerKey: number | null,
    addressKey?: number, // billing address
    status: string,
    creationTime: string,
    purchaseTime: string | null,
    shippedTime: string | null,
    refundTime: string | null,
    paymentIntentId: string,
    note: string | null,
    amount: number,
    couponDiscount: number,
    couponCode: string | null,
    email: string | null,
    newPurchaseJson: string | null,
    lineItems: LineItem[],
    cartLines: CartLine[], // Array of CartLines exists while on the checkout screen, address not frozen yet
}

export type LineItem = {
    type: "lineItem",
    lineItemKey: number,
    productKey: number,
    customerKey: number | null, // null for a guest buying something
    purchaseKey: number,
    addressKey: number,
    quantity: number,
    addedAt: string,
    unitPrice: number,
    taxRate: number,
    firstName: string | null,
    lastName: string | null,
    postalCode: number | null,
    prefCode: number | null,
    pref: string | null,
    city: string | null,
    ward: string | null,
    address2: string | null,
    phoneNumber: string | null,
    shippingStatus?: string,
}
//#endregion



//#region Credentials
interface CredentialsWithEmail {
    email: string;
    password: string;
    token?: string; // Optional, as having all three is allowed
}

interface CredentialsWithToken {
    token: string;
}

export type UserCredentials = CredentialsWithEmail | CredentialsWithToken;
//#endregion



// Define a TypeScript interface for the breadcrumb object used in the Header component
export interface Breadcrumb {
    text: string;
    url: string;
}


export type AdminDataType = {
    customers: Customer[],
    addresses: Address[],
    purchases: Purchase[],
    products: Product[],
    coupons: Coupon[],
    couponGroups: CouponGroup[],
    images: Image[],
    lineItems: LineItem[],
  }