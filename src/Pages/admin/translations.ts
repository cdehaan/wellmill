export type LanguageType = "en" | "jp";

export function getText(id: string | undefined, language: LanguageType): string | undefined {
    const translationObject = translations.find((item) => item.id === id);
    const translation = translationObject?.[language] ?? id;
    return translation;
};

const translations = [

    /* Common */
    { id: "loading", en: "Loading...", jp: "読み込み中..." },
    { id: "loadingAddresses", en: "Loading addresses...", jp: "住所を読み込んでいます..." },
    { id: "loadingPurchases", en: "Loading purchases...", jp: "購入を読み込んでいます..." },
    { id: "loadingLineItems", en: "Loading line items...", jp: "行アイテムを読み込んでいます..." },
    { id: "loadingImages", en: "Loading images...", jp: "画像を読み込んでいます..." },
    { id: "loadingProducts", en: "Loading products...", jp: "商品を読み込んでいます..." },

    { id: "cancel", en: "Cancel", jp: "キャンセル" },
    { id: "delete", en: "Delete", jp: "削除" },
    { id: "search", en: "Search", jp: "検索" },
    { id: "searching...", en: "Searching...", jp: "検索中..." },
    { id: "edit", en: "Edit", jp: "編集" },
    { id: "save", en: "Save", jp: "保存" },
    { id: "upload", en: "Upload", jp: "アップロード" },
    { id: "create", en: "Create", jp: "作成" },
    { id: "search", en: "Search", jp: "検索" },
    { id: "export", en: "Export", jp: "エクスポート" },
    { id: "none", en: "None", jp: "なし" },
    { id: "close", en: "Close", jp: "閉じる" },
    { id: "advancedOptions", en: "Advanced options ▼", jp: "詳細オプション ▼" },
    { id: "actions", en: "Actions", jp: "アクション" },

    { id: "key", en: "Key", jp: "キー" },
    { id: "customerKey", en: "Customer key", jp: "顧客キー" },
    { id: "addressKey", en: "Address key", jp: "住所キー" },
    { id: "productKey", en: "Product key", jp: "商品キー" },



    /* Menu */
    { id: "dashboard", en: "Dashboard", jp: "ダッシュボード" },
    { id: "customers", en: "Customers", jp: "顧客" },
    { id: "addresses", en: "Addresses", jp: "住所" },
    { id: "products", en: "Products", jp: "商品" },
    { id: "images", en: "Images", jp: "画像" },
    { id: "coupons", en: "Coupons", jp: "個別クーポン" },
    { id: "coupongroups", en: "Coupon Groups", jp: "クーポン束" },



    /* Dashboard */
    { id: "admin", en: "Admin", jp: "管理者" },
    { id: "totalCustomers", en: "Total customers", jp: "総顧客数" },
    { id: "numberOfGuests", en: "Number of guests", jp: "ゲスト数" },



    /* Customers */
    { id: "customers", en: "Customers", jp: "顧客" },
    { id: "purchaseNumber", en: "Purchase number", jp: "購入数" },
    { id: "firstName", en: "First name", jp: "名" },
    { id: "lastName", en: "Last name", jp: "姓" },
    { id: "firstNameKana", en: "Phonetic first name", jp: "名-カナ" },
    { id: "lastNameKana", en: "Phonetic last name", jp: "姓-カナ" },
    { id: "gender", en: "Gender", jp: "性別" },
    { id: "male", en: "Male", jp: "男性" },
    { id: "female", en: "Female", jp: "女性" },
    { id: "birthday", en: "Birthday", jp: "誕生日" },
    { id: "email", en: "Email", jp: "メール" },
    { id: "termsOfService", en: "Terms of service", jp: "利用規約" },
    { id: "latestCouponCode", en: "Latest coupon", jp: "最新のクーポン" },
    { id: "couponsUsed", en: "Times used", jp: "使用回数" },
    { id: "couponDiscountsTotal", en: "Total discounts", jp: "割引合計" },
    { id: "currentDefaultAddress", en: "Current default address", jp: "現在のデフォルト住所" },

    { id: "productsQuantity", en: "Products quantity", jp: "商品の数量" },
    { id: "paymentStatus", en: "Payment status", jp: "支払い状況" },
    { id: "created", en: "Created", jp: "作成" },
    { id: "succeeded", en: "Succeeded", jp: "成功" },
    { id: "shipped", en: "Shipped", jp: "配送済み" },
    { id: "cancelled", en: "Cancelled", jp: "キャンセル" },

    { id: "firstAddedAt", en: "First added at", jp: "最初に追加された日" },
    { id: "purchasedAt", en: "Purchased at", jp: "購入日" },
    { id: "refundedAt", en: "Refunded at", jp: "返金日" },
    { id: "purchaseTotal", en: "Purchase total", jp: "購入合計" },
    { id: "couponDiscount", en: "Coupon discount", jp: "クーポン割引" },

    { id: "productTitle", en: "Product title", jp: "商品タイトル" },
    { id: "productQuantity", en: "Product quantity", jp: "商品数量" },
    { id: "unitPrice", en: "Unit price", jp: "単価" },
    { id: "shippingStatus", en: "Shipping status", jp: "配送状況" },
    { id: "billingAddress", en: "Billing address", jp: "請求先住所" },


    { id: "confirmDeleteCustomer", en: "Are you sure you want to delete this customer?", jp: "この顧客を削除してもよろしいですか？" },



    /* Addresses */
    { id: "editAddress", en: "Edit address", jp: "住所を編集" },
    { id: "phone", en: "Phone", jp: "電話" },
    { id: "address", en: "Address", jp: "住所" },
    { id: "postalCode", en: "Zip code", jp: "郵便番号" },
    { id: "pref", en: "Prefecture", jp: "都道府県" },
    { id: "city", en: "City", jp: "市" },
    { id: "ward", en: "Ward", jp: "区" },
    { id: "building", en: "Building", jp: "それ以降の住所" },
    { id: "phoneNumber", en: "Phone number", jp: "電話番号" },

    { id: "shippingAddress", en: "Shipping address", jp: "配送先住所" },
    { id: "shippingZipCode", en: "Shipping zip code", jp: "配送先郵便番号" },
    { id: "shippingCity", en: "Shipping city", jp: "配送先市" },
    { id: "shippingState", en: "Shipping state", jp: "配送先都道府県" },
    { id: "shippingCountry", en: "Shipping country", jp: "配送先国" },
    { id: "billingZipCode", en: "Billing zip code", jp: "請求先郵便番号" },
    { id: "billingCity", en: "Billing city", jp: "請求先市" },
    { id: "billingState", en: "Billing state", jp: "請求先都道府県" },
    { id: "billingCountry", en: "Billing country", jp: "請求先国" },
    { id: "product", en: "Product", jp: "商品" },



    /* Products */
    { id: "products", en: "Products", jp: "商品" },
    { id: "addProduct", en: "Add product", jp: "商品を追加" },
    { id: "editProduct", en: "Edit product", jp: "商品を編集"},
    { id: "id", en: "ID", jp: "ID" },
    { id: "title", en: "Title", jp: "タイトル" },
    { id: "description", en: "Description", jp: "説明" },
    { id: "available", en: "Available", jp: "利用可能" },
    { id: "productOrder", en: "Order", jp: "表示順" },
    { id: "type", en: "Type", jp: "タイプ" },
    { id: "price", en: "Price", jp: "価格" },
    { id: "taxRate", en: "Tax rate", jp: "税率" },
    { id: "discount", en: "Discount", jp: "割引率" },
    { id: "selectProduct", en: "Select product", jp: "商品を選択" },

    { id: "deleteProduct", en: "Delete product", jp: "商品を削除" },
    { id: "confirmDeleteProduct", en: "Are you sure you want to delete this product?", jp: "この商品を削除してもよろしいですか？" },



    /* Images */
    { id: "images", en: "Images", jp: "画像" },
    { id: "addImage", en: "Add image", jp: "画像を追加" },
    { id: "selectUploadFile", en: "Please select a file to upload.", jp: "アップロードするファイルを選択してください。" },
    { id: "fileTooLarge", en: "File size exceeds the 25MB limit.", jp: "ファイルサイズが25MBの制限を超えています。" },
    { id: "assignImageConfirm", en: "Assign image to this product:", jp: "この商品に画像を割り当てる：" },
    { id: "selectProduct", en: "Select product", jp: "商品を選択" },
    { id: "imageDescription", en: "Image description", jp: "画像の説明" },



    /* Coupons */
    { id: "coupons", en: "Coupons", jp: "クーポン" },
    { id: "addCoupon", en: "Add coupon", jp: "クーポンを追加" },
    { id: "couponCode", en: "Code", jp: "コード" },
    { id: "couponType", en: "Type", jp: "タイプ" },
    { id: "couponTarget", en: "Target", jp: "ターゲット" },
    { id: "couponProduct", en: "Product", jp: "商品" },
    { id: "couponReward", en: "Reward", jp: "報酬" },
    { id: "couponCount", en: "Coupons: ", jp: "クーポン: " },

    { id: "couponYenDiscount", en: "▼ ~~¥ Off", jp: "▼ ~~¥ 割引" }, // type 1
    { id: "couponPercentDiscount", en: "▼ ~~% Off", jp: "▼ ~~% 割引" }, // type 2
    { id: "couponProductDiscount", en: "▼ Product ~~¥ Off", jp: "▼ 製品 ~~¥ 割引" }, // type 3
    { id: "couponProductYenDiscount", en: "▼ Product ~~¥ Off", jp: "▼ 製品 ~~¥ 割引" }, // type 4 - not used, still in MySQL table
    { id: "couponProductPercentDiscount", en: "▼ Product ~~% Off", jp: "▼ 製品 ~~% 割引" }, // type 5

    { id: "couponExplanation", en: "Coupon Explanation", jp: "クーポン説明" },

    /* Bulk coupons / coupon groups */
    { id: "addCouponGroup", en: "Create coupon group", jp: "クーポングループを追加" },
    { id: "searchCoupons", en: "Search coupons", jp: "クーポンを検索" },
    { id: "couponGroupName", en: "Group name", jp: "グループ名" },
    { id: "couponGroupNamePlaceholder", en: "Fall", jp: "Fall" },
    { id: "couponGroupNameRules", en: "Only English characters can be used. This won't be seen by the customer.", jp: "英語の文字のみ使用可能。これは顧客には表示されません。" },
    { id: "couponGroupQuantityPrefix", en: "Create", jp: "クーポンを" },
    { id: "couponGroupQuantitySuffix", en: "coupons", jp: "枚作成します。" },
    { id: "couponGroupMaxUsesPrefix", en: "Each coupon can be used", jp: "各クーポンは" },
    { id: "couponGroupMaxUsesSuffix", en: "times", jp: "回までご利用いただけます。" },
    { id: "couponGroupUnlimitedUsesSuffix", en: "an unlimited number of times", jp: "無制限にご利用いただけます。" },
    { id: "couponGroupCodeSource", en: "Source of coupon codes", jp: "クーポンコードのソース" },
    { id: "couponGroupCodesProvided", en: "I will provide the coupon codes", jp: "クーポンコードを提供します" },
    { id: "couponGroupUploadExplanation", en: "You can upload a csv file of coupon codes", jp: "クーポンコードのcsvファイルをアップロードできます" },
    { id: "couponGroupTextareaFull", en: "The textbox is full, you cannot type in any more codes.", jp: "テキストボックスがいっぱいです。csv ファイルを使用してください。" },
    { id: "couponGroupTextareaOverflow", en: " characters are hidden in the textbox, but loaded correctly.", jp: "文字が切り捨てられましたが、正しく読み込まれました。" },
    { id: "couponGroupCodesGenerated", en: "Create random coupon codes on the server automatically", jp: "サーバー上でランダムなクーポンコードを自動的に作成します" },
    { id: "couponGroupStemPrefix", en: "Include at the", jp: "クーポンコードの" },
    { id: "couponGroupStemSuffix", en: "in all coupon codes", jp: "という文字を含めます。" },
    { id: "couponGroupStemBefore", en: "▼ beginning", jp: "▼ 先頭に" },
    { id: "couponGroupStemAfter", en: "▼ end", jp: "▼ 末尾に" },
    { id: "couponGroupJumbleLength", en: "Include", jp: "" },
    { id: "couponGroupJumbleLengthSuffix", en: "characters of random letters and numbers", jp: "文字のランダムな文字と数字を含めます。" },
    { id: "couponGroupUnambiguous", en: "Avoid ambiguous characters (e.g.: 1, I, l, 0, O)", jp: "曖昧な文字を避ける (1, I, l, 0, O など)" },
    { id: "couponGroupGeneratedExamples", en: "Example coupon codes:", jp: "クーポンコードの例:" },
    { id: "couponDescriptionHeader", en: "This coupon will act as follows:", jp: "このクーポンは以下のように機能します:" },
    { id: "generateCouponGroup", en: "Generate group", jp: "グループを生成" },

    { id: "totalCoupons", en: "Total coupons", jp: "総クーポン数" },
    { id: "couponGroupName", en: "Group name", jp: "グループ名" },
    { id: "couponGroupCodeStem", en: "Code stem", jp: "コードの先頭" },
    { id: "couponGroupCount", en: "Count", jp: "数" },
    { id: "couponGroupKey", en: "Key", jp: "キー" },
    { id: "couponGroupStatus", en: "Status", jp: "ステータス" },
    { id: "couponGroupActive", en: "Active", jp: "アクティブ" },
    { id: "couponGroupInactive", en: "Inactive", jp: "非アクティブ" },
    { id: "couponGroupUseText", en: "Usage statistics", jp: "使用統計" },
    { id: "couponGroupUseChart", en: "", jp: "" },
    { id: "addCoupons", en: "Add coupons", jp: "クーポンを追加" },
    { id: "activateCouponGroup", en: "Activate group", jp: "グループをアクティブにする" },
    { id: "deactivateCouponGroup", en: "Deactivate group", jp: "グループを非アクティブにする" },
    { id: "deleteCouponGroup", en: "Delete group", jp: "グループを削除" },
    { id: "couponGroupDeleteConfirmation", en: "Are you sure you want to delete this coupon group?", jp: "このクーポングループを削除してもよろしいですか？" },
    { id: "couponGroupAppendPrompt", en: "Create additional coupons in this group", jp: "このグループに追加のクーポンを作成" },
    { id: "couponGroupAppendInvalid", en: "Invalid number of coupons to append", jp: "追加するクーポンの数が無効です" },
    { id: "couponGroupActivateConfirmation", en: "Are you sure you want to activate this coupon group?", jp: "このクーポングループをアクティブにしてもよろしいですか？" },
    { id: "couponGroupDeactivateConfirmation", en: "Are you sure you want to deactivate this coupon group?", jp: "このクーポングループを非アクティブにしてもよろしいですか？" },
    { id: "maxUses", en: "Max uses", jp: "最大使用回数" },
    { id: "unused", en: "Unused", jp: "未使用" },
    { id: "partiallyUsed", en: "Partly used", jp: "一部使用" },
    { id: "fullyUsed", en: "Fully used", jp: "使用済" },
    { id: "lastUsed", en: "Last used", jp: "最後に使用した日付" },

    { id: "couponGroupNameRequired", en: "Group name is required", jp: "グループ名は必須です" },

    { id: "couponSearch", en: "Coupon search", jp: "クーポン検索" },
    { id: "enterCouponCode", en: "Enter coupon code", jp: "クーポンコードを入力" },
    { id: "100SubsetShown", en: "Top 100 results shown. Consider refining your search.", jp: "上位100件の結果が表示されます。検索条件を絞ることを検討してください。" },
    
];

export default translations;
