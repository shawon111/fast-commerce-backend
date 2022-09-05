const express = require('express');
const cors = require('cors');
const app = express();
const multer = require('multer');
const path = require('path');
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send("fast commerce server")
})


// file upload folder
const uploads_folder = './uploads/';

// define storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploads_folder)
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName = file.originalname.replace(fileExt, "").toLowerCase().split(" ").join("-") + "-" + Date.now();
    const fullName = fileName + fileExt;
    cb(null, fullName);
  }
})

// file upload function
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 3000000,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/webp" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/jpeg"
    ) {
      cb(null, true)
    } else {
      cb(new Error("Only webp, png, jpg and jpeg images are allowed"), false)
    }
  }
})


// mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gv57l.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const database = client.db('FastCommerce');
    const productCollection = database.collection('products');


    // post api for adding product
    app.post('/addproduct', upload.fields([{ name: 'featuredImage', maxCount: 1 }, { name: 'gallaryImages', maxCount: 4 }]), async (req, res) => {
      const images = req.files;
      const featuredImageFile = images['featuredImage'][0];
      const featuredImagePath = featuredImageFile.path.replace("\\", "/");

      const galleryFiles = images['gallaryImages']
      let galleryImagesPathList = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const filePath = await galleryFiles[i].path.replace("\\", "/");
        galleryImagesPathList.push(filePath);
      }

      const productInfo = req.body;

      const { product_name, product_desc, additionalInfo, sizes, sku, features, brand, stock, availableStock, metaTags, metaDescription, metaTitle, price, category } = productInfo;

      const productSizes = sizes.split(",");

      // product format for database
      const product = {
        name: product_name,
        desc: product_desc,
        additionalInfo: additionalInfo,
        reviews: [

        ],
        product_sizes: {
          small: productSizes[0],
          medium: productSizes[1],
          large: productSizes[2],
        },
        sku: sku,
        features: features,
        brand: brand,
        stock: stock,
        availableStock: availableStock,
        metaTags: metaTags,
        metaDescription: metaDescription,
        metaTitle: metaTitle,
        featuredImageUrl: featuredImagePath,
        galleryImagesUrls: galleryImagesPathList,
        price: price,
        category: category
      }

      // inserting data to the database
      const result = await productCollection.insertOne(product)


      res.json(result)
    })

    // get api for finding all products
    app.get('/products', async (req, res) => {
      const cursor = productCollection.find({});
      const result = await cursor.toArray();
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    // get product according to pagination
    app.get('/products/page', async (req, res)=>{
      const page = req.query.index;
      let skipProduct = (page - 1) * 12;
      const cursor = productCollection.find({}).limit(12).skip(skipProduct);
      const result = await cursor.toArray();
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    // get api for product length
    app.get('/products/length', async (req, res)=>{
      const cursor = productCollection.find({});
      const result = await cursor.toArray();
      const countResult = result.length;
      res.json(countResult)
    })

    // get api for a specific category
    app.get('/products/category/:categoryName', async (req, res) => {
      const requestedCategory = req.params.categoryName;
      const query = { category: requestedCategory };
      const cursor = productCollection.find(query).limit(8);
      const result = await cursor.toArray();
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    // get latest 8 product
    app.get('/products/latest', async (req, res)=> {
      const options = {
        sort: {_id: -1}
      }
      const cursor =productCollection.find({}, options).limit(8);
      const result = await cursor.toArray();
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    // get api for featured products
    app.get('/products/featured', async (req, res)=>{
      const cursor = productCollection.find({}).limit(10);
      const result = await cursor.toArray();
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    // get api for search
    app.get('/products/search', async (req,res)=>{
      const searchText = req.query.text;
      const query = {$text:{$search:`${searchText}`}};
      const projection = {
        _id: 1,
        name: 1,
        featuredImageUrl: 1,
        price: 1,
        reviews: 1
      };
      const cursor = productCollection.find(query).project(projection);
      const result = await cursor.toArray();
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    // get api for single product
    app.get('/products/:id', async (req, res)=>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const cursor = productCollection.findOne(query);
      const result = await cursor;
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    //get api for related product
    app.get('/products/related/:category', async (req, res)=>{
      const requestedCategory = req.params.category;
      const query = {category: requestedCategory};
      const cursor = productCollection.find(query).limit(2);
      const result = await cursor.toArray();
      if ((result.length) === 0) {
        res.json("No documents found!")
      } else {
        res.json(result)
      }
    })

    app.use((err, req, res, next) => {
      if (err) {
        res.status(500).send(err.message)
      } else {
        res.send("success")
      }
    })


  } finally {
    console.log("server operation complete")
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`listening to the port:  ${port}`)
})