const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.port || 3000;

// middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// token verification

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ message: "No Token" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (error, decoded) => {
    if (error) {
      return res.send({ message: "Invalid Token" });
    }
    req.decoded = decoded;
    next();
  });
};

// verify seller

const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const user = await userCollection.findOne({ email: email });
  if (user?.role !== "seller") {
    return res.send({ message: "Forbidden Access" });
  }
  next();
};

// /mongodb

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oapnwos.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const userCollection = client.db("UrbanNest").collection("users");
const productCollection = client.db("UrbanNest").collection("products");

const dbConnect = async () => {
  try {
    client.connect();
    console.log("Database connected successfully");

    // post user

    app.post("/user", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get single user

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });
    // admin related api
    // get all users

    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // delete user

    app.delete("/deleteUser/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const result = await userCollection.deleteOne({
        _id: new ObjectId(String(id)),
      });
      res.send(result);
    });
    // make buyer to seller

    app.patch("/makeSeller/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id)

      const query = { _id: new ObjectId(String(id)), role: "buyer" };
      const updatedDoc = { $set: { role: "seller" } };

      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // seller api
    // add iteams
    app.post("/add-product", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      // console.log(product)
      const result = await productCollection.insertOne(product);
      console.log(result);
      // res.send(result);
    });

    // get items according to seller email

    app.get("/seller-products", verifyJWT, verifySeller, async (req, res) => {
      const email = req.query.email;
      const result = await productCollection
        .find({ SellerEmail: email })
        .toArray();
      res.send(result);
    });
    // delete item with id
    app.delete(
      "/deleteProduct/:id",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const result = await productCollection.deleteOne({
          _id: new ObjectId(String(id)),
        });
        console.log(result);
        res.send(result);
      }
    );

       // update a product

       app.patch("/updateProduct/:id",verifyJWT, verifySeller, async (req, res) => {
        const id = req.params.id;
        // console.log(id)
        const updatedProduct = req.body
  
        const query = { _id: new ObjectId(String(id)), };
        const updatedDoc = { $set: updatedProduct };
  
        const result = await productCollection.updateOne(query, updatedDoc);
        res.send(result);
      });

    // only users api
    // add to wishlist
    app.patch("/add-to-wishlist/:id", verifyJWT, async (req, res) => {
      const productId = req.params.id;
      const userEmail = req.decoded.email;
      const query = { email: userEmail };
      const updateDoc = {
        $addToSet: { wishlist: productId },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
      console.log(result)
    });
       // add to cart
    app.patch("/add-to-cart/:id", verifyJWT, async (req, res) => {
      const productId = req.params.id;
      const userEmail = req.decoded.email;
      const query = { email: userEmail };
      const updateDoc = {
        $addToSet: { cart: productId },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
      console.log(result)
    });

 

    // get product

    app.get("/all-products", async (req, res) => {
      const { title, sort, category, brand, page = 1, limit = 9 } = req.query;

      const query = {};
      // name searching

      if (title) {
        query.title = { $regex: title, $options: "i" };
      }
      // filter by category
      if (category) {
        query.category = { $regex: category, $options: "i" };
      }
      // filter by brand
      if (brand) {
        query.brand = brand;
      }

      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      // sort by price
      const sortOptions = sort === "asc" ? 1 : -1;

      const products = await productCollection
        .find(query)
        .skip((pageNumber - 1) * limit)
        .limit(limitNumber)
        .sort({ price: sortOptions })
        .toArray();

      const totalproducts = await productCollection.countDocuments(query);

      const categories = [
        ...new Set(products.map((product) => product.category)),
      ];

      const brands = [...new Set(products.map((product) => product.brand))];

      res.json({ products, totalproducts, categories, brands });
    });

    // get product by id

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(String(id)) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
  } catch (error) {
    console.log(error.name, error.message);
  }
};

dbConnect();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/authentication", async (req, res) => {
  const userEmail = req.body;
  // console.log(userEmail)
  const token = jwt.sign(userEmail, process.env.ACCESS_KEY_TOKEN, {
    expiresIn: "10d",
  });
  // console.log(token)
  res.send(token);
});

app.listen(port, () => {
  console.log(`Server is runing on port, ${port}`);
});
