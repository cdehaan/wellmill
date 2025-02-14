require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const stripeStage = require('stripe')(process.env.STRIPE_TEST_SECRET_API_KEY);
const stripeProduction = require('stripe')(process.env.STRIPE_PRODUCTION_SECRET_API_KEY);

//const fetch = require('node-fetch');
let fetch;
(async () => { fetch = (await import('node-fetch')).default; })();

const sgMail = require('@sendgrid/mail');
//const { numberToBaseString, calculateMinimumJumbleLength } = require('./utils/calculations');
//const { authenticate } = require('./utils/auth');
sgMail.setApiKey(process.env.SENDGRID_NODE_API_KEY)

const app = express();
app.use(cors());  // Enable CORS for all routes
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //cb(null, path.join(__dirname, '../../products'));
    cb(null, '/var/www/wellmill/products');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB file size limit
});


const poolStage = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER_STAGE,
  password: process.env.DB_PASS_STAGE,
  database: process.env.DB_NAME_STAGE,
});

const poolProduction = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});



const PRODUCTS_FILE_PATH = path.join('/var/www/wellmill/products.json');
const PRODUCTS_FILE_PATH_STAGE = path.join('/var/www/wellmill/productsStage.json');
const COUPONS_FILE_PATH = path.join('/var/www/wellmill/coupons.json');
const COUPONS_FILE_PATH_STAGE = path.join('/var/www/wellmill/couponsStage.json');
const ORDER_BACKUP_FILE_PATH = path.join('/var/www/wellmill/order-WindsorAction.json');
const ORDER_BACKUP_FILE_PATH_STAGE = path.join('/var/www/wellmill/order-WindsorActionStage.json');

// used for both creating a file, and calculating cart totals
let products = {};

// used as a pair to run MySQL queries
let query, values;

const environmentValues = [
  {name: "production", pool: poolProduction, productsFilePath: PRODUCTS_FILE_PATH,       couponsFilePath: COUPONS_FILE_PATH},
  {name: "stage",      pool: poolStage,      productsFilePath: PRODUCTS_FILE_PATH_STAGE, couponsFilePath: COUPONS_FILE_PATH_STAGE },
]

const prefectureNames = [
  {code: 1 , name:"北海道"},
  {code: 2 , name:"青森県"},
  {code: 3 , name:"岩手県"},
  {code: 4 , name:"宮城県"},
  {code: 5 , name:"秋田県"},
  {code: 6 , name:"山形県"},
  {code: 7 , name:"福島県"},
  {code: 8 , name:"茨城県"},
  {code: 9 , name:"栃木県"},
  {code: 10, name:"群馬県"},
  {code: 11, name:"埼玉県"},
  {code: 12, name:"千葉県"},
  {code: 13, name:"東京都"},
  {code: 14, name:"神奈川県"},
  {code: 15, name:"新潟県"},
  {code: 16, name:"富山県"},
  {code: 17, name:"石川県"},
  {code: 18, name:"福井県"},
  {code: 19, name:"山梨県"},
  {code: 20, name:"長野県"},
  {code: 21, name:"岐阜県"},
  {code: 22, name:"静岡県"},
  {code: 23, name:"愛知県"},
  {code: 24, name:"三重県"},
  {code: 25, name:"滋賀県"},
  {code: 26, name:"京都府"},
  {code: 27, name:"大阪府"},
  {code: 28, name:"兵庫県"},
  {code: 29, name:"奈良県"},
  {code: 30, name:"和歌山県"},
  {code: 31, name:"鳥取県"},
  {code: 32, name:"島根県"},
  {code: 33, name:"岡山県"},
  {code: 34, name:"広島県"},
  {code: 35, name:"山口県"},
  {code: 36, name:"徳島県"},
  {code: 37, name:"香川県"},
  {code: 38, name:"愛媛県"},
  {code: 39, name:"高知県"},
  {code: 40, name:"福岡県"},
  {code: 41, name:"佐賀県"},
  {code: 42, name:"長崎県"},
  {code: 43, name:"熊本県"},
  {code: 44, name:"大分県"},
  {code: 45, name:"宮崎県"},
  {code: 46, name:"鹿児島県"},
  {code: 47, name:"沖縄県"},
]

async function fetchProducts() {
  console.log("░▒▓█ Hit fetchProducts. Time: " + CurrentTime());

  const productQuery = `
    SELECT p.*, i.imageKey, i.url, i.displayOrder, i.altText 
    FROM product p
    LEFT JOIN image i ON p.productKey = i.productKey`;

  const couponQuery = `SELECT * FROM coupon`;

  for(const environmentValue of environmentValues) {
    try{
      const [results] = (await environmentValue.pool.query(productQuery));

      if (!results) {
        console.log("Products not found");
        return Promise.reject("Products not found");
      }

      // holds products and their images
      const productResults = {};


      results.forEach(row => {
        // If the product is not already in the products object, add it
        if (!productResults[row.productKey]) {
          productResults[row.productKey] = {
            productKey: row.productKey,
            id: row.id,
            title: row.title,
            description: row.description,
            available: row.available,
            stock: row.stock,
            price: row.price,
            taxRate: row.taxRate,
            discountRate: row.discountRate,
            discountValue: row.discountValue,
            type: row.type,
            images: [],
            productOrder: row.productOrder,
          };
        }

        // Add the image to the product's images array, if image data exists
        if (row.imageKey) {
          productResults[row.productKey].images.push({
            imageKey: row.imageKey,
            url: row.url,
            displayOrder: row.displayOrder,
            altText: row.altText
          });
        }
      });

      // Write the products to a file
      fs.writeFileSync(environmentValue.productsFilePath, JSON.stringify(Object.values(productResults), null, 2));
      console.log(`[${CurrentTime()}] Updated modern ${environmentValue.name} products.json to ${environmentValue.productsFilePath}`);
    } catch(error) {
      console.error(`[${CurrentTime()}] Error fetching ${environmentValue.name} products:`, error);
      return Promise.reject(error);
    }

    try{
      const [coupons] = (await environmentValue.pool.query(couponQuery));

      coupons.forEach(coupon => {
        delete coupon.code;
      });

      fs.writeFileSync(environmentValue.couponsFilePath, JSON.stringify(Object.values(coupons), null, 2));
      console.log(`[${CurrentTime()}] Updated ${environmentValue.name} coupons.json`);
    } catch(error) {
      console.error(`[${CurrentTime()}] Error fetching ${environmentValue.name} coupons:`, error);
      return Promise.reject(error);
    }
  }
  return Promise.resolve(true);
}

fetchProducts();

app.post('/adminFetch', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminFetch. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const credentials = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(credentials.token && !tokenRegex.test(credentials.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + credentials.token);
  const token = credentials.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const returnData = {};

  query = "SELECT * FROM customer";
  values = [];
  try {
    const [customerData] = await pool.query(query, values);
    returnData.customers = customerData;
  } catch(error) {
    console.error('Error fetching customer data:', error);
    return res.status(500).send('Error fetching customer data');
  }

  query = "SELECT * FROM address";
  values = [];
  try {
    const [addressData] = await pool.query(query, values);
    returnData.addresses = addressData;
  } catch(error) {
    console.error('Error fetching address data:', error);
    return res.status(500).send('Error fetching address data');
  }

  query = "SELECT * FROM purchase";
  values = [];
  try {
    const [purchaseData] = await pool.query(query, values);
    returnData.purchases = purchaseData;
  } catch(error) {
    console.error('Error fetching purchase data:', error);
    return res.status(500).send('Error fetching purchase data');
  }

  query = "SELECT * FROM product";
  values = [];
  try {
    const [productData] = await pool.query(query, values);
    returnData.products = productData;
  } catch(error) {
    console.error('Error fetching product data:', error);
    return res.status(500).send('Error fetching product data');
  }

  query = "SELECT * FROM coupon";
  values = [];
  try {
    const [couponData] = await pool.query(query, values);
    returnData.coupons = couponData;
  } catch(error) {
    console.error('Error fetching coupon data:', error);
    return res.status(500).send('Error fetching coupon data');
  }

  query = "SELECT * FROM couponGroup";
  values = [];
  try {
    const [couponGroupData] = await pool.query(query, values);
    returnData.couponGroups = couponGroupData;
  } catch(error) {
    console.error('Error fetching coupon group data:', error);
    return res.status(500).send('Error fetching coupon group data');
  }

  query = "SELECT * FROM image";
  values = [];
  try {
    const [imageData] = await pool.query(query, values);
    returnData.images = imageData;
  } catch(error) {
    console.error('Error fetching image data:', error);
    return res.status(500).send('Error fetching image data');
  }

  query = "Select * FROM lineItem";
  values = [];
  try {
    const [lineItemData] = await pool.query(query, values);
    returnData.lineItems = lineItemData;
  } catch(error) {
    console.error('Error fetching line item data:', error);
    return res.status(500).send('Error fetching line item data');
  }

  return res.json(returnData);
});

app.post('/adminCustomerUpdate', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminCustomerUpdate. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const customerKey = requestData.customerKey;
  const firstName = requestData.firstName;
  const lastName = requestData.lastName;
  const firstNameKana = requestData.firstNameKana;
  const lastNameKana = requestData.lastNameKana;
  const gender = requestData.gender;
  const birthday = requestData.birthday;
  const email = requestData.email;

  query = "UPDATE customer SET firstName = ?, lastName = ?, firstNameKana = ?, lastNameKana = ?, gender = ?, birthday = ?, email = ? WHERE customerKey = ?";
  values = [firstName, lastName, firstNameKana, lastNameKana, gender, birthday, email, customerKey];

  console.log("Update query:")
  console.log(query)
  console.log("Update values:")
  console.log(values)

  try {
    await pool.query(query, values);
    return res.json({ success: true });
  } catch(error) {
    console.error('Error updating customer:', error);
    return res.status(500).send('Error updating customer');
  }
});

app.post('/adminCustomerDelete', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminCustomerDelete. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const customerKey = requestData.customerKey;

  query = "DELETE FROM customer WHERE customerKey = ?";
  values = [customerKey];
  try {
    await pool.query(query, values);
    return res.json({ success: true });
  } catch(error) {
    console.error('Error deleting customer:', error);
    return res.status(500).send('Error deleting customer');
  }
});

app.post('/adminAddressUpdate', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminAddressUpdate. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const addressKey = requestData.addressKey;

  const customerKey = requestData.customerKey;
  const firstName = requestData.firstName;
  const lastName = requestData.lastName;
  const postalCode = requestData.postalCode;
  const prefCode = requestData.prefCode;
  const pref = prefectureNames.find(prefectureName => {return prefectureName.code == prefCode}).name;
  const city = requestData.city;
  const ward = requestData.ward;
  const address2 = requestData.address2;
  const phoneNumber = requestData.phoneNumber;

  query = "UPDATE address SET firstName = ?, lastName = ?, postalCode = ?, prefCode = ?, pref = ?, city = ?, ward = ?, address2 = ?, phoneNumber = ? WHERE addressKey = ?";
  values = [firstName, lastName, postalCode, prefCode, pref, city, ward, address2, phoneNumber, addressKey];
  try {
    await pool.query(query, values);
    return res.json({ success: true });
  } catch(error) {
    console.error('Error updating address:', error);
    return res.status(500).send('Error updating address');
  }
});

app.post('/adminAddressDelete', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminAddressDelete. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const addressKey = requestData.addressKey;

  query = "DELETE FROM address WHERE addressKey = ?";
  values = [addressKey];
  try {
    await pool.query(query, values);
    return res.json({ success: true });
  } catch(error) {
    console.error('Error deleting address:', error);
    return res.status(500).send('Error deleting address');
  }
});

app.post('/adminImageUpload', upload.single("image"), async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminImageUpload. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const { altText, token } = req.body;
  const file = req.file;

  const tokenRegex = /^[0-9a-z]+$/i;
  if(token && !tokenRegex.test(token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + token);
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  if (!file) {
    return res.status(400).send("No file uploaded");
  }

  const imageURL = `products/${file.filename}`
  query = "INSERT INTO image (url, altText) VALUES (?, ?)";
  values = [imageURL, altText];

  try {
    await pool.query(query, values);
    return res.json({ success: true, imageURL: imageURL });
  }
  catch(error) {
    console.error('Error uploading image:', error);
    return res.status(500).send('Error uploading image');
  }
});

app.post('/adminImageUpdate', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminImageUpdate. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const imageKey = requestData.imageKey;
  const productKey = requestData.productKey;
  let newDisplayOrder = 1;

  query = `
    SELECT COALESCE(MAX(displayOrder), 0) + 1 AS newDisplayOrder
    FROM image
    WHERE productKey = ?
  `;
  values = [productKey];
  try {
    const [maxDisplayOrderResult] = await pool.query(query, values);
    newDisplayOrder = maxDisplayOrderResult[0].newDisplayOrder || 1;
  } catch(error) {
    console.error('Error fetching new display order:', error);
    return res.status(500).send('Error fetching new display order');
  }

  query = `UPDATE image SET productKey = ?, displayOrder = ? WHERE imageKey = ?`;
  values = [productKey, newDisplayOrder, imageKey];
  try {
    await pool.query(query, values);
    fetchProducts(); // Update the products json file with the new image data
    return res.json({ success: true });
  } catch(error) {
    console.error('Error updating image:', error);
    return res.status(500).send('Error updating image');
  }
});

app.post('/adminImageDelete', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminImageDelete. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const imageKey = requestData.imageKey;

  query = "SELECT url FROM image WHERE imageKey = ?";
  values = [imageKey];
  try{
    const [results] = await pool.query(query, values);
    if (!results) {
      return res.status(404).send("Image not found");
    }
    const imageURL = results[0].url;
    const filePath = path.join('/var/www/wellmill/', imageURL);
    fs.unlinkSync(filePath);
  } catch(error) {
    console.error('Error deleting image file:', error);
    return res.status(500).send('Error deleting image file');
  }

  query = "DELETE FROM image WHERE imageKey = ?";
  values = [imageKey];
  try {
    await pool.query(query, values);
    fetchProducts(); // Update the products json file with the new image data
    return res.json({ success: true });
  } catch(error) {
    console.error('Error deleting image:', error);
    return res.status(500).send('Error deleting image');
  }
});


app.post('/adminCouponCreate', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminCouponCreate. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const coupon = requestData.coupon;
  const code = coupon.code;
  const hash = await sha1(code);
  const productKey = coupon.productKey || null;
  const type = coupon.type;
  const target = coupon.target;
  const reward = coupon.reward;

  query = "INSERT INTO coupon (code, hash, productKey, type, target, reward) VALUES (?, ?, ?, ?, ?, ?)";
  values = [code, hash, productKey, type, target, reward];
  try {
    await pool.query(query, values);
    fetchProducts(); // Update the coupons json file with the new coupon data
    return res.json({ success: true });
  } catch(error) {
    console.error('Error creating coupon:', error);
    return res.status(500).send('Error creating coupon');
  }
});

app.post('/adminCouponDelete', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminCouponDelete. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const couponKey = requestData.couponKey;

  query = "DELETE FROM coupon WHERE couponKey = ?";
  values = [couponKey];
  try {
    await pool.query(query, values);
    fetchProducts(); // Update the coupons json file with the new coupon data
    return res.json({ success: true });
  } catch(error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).send('Error deleting coupon');
  }
});

app.post('/adminCouponGroupCreate', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminCouponGroupCreate. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const alphanumericRegex = /^[0-9a-z]+$/i;
  const reasonableTextRegex = /^[0-9a-zA-Z\s\-%.!$&()*+,\/:;<=>?@[\]^_`{|}~]+$/;
  const veryReasonableTextRegex = /^[0-9a-zA-Z\-%.!$&+=^_~]+$/;

  const newCouponGroupSpecs = requestData.couponGroup;

  const codeList = newCouponGroupSpecs.codeList;
  const codeArray = Array.isArray(codeList)
    ? codeList
    : typeof codeList === 'string'
      ? codeList.split(",").map(item => item.trim())
      : [];

  const invalidCode = codeArray.find(code => !veryReasonableTextRegex.test(code));
  if(invalidCode) { return res.status(400).send("Malformed code: " + invalidCode); }

  const hasDuplicates = codeArray.length !== new Set(codeArray).size;
  if(hasDuplicates) { return res.status(400).send("Duplicate codes found in list"); }

  const longCode = codeArray.find(code => code.length > 50);
  if(longCode) { return res.status(400).send("Coupon code over 50 characters found: " + longCode); }


  const couponGroupName = newCouponGroupSpecs.name || `CouponGroup${new Date().toISOString().split('.')[0]}`;
  if(!veryReasonableTextRegex.test(couponGroupName)) { return res.status(400).send("Malformed coupon group name"); }

  const codeStem = newCouponGroupSpecs.codeStem;
  if(!veryReasonableTextRegex.test(codeStem)) { return res.status(400).send("Malformed code stem"); }

  const isCodePrefixed = !!newCouponGroupSpecs.isCodePrefixed;
  const isUnambiguous = !!newCouponGroupSpecs.isUnambiguous;

  const couponQuantity = newCouponGroupSpecs.couponQuantity === undefined ? undefined : Number(newCouponGroupSpecs.couponQuantity);
  if(isNaN(couponQuantity) || couponQuantity <= 0) { return res.status(400).send("Malformed coupon quantity"); }
  const jumbleLength = newCouponGroupSpecs.jumbleLength === undefined ? undefined : Number(newCouponGroupSpecs.jumbleLength);
  if(isNaN(jumbleLength) || jumbleLength <= 0) { return res.status(400).send("Malformed jumble length"); }
  const productKey = newCouponGroupSpecs.productKey === undefined ? undefined : Number(newCouponGroupSpecs.productKey);
  if(isNaN(productKey) || productKey <= 0) { return res.status(400).send("Malformed productKey"); }
  const type = newCouponGroupSpecs.type === undefined ? undefined : Number(newCouponGroupSpecs.type);
  if(isNaN(type) || type <= 0) { return res.status(400).send("Malformed type"); }
  const target = newCouponGroupSpecs.target === undefined ? undefined : Number(newCouponGroupSpecs.target);
  if(isNaN(target) || target < 0) { return res.status(400).send("Malformed target"); }
  const reward = newCouponGroupSpecs.reward === undefined ? undefined : Number(newCouponGroupSpecs.reward);
  if(isNaN(reward) || reward <= 0) { return res.status(400).send("Malformed reward"); }
  const maxUses = newCouponGroupSpecs.maxUses === undefined ? undefined : Number(newCouponGroupSpecs.maxUses);
  if(isNaN(maxUses) || maxUses <= 0) { return res.status(400).send("Malformed maxUses"); }

  const minimumJumbleLength = 5; //calculateMinimumJumbleLength(couponQuantity);
  if(jumbleLength < minimumJumbleLength) { return res.status(400).send("Jumble length too short for coupon quantity"); }

  query = "INSERT INTO couponGroup (name, codeStem, isCodePrefixed, jumbleLength, isUnambiguous, type, target, reward, maxUses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  values = [couponGroupName, codeStem, isCodePrefixed, jumbleLength, isUnambiguous, type, target, reward, maxUses];
  let couponGroupKey;

  try {
    const [result] = await pool.query(query, values);
    couponGroupKey = result.insertId;
  } catch(error) {
    console.error('Error creating coupon group:', error);
    return res.status(500).send('Error creating coupon group');
  }

  let couponCreationResults = {statusCode: 400, message: "Needed content for list or server creation not found"};
  if(codeArray.length > 0 && type !== undefined && target !== undefined && reward !== undefined && maxUses !== undefined) {
    couponCreationResults = await createCouponsFromList(codeArray, productKey, type, target, reward, maxUses, couponGroupKey);
  } else if(codeStem !== undefined && jumbleLength !== undefined && type !== undefined && target !== undefined && reward !== undefined && maxUses !== undefined) {
    couponCreationResults = await createCouponsFromStem(pool, codeStem, isCodePrefixed, couponQuantity, jumbleLength, isUnambiguous, productKey, type, target, reward, maxUses, couponGroupKey);
  }
  return res.status(couponCreationResults.statusCode).send(couponCreationResults.message);
});

async function createCouponsFromList(codeArray, productKey, type, target, reward, maxUses, couponGroupKey) {
  const uniqueCodes = [...new Set(codeArray)];

  try {
    // Check if codes already exist in the database
    const checkQuery = 'SELECT code FROM coupon WHERE code IN (?)';
    const [existingCoupons] = await pool.query(checkQuery, [uniqueCodes]);
    const existingCodes = new Set(existingCoupons.map(row => row.code));
    const newCodes = uniqueCodes.filter(code => !existingCodes.has(code));

    // Collect all coupon data in an array
    const couponsData = await Promise.all(newCodes.map(async code => {
      const hash = await sha1(code);
      return [code, hash, productKey, type, target, reward, maxUses, couponGroupKey];
    }));

    // Construct the bulk INSERT query
    const query = `
      INSERT INTO coupon (code, hash, productKey, type, target, reward, maxUses, couponGroupKey) 
      VALUES ?`;

    // Use pool.query once to insert all the rows in couponData
    await pool.query(query, [couponsData]);
    console.log('Coupons created from list successfully');
    return { statusCode: 200 }
  } catch (error) {
    console.error('Error creating coupons:', error);
    return { statusCode: 500, message: "Error creating coupons from list"}
  }
}

async function createCouponsFromStem(pool, codeStem, isCodePrefixed, couponQuantity, jumbleLength, isUnambiguous, productKey, type, target, reward, maxUses, couponGroupKey) {
  const unambiguousChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const ambiguousChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charSet = isUnambiguous ? unambiguousChars : ambiguousChars;
  const charSetSize = charSet.length;

  const baseLength = 4; // Minimum unique prefix length
  const totalBaseCodes = Math.pow(charSetSize, baseLength); // 56^4 or 62^4

  if (couponQuantity > totalBaseCodes) {
    return { statusCode: 400, message: "Coupon quantity exceeds possible unique codes" }
  }

  const codes = [];
  const availableIndexes = Array.from({ length: totalBaseCodes }, (_, i) => i);

  // Fisher-Yates shuffle for first `couponQuantity` numbers
  for (let i = 0; i < couponQuantity; i++) {
    const j = Math.floor(Math.random() * (totalBaseCodes - i));
    [availableIndexes[i], availableIndexes[j]] = [availableIndexes[j], availableIndexes[i]];
  }

  const filePath = path.join(__dirname, 'couponsGroup.csv');
  const writeStream = fs.createWriteStream(filePath);

  try {
    const buffer = [];
    const batchSize = 1000;
    for (let i = 0; i < couponQuantity; i++) {
      const num = availableIndexes[i];
      let baseCode = "1234a"; //numberToBaseString(num, charSet, baseLength);
  
      // Extend code if `jumbleLength` > baseLength
      while (baseCode.length < jumbleLength) {
          baseCode += charSet[Math.floor(Math.random() * charSetSize)];
      }

      const finalCode = isCodePrefixed ? codeStem + baseCode : baseCode + codeStem;
      const hash = await sha1(finalCode);
      buffer.push([currentCode, hash, productKey, type, target, reward, maxUses, couponGroupKey]);

      if (buffer.length >= batchSize) {
        writeStream.write(buffer.join('\n') + '\n');
        buffer.length = 0;
      }
    }

    // push any remaining buffer contents to the file
    if (buffer.length > 0) {
      writeStream.write(buffer.join('\n') + '\n');
      buffer.length = 0;
    }

    writeStream.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        console.log(`CSV file created: ${filePath}`);

        // Insert into MySQL using LOAD DATA INFILE
        try {
          const connection = await pool.getConnection();
          const query = `
            LOAD DATA INFILE ?
            INTO TABLE coupon
            FIELDS TERMINATED BY ','
            LINES TERMINATED BY '\n'
            (code, hash, productKey, type, target, reward, maxUses, couponGroupKey);
          `;

          await connection.query(query, [filePath]);
          connection.release();
          console.log('Coupons successfully inserted into MySQL');
          resolve({ statusCode: 200 });
        } catch (error) {
          console.error('Error loading data into MySQL:', error);
          reject({ statusCode: 500, message: "Error loading data into MySQL" });
        }
      });

      writeStream.on('error', (error) => {
        console.error('Error writing file:', error);
        reject({ statusCode: 500, message: "Error writing file" });
      });
    });
  } catch (error) {
    console.error('Error creating coupons:', error);
    return { statusCode: 500, message: "Error creating coupons from stem"}
  }
}

app.post('/adminCouponGroupDelete', async (req, res) => {
  return res.status(500).send('Not implemented');
//  const { authenticated, error, status, stageSubdomain } = authenticate(req);
//  if (!authenticated) { return res.status(status).send(error); }
//  const couponGroupKey = Number(req.body.data.couponGroupKey);
//  if(isNaN(couponGroupKey) || couponGroupKey <= 0 || !Number.isInteger(couponGroupKey)) { return res.status(400).send("Malformed couponGroupKey"); }
//
//  // delete all coupons in table "coupon" with couponGroupKey
//  let query = "DELETE FROM coupon WHERE couponGroupKey = ?";
//  let values = [couponGroupKey];
//  try {
//    await pool.query(query, values);
//  } catch(error) {
//    console.error('Error deleting coupons:', error);
//    return res.status(500).send('Error deleting coupons');
//  }
//
//  // delete coupon group with couponGroupKey in table couponGroup
//  query = "DELETE FROM couponGroup WHERE couponGroupKey = ?";
//  values = [couponGroupKey];
//  try {
//    await pool.query(query, values);
//  } catch(error) {
//    console.error('Error deleting coupon group:', error);
//    return res.status(500).send('Error deleting coupon group');
//  }
//
//  return res.json({ success: true });
});

app.post('/adminProductCreate', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminProductCreate. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const product = requestData.product;
  const title = product.title;
  const description = product.description;
  const available = product.available;
  const price = product.price;
  const taxRate = product.taxRate;
  const type = product.type;
  const discountRate = product.discountRate ? product.discountRate : null; // 0 (or blank) means "null", it's not a 0% discount, it's no discount

  query = "INSERT INTO product (title, description, available, type, price, taxRate, discountRate) VALUES (?, ?, ?, ?, ?, ?, ?)";
  values = [title, description, available, type, price, taxRate, discountRate];
  try {
    const [newProductResult] = await pool.query(query, values);

    const newProductKey = newProductResult.insertId;
    const newProductId = `S${newProductKey.toString().padStart(5, '0')}`;
    const updateQuery = "UPDATE product SET id = ? WHERE productKey = ?";
    const updateValues = [newProductId, newProductKey];
    await pool.query(updateQuery, updateValues);

    fetchProducts(); // Update the products json file with the new product data
    return res.json({ success: true });
  } catch(error) {
    console.error('Error creating product:', error);
    return res.status(500).send('Error creating product');
  }
});


app.post('/adminProductUpdate', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminProductUpdate. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const product = requestData.product;
  if(!product) { return res.status(400).send("Missing product data"); }

  const productKey = product.productKey;
  if(!productKey) { return res.status(400).send("Missing product key"); }

  const title = product.title || "";
  const description = product.description || "";
  const available = product.available || 0;
  const productOrder = product.productOrder || 1000;
  const price = product.price;
  if(!price) { return res.status(400).send("Missing price"); }

  const taxRate = product.taxRate || 0.1;
  const discountRate = product.discountRate ? product.discountRate : null; // 0 (or blank) means "null", it's not a 0% discount, it's no discount
  const type = product.type || 1;

  query = "UPDATE product SET title = ?, description = ?, available = ?, productOrder = ?, price = ?, taxRate = ?, discountRate = ?, type = ? WHERE productKey = ?";
  values = [title, description, available, productOrder, price, taxRate, discountRate, type, productKey];
  console.log("Update query:")
  console.log(query)
  console.log("Update values:")
  console.log(values)

  try {
    await pool.query(query, values);
    fetchProducts(); // Update the products json file with the new product data
    return res.json({ success: true });
  } catch(error) {
    console.error('Error updating product:', error);
    return res.status(500).send('Error updating product');
  }
});

app.post('/adminProductDelete', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit adminProductDelete. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);
  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;
  const tokenRegex = /^[0-9a-z]+$/i;
  if(requestData.token && !tokenRegex.test(requestData.token)) { return res.status(400).send("Malformed token"); }
  console.log("Clean Token: " + requestData.token);
  const token = requestData.token;
  if (token !== process.env.ADMIN_TOKEN) { return res.status(401).send("Unauthorized"); }

  const productKey = requestData.productKey;

  query = "DELETE FROM product WHERE productKey = ?";
  values = [productKey];
  try {
    await pool.query(query, values);
    fetchProducts(); // Update the products json file with the new product data
    return res.json({ success: true });
  } catch(error) {
    console.error('Error deleting product:', error);
    return res.status(500).send('Error deleting product');
  }
});


app.post('/createUser', async (req, res) => {
    const subdomains = req.subdomains;
    const subdomain = subdomains.length > 0 ? subdomains[0] : null;
    console.log(`░▒▓█ Hit createUser. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
    console.log(req.body);
    const stageSubdomain = subdomain === "stage" ? true : false;
    const pool = stageSubdomain ? poolStage : poolProduction;

    const userData = req.body.data;
    const firstName = userData.firstName?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
    const lastName = userData.lastName?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
    const firstNameKana = userData.firstNameKana?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
    const lastNameKana = userData.lastNameKana?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
    const gender = userData.gender?.replace(/[^\p{L}\p{N}\p{Z}]/gu, ''); // "male" or "female" typically

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!userData.email || !emailRegex.test(userData.email)) { return res.status(400).send('Missing or malformed email'); }
    const email = userData.email;

    const passwordRegex = /^[\x20-\x7E]{8,}$/;
    if(!userData.password || !passwordRegex.test(userData.password)) { return res.status(400).send('Missing or malformed password'); }
    const password = userData.password;

    const newUser = userData.token ? false : true;
    console.log("New user in createUser: " + newUser);
    const tokenRegex = /^[0-9a-f]+$/i;
    if(userData.token && !tokenRegex.test(userData.token)) { return res.status(400).send("Malformed token"); }
    const token = newUser ? crypto.randomBytes(48).toString('hex') : userData.token;

    const birthday = ValidateBirthday(userData.birthday);

    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    query = "SELECT COUNT(*) FROM customer WHERE email = ?";
    try {
      const [existingCustomerCount] = await pool.query(query, [email]);
      if(existingCustomerCount[0]['COUNT(*)'] > 0) {
        //return res.status(400).send("すでに登録されたメール"); // Email already registered
        return res.status(400).json({data: null, error: "すでに登録されたメール"}); // Email already registered
      }
    } catch(error) {
      console.error('Error counting existing users by email:', error);
      return res.status(500).send('Error counting existing users by email');  
    }

    query = newUser ?
      `INSERT INTO customer (firstName, lastName, firstNameKana, lastNameKana, gender, birthday, email, passwordHash, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` :
      `UPDATE customer SET firstName = ?, lastName = ?, firstNameKana = ?, lastNameKana = ?, gender = ?, birthday = ?, email = ?, passwordHash = ?, guest = FALSE WHERE token = ?`;
    values = [firstName, lastName, firstNameKana, lastNameKana, gender, birthday, email, hashedPassword, token];

  try {
    const [results] = await pool.query(query, values);
    //console.log("Results after adding new customer:");
    //console.log(results);

    if(newUser) {
      const customerKey = results.insertId;
      const code = "NV" + customerKey;
  
      console.log(`Created user with customerKey: ${customerKey}, token: ${token} and code: ${code}`);
      return res.json({ customerKey: customerKey, token: token, code: code });
    } else {
      // it's an existing user, so they sent a token to update their info, but no user was found with that token
      if (results.affectedRows === 0) {
        console.error('No user found with token:', token);
        return res.status(404).send('No user found with the given token'); // It's more semantically appropriate to return a 404 status here
      }
      query = "SELECT customerKey FROM customer WHERE token = ?";
      values = [token];
      const [customerKeyResults] = await pool.query(query, values);
      if(customerKeyResults.affectedRows === 0) {
        console.error('No user found with token: ', token);
        return res.status(404).send('No user found with the given token'); // It's more semantically appropriate to return a 404 status here
      }
      const customerKey = customerKeyResults[0].customerKey;
      const code = "NV" + customerKey;
      console.log(`Registered user with customerKey: ${customerKey}, token: ${token} and code: ${code}`);
      return res.json({ customerKey: customerKey, token: token, code: code });
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).send('Error creating user: ' + error);
  }
});

app.post('/updateUser', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit updateUser. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  //#region Validate input
  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in updateUser: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const userData = req.body.data;
  const firstName = userData.firstName?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
  const lastName = userData.lastName?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
  const firstNameKana = userData.firstNameKana?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
  const lastNameKana = userData.lastNameKana?.replace(/[^\p{L}\p{N}\p{Z}]/gu, '');
  const gender = userData.gender?.replace(/[^\p{L}\p{N}\p{Z}]/gu, ''); // "male" or "female" typically

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if(userData.email && !emailRegex.test(userData.email)) { return res.status(400).send('Malformed email'); }
  const email = userData.email;

  const passwordRegex = /^[\x20-\x7E]{8,}$/;
  if(userData.password && !passwordRegex.test(userData.password)) { return res.status(400).send('Malformed current password'); }
  const password = userData.password;

  if(userData.newPassword1 && !passwordRegex.test(userData.newPassword1)) { return res.status(400).send('Malformed new password'); }
  const newPassword1 = userData.newPassword1;

  if(userData.newPassword2 && !passwordRegex.test(userData.newPassword2)) { return res.status(400).send('Malformed new password'); }
  const newPassword2 = userData.newPassword2;

  if(newPassword1 && newPassword2 && newPassword1 !== newPassword2) { return res.status(400).send('Mismatched new password'); }

  if(newPassword1 && !password) { return res.status(400).send('Current password required to change password'); }

  const birthday = ValidateBirthday(userData.birthday);
  //#endregion

  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined; // 10 salt rounds
  const hashedNewPassword = newPassword1 ? await bcrypt.hash(newPassword1, 10) : undefined; // 10 salt rounds


  // If updating to a new email address, make sure no one else has it.
  if(email) {
    query = "SELECT COUNT(*) FROM customer WHERE email = ? AND customerKey != ?";
    try {
      const [existingCustomerCount] = await pool.query(query, [email, customerKey]);
      if(existingCustomerCount[0]['COUNT(*)'] > 0) {
        return res.status(400).json({data: null, error: "※すでにこのメールアドレスのユーザーが存在しています。"}); // Email already registered
      }
    } catch(error) {
      console.error('Error counting existing users by email:', error);
      return res.status(500).send('Error counting existing users by email');
    }    
  }

  //#region Query to get customer info by customerKey and verify current password, if given
  try {
    query = `SELECT passwordHash FROM customer WHERE customerKey = ?`;
    const [results] = await pool.query(query, [customerKey]);

    // If no results, customer not found
    if (results.length === 0) {
      return res.status(500).send("Can't SELECT customer data");
    }

    const [customer] = results;

    // Compare the password (if provided) with the stored hash
    if(password) {
      const match = await bcrypt.compare(password, customer.passwordHash);
      if(!match) {
        return res.status(400).send("現在のパスワードが正しくありません");
      }  
    }
  } catch(error) {
    return res.status(500).send("Error pulling customer data");
  }
  //#endregion

  const queryParts = [];
  values = [];

  if (firstName      !== undefined) { queryParts.push('firstName = ?');      values.push(firstName); }
  if (lastName       !== undefined) { queryParts.push('lastName = ?');       values.push(lastName); }
  if (firstNameKana  !== undefined) { queryParts.push('firstNameKana = ?');  values.push(firstNameKana); }
  if (lastNameKana   !== undefined) { queryParts.push('lastNameKana = ?');   values.push(lastNameKana); }
  if (gender         !== undefined) { queryParts.push('gender = ?');         values.push(gender); }
  if (birthday       !== undefined) { queryParts.push('birthday = ?');       values.push(birthday); }
  if (email          !== undefined) { queryParts.push('email = ?');          values.push(email); }

  if (hashedPassword !== undefined && !hashedNewPassword) { queryParts.push('passwordHash = ?'); values.push(hashedPassword); }
  if (hashedNewPassword) { queryParts.push('passwordHash = ?'); values.push(hashedNewPassword); }

  if (queryParts.length === 0) {
    return res.status(400).send('No updateable fields provided');
  }

  query = `UPDATE customer SET ${queryParts.join(', ')} WHERE customerKey = ?`;
  values.push(customerKey);

  console.log("Update query:")
  console.log(query)
  console.log("Update values:")
  console.log(values)

  try {
    const [results] = await pool.query(query, values);
    console.log("Results after updating customer:");
    console.log(results);

    console.log(`Updated user with key: ${customerKey}`);
    return res.json({ customerKey: customerKey, code: `NV${customerKey}` });
  } catch (error) {
    console.error('Internal error updating user:', error);
    return res.status(500).send('Internal error updating user');
  }
});

function ValidateBirthday(birthdayInput) {
  if(!birthdayInput) return undefined;
  const birthdayObject = new Date(birthdayInput.replace(/[^\w\-:\/]/g, ''));
  if (isNaN(birthdayObject.getTime())) { return undefined; }

  const now = new Date();
  const oneHundredFiftyYearsAgo = new Date(now.getFullYear() - 150, now.getMonth(), now.getDate());
  if (birthdayObject > now || birthdayObject < oneHundredFiftyYearsAgo) { return undefined; }

  const year = birthdayObject.getFullYear();
  const month = (birthdayObject.getMonth() + 1).toString().padStart(2, '0');
  const day = birthdayObject.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
  //return `${year}年${month}月${day}日`;
}

app.post('/registerGuest', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit registerGuest. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const requestData = req.body.data;

  // random number between 1000000000 and 2000000000 (cut off first and last 2 numbers, potential edge cases)
  const customerKey = Math.floor(Math.random() * 1000000002) + 1000000000 -4;
  const token = crypto.randomBytes(48).toString('hex');
  const code = "NV" + customerKey;

  let query = `
    INSERT INTO customer (token, guest)
    VALUES (?, ?)`;
  let values = [token, 1];


  try {
    const [results] = await pool.query(query, values);
  
    const customerKey = results.insertId;
    const code = "NV" + customerKey;

    console.log(`Registered guest with customerKey: ${customerKey}, token: ${token} and code: ${code}`);
    return res.json({ customerKey: customerKey, token: token, code: code });
  } catch (error) {
    console.error('Error registering guest:', error);
    return res.status(500).send('Error registering guest: ' + error);
  }
});

app.post('/addAddress', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit addAddress. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in addAddress: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const addressData = req.body.data;

  // addressKey can be passed in, when requesting an edit, or given by MySQL for a new address
  let addressKey;
  addressKey = Number(addressData.addressKey) || null;
  const newAddress = (addressKey === null)

  function SanitizeInput(input) { return (input) ? input.replace(/[^\p{L}\p{N}\p{Z}\-#&()]/gu, '') : ""; }
  const firstName =   SanitizeInput(addressData.firstName);
  const lastName =    SanitizeInput(addressData.lastName);
  const postalCode =  SanitizeInput(addressData.postalCode);
  const prefCode =    parseInt(SanitizeInput(addressData.prefCode));
  const pref =        prefectureNames.find(prefectureName => {return prefectureName.code === prefCode}).name;
  const city =        SanitizeInput(addressData.city);
  const ward =        SanitizeInput(addressData.ward);
  const address2 =    SanitizeInput(addressData.address2);
  const phoneNumber = SanitizeInput(addressData.phoneNumber);

  // This can be changed later if needed
  // MySQL uses "1" and "0" for true and false
  let defaultAddress = (addressData.defaultAddress ? "1" : "0");

  if (!Number.isInteger(customerKey) || customerKey <= 0 || customerKey >= 2147483647) {
    return res.status(400).send('Malformed customerKey: ' + customerKey);
  }


  // Count the number of default addresses. If it's zero, force this new one to be default
  // If it's an update, don't include the one being updates in this count
  // When addressKey is not null, it will exclude the address with that key.
  // When addressKey is null, the ? IS NULL condition becomes true, so the addressKey <> ? part is effectively ignored.
  query = "SELECT COUNT(*) FROM address WHERE defaultAddress = 1 AND customerKey = ? AND (? IS NULL OR addressKey <> ?)";
  try {
    const [defaultsCount] = await pool.query(query, [customerKey, addressKey, addressKey]);
    if(defaultsCount[0]['COUNT(*)'] === 0) { defaultAddress = "1"; }
  } catch(error) {
    console.error('Error counting address defaults:', error);
    return res.status(500).send('Error counting address defaults: ' + error);  
  }


  // If this address wants to be the default, all others must not be default
  if(defaultAddress === "1") {
    query = "UPDATE address SET defaultAddress = 0 WHERE customerKey = ?;"
    try {
      await pool.query(query, [customerKey]);
    } catch(error) {
      console.error('Error updating old address defaults:', error);
      return res.status(500).send('Error updating old address defaults: ' + error);  
    }
  }

  values = [customerKey, firstName, lastName, postalCode, prefCode, pref, city, ward, address2, phoneNumber, defaultAddress];

  // Make a query to add a new address
  if(newAddress) {
    query = `
      INSERT INTO address (customerKey, firstName, lastName, postalCode, prefCode, pref, city, ward, address2, phoneNumber, defaultAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  }

  // Make a query to edit an existing address
  else {
    query = `
    UPDATE address SET customerKey = ?, firstName = ?, lastName = ?, postalCode = ?, prefCode = ?, pref = ?, city = ?, ward = ?, address2 = ?, phoneNumber = ?, defaultAddress = ?
    WHERE addressKey = ?`;
    values.push(addressKey);
  }

  // Make the change in the database
  try {
    await pool.query(query, values);
    //const addressKey = results[0].insertId;
    //console.log('Generated Address Key:', addressKey);
  } catch (error) {
    console.error(`Error ${newAddress ? "adding" : "updating"} address: ${error}`);
    return res.status(500).send(`Error ${newAddress ? "adding" : "updating"} address: ${error}`);
  }

  const freshAddresses = await PullFreshAddresses(customerKey, stageSubdomain)
  return res.json({ addresses: freshAddresses });
});

app.post('/deleteAddress', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit deleteAddress. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in deleteAddress: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const addressData = req.body.data;
  if(!addressData) {
    const errorMessage = "No addresses data in deleteAddress";
    console.error(errorMessage);
    return res.status(400).send(errorMessage);
  }

  const addressKey = Number(addressData.addressKey);
  if(!addressKey) {
    const errorMessage = `Malformed addressKey in deleteAddress: ${addressKey}`;
    console.error(errorMessage);
    return res.status(400).send(errorMessage);
  }

  query = `DELETE FROM address WHERE addressKey = ? AND customerKey = ?`;
  try {
    await pool.query(query, [addressKey, customerKey]);
  } catch(error) {
    const errorMessage = `Error deleting address, addressKey: ${addressKey}, customerKey: ${customerKey}`;
    console.error(errorMessage);
    return res.status(500).send(errorMessage);
  }

  let forceNewDefault = false;
  query = "SELECT COUNT(*) FROM address WHERE defaultAddress = 1 AND customerKey = ?";
  try {
    const [defaultsCount] = await pool.query(query, [customerKey]);
    if(defaultsCount[0]['COUNT(*)'] === 0) { forceNewDefault = true; }
  } catch(error) {
    console.error('Error counting address defaults after delete:', error);
    return res.status(500).send('Error counting address defaults after delete: ' + error);  
  }

  if(forceNewDefault) {
    query = `UPDATE address SET defaultAddress = ? WHERE customerKey = ? LIMIT 1`;
    await pool.query(query, [true, customerKey]);
  }

  const freshAddresses = await PullFreshAddresses(customerKey, stageSubdomain)
  return res.json({ addresses: freshAddresses });
});

async function PullFreshAddresses(customerKey, stageSubdomain) {
  // Pull fresh copy of all addresses to send back
  const pool = stageSubdomain ? poolStage : poolProduction;
  query = "SELECT * FROM address WHERE customerKey = ?";
  try {
    const [addresses] = await pool.query(query, [customerKey]);

    // MySQL uses 1 and 0 for true and false, but I want real bools
    addresses.forEach(address => {address.defaultAddress = (address.defaultAddress === 1) ? true : false});
    return addresses;
  } catch (error) {
    console.error(`Error pulling fresh addresses after updating address: ${error}`);
    return res.status(500).send(`Error pulling fresh addresses after updating address: ${error}`);
  }  
}

app.post('/sendEmail', async (req, res) => {
  console.log("░▒▓█ Hit sendEmail. Time: " + CurrentTime());
  console.log(req.body);
  let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: 'cdehaan@gmail.com',
          pass: process.env.EMAIL_PASSWORD
      }
  });

  let mailOptions = {
      from: 'cdehaan@gmail.com', 
      //to: 'cdehaan@gmail.com', 
      to: 'wellmill@reprocell.com', 
      subject: 'New Contact Form Submission',
      text: `Name: ${req.body.name}\nEmail: ${req.body.email}\nPhone: ${req.body.phone}\nInquiry: ${req.body.inquiry}\nMessage: ${req.body.message}`
  };

  try {
      await transporter.sendMail(mailOptions);
      return res.status(200).send('Email sent successfully');
  } catch (error) {
      const errorMessage = `[${new Date().toISOString()}] Error in /sendEmail: ${error.message}`;
      console.error(errorMessage);
      return res.status(500).send(errorMessage);
  }
});

app.post('/sendWelcome', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit sendWelcome. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const emailSubdomain = subdomain === "stage" ? "stage" : "shop";

  const recipient = req.body.recipient;
  console.log("recipient: " + recipient);

  let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.WELLMILL_EMAIL_ADDRESS,
          pass: process.env.WELLMILL_EMAIL_APP_PASSWORD
      }
  });

  const old_emailHTML = `
  <html>
      <head>
          <style>
              /* Inline CSS here */
          </style>
      </head>
      <body>
        <div style="display: flex; justify-content: center">
          <div style="display: grid; width: 30rem; margin-top: 2rem; grid-template-columns: 1fr;">
          <img src="cid:logo" alt="Logo">
          <span style="font-size: 1.5rem; display: flex; margin-top: 1rem;">ウェルミル（デストサイト）へようこそ!</span>
          <span style="color: #444; display: flex; margin: 1rem 0;">会員登録いただきありがとうございます。引き続きお買い物をお楽しみください。</span>
          <a href="https://${emailSubdomain}.well-mill.com/shop" style="width: 10rem; text-align: center; background-color: #FFA500; padding: 1rem; border-radius: 0.25rem; color: white; text-decoration: none; justify-self: flex-start">ショッピングアクセスする</a>
          </div>
        </div>
        <hr/>
        <div style="display: flex; justify-content: center">
          <div style="display: grid; width: 30rem; margin-top: 2rem; grid-template-columns: 1fr;">
            <span style="display: flex; font-size: 0.9rem; color: #444;">株式会社リプロセル 臨床検査室</span>
            <span style="display: flex; font-size: 0.9rem; color: #444;">〒222-0033 神奈川県横浜市港北区新横浜3-8-11</span>
            <span style="display: flex; font-size: 0.9rem; color: #FFA500;">0120-825-828</span>
            <span style="display: flex; font-size: 0.9rem; color: #444;">(平日9:00~18:00 土日祝日休み)</span>
          </div>
        </div>
      </body>
  </html>
  `;
  const logoPath = process.env.BASE_URL + 'logo.png';

  const emailHTML = `
<html>
  <head>
    <style>
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
      }
      .content {
        width: 600px;
        margin: 0 auto;
      }
      .button {
        background-color: #FFA500;
        color: #FFFFFF;
        padding: 1rem;
        border-radius: 0.25rem;
        text-decoration: none;
        text-align: center;
        display: inline-block;
      }
      .footer-text {
        font-size: 0.9rem;
        color: #888;
        padding: 0;
      }
      .footer-highlight {
        color: #FFA500;
      }
    </style>
  </head>
  <body>
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table class="content" cellspacing="0" cellpadding="0">
            <!-- Logo -->
            <tr>
              <td align="left" style="padding-top: 2rem;">
                <img src="${logoPath}" alt="Logo" style="max-width: 100%;">
              </td>
            </tr>
            <!-- Title -->
            <tr>
              <td align="left" style="font-size: 1.5rem; color: #000; padding: 1rem 0;">
                ウェルミルへようこそ!
              </td>
            </tr>
            <!-- Message -->
            <tr>
              <td align="left" style="color: #444; padding: 0;">
                会員登録いただきありがとうございます。引き続きお買い物をお楽しみください。
              </td>
            </tr>
            <!-- Button -->
            <tr>
              <td align="left" style="padding: 2rem 1rem;">
                <a href="https://${emailSubdomain}.well-mill.com/shop" class="button" style="color: #FFFFFF">
                  ショップにアクセスする
                </a>
              </td>
            </tr>
            <!-- Separator -->
            <tr>
              <td align="center" style="padding: 2rem 0;">
                <hr/>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="left" style="padding-bottom: 2rem;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td class="footer-text" align="left">
                      株式会社リプロセル 臨床検査室
                    </td>
                  </tr>
                  <tr>
                    <td class="footer-text" align="left">
                      〒222-0033 神奈川県横浜市港北区新横浜3-8-11
                    </td>
                  </tr>
                  <tr>
                    <td class="footer-text footer-highlight" align="left">
                      0120-825-828
                    </td>
                  </tr>
                  <tr>
                    <td class="footer-text" align="left">
                      (平日9:00~18:00 土日祝日休み)
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  /*
  // Works great, sends via gmail
  let mailOptions = {
      from: process.env.WELLMILL_EMAIL_ADDRESS, 
      to: recipient, 
      subject: '【ウェルミル】お客様アカウントの確認',
      html: emailHTML,
      attachments: [{
        filename: 'logo.png',
        //path: __dirname + '/logo.png',
        path: process.env.BASE_URL + 'logo.png',
        cid: 'logo'
    }]
  };

  try {
      await transporter.sendMail(mailOptions);
      return res.status(200).send('Email sent successfully');
  } catch (error) {
      const errorMessage = `[${new Date().toISOString()}] Error in /sendEmail: ${error.message}`;
      console.error(errorMessage);
      return res.status(500).send(errorMessage);
  }
  */

  const msg = {
    to: recipient,
    from: 'no-reply@well-mill.com',
    subject: '【ウェルミル】お客様アカウントの確認',
    html: emailHTML,
  };

  sgMail
  .send(msg)
  .then(() => {
    console.log('SendGrid welcome email sent')
    return res.json({ message: 'Email sent successfully' });
  })
  .catch((error) => {
    console.error(error)
    return res.status(500).send('Error sending email');
  })

});

app.post("/sendOrderEmail", async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit sendOrderEmail (API). Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const emailSubdomain = subdomain === "stage" ? "stage" : "shop";

  const images = req.body.data.products.flatMap(product => {
    const images = product.images;
    images.forEach(image => { image.productKey = product.productKey; });
    return images;
  });

  images.sort((a, b) => {
    if (a.productKey < b.productKey) return -1;
    if (a.productKey > b.productKey) return 1;
    // If productKey is equal, sort by displayOrder
    return a.displayOrder - b.displayOrder;
  });

  req.body.data.products.forEach(product => { delete product.images; });

  sendOrderEmail(req.body.data.email, req.body.data.purchase, req.body.data.addresses, req.body.data.lineItems, req.body.data.products, images, emailSubdomain);

  return res.json({ message: 'Email sent successfully' });
});

async function sendOrderEmail(recipient, purchase, addresses, lineItems, products, images, emailSubdomain) {
  console.log(`░▒▓█ Hit sendOrderEmail (function). Subdomain: [${emailSubdomain}] Time: ${CurrentTime()}`);
  console.dir({recipient, purchase, addresses, lineItems, products, images}, { depth: null, colors: true });

  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.WELLMILL_EMAIL_ADDRESS,
        pass: process.env.WELLMILL_EMAIL_APP_PASSWORD
    }
  });

  const totalCost = Math.round(lineItems.reduce((accumulator, lineItem) => {
    const lineItemCost = (parseInt(lineItem.unitPrice) * (1 + parseFloat(lineItem.taxRate)) * parseInt(lineItem.quantity));
    return accumulator + lineItemCost;
  }, 0));

  console.log(`totalCost: ${totalCost}`);

  const totalTax = Math.round(lineItems.reduce((accumulator, lineItem) => {
    const lineItemCost = (parseInt(lineItem.unitPrice) * (parseFloat(lineItem.taxRate)) * parseInt(lineItem.quantity));
    return accumulator + lineItemCost;
  }, 0));

  const couponDiscount = purchase.couponDiscount ? parseInt(purchase.couponDiscount) : 0;

  const uniqueProductKeysSet = new Set();
  for (const item of lineItems) {
    uniqueProductKeysSet.add(item.productKey);
  }
  const uniqueProductKeys = Array.from(uniqueProductKeysSet);

  console.log(`uniqueProductKeys: ${uniqueProductKeys}`);

  console.log("products");
  console.dir(products, { depth: null, colors: true });

  const attachments = uniqueProductKeys.map(productKey => {
    const product = products.find(prod => { return prod.productKey === productKey});
    if(!product) { console.log("No Product"); return null;}

    const productImages = images.filter(img => img.productKey === productKey);

    console.dir(productImages, { depth: null, colors: true });
    console.dir(productImages[0].url.split("/").pop(), { depth: null, colors: true });
    const filename = productImages[0].url.split("/").pop();
    //const path = __dirname + "/../" + productImages[0].url;
    const path = process.env.BASE_URL + productImages[0].url;
    const cid = `Prod${productKey}`;

    return {
      filename: filename,
      path: path,
      cid: cid,
    }
  });

  attachments.push({
    filename: 'logo.png',
    //path: __dirname + '/logo.png',
    path: process.env.BASE_URL + 'logo.png',
    cid: 'logo'
  })

  console.log("attachments");
  console.dir(attachments, { depth: null, colors: true });

  /*
  const sendGridAttachments = uniqueProductKeys.map(productKey => {
    const product = products.find(prod => { return prod.productKey === productKey});
    if(!product) { console.log("No Product"); return null;}

    const productImages = images.filter(img => img.productKey === productKey);

    const filename = productImages[0].url.split("/").pop();
    //const path = __dirname + "/../" + productImages[0].url;
    const path = process.env.BASE_URL + productImages[0].url;
    const imageBuffer = fs.readFileSync(path);

    const extention = filename.split('.').pop().toLowerCase();
    const contentType = (extention === 'jpeg' || extention === 'jpg') ? 'image/jpeg' : (extention === 'png') ? 'image/png' : 'application/octet-stream';

    const cid = `Prod${productKey}`;

    return {
      filename: filename,
      contentType: contentType,
      cid: cid,
      //content: imageBuffer,
      content: imageBuffer.toString('base64'),
    }
  });

  sendGridAttachments.push({
    filename: 'logo.png',
    contentType: 'image/png',
    cid: 'logo',
    //content: fs.readFileSync(__dirname + '/logo.png').toString('base64'),
    content: fs.readFileSync(process.env.BASE_URL + 'logo.png').toString('base64'),
  })

  console.log("sendGridAttachments");
  console.dir(sendGridAttachments, { depth: null, colors: true });
  */

  //const logo64 = fs.readFileSync(__dirname + '/logo.png').toString('base64');
  //const logo64 = fs.readFileSync(process.env.BASE_URL + 'logo.png').toString('base64');

  const uniqueAddressKeysSet = new Set();
  for (const item of lineItems) {
    uniqueAddressKeysSet.add(item.addressKey);
  }
  const uniqueAddressKeys = Array.from(uniqueAddressKeysSet);
  console.log(`uniqueAddressKeys: ${uniqueAddressKeys}`);

  const billingAddress = addresses.find(addr => { return addr.addressKey === purchase.addressKey}) || null;
  const billingAddressText = billingAddress ? `
    配送先住所<br/>
    ${billingAddress.lastName} ${billingAddress.firstName}<br/>
    〒${billingAddress.postalCode}<br/>
    ${prefectureNames.find(prefectureName => prefectureName.code == billingAddress.prefCode)?.name || ""}${billingAddress.city}${billingAddress.ward}<br/>
    ${billingAddress.address2}<br/>
    日本` : null;

  const shippingAddressKey = uniqueAddressKeys.find(uAddrKey => { return uAddrKey !== purchase.addressKey});
  console.log("shippingAddressKey: " + shippingAddressKey);

  const shippingAddress = shippingAddressKey ? addresses.find(addr => {return addr.addressKey === shippingAddressKey}) || null : null;
  console.log("shippingAddress");
  console.log(shippingAddress);

  const shippingAddressText = shippingAddress ? `
    請求先住所<br/>
    ${shippingAddress.lastName} ${shippingAddress.firstName}<br/>
    〒${shippingAddress.postalCode}<br/>
    ${prefectureNames.find(prefectureName => prefectureName.code == billingAddress.prefCode)?.name || ""}${shippingAddress.city}${shippingAddress.ward}<br/>
    ${shippingAddress.address2}<br/>
    日本` : null;


  const emailLines = lineItems.map(line => {
    const product = products.find(prod => { return prod.productKey === line.productKey});
    if(!product) return null;
    const lineCost = Math.round(parseInt(line.unitPrice) * (1+parseFloat(line.taxRate)) * parseInt(line.quantity));
    //const productImageUrl = __dirname + images.find(img => { return img.productKey === line.productKey}).url;
    const productImageUrl = process.env.BASE_URL + images.find(img => { return img.productKey === line.productKey}).url;

    return `
    <tr>
      <td style="width:20%;">
        <img src="${productImageUrl}" alt="Item #${line.productKey}" style="max-width: 100%; padding-bottom:1rem;">
      </td>
      <td style="width:60%; font-weight: bold; padding-left: 1rem;">
        <span>${product.title} × ${line.quantity}</span>
      </td>
      <td style="width:20%; text-align:right;">
        ¥${lineCost}
      </td>
    </tr>
    `;
  }); 
  //        <img src="cid:Prod${line.productKey}" alt="Item #${line.productKey}" style="max-width: 100%; padding-bottom:1rem;">

  console.log("emailLines");
  console.dir(emailLines, { depth: null, colors: true });


  //const logoPath = __dirname + '/logo.png';
  const logoPath = process.env.BASE_URL + 'logo.png';

  const emailHTML = `
    <html>
      <head>
        <style>
          table {
            border-spacing: 0;
          }
          td {
            padding: 0;
          }
          img {
            border: 0;
          }
          .content {
            width: 600px;
            margin: 0 auto;
          }
          .button {
            background-color: #FFA500;
            color: #FFFFFF;
            padding: 1rem;
            border-radius: 0.25rem;
            text-decoration: none;
            text-align: center;
            display: inline-block;
          }
          .footer-text {
            font-size: 0.9rem;
            color: #888;
            padding: 0;
          }
          .footer-highlight {
            color: #FFA500;
          }
        </style>
      </head>
      <body>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">

              <table class="content" cellspacing="0" cellpadding="0">
                <!-- Logo -->
                <tr>
                  <td colspan="2" align="left" style="padding-top: 2rem;">
                    <img src="${logoPath}" alt="Logo" style="max-width: 100%;">
                  </td>
                </tr>
                <tr>
                  <td colspan="2" align="right" style="color: #444; padding: 0;">
                    注文 #${purchase.purchaseKey}
                  </td>
                </tr>
                <!-- Title -->
                <tr>
                  <td colspan="2" align="left" style="font-size: 1.5rem; color: #000; padding: 1rem 0;">
                    ご購入頂きありがとうございました!
                  </td>
                </tr>
                <!-- Message -->
                <tr>
                  <td colspan="2" align="left" style="font-size: 1.25rem; color: #444; padding: 0;">
                    注文の発送準備を行なっております。商品を発送いたしましたら、改めてお 知らせいたします。
                  </td>
                </tr>
                <tr>
                  <td colspan="2" align="left" style="font-size: 1.25rem; color: #444; padding: 0;">
                    <a href="https://${emailSubdomain}.well-mill.com/order-list">
                      購入履歴確認
                    </a>
                  </td>
                </tr>
                ${/*
                    <!-- Button -->
                    <tr style="font-size: 1.25rem;">
                      <td align="left" style="width: 200px; padding: 2rem 1rem;">
                        <a href="https://${emailSubdomain}.well-mill.com/account" class="button" style="color: #FFFFFF;">
                          注文を表示する
                        </a>
                      </td>
                      <td style="width: 400px;">
                        または<a href="https://${emailSubdomain}.well-mill.com/shop" style="color: #FFA500;">ショップにアクセスする</a>
                      </td>
                    </tr>
                */ true ? "" : ""}
                <tr>
                  <td colspan="2" style="font-size: 1.5rem; padding-top: 4rem; padding-bottom: 2rem;">
                    注文概要
                  </td>
                </tr>
              </table>

              <table class="content" cellspacing="0" cellpadding="0">
                <!-- Dynamic Rows -->
                ${emailLines.join('')}
              </table>

              <table class="content" cellspacing="0" cellpadding="0">
                <!-- Full Separator -->
                <tr>
                  <td colspan="3" style="height: 1px; background-color: #eee; overflow: hidden;"></td>
                </tr>
                <tr>
                  <td style="width: 300px; padding-top:2rem;"></td><td style="width: 150px padding-top:2rem;">小計   </td><td style="width: 150px; text-align: right; padding-top:2rem;">¥${totalCost}</td>
                </tr>
                <tr>
                  <td style="width: 300px;"></td><td style="width: 150px">配送   </td><td style="width: 150px; text-align: right;">¥0</td>
                </tr>
                <tr>
                  <td style="width: 300px; padding-bottom:2rem;"></td><td style="width: 150px; padding-bottom:2rem;">税金合計</td><td style="width: 150px; text-align: right; padding-bottom:2rem;">¥${totalTax}</td>
                </tr>
                ${couponDiscount > 0 ? `
                  <tr>
                    <td style="width: 300px; padding-bottom:2rem;"></td><td style="width: 150px; padding-bottom:2rem;">クーポン割引</td><td style="width: 150px; text-align: right; padding-bottom:2rem;">-¥${couponDiscount}</td>
                  </tr>`
                : ""}

                <!-- Right half Separator -->
                <tr>
                  <td style="width: 300px; height: 1px; overflow: hidden;"></td><td style="width: 150px; height: 1px; background-color: #eee; overflow: hidden;"></td><td style="width: 150px; height: 1px; background-color: #eee; overflow: hidden;"></td>
                </tr>
                <tr>
                  <td style="width: 50%;"></td><td style="width: 25%">合計</td><td style="width: 25%; text-align: right; font-size: 1.5rem; font-weight: bold;">¥${totalCost - (couponDiscount || 0)} JPY</td>
                </tr>
              </table>

              <table class="content" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 2rem 0;">
                  お客様情報
                </td>
              </tr>
              <tr>
                <td style="width: 50%;">
                  ${billingAddressText ? billingAddressText : " "}
                </td>
                <td style="width: 50%;">
                  ${shippingAddressText ? shippingAddressText : " "}
                </td>
              </tr>
              <tr>
                <td style="padding-top: 1rem;">
                  配送方法
                </td>
              </tr>
              <tr>
                <td>
                  通常配送
                </td>
              </tr>
              </table>

              <!-- Footer -->
              <table class="content" cellspacing="0" cellpadding="0" style="margin-top: 3rem;">
                <tr>
                  <td class="footer-text" align="left">
                    株式会社リプロセル 臨床検査室
                  </td>
                </tr>
                <tr>
                  <td class="footer-text" align="left">
                    〒222-0033 神奈川県横浜市港北区新横浜3-8-11
                  </td>
                </tr>
                <tr>
                  <td class="footer-text footer-highlight" align="left">
                    0120-825-828
                  </td>
                </tr>
                <tr>
                  <td class="footer-text" align="left">
                    (平日9:00~18:00 土日祝日休み)
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  /*
  // Works great, sends via gmail
  let mailOptions = {
    from: process.env.WELLMILL_EMAIL_ADDRESS, 
    to: recipient, 
    subject: '【ウェルミル】ご注文内容の確認 注文番号：＃' + purchase.purchaseKey,
    html: emailHTML,
    attachments: attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    //return res.status(200).send('Email sent successfully');
  } catch (error) {
    const errorMessage = `[${new Date().toISOString()}] Error in /sendEmail: ${error.message}`;
    console.error(errorMessage);
    //return res.status(500).send(errorMessage);
  }
  */

  const msg = {
    to: recipient,
    from: 'no-reply@well-mill.com',
    subject: '【ウェルミル】ご注文内容の確認 注文番号：＃' + purchase.purchaseKey,
    html: emailHTML,
  };

  sgMail
  .send(msg)
  .then(() => {
    console.log('SendGrid order email sent')
  })
  .catch((error) => {
    console.error(error)
  })
}

app.post('/generateReceipt', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit generateReceipt. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in addAddress: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const purchaseKey = Number(req.body.data.purchaseKey);
  if (isNaN(purchaseKey)) {
    console.error('Malformed purchaseKey:', purchaseKey);
    return res.status(400).send('Malformed purchaseKey');
  }

  let query = `
    SELECT * 
    FROM purchase
    WHERE purchaseKey = ? AND customerKey = ?;
  `;

  let values = [purchaseKey, customerKey];

  let purchase;
  try {
    const [purchaseResults] = await pool.query(query, values);
    if (purchaseResults.length === 0) {
      console.error('No purchase found for purchaseKey:', purchaseKey, ", customerKey:", customerKey);
      return res.status(400).send('No purchase found');
    } else {
      purchase = purchaseResults[0];
    }
  } catch (error) {
    console.error('Error in generateReceipt pulling purchase:', error);
    return res.status(500).send('An error occurred');
  }
  const creationDate = new Date(purchase.creationTime);
  const addressKey = purchase.addressKey;

  query = `
    SELECT * 
    FROM lineItem
    WHERE purchaseKey = ?;
  `;
  values = [purchaseKey];

  let lineItems;
  try {
    const [lineItemResults] = await pool.query(query, values);
    if (lineItemResults.length === 0) {
      console.error('No line items found for purchaseKey:', purchaseKey);
      return res.status(400).send('No line items found');
    } else {
      lineItems = lineItemResults;
    }
  } catch (error) {
    console.error('Error in generateReceipt pulling line items:', error);
    return res.status(500).send('An error occurred');
  }

  query = `
    SELECT * 
    FROM address
    WHERE addressKey = ?;
  `;
  values = [addressKey];

  let address;
  try {
    const [addressResults] = await pool.query(query, values);
    if (addressResults.length > 0) {
      address = addressResults[0];
    }
  } catch (error) {
    console.error('Error in generateReceipt pulling address:', error);
    return res.status(500).send('An error occurred');
  }
  const addressSource = address ? address : lineItems[0];

  query = `
    SELECT * 
    FROM product;
  `;
  values = [];

  let products;
  try {
    const [productResults] = await pool.query(query, values);
    if (productResults.length > 0) {
      products = productResults;
    }
  } catch (error) {
    console.error('Error in generateReceipt pulling products:', error);
    return res.status(500).send('An error occurred');
  }

  const options = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Tokyo'
  };

  const formattedPurchaseTime = new Intl.DateTimeFormat('ja-JP', options).format(creationDate);
  const formattedCreationTime = new Intl.DateTimeFormat('ja-JP', options).format(Date.now());


  const doc = new PDFDocument({
    margins: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-purchase${purchaseKey}.pdf`);
  doc.pipe(res);
  doc.rect(10, 10, doc.page.width-20, 20).fill('#fbc600');
  doc.image('logo.png', 50, 50, { width: 100 });
  doc.fill('#000000');
  doc.font('NotoSansJP-VariableFont_wght.ttf')
  doc.fontSize(25).text('Receipt', 50, 100);
  doc.fontSize(10).text("購入時間:", 50, 145);
  doc.fontSize(10).text(formattedPurchaseTime, 100, 145);
  doc.text("住所:", 50, 165);
  doc.text(`${addressSource.lastName}, ${addressSource.firstName}様`, 100, 165);
  doc.text(`${addressSource.pref} ${addressSource.city} ${addressSource.ward} ${addressSource.address2}`, 100, 180);
  doc.text(`〒${addressSource.postalCode.slice(0, 3)}-${addressSource.postalCode.slice(3)}`, 100, 195);
  doc.text(`${addressSource.phoneNumber}`, 100, 210);
  doc.rect(10, 225, doc.page.width-20, 2).fill('#000000');

  const tableWidth = doc.page.width-100;

  doc.rect(50, 240, tableWidth, 27).fill("#eeeeee");
  doc.strokeColor('#888888').lineWidth(1);
  doc.rect(50 + (tableWidth*0.0), 240, (tableWidth*0.1), 27).stroke();
  doc.rect(50 + (tableWidth*0.1), 240, (tableWidth*0.5), 27).stroke();
  doc.rect(50 + (tableWidth*0.6), 240, (tableWidth*0.2), 27).stroke();
  doc.rect(50 + (tableWidth*0.8), 240, (tableWidth*0.2), 27).stroke();

  doc.fill('#000000');
  doc.fontSize(13).text("数量",    50 + (tableWidth*0.05) - doc.widthOfString("数量")/2, 244);
  doc.fontSize(13).text("アイテム", 50 + (tableWidth*0.35) - doc.widthOfString("アイテム")/2, 244);
  doc.fontSize(13).text("単価",    50 + (tableWidth*0.70) - doc.widthOfString("単価")/2, 244);
  doc.fontSize(13).text("小計",    50 + (tableWidth*0.90) - doc.widthOfString("小計")/2, 244);


  const lineHeight = 25;
  const leftPadding = 20;
  let overflowLines = 0;
  let currentY = 270;
  lineItems.forEach((lineItem, index) => {
    const product = products.find(prod => prod.productKey === lineItem.productKey);
    const unitPrice = Math.round(parseFloat(lineItem.unitPrice));
    const linePrice = Math.round(parseFloat(lineItem.unitPrice) * parseFloat(lineItem.quantity));
    currentY = 270 + (index * lineHeight) + (overflowLines * lineHeight);

    doc.text(lineItem.quantity.toString(), 50 + (tableWidth*0.1) - doc.widthOfString(lineItem.quantity.toString()) - leftPadding, currentY);
    if(doc.widthOfString(product.title) > (tableWidth*0.5)-30) {
      doc.text(product.title.slice(0, Math.ceil(product.title.length/2)+3), 50 + (tableWidth*0.1) + 10, currentY);
      doc.text(product.title.slice(Math.ceil(product.title.length/2)-3), 50 + (tableWidth*0.1) + 20, currentY + lineHeight);
      overflowLines++;
    } else {
      doc.text(product.title, 50 + (tableWidth*0.1) + 10, currentY);
    }
    doc.text(`¥${unitPrice}`, 50 + (tableWidth*0.8) - doc.widthOfString(unitPrice.toString()) - leftPadding, currentY);
    doc.text(`¥${linePrice}`, 50 + (tableWidth*1.00) - doc.widthOfString(linePrice.toString()) - leftPadding, currentY);
  });

  const totalWithoutTax = Math.round(lineItems.reduce((accumulator, lineItem) => {
    return accumulator + (parseInt(lineItem.unitPrice) * parseInt(lineItem.quantity));
  }, 0));

  const totalTax = Math.round(lineItems.reduce((accumulator, lineItem) => {
    return accumulator + (parseInt(lineItem.unitPrice) * parseFloat(lineItem.taxRate) * parseInt(lineItem.quantity));
  }, 0));

  const totalWithTax = totalWithoutTax + totalTax;

  currentY = 270 + (lineItems.length * 25) + ((overflowLines) * 25);
  doc.strokeColor('#888888').lineWidth(1);
  doc.moveTo(50,currentY).lineTo(doc.page.width - 50, currentY).stroke();

  currentY += 10;
  doc.text("小計", 50 + (tableWidth*0.80) - doc.widthOfString("小計") - leftPadding, currentY);
  doc.text(`¥${totalWithoutTax}`, 50 + (tableWidth*1.00) - doc.widthOfString(totalWithoutTax.toString()) - leftPadding, currentY);

  currentY += lineHeight;
  doc.text("税金（消費税10%）", 50 + (tableWidth*0.80) - doc.widthOfString("税金（消費税10%）") - leftPadding, currentY);
  doc.text(`¥${totalTax}`, 50 + (tableWidth*1.00) - doc.widthOfString(totalTax.toString()) - leftPadding, currentY);

  currentY += lineHeight;
  doc.text("合計", 50 + (tableWidth*0.80) - doc.widthOfString("合計") - leftPadding, currentY);
  doc.text(`¥${totalWithTax}`, 50 + (tableWidth*1.00) - doc.widthOfString(totalWithTax.toString()) - leftPadding, currentY);
  

  const footerAddress = "登録番号：T2020001086778\n株式会社リプロセル\nウェルミルサービス事業\n〒222-0033\n神奈川県横浜市港北区新横浜三丁目8-11\nメットライフ新横浜ビル9階"
  const footerRight = `#${purchaseKey} - 領収書は ${formattedCreationTime} に生成されました`;
  //const footerRight = "© 2024 www.well-mill.com";
  doc.fontSize(10).text(footerAddress, 50,                                                 doc.page.height + 13 - doc.heightOfString(footerAddress) + doc.heightOfString(footerRight));
  doc.fontSize(10).text(footerRight,   doc.page.width-50 - doc.widthOfString(footerRight), doc.page.height - 45);

  const bottomBarStart = doc.page.height - 30;
  doc.rect(10, bottomBarStart, doc.page.width-20, 20).fill('#fbc600');

  doc.end();
});

app.post('/sendPassword', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit sendPassword. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const emailSubdomain = stageSubdomain ? "stage" : "shop";
  const pool = stageSubdomain ? poolStage : poolProduction;

  const recipient = req.body.recipient;
  console.log("recipient: " + recipient);

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if(!emailRegex.test(recipient)) {
     return res.status(400).send("Malformed email");
  }

  const newPassword = crypto.randomBytes(4).toString('hex');
  const hashedPassword = await bcrypt.hash(newPassword, 10); // 10 salt rounds

  query = `UPDATE customer SET passwordHash = ? WHERE email = ?`;
  await pool.query(query, [hashedPassword, recipient]);


  let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.WELLMILL_EMAIL_ADDRESS,
          pass: process.env.WELLMILL_EMAIL_APP_PASSWORD
      }
  });

  const emailHTML = `
<html>
  <head>
    <style>
      /* Inline CSS here for styling */
      table {
        border-spacing: 0;
      }
      td {
        padding: 0;
      }
      img {
        border: 0;
      }
      .content {
        width: 600px;
        margin: 0 auto;
      }
      .newPassword {
        background-color: #DDEEFF;
        border: 1px solid #a8d4ff;
        padding: 0.5rem 2rem;
      }
      .button {
        background-color: #FFA500;
        color: #FFFFFF;
        padding: 1rem;
        border-radius: 0.25rem;
        text-decoration: none;
        text-align: center;
        display: inline-block;
      }
      .footer-text {
        font-size: 0.9rem;
        color: #888;
        padding: 0;
      }
      .footer-highlight {
        color: #FFA500;
      }
    </style>
  </head>
  <body>
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table class="content" cellspacing="0" cellpadding="0">
            <!-- Logo -->
            <tr>
              <td align="left" style="padding-top: 2rem;">
                <img src="cid:logo" alt="Logo" style="max-width: 100%;">
              </td>
            </tr>
            <!-- Title -->
            <tr>
              <td align="left" style="font-size: 1.5rem; color: #000; padding: 1rem 0;">
                パスワードのリセット
              </td>
            </tr>
            <!-- Message -->
            <tr>
              <td align="left" style="color: #444; padding: 0;">
              これが新しいパスワードです。 サイトにサインインして、できるだけ早く変更してください。
              </td>
            </tr>
            <tr>
              <td align="left" class="newPassword">
                ${newPassword}
              </td>
            </tr>
            <!-- Button -->
            <tr>
              <td align="left" style="padding: 1rem 0;">
                <a href="https://${emailSubdomain}.well-mill.com/login" class="button" style="color: #FFFFFF">
                  今すぐサインイン
                </a>
              </td>
            </tr>
            <!-- Separator -->
            <tr>
              <td align="center" style="padding: 2rem 0;">
                <hr/>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="left" style="padding-bottom: 2rem;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td class="footer-text" align="left">
                      株式会社リプロセル 臨床検査室
                    </td>
                  </tr>
                  <tr>
                    <td class="footer-text" align="left">
                      〒222-0033 神奈川県横浜市港北区新横浜3-8-11
                    </td>
                  </tr>
                  <tr>
                    <td class="footer-text footer-highlight" align="left">
                      0120-825-828
                    </td>
                  </tr>
                  <tr>
                    <td class="footer-text" align="left">
                      (平日9:00~18:00 土日祝日休み)
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  let mailOptions = {
      from: process.env.WELLMILL_EMAIL_ADDRESS, 
      to: recipient, 
      //to: "cdehaan@gmail.com", 
      subject: '【ウェルミル】お客様アカウントの確認',
      html: emailHTML,
      attachments: [{
        filename: 'logo.png',
        //path: __dirname + '/logo.png',
        path: process.env.BASE_URL + 'logo.png',
        cid: 'logo'
    }]
  };

  try {
      await transporter.sendMail(mailOptions);
      return res.status(200).send('Email sent successfully');
  } catch (error) {
      const errorMessage = `[${new Date().toISOString()}] Error in /sendEmail: ${error.message}`;
      console.error(errorMessage);
      return res.status(500).send(errorMessage);
  }
});


app.post('/login', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit login. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const userCredentials = req.body.data;
  const email = userCredentials.email;
  const password = userCredentials.password;
  const token = userCredentials.token;

  let customerData;

  if(email && password) {
    console.log("Email/password login");
    customerData = await GetCustomerDataFromCredentials(email, password, stageSubdomain);
    if(customerData.error) {
      return res.status(401).json({ error: customerData.error });
    }
  } else if(token) {
    console.log("token login");
    customerData = await GetCustomerDataFromToken(token, stageSubdomain);
    if(customerData.error) {
      return res.status(401).json({ error: customerData.error });
    }
  } else {
    return res.status(401).json({ error: "No customer credentials given" });
  }

  // console.log("customerData");
  // console.dir(customerData, { depth: null, colors: true });
  return res.json({customerData: customerData});
});

app.post('/addToCart', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit addToCart. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body); // { data: { productKey: 1, customerKey: 1, quantity: 1 } }

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in addToCart: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const cartData = req.body.data;
  const { productKey, unitPrice, taxRate, quantity } = cartData;

  // Sanitize input
  if (!Number.isInteger(productKey)  || productKey.toString().length > 50  ||
      !Number.isInteger(customerKey) || customerKey.toString().length > 50 ||
       Number.isNaN(unitPrice)       || unitPrice > 100000000              || unitPrice < 0 ||
       Number.isNaN(taxRate)         || taxRate > 10                       || taxRate < 0 ||
      !Number.isInteger(quantity)    || quantity > 100) {
      return res.status(400).send('Invalid input');
  }

  const roundedUnitPrice = Math.round(unitPrice * 100) / 100;
  const roundedTaxRate   = Math.round(taxRate * 1000) / 1000;


  try {
    // Check if the item already exists in the cart
    // If it has a purchase record, other than "created", it should not be counted
    const checkQuery = `
      SELECT lineItem.quantity
      FROM lineItem
      LEFT JOIN purchase ON lineItem.purchaseKey = purchase.purchaseKey
      WHERE lineItem.productKey = ?
      AND lineItem.customerKey = ?
      AND lineItem.unitPrice = ?
      AND lineItem.taxRate = ?
      AND (lineItem.purchaseKey IS NULL OR purchase.status = 'created');`;
    const [existingItem] = (await pool.query(checkQuery, [productKey, customerKey, roundedUnitPrice, roundedTaxRate]));
  
    if (existingItem.length > 0) {
      // Item exists, update the quantity
      const newQuantity = existingItem[0].quantity + quantity;
      const updateQuery = "UPDATE lineItem SET quantity = ? WHERE productKey = ? AND customerKey = ? AND unitPrice = ? AND taxRate = ?";
      await pool.query(updateQuery, [newQuantity, productKey, customerKey, roundedUnitPrice, roundedTaxRate]);
    } else {
      // Insert data into the database
      const insertQuery = "INSERT INTO lineItem (productKey, customerKey, unitPrice, taxRate, quantity) VALUES (?, ?, ?, ?, ?)";
      await pool.query(insertQuery, [productKey, customerKey, roundedUnitPrice, roundedTaxRate, quantity]);
    }
  
    // Get updated cart data
    const updatedCart = await GetCartFromCustomerKey(customerKey, stageSubdomain);
    return res.json(updatedCart);
  } catch (error) {
    console.error('Error in addToCart:', error);
    return res.status(500).send('An error occurred');
  }
});


app.post('/updateCartQuantity', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit updateCartQuantity. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in updateCartQuantity: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const updateData = req.body.data;
  const { lineItemKey, quantity } = updateData;

  // Sanitize input
  if (!Number.isInteger(lineItemKey) || lineItemKey.toString().length > 50 ||
      !Number.isInteger(quantity)    || quantity.toString().length > 50) {
      return res.status(400).send('Invalid input');
  }

  try {
    // Update line quantity in the database
    const updateQuery = "UPDATE lineItem SET quantity = ? WHERE customerKey = ? AND lineItemKey = ?";
    await pool.query(updateQuery, [quantity, customerKey, lineItemKey]);
  
    // Get updated cart data
    const updatedCart = await GetCartFromCustomerKey(customerKey, stageSubdomain);
    return res.json(updatedCart);
  } catch (error) {
    console.error('Error in updateCartQuantity:', error);
    return res.status(500).send('An error occurred');
  }
});

app.post('/deleteFromCart', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit deleteFromCart. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body); // { data: { customerKey: 1, token: "abc", lineItemKey: 1 } }

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in deleteFromCart: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const lineItemData = req.body.data;
  const { lineItemKey } = lineItemData;

  // Sanitize input
  if (!Number.isInteger(lineItemKey) || lineItemKey.toString().length > 50) {
      return res.status(400).send('Invalid input');
  }

  try {
    // Delete line from the database
    const deleteQuery = "DELETE FROM lineItem WHERE customerKey = ? AND lineItemKey = ?";
    await pool.query(deleteQuery, [customerKey, lineItemKey]);

    // Get updated cart data
    const updatedCart = await GetCartFromCustomerKey(customerKey, stageSubdomain);
    return res.json(updatedCart);
  } catch (error) {
    console.error('Error in deleteFromCart:', error);
    return res.status(500).send('An error occurred');
  }
});

app.post('/cancelPurchase', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit cancelPurchase. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body); // { data: { customerKey: 1, token: "abc", purchaseKey: 193 } }

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;
  const stripe = stageSubdomain ? stripeStage : stripeProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in deleteFromCart: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const purchaseKey = req.body.data.purchaseKey;

  // Sanitize input
  if (!Number.isInteger(purchaseKey) || purchaseKey.toString().length > 50) {
      return res.status(400).send('Invalid input');
  }

  const connection = await pool.getConnection();
  try {
    // Delete query for lineItem table
    //const deleteLineItemQuery = "DELETE FROM lineItem WHERE customerKey = ? AND purchaseKey = ?";
    //await connection.query(deleteLineItemQuery, [customerKey, purchaseKey]);

    // Update lineItems to "canceled"
    const updateLineItemQuery = "UPDATE lineItem SET shippingStatus = 'canceled' WHERE customerKey = ? AND purchaseKey = ?";
    await connection.query(updateLineItemQuery, [customerKey, purchaseKey]);
    console.log(`Query: ${updateLineItemQuery}, customerKey: ${customerKey}, purchaseKey: ${purchaseKey}`);

    // Delete query for purchase table
    //const deletePurchaseQuery = "DELETE FROM purchase WHERE customerKey = ? AND purchaseKey = ?";
    //await connection.query(deletePurchaseQuery, [customerKey, purchaseKey]);

    // // Update purchase to "canceled"
    // const updatePurchaseQuery = "UPDATE purchase SET status = 'canceled' WHERE customerKey = ? AND purchaseKey = ?";
    // await connection.query(updatePurchaseQuery, [customerKey, purchaseKey]);
    // console.log(`Query: ${updatePurchaseQuery}, customerKey: ${customerKey}, purchaseKey: ${purchaseKey}`);

    if(stageSubdomain) {
      // Save refund time
      const refundTimePurchaseQuery = "UPDATE purchase SET refundTime = CURRENT_TIMESTAMP, status = 'canceled' WHERE customerKey = ? AND purchaseKey = ?";
      await connection.query(refundTimePurchaseQuery, [customerKey, purchaseKey]);
    }

    // Commit the transaction if both queries succeed
    await connection.commit();
  } catch (error) {
    // If an error occurs, roll back the transaction
    await connection.rollback();
    console.log("Error while canceling purchase: ");
    console.dir(error, { depth: null, colors: true });
    return res.status(500).send("Error canceling purchase");
  } finally {
    // Release the connection back to the pool
    connection.release();
  }

  query = `
    SELECT newPurchaseJson 
    FROM purchase
    WHERE purchaseKey = ?;
  `;

  console.log("query");
  console.log(query);

  try {
    const [results] = await pool.query(query, [purchaseKey]);
    if (results.length > 0) {
      console.log("results");
      console.dir(results, { depth: null, colors: true });
      const originalPurchaseJson = JSON.parse(results[0].newPurchaseJson);
      originalPurchaseJson.touroku_kbn = 9; // 9 is for delete
      console.log("originalPurchaseJson");
      console.dir(originalPurchaseJson, { depth: null, colors: true });
      const responseData = await StoreBackupData("chumon_renkei_api", originalPurchaseJson, stageSubdomain);
      console.log("responseData");
      console.log(responseData);
    } else {
      console.log("results.length > 0 failed when selecting newPurchaseJson using purchaseKey: " + purchaseKey);
      return res.status(400).send('Purchase not found');
    }
  } catch (error) {
    console.log("query failed when selecting newPurchaseJson using purchaseKey: " + purchaseKey + ", error:");
    console.dir(error, { depth: null, colors: true });
    return res.status(500).send('Purchase not found');
  }

  try {
    query = `SELECT paymentIntentId, amount, couponDiscount FROM purchase WHERE purchaseKey = ?`;
    const [paymentIntents] = (await pool.query(query, [purchaseKey]));

    if (paymentIntents.length > 0) {
      const paymentIntentId = paymentIntents[0].paymentIntentId;
      const paymentIntentAmount = paymentIntents[0].amount;
      const paymentIntentCouponDiscount = paymentIntents[0].couponDiscount;
      const paymentIntentAmountAfterDiscount = paymentIntentAmount - paymentIntentCouponDiscount;
      if(paymentIntentAmountAfterDiscount > 0) {
        // Non-zero payment exists, use the paymentIntentId to cancel the payment
        try {
          const refund = await stripe.refunds.create({ payment_intent: paymentIntentId, reason: 'requested_by_customer' });
          console.log("refund done");
          console.log(refund);  
        } catch (error) {
          console.log("refund failed");
          console.dir(error, { depth: null, colors: true });
          return res.status(500).send('Stripe refund failed');
        }
      } else {
        console.log("Payment for zero amount, no refund needed");
      }
    } else {
      console.log("paymentIntentIds.length > 0 failed when selecting paymentIntentId using purchaseKey: " + purchaseKey);
      return res.status(400).send('Payment not found');
    }  
  } catch (error) {
    console.log("query failed when selecting paymentIntentId using purchaseKey: " + purchaseKey + ", error:");
    console.dir(error, { depth: null, colors: true });
    return res.status(500).send('Payment not found');
  }




  // Get updated customer data
  const customerData = await GetCustomerDataFromCustomerKey(customerKey, stageSubdomain);
  return res.json(customerData);
});

app.post('/deleteLineItem', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit deleteLineItem. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in deleteFromCart: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  const lineItemKey = req.body.data?.lineItemKey;

  // Sanitize input
  if (!Number.isInteger(lineItemKey) || lineItemKey.toString().length > 50) {
      return res.status(400).send('Invalid input');
  }

  query = `
    SELECT p.newPurchaseJson 
    FROM lineItem li
    JOIN purchase p ON li.purchaseKey = p.purchaseKey
    WHERE li.lineItemKey = ?;
  `;

  try {
    const results = await pool.query(query, [lineItemKey]);
    if (results.length > 0) {
        const originalPurchaseJson = JSON.parse(results[0].newPurchaseJson);
        console.log("originalPurchaseJson");
        console.dir(originalPurchaseJson, { depth: null, colors: true });
    } else {
      console.log("results.length = 0 failed when selecting newPurchaseJson using lineItemKey: " + lineItemKey);
      return res.status(400).send('Purchase not found');
    }
  } catch (error) {
    console.log("query failed when selecting newPurchaseJson using lineItemKey: " + lineItemKey + ", error:");
    console.dir(error, { depth: null, colors: true });
    return res.status(500).send('Purchase not found');
  }


  try {
    // Delete line from the database
    const deleteQuery = "DELETE FROM lineItem WHERE customerKey = ? AND lineItemKey = ?";
    await pool.query(deleteQuery, [customerKey, lineItemKey]);
  
    // Get updated cart data
    const updatedCart = await GetCartFromCustomerKey(customerKey, stageSubdomain);
    return res.json(updatedCart);
  } catch (error) {
    console.error('Error in deleteFromCart:', error);
    return res.status(500).send('An error occurred');
  }
});


//#region Azure backup
const BASE_URL_STAGE = 'https://wellmill-test-api-mgmnt.azure-api.net/api/';
const BASE_URL = 'https://wellmill-api-mgmnt.azure-api.net/api/';


// This storeBackupData Works a charm
/*
app.post('/storeBackupData', async (req, res) => {
  console.log("░▒▓█ Hit storeBackupData. Time: " + CurrentTime());
  console.log(req.body);

  // Extract data from the request body
  const { endpoint, inputData } = req.body;

  try {
    const fullEndpoint = `${BASE_URL}${endpoint}`;
    const fullFetchContent = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        //'Ocp-Apim-Subscription-Key': process.env.AZURE_TEST_API_KEY,
        'Ocp-Apim-Subscription-Key': process.env.AZURE_API_KEY,
      },
      body: JSON.stringify(inputData),
    };

    console.log("fullEndpoint");
    console.log(fullEndpoint);
    console.log("fullFetchContent");
    console.log(fullFetchContent);

    // Make the POST request to the backup server
    const response = await fetch(fullEndpoint, fullFetchContent);
    const responseData = await response.json();

    console.log("Json response:");
    console.log(responseData);

    if (!response.ok) {
      // Forward any non-2xx responses as is
      return res.status(response.status).json({ message: `API request failed with status ${response.status}` });
    }

    // Send the response from the backup server to the client
    return res.json(responseData);

  } catch (error) {
    // Handle any other errors
    return res.status(500).json({ message: error.message || 'An unexpected error occurred.' });
  }
});
*/

app.post('/storeBackupData', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit storeBackupData. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.dir(req.body, { depth: null, colors: true });

  const stageSubdomain = subdomain === "stage" ? true : false;
  const stripe = stageSubdomain ? stripeStage : stripeProduction;

//  // Validation happens against paymentIntentId
//  const validation = await ValidatePayload(req.body.data);
//  if(validation.valid === false) {
//    console.log(`Validation error in storeBackupData: ${validation.message}`);
//    return res.status(400).send("Validation error");
//  }
//  const customerKey = validation.customerKey;

  const { endpoint, paymentIntentId, inputData } = req.body.data;

  if(endpoint === "kentai_id_check_api") {
    if(inputData.kentai_saishubi) {
      const dateRegex = /^(?:19|20)\d\d[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12][0-9]|3[01])$/;
      if (!dateRegex.test(inputData.kentai_saishubi)) { return res.status(400).send('Malformed data'); }
      const [year, month, day] = inputData.kentai_saishubi.split(/[-/]/);
      inputData.kentai_saishubi = `${year}年${month}月${day}日`;    
    }
  }

  if(paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if(!paymentIntent) { return res.status(400).send('Payment intent not found.'); }

    const paymentStatus = paymentIntent.status;
    console.log(`paymentStatus: ${paymentStatus}`);

    if(paymentStatus === 'succeeded') {
      const result = await StoreBackupData(endpoint, inputData, stageSubdomain);

      if (result.error) {
        return res.status(result.status).json({ message: result.message });
      }

      return res.json(result);  
    }

    return res.status(400).json({ message: "Payment not succeeded" });  
  } else {
    const result = await StoreBackupData(endpoint, inputData, stageSubdomain);

    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json(result);
  }

});

async function StoreBackupData(endpoint, inputData, stageSubdomain) {
  console.log(`░▒▓█ Hit storeBackupData function. Subdomain: [${stageSubdomain ? "stage" : "not stage"}] Time: ${CurrentTime()}`);
  console.dir({endpoint, inputData}, { depth: null, colors: true });

  const fullEndpoint = `${stageSubdomain ? BASE_URL_STAGE : BASE_URL}${endpoint}`;
  const subscriptionKey = stageSubdomain ? process.env.AZURE_TEST_API_KEY : process.env.AZURE_API_KEY;
  const backupFileLocation = stageSubdomain ? ORDER_BACKUP_FILE_PATH_STAGE : ORDER_BACKUP_FILE_PATH;
  try {
    const fullFetchContent = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
      body: JSON.stringify(inputData),
    };

    if(endpoint === "chumon_renkei_api") {
      fs.writeFileSync(backupFileLocation, JSON.stringify(inputData, null, 2));
    }

    // Make the POST request to the backup server
    const response = await fetch(fullEndpoint, fullFetchContent);
    const responseData = await response.json();
    console.dir(responseData);

    if (!response.ok) {
      return { error: true, status: response.status, message: 'An unexpected error occurred in StoreBackupData.' };
    }

    return responseData;
  } catch (error) {
    console.log("Caught in storeBackupData function with error: ")
    console.dir(error, { depth: null, colors: true });
    return { error: true, status: 500, message: error.message || 'An unexpected error occurred in StoreBackupData.' };
  }
}
//#endregion Azure backup


async function GetCustomerDataFromCredentials(email, password, stageSubdomain) {
  const pool = stageSubdomain ? poolStage : poolProduction;

  try {
    // Prepare the SQL query to find the user by email
    query = `SELECT * FROM customer WHERE email = ?`;

    // Execute the query using the promisified pool.query and wait for the promise to resolve
    const [results] = await pool.query(query, [email]);

    // If no results, the email is not registered
    if (results.length === 0) {
      console.log("メールアドレスとパスワードが一致しません 1")
      //return {error: "Email and Password pair not found"};
      return {error: "メールアドレスとパスワードが一致しません"};
    }

    const [customerResults] = results;

    // Compare the provided password with the stored hash
    const match = await bcrypt.compare(password, customerResults.passwordHash);

    // Passwords do not match
    if (!match) {
      // TODO think about some login attempt limit
      //return {error: "Email and Password pair not found"};
      console.log("メールアドレスとパスワードが一致しません 2")
      return {error: "メールアドレスとパスワードが一致しません"};
    }

    // Passwords match, now fetch the customer's cart
    console.log("Correct password, customer key: " + customerResults.customerKey);

    const customer = GetCustomerDataFromCustomerKey(customerResults.customerKey, stageSubdomain);
    //console.dir(customer, { depth: null, colors: true });

    return customer;
  } catch (error) {
    console.error('Error in GetCustomerDataFromCredentials:', error);
    return {error: "Internal login error"};
  }
}

async function GetCustomerDataFromToken(token, stageSubdomain) {
  const pool = stageSubdomain ? poolStage : poolProduction;

  try {
    // Prepare the SQL query to find the user by token
    query = `SELECT * FROM customer WHERE token = ?`;

    // Execute the query using the promisified pool.query and wait for the promise to resolve
    const [results] = await pool.query(query, [token]);

    // If no results, the token does not exist
    if (results.length === 0) {
      // TODO think about some login attempt limit
      return {error: "Token not validated"};
    }

    // Token exists, the user is authenticated, get their customerKey
    const customerKey = results[0].customerKey;

    const customer = GetCustomerDataFromCustomerKey(customerKey, stageSubdomain);

    return customer;
  } catch (error) {
    console.error('Error in GetCustomerDataFromToken:', error);
    return {error: "Error validating token"};
  }
}

async function GetCustomerDataFromCustomerKey(customerKey, stageSubdomain) {
  const pool = stageSubdomain ? poolStage : poolProduction;
  query = `SELECT * FROM customer WHERE customerKey = ?`;

  // Execute the query using the promisified pool.query and wait for the promise to resolve
  const [results] = await pool.query(query, [customerKey]);

  // If no results, the customer does not exist
  if (results.length === 0) {
    console.log("Customer not found with customerKey");
    return {error: "Customer not found with customerKey"};
  }

  // A customer exists
  const customer = results[0];
  customer.guest = (customer.guest === 1 || customer.guest === "1");

  // Pull customer's cart
  const cartData = await GetCartFromCustomerKey(customer.customerKey, stageSubdomain);
  customer.cart = cartData;

  // Pull customer's purchases
  const purchases = await GetPurchasesFromCustomerKey(customer.customerKey, stageSubdomain);
  customer.purchases = purchases;

  // Pull customer's addresses
  const addresses = await GetAddressesFromCustomerKey(customer.customerKey, stageSubdomain);
  customer.addresses = addresses;

  // Pull all coupons (codes are hashed)
  const coupons = await GetCoupons(stageSubdomain);
  customer.coupons = coupons;
  //console.log("coupons2");
  //console.dir(coupons, { depth: null, colors: true });

  // Adjust date for timezone, adding 12h should make anything from -12h to +11h work, which is most of the world
  // It's kinda a hack, but this site will likely only ever run in Japan, sorry Kiribati
  if(customer.birthday) {
    customer.birthday = new Date(customer.birthday.getTime() + (12*60*60*1000))
  }

  // Remove sensitive data before sending the customer object
  delete customer.passwordHash;
  customer.type = "customer";

  return customer;
}

async function GetCartFromCustomerKey(customerKey, stageSubdomain) {
  if(stageSubdomain === undefined) {stageSubdomain = false; console.log("XXXXX stageSubdomain is undefined in GetCartFromCustomerKey");}
  const pool = stageSubdomain ? poolStage : poolProduction;

  // Prepare the SQL query to get a customer's line items that haven't been purchased
  const selectQuery = `
    SELECT lineItem.*, purchase.status
    FROM lineItem 
    LEFT JOIN purchase ON lineItem.purchaseKey = purchase.purchaseKey
    WHERE lineItem.customerKey = ?
    AND (lineItem.purchaseKey IS NULL OR purchase.status = 'created');`;

  // Execute the query then calculate metadata
  try {
    const [linesResults] = (await pool.query(selectQuery, [customerKey]));

    linesResults.forEach(line => {line.type = "lineItem"});
    const cartQuantity = Math.round(linesResults.reduce((sum, lineItem) => sum + lineItem.quantity, 0));
    const cartCost = Math.round(linesResults.reduce((sum, lineItem) => sum + (lineItem.unitPrice * (1+lineItem.taxRate) * lineItem.quantity), 0));
    const cartTax = Math.round(linesResults.reduce((sum, lineItem) => sum + (lineItem.unitPrice * (lineItem.taxRate) * lineItem.quantity), 0));

    const cart = {type: "cart", quantity: cartQuantity, cost: cartCost, includedTax: cartTax, lines: linesResults }

    return cart;
  } catch (error) {
    console.error('Error in GetCartDataFromCustomerKey: ', error);
    throw error;
  }
}

async function GetPurchasesFromCustomerKey(customerKey, stageSubdomain) {
  if(stageSubdomain === undefined) {stageSubdomain = false; console.log("XXXXX stageSubdomain is undefined in GetPurchasesFromCustomerKey");}
  const pool = stageSubdomain ? poolStage : poolProduction;
  try {
    query = `
    SELECT *
    FROM purchase
    WHERE customerKey = ?
    AND purchase.status != 'created';`;

    const [purchases] = await pool.query(query, [customerKey]);
    const purchaseKeys = purchases.map(pur => { return pur.purchaseKey; })
    const fallbackPurchaseKeys = purchaseKeys.length > 0 ? purchaseKeys : [-1];

    query = `
      SELECT *
      FROM lineItem
      WHERE purchaseKey IN (?);`

    const [lineItems] = await pool.query(query, [fallbackPurchaseKeys]);

    purchases.forEach((purchase) => {
      const purchaseKey = purchase.purchaseKey;
      const purchaseLines = lineItems.filter(line => line.purchaseKey === purchaseKey);
      purchase.lineItems = purchaseLines;
    });

    // Values in purchases come from MySQL maybe as strings, but I want the numbers to be real numbers
    for (const purchase of purchases) {
      for (const lineItem of purchase.lineItems) {
        // Convert from string to integer
        lineItem.unitPrice = parseInt(lineItem.unitPrice);
        lineItem.taxRate = parseInt(lineItem.taxRate);
      }
    }

    return purchases;
  } catch (error) {
    console.error('Error in GetPurchasesFromCustomerKey: ', error);
    throw error;
  }
}

async function GetAddressesFromCustomerKey(customerKey, stageSubdomain) {
  if(stageSubdomain === undefined) {stageSubdomain = false; console.log("XXXXX stageSubdomain is undefined in GetAddressesFromCustomerKey");}
  const pool = stageSubdomain ? poolStage : poolProduction;
  const selectQuery = `
    SELECT * FROM address
    WHERE customerKey = ?`;

  try {
    const [addresses] = (await pool.query(selectQuery, [customerKey]));
    return ProcessAddresses(addresses);
  } catch (error) {
    console.error('Error in GetAddressesFromCustomerKey: ', error);
    throw error;
  }
}

async function GetCoupons(stageSubdomain) {
  if(stageSubdomain === undefined) {stageSubdomain = false; console.log("XXXXX stageSubdomain is undefined in GetCoupons");}
  const pool = stageSubdomain ? poolStage : poolProduction;
  const selectQuery = `SELECT * FROM coupon`;

  try {
    const [coupons] = await pool.query(selectQuery, []);
    const noCodeCoupons = ProcessCoupons(coupons);
    //console.log("noCodeCoupons");
    //console.dir(noCodeCoupons, { depth: null, colors: true });
    return noCodeCoupons;
  } catch (error) {
    console.error('Error in GetAddressesFromCustomerKey: ', error);
    throw error;
  }
}

// All values in Addresses come from MySQL as strings, but I want the bool to be a real bool
function ProcessAddresses(addresses) {
  return updatedAddresses = addresses.map(address => {
    if(address === undefined) return null;
    address.defaultAddress = (address.defaultAddress?.toString() === "1");
    return address;
  });
}

// Only send the coupon code hash so they are not sent in plain text
function ProcessCoupons(coupons) {
  const updatedCoupons = coupons.map(coupon => {
    if(coupon === undefined) return null;
    delete coupon.code;
    return coupon;
  });
  return updatedCoupons;
}

async function sha1(str) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-1', enc.encode(str));
  return Array.from(new Uint8Array(hash))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}






//#region Stripe
app.post("/createPaymentIntent", async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit createPaymentIntent. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.dir(req.body, { depth: null, colors: true });

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;
  const stripe = stageSubdomain ? stripeStage : stripeProduction;

  // Validation happens after intent is made, since unregistered users can make an intent, but can't validate

  const cartLines = req.body.data.cartLines;
  const purchaseTotal = await calculateOrderAmount(cartLines, stageSubdomain);
  if(isNaN(purchaseTotal)) { return res.status(400).send('Malformed items in cart'); }

  const addressesState = req.body.data.addressesState;

  const productsData = JSON.parse(fs.readFileSync(PRODUCTS_FILE_PATH, 'utf8'));
  const itemsMetadata = cartLines.map(cartLine => {
    const product = productsData.find(p => p.productKey === cartLine.productKey);
    return `${cartLine.productKey} - ${product ? product.title : "Unknown Product"}`;
  }).join(' | ');

  // Create a PaymentIntent with the order amount and currency
  // Make a purchase intention, even though they are just on the checkout screen. Stripe suggests doing this
  const paymentIntent = await stripe.paymentIntents.create({
    amount: purchaseTotal,
    currency: "jpy",
    metadata: {
      items: itemsMetadata,
    }
  });


  if(req.body.data.guest === true) {
    // Save the purchase intention for guest (no customer key)
    query = `
      INSERT INTO purchase (paymentIntentId, amount)
      VALUES (?, ?)`;
    values = [paymentIntent.id, paymentIntent.amount];

    let purchaseKey;
    try {
      const [results] = await pool.query(query, values);
      purchaseKey = results.insertId;
    } catch (error) {
      console.error('Error creating purchase intention: ', error);
      return res.status(500).send('Error creating purchase intention: ' + error);
    }

    console.log("Created paymentIntent for guest and saved in database");
    return res.send({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, purchaseKey: purchaseKey});
  }

  console.log("Created paymentIntent (not a guest)");
  //console.log(paymentIntent);


  // Validation happens after intent is made, since unregistered users can make an intent, but can't validate their customer key
  const validation = await ValidatePayload(req.body.data, stageSubdomain);
  if(validation.valid === false) {
    console.log(`Validation error in createPaymentIntent: ${validation.message}`);
    return res.status(400).send("Validation error");
  }
  const customerKey = validation.customerKey;

  // Save the purchase intention
  query = `
    INSERT INTO purchase (customerKey, paymentIntentId, amount)
    VALUES (?, ?, ?)`;
  values = [customerKey, paymentIntent.id, paymentIntent.amount];

  let purchaseInsertId;
  try {
    const [results] = await pool.query(query, values);
    purchaseInsertId = results.insertId;
  } catch (error) {
    console.error('Error creating purchase intention: ', error);
    return res.status(500).send('Error creating purchase intention: ' + error);
  }

  // Match lineItem	in the cart to this intention
  const cartLineKeys = cartLines.map(line => line.lineItemKey);
  query = `
    UPDATE lineItem
    SET purchaseKey = ?
    WHERE lineItemKey IN (?)`;
  values = [purchaseInsertId, cartLineKeys];

  try {
    const [results] = await pool.query(query, values);
    //console.log("Results after saving purchase in MySQL:");
    //console.log(results);
  } catch (error) {
    console.error('Error updating line items after making payment intent: ', error);
    return res.status(500).send('Error updating line items after making payment intent: ' + error);
  }



  // Make duplicate lineItems for orders sent to multiple addresses
  for (const addressState of addressesState) {
    console.log(`addressState`);
    console.dir(addressState, { depth: null, colors: true });

    // If addresses is null, the address will be set later
    if (addressState.addresses === null) { continue; }

    const lineItemKeys = [addressState.lineItemKey]

    query = `
      INSERT INTO lineItem (productKey, customerKey, purchaseKey, addedAt, unitPrice, taxRate)
      SELECT productKey, customerKey, purchaseKey, addedAt, unitPrice, taxRate
      FROM lineItem
      WHERE lineItemKey = ?`;

    const values = [addressState.lineItemKey];

    // We already have one copy, so start loop counter at 1
    const copiesNeeded = addressState.addresses.length;
    console.log(`copiesNeeded: ${copiesNeeded}`);
    console.log(`query: ${query}`);

    for(let duplicateLoop = 1; duplicateLoop < copiesNeeded; duplicateLoop++) {
      try {
        const [results] = await pool.query(query, values);
        lineItemKeys.push(results.insertId);
        console.log(`lineItemKeys: ${lineItemKeys}`);
      } catch (error) {
        console.error('Error in duplicating line item:', error);
        throw error;
      }
    }

    if(lineItemKeys.length !== copiesNeeded) {
      console.error(`Error in number of duplicated line items. lineItemKeys.length: ${lineItemKeys.length}, copiesNeeded: ${copiesNeeded}`);
      return;
    }

    const addresses = await GetAddressesFromCustomerKey(customerKey);

    for (const [index, lineItemAddress] of addressState.addresses.entries()) {
      const addressKey = lineItemAddress.addressKey;
      const quantity = lineItemAddress.quantity;
      const address = addresses.find(ad => {return ad.addressKey === addressKey});

      query = `
        UPDATE lineItem
        SET addressKey = ?, quantity = ?, firstName = ?, lastName = ?, postalCode = ?, prefCode = ?, pref = ?, city = ?, ward = ?, address2 = ?, phoneNumber = ?
        WHERE lineItemKey = ?`;
      const values = [addressKey, quantity, address.firstName, address.lastName, address.postalCode, address.prefCode, address.pref, address.city, address.ward, address.address2, address.phoneNumber, lineItemKeys[index]];

      try {
        await pool.query(query, values);
      } catch (error) {
        console.error('Error populating duplicated line item:', error);
        throw error;
      }
    }
  }

  return res.send({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
});


// This is to apply a coupon
app.post("/updatePaymentIntent", async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit updatePaymentIntent. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.dir(req.body, { depth: null, colors: true });

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;
  const stripe = stageSubdomain ? stripeStage : stripeProduction;

  // Can't validate like normal. A guest can do this, but won't have a token.
  // If the sender knows the paymentIntentId, they can apply a coupon

  //const validation = await ValidatePayload(req.body.data);
  //if(validation.valid === false) {
  //  console.log(`Validation error in updatePaymentIntent: ${validation.message}`);
  //  return res.status(400).send("Validation error");
  //}
  //const customerKey = validation.customerKey;

  // Blank/undefined is ok, will reset to no discount
  const couponCode = req.body.data.couponCode;
  const couponRegex = /^[\p{L}\p{N}\p{Pd}\p{Pc}\s.,]+$/u;
  if(!couponRegex.test(couponCode)) {
    console.log(`Malformed coupon code: ${couponCode}`);
    return res.status(400).send('Malformed coupon code');
  }

  const cartLines = req.body.data.cartLines;
  if(!cartLines) { return res.status(400).send('No cart lines provided'); }

  const paymentIntentId = req.body.data.paymentIntentId;
  if(!paymentIntentId) { return res.status(400).send('No payment intent provided'); }

  const { purchaseTotal, couponDiscount } = await calculateOrderAmount(cartLines, stageSubdomain, couponCode);
  if(isNaN(purchaseTotal) || purchaseTotal < 0) { return res.status(400).send('Malformed items in cart'); }
  if(isNaN(couponDiscount) || couponDiscount < 0) { return res.status(400).send('Malformed coupon'); }

  console.log("New purchaseTotal: " + purchaseTotal);
  console.log("New couponDiscount: " + couponDiscount);

  // Stripe doesn't allow payments of less than 50 yen
  // A 0 yen payment is a free purchase, so it's allowed, we won't use Stripe for it
  if(purchaseTotal > 0 && purchaseTotal < 50) { return res.status(400).send('Coupon cannot cause final price to be from 1 to 49 yen.'); }

  const productsData = JSON.parse(fs.readFileSync(PRODUCTS_FILE_PATH, 'utf8'));
  const itemsMetadata = cartLines.map(cartLine => {
    const product = productsData.find(p => p.productKey === cartLine.productKey);
    return `${cartLine.productKey} - ${product ? product.title : "Unknown Product"}`;
  }).join(' | ');

  query = `UPDATE purchase SET couponDiscount = ? WHERE paymentIntentId = ?`;
  values = [couponDiscount, paymentIntentId];
  try {
    await pool.query(query, values);
  } catch (error) {
    console.error('Error updating couponDiscount:', error);
    return res.status(500).send('Error updating couponDiscount');
  }

  try {
      // payment intent at Stripe is not updated if the purchase total is 0 (sending a free order)
      const updatedPaymentIntent = purchaseTotal === 0 ? null : await stripe.paymentIntents.update(paymentIntentId, {
          amount: purchaseTotal,
          metadata: {
            items: itemsMetadata,
            couponCode: couponCode,
          }
      });

      res.json({ success: true, amount: purchaseTotal, couponDiscount:couponDiscount, paymentIntent: updatedPaymentIntent });
  } catch (error) {
    console.error('Error updating paymentIntent:', error);
    res.status(400).send("Failed to update intent:" + error);
  }
});

async function calculateOrderAmount(cartLines, stageSubdomain, couponCode = undefined) {
  const totalBeforeCoupon = Math.round(cartLines.reduce((total, line) => {
    const lineCost = line.unitPrice * (1 + line.taxRate) * line.quantity;
    return total + lineCost;
  }, 0));
  console.log("totalBeforeCoupon: " + totalBeforeCoupon);
  if(couponCode === undefined) { return totalBeforeCoupon; }
  const couponDiscount = await calculateCouponDiscount(cartLines, totalBeforeCoupon, stageSubdomain, couponCode);
  console.log("couponDiscount2: " + couponDiscount);
  const totalAfterCoupon = totalBeforeCoupon - couponDiscount;
  return {purchaseTotal: totalAfterCoupon, couponDiscount: couponDiscount};
};

async function calculateCouponDiscount(cartLines, totalBeforeCoupon, stageSubdomain, couponCode) {
  const pool = stageSubdomain ? poolStage : poolProduction;
  const selectQuery = `SELECT * FROM coupon WHERE code = ?`;
  const [coupons] = await pool.query(selectQuery, [couponCode]);
  console.log("coupons length: " + coupons.length);
  if(coupons.length === 0) { return 0; }
  const coupon = coupons[0];
  const couponType = parseInt(coupon.type);
  const couponTarget = parseInt(coupon.target);
  const couponReward = parseInt(coupon.reward);
  if(isNaN(couponType) || couponType < 0 || isNaN(couponTarget) || couponTarget < 0 || isNaN(couponReward) || couponReward < 0) { return 0; }

  // This can be undefined for type 1 and 2
  const couponProductKey = parseInt(coupon.productKey?.toString()) ?? undefined;
  const productCount = cartLines.reduce((acc, line) => {
    if (line.productKey === couponProductKey) {
      return acc + line.quantity;
    }
    return acc;
  }, 0) ?? 0;

  if(couponType == "1") {
    return (totalBeforeCoupon >= couponTarget) ? Math.round(couponReward) : 0;
  }

  if(couponType == "2") {
    return (totalBeforeCoupon >= couponTarget) ? Math.round(couponReward/100 * totalBeforeCoupon) : 0;
  }

  if(couponType == "3") {
    if(!productCount) { return 0; }
    if(productCount >= couponTarget) {
      return Math.round(couponReward);
    }
    return 0;
  }

  if(couponType == "4") {
    if(!productCount) { return 0; }
    if(productCount >= couponTarget) {
      return Math.round(couponReward/100 * totalBeforeCoupon);
    }
    return 0;
  }

  return 0;
}


app.post("/finalizePurchase", async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit finalizePurchase. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log(req.body);

  const stageSubdomain = subdomain === "stage" ? true : false;
  const emailSubdomain = stageSubdomain ? "stage" : "shop";
  const pool = stageSubdomain ? poolStage : poolProduction;
  const stripe = stageSubdomain ? stripeStage : stripeProduction;

  const keyRegex = /^[1-9]\d*$/;
  const customerKey = req.body.data.customerKey;
  if(!keyRegex.test(customerKey)) {
    return res.status(400).send('Malformed customer key');
  }

  // Validate the email
  const email = req.body.data.email;
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if(!regex.test(email)) { return res.status(400).send('Malformed email address'); }

  // I use the paymentIntentId to validate users request, not using this secret
  const {paymentIntentId, paymentIntentClientSecret } = req.body.data;

  query = `SELECT * FROM purchase WHERE paymentIntentId = ?`;
  values = [paymentIntentId];
  const [purchaseResults] = await pool.query(query, values);
  const purchase = purchaseResults[0];
  const totalAfterCoupon = purchase.amount - purchase.couponDiscount;

  let paymentStatus = "succeeded";
  if(totalAfterCoupon === 0) {
    console.log("No charge for this purchase, no payment status available from Stripe. Default to succeeded");
  } else {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if(!paymentIntent) { return res.status(400).send('Payment intent not found.'); }

    paymentStatus = paymentIntent.status;
    console.log("paymentIntent");
    console.log(paymentIntent);  
  }

  query = `SELECT * FROM customer WHERE customerKey = ?`;
  values = [customerKey];
  const [results] = await pool.query(query, values);

  if (results.length === 0) {
    console.error('Error pulling customer data with key before payment verification. Customer Key: ', customerKey);
    return res.status(500).send('Error pulling customer data with key before payment verification. Customer Key: ' + customerKey);
  }

  const customer = results[0];
  customer.guest = (customer.guest === 1 || customer.guest === "1");

  // This is the address key to use for line items that don't have a line-item level address specified
  const billingAddressKey = parseInt(req.body.data.billingAddressKey);
  if(isNaN(billingAddressKey)) { return res.status(400).send('billingAddressKey must be a valid integer'); }

  // Pick the address with the key specified OR the default OR anything else
  query = `
    SELECT * FROM address 
    WHERE customerKey = ?
    ORDER BY
      (addressKey = ?) DESC,
      defaultAddress DESC`;
    //LIMIT 1`;
  values = [customerKey, billingAddressKey];

  const [addresses] = await pool.query(query, values);

  // If no results, there are no addresses for this user
  if (addresses.length === 0) {
    console.log("Thrown out at addressResults.length === 0");
    console.log("Query:")
    console.log(query)
    console.log("values:")
    console.log(values)
    return res.status(500).send('Error pulling customer addresses. Address Key: ' + billingAddressKey);
  }

  // Address data exists, use the top result
  // This address will only be used if the line item doesn't contain any address data
  const defaultAddress = addresses[0];

  if (paymentStatus === 'succeeded' || paymentStatus === 'created') {
    query = `
      UPDATE purchase 
      SET status = ?, email = ?, addressKey = ?, purchaseTime = CURRENT_TIMESTAMP
      WHERE paymentIntentId = ? AND status != ?`;
    values = [paymentStatus, email, billingAddressKey, paymentIntentId, paymentStatus];

    try {
      const [finalizePurchaseResults] = await pool.query(query, values);
      console.log("finalizePurchase results");
      console.log(finalizePurchaseResults);

      //Send order details to Azure
      if(paymentStatus === 'succeeded' && finalizePurchaseResults.affectedRows > 0) {
        //await SendOrderToAzure(paymentIntentId);
        query = `SELECT * FROM product`;
        const [products] = await pool.query(query);

        // If no results, no products found
        if (products.length === 0) {
          console.log("Thrown out at productResults.length === 0");
          return res.status(500).send("Products error");
        }

        query = `SELECT * FROM image`;
        const [images] = await pool.query(query);

        query = `
          SELECT * FROM purchase 
          WHERE paymentIntentId = ?`;
        values = [paymentIntentId];

        const [purchaseResults] = await pool.query(query, values);

        // If no results, the purchase isn't found
        if (purchaseResults.length === 0) {
          console.log("Thrown out at purchaseResults.length === 0");
          return res.status(500).send("Purchase error");
        }

        const purchase = purchaseResults[0];

        query = `
          SELECT * FROM lineItem 
          WHERE purchaseKey = ?`;
        values = [purchase.purchaseKey];

        const [lineItemResults] = await pool.query(query, values);

        // If no results, no item in the purchase is found
        if (lineItemResults.length === 0) {
          console.log("Thrown out at lineItemResults.length === 0");
          console.log(`purchase.purchaseKey: ${purchase.purchaseKey}`);
          return res.status(500).send("Line item error");
        }

        // Filter out line items that need their address updated
        const noAddressLineItems = lineItemResults.filter(lineItem => lineItem.addressKey === null);
        console.log("noAddressLineItems")
        console.dir(noAddressLineItems, { depth: null, colors: true });


        for (const lineItem of noAddressLineItems) {
          query = `
            UPDATE lineItem
            SET addressKey = ?, firstName = ?, lastName = ?, postalCode = ?, prefCode = ?, pref = ?, city = ?, ward = ?, address2 = ?, phoneNumber = ?
            WHERE lineItemKey = ?`;

          values = [defaultAddress.addressKey, defaultAddress.firstName, defaultAddress.lastName, defaultAddress.postalCode, defaultAddress.prefCode, defaultAddress.pref, defaultAddress.city, defaultAddress.ward, defaultAddress.address2, defaultAddress.phoneNumber, lineItem.lineItemKey];

          try {
              await pool.query(query, values);
              console.log(`Updated line item ${lineItem.lineItemKey} with default address.`);
          } catch (error) {
              console.error(`Error updating line item ${lineItem.lineItemKey}:`, error);
              // Handle error appropriately (e.g., continue, throw, etc.)
          }
        }

        query = `
          SELECT * FROM lineItem 
          WHERE purchaseKey = ?`;
        values = [purchase.purchaseKey];

        const [lineItemUpdatedResults] = await pool.query(query, values);

        console.log("lineItemUpdatedResults");
        console.log(lineItemUpdatedResults);
        console.log("products");
        console.log(products);


        sendOrderEmail(email, purchase, addresses, lineItemUpdatedResults, products, images, emailSubdomain);



        //#region send purchase to Azure
        const orderDetails = lineItemUpdatedResults.map(lineItem => {
          const product = products.find(product => {return lineItem.productKey === product.productKey});
          return({
            "chumon_meisai_no": lineItem.lineItemKey,
            "shohin_code": product?.id,
            "shohin_name": product?.title || "",
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

        
        // grouped delivery JSON for the backup servers (they don't want this)
        /*
        const uniqueAddressKeysSet = new Set();
        for (const item of lineItemUpdatedResults) {
          uniqueAddressKeysSet.add(item.addressKey);
        }
        const uniqueAddressKeys = Array.from(uniqueAddressKeysSet);
        console.log("uniqueAddressKeys");
        console.dir(uniqueAddressKeys, { depth: null, colors: true });

        //haiso
        const delivery = uniqueAddressKeys.map(addressKey => {
          const address = addresses.find(ad => {return ad.addressKey === addressKey});
          const lineItems = lineItemUpdatedResults.filter(lineItem => {return lineItem.addressKey === addressKey})

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
            "haiso_renrakusaki": `${address.phoneNumber.replace(/\D/g, '')}`,
            "haiso_meisai": deliveryDetails
          }
        })
        */

        const delivery = lineItemUpdatedResults.map(purchaseLineItem => {
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
            "haiso_meisai": deliveryDetails
          }
        });

        console.log("delivery");
        console.dir(delivery, { depth: null, colors: true });

        // 'userAddress' contains the first matching address or the default address if none were found.
        const orderAddress = lineItemUpdatedResults.reduce((foundAddress, purchaseLineItem) => {
          if (!foundAddress) {
            const address = addresses.find(ad => ad.addressKey === purchaseLineItem.addressKey);
            if (address) {
              return address;
            }
          }
          return foundAddress;
        }, defaultAddress);

        const backupData = {
          "chumon_no": "NVP-" + purchase.purchaseKey,
          "chumon_no2": "NVP-" + purchase.purchaseKey,
          "chumon_date": formatDate(purchase.purchaseTime),
          "konyu_name": `${customer.lastName || orderAddress.lastName} ${customer.firstName || orderAddress.firstName}`,
          "nebiki": 0,
          "soryo": 0,
          "zei1": Math.round(purchase.amount * (1/1.1)),
          "zei_ritsu1": 10,
          "zei2": 0,
          "zei_ritsu2": 0,
          "zei3": 0,
          "zei_ritsu3": 0,
          "konyu_mail_address": (email || customer.email || orderAddress.email || ""),
          "touroku_kbn": 0,
          "coupon_use_flg": purchase.couponDiscount > 0 ? 1 : 0,
          "chumon_meisai": orderDetails,
          "haiso": delivery,
        }
        console.log("backupData (for order)");
        console.dir(backupData, { depth: null, colors: true });
        const backupResults = await StoreBackupData("chumon_renkei_api", backupData, stageSubdomain);
        console.log("backupResults");
        console.log(backupResults);
        //#endregion


        // Make a copy of the exact data sent to Azure
        const backupDataJSON = JSON.stringify(backupData);
        query = "UPDATE purchase SET newPurchaseJson = ? WHERE paymentIntentId = ?;";
        try {
          await pool.query(query, [backupDataJSON, paymentIntentId]);
        } catch (error) {
          console.log("Error while updating newPurchaseJson:");
          console.dir(error, { depth: null, colors: true });
        }

      } // Only runs on "succeeded"
    } catch (error) {
      console.error('Error updating payment: ', error);
      return res.status(500).send('Error updating payment: ' + error);
    }
  } // paymentStatus === "created" or "succeeded"

  const customerData = await GetCustomerDataFromCustomerKey(customerKey, stageSubdomain);

  return res.json({customerData: customerData, paymentStatus: paymentStatus});
});
//#endregion Stripe

function CurrentTime() {
  const current = new Date();
  return `${current.getFullYear()}/${String(current.getMonth() + 1).padStart(2, '0')}/${String(current.getDate()).padStart(2, '0')} ${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}:${String(current.getSeconds()).padStart(2, '0')}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);

  // Format the date components to be in YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 because months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}年${month}月${day}日`;
}

app.post('/1.1/wf/update_fulfillment', async (req, res) => {
  const subdomains = req.subdomains;
  const subdomain = subdomains.length > 0 ? subdomains[0] : null;
  console.log(`░▒▓█ Hit 1.1/wf/update_fulfillment. Subdomain: [${subdomain}] Time: ${CurrentTime()}`);
  console.log("req.body:");
  console.dir(req.body, { depth: null, colors: true });
  console.log("req.headers:");
  console.dir(req.headers, { depth: null, colors: true });

  const stageSubdomain = subdomain === "stage" ? true : false;
  const pool = stageSubdomain ? poolStage : poolProduction;

  let query, values; // For MySQL

  //#region Validate inputs
  const purchaseKey = parseInt(req.body.chumon_no.replace(/\D/g, ''));
  if(isNaN(purchaseKey)) {
    return res.status(400).send('Bad Request: Could not parse numeric purchaseKey');
  }

  // This should never fire now, this was for guests who were not given a purchaseKey by the server because they had no account.
  if(purchaseKey > 1000000) {
    const returnPayload = {
      "status": "success",
      "statusCode": 200,
      "response": {
        "fulfillmentId": purchaseKey,
        "fulfillmentStatus": "success"
      }
    }
    console.log("returnPayload for guest:");
    console.dir(returnPayload, { depth: null, colors: true });
    console.log("XXXXX Guest order, large purchaseKey")
  
    return res.status(200).send(returnPayload);  
  }

  const purchaseDetails = req.body.chumon_meisai;
  if(purchaseDetails === null) {
    return res.status(400).send('Bad Request: null chumon_meisai (purchaseDetails)');
  }
  if(typeof purchaseDetails !== "object") {
    return res.status(400).send('Bad Request: non-object chumon_meisai (purchaseDetails)');
  }

  const shippingDetails = req.body.haiso_meisai;
  if(shippingDetails === null) {
    return res.status(400).send('Bad Request: null haiso_meisai (shippingDetails)');
  }
  if(typeof shippingDetails !== "object") {
    return res.status(400).send('Bad Request: non-object haiso_meisai (shippingDetails)');
  }

  const shippedLineItemKeys = shippingDetails.map(shippingDetail => {return parseInt(shippingDetail.haiso_meisai_no)});
  const purchasedLineItemKeys = purchaseDetails.map(purchaseDetail => {return parseInt(purchaseDetail.chumon_meisai_no)});
  const allLineItemKeys = [...shippedLineItemKeys, ...purchasedLineItemKeys];
  if(allLineItemKeys.length === 0) {
    return res.status(400).send('Bad Request: no items sent');
  }
  //#endregion



  //#region Count the number of lineItems covered by shipping status update using haiso_meisai_no and purchaseKey
  query = `
    SELECT * FROM lineItem 
    WHERE purchaseKey = ? AND lineItemKey IN (?)`;
  values = [purchaseKey, shippedLineItemKeys];

  try {
    const [result] = await pool.query(query, values);
    if(result.length === 0) {
      const returnPayload = {
        "status": "error",
        "statusCode": 404,
        "Messages": "注文情報が見つかりませんでした (chumon_no)"
      }
    
      console.dir(returnPayload, { depth: null, colors: true });
      return res.status(404).send(returnPayload);  
    }
  } catch (error) {
    console.log('Error finding unshipped line items');
    res.status(500).send('Error finding unshipped line items');
  }
  //#endregion


  //#region Actually update lineItems with "shipped" status
  query = `
    UPDATE lineItem 
    SET shippingStatus = ? 
    WHERE purchaseKey = ? AND lineItemKey IN (?) AND (shippingStatus != ? OR shippingStatus IS NULL)`;
  values = ['shipped', purchaseKey, shippedLineItemKeys, 'shipped'];

  try{
    const [result] = await pool.query(query, values);
    console.log("Query:", query);
    console.log("Values:", values);
    console.log("result:");
    console.dir(result, { depth: null, colors: true });
    if(result.affectedRows === 0) {
      const returnPayload = {
        "status": "error",
        "statusCode": 422,
        "Messages": "すでに発送した商品です"
      }

      return res.status(422).send(returnPayload);  
    }
  } catch (error) {
    console.error('Error updating shipping status: ', error);
    return res.status(500).send('Error updating shipping status: ' + error);
  }
  //#endregion

  const fulfillmentId = `${shippedLineItemKeys.join('-')}_${NoPunctuationDateTime()}`;

  const returnPayload = {
    "status": "success",
    "statusCode": 200,
    "response": {
      "fulfillmentId": fulfillmentId,
      "fulfillmentStatus": "success"
    }
  }
  console.log("returnPayload:");
  console.dir(returnPayload, { depth: null, colors: true });

  return res.status(200).send(returnPayload);
});




// Validates a user with either customerKey+token, or customerKey+email+password
async function ValidatePayload(payload, stageSubdomain) {
  if(stageSubdomain === undefined) {stageSubdomain = false; console.log("XXXXX stageSubdomain is undefined in ValidatePayload");}
  const pool = stageSubdomain ? poolStage : poolProduction;

  // Check for required inputs
  if(!payload) { return {valid: false, message: "No payload"};}
  if(!payload.customerKey) { return {valid: false, message: "No customer Key"};}
  const customerKey = Number(payload.customerKey)
  if(!customerKey) { return {valid: false, message: "Malformed customer Key"};}


  // Validate with token
  if(payload.token) {
    const token = payload.token
    const hexRegex = /^[0-9a-f]{96}$/i;
    if(!hexRegex.test(token)) { return {valid: false, message: "Malformed token"};}

    query = `SELECT * FROM customer WHERE token = ? AND customerKey = ?`;
    const [results] = await pool.query(query, [token, customerKey]);
    if (results.length === 0) { return {valid: false, message: "Token not found"};}

    return {valid: true, message: "Valid token", customerKey: customerKey};
  }


  // Validate with email / password
  if(payload.email && payload.password) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!emailRegex.test(payload.email)) { return {valid: false, message: "Malformed email"};}
    const email = payload.email;

    const passwordRegex = /^[\x20-\x7E]{8,}$/;
    if(!passwordRegex.test(payload.password)) { return {valid: false, message: "Malformed password"};}
    const password = payload.password;

    let query = `SELECT * FROM customer WHERE email = ?`;
    const [results] = await pool.query(query, [email]);
    if (results.length === 0) { return {valid: false, message: "Email / Password incorrect"};}

    const [customer] = results;
    const match = await bcrypt.compare(password, customer.passwordHash);
    if (!match) { return {valid: false, message: "Email / Password incorrect"};}

    return {valid: true, message: "Valid email / password", customerKey: customerKey};
  }

  return {valid: false, message: "Validation data not found"};
}

function NoPunctuationDateTime() {
  const now = new Date();
  const formattedDateTime = (
    now.getFullYear().toString() + 
    (now.getMonth() + 1).toString().padStart(2, '0') + // +1 because getMonth() returns 0-11
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0'));
  return formattedDateTime;
}

app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unknown top-level error:`, err.stack);
    return res.status(500).send('Unknown top-level error. Time: ' + CurrentTime());
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
  //process.exit(1);
});

process.on('exit', (code) => {
  console.log(`[${new Date().toISOString()}] Process exit with code: ${code}`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => { console.log(`Server started on ${PORT} at ${CurrentTime()}`); });
