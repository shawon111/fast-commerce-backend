const express = require('express');
const cors = require('cors');
const app = express();
const multer = require('multer');
app.use(cors());
app.use(express.json());
require('dotenv').config();
const {MongoClient} = require('mongodb');
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 5000;

app.get('/', (req, res) =>{
    const data = req.query;
    console.log(data);
    res.send("fast commerce server")
})


// file upload function
const uploads_folder = './uploads/';
const upload = multer({
  dest: uploads_folder
})


// Replace the uri string with your connection string.
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gv57l.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const database = client.db('FastCommerce');
    const productCollection = database.collection('products');

    app.post('/addproduct', upload.single("image"), (req, res)=>{
      const data = req.file;

      console.log("data from clientside", req.body)
      console.log("image from clientside", data)
      res.json("data recieved")
    })


    
  } finally {
    console.log("server operation complete")
  }
}
run().catch(console.dir);


app.listen(port, ()=>{
    console.log(`listening to the port:  ${port}`)
})