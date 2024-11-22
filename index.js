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
      console.log(email);
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
      console.log(result);
    });

    // get product

    app.get("/all-products", async (req, res) => {
      // name searching
      // sort by price
      // filter by category
      // filter by brand

      const { title, sort, category, brand, page = 1, limit = 9 } = req.query;

      const query = {};

      if (title) {
        query.title = { $regex: title, $options: "i" };
      }

      if (category) {
        query.category = { $regex: category, $options: "i" };
      }

      if (brand) {
        query.brand = brand;
      }

      const pageNumber = Number(page);
      const limitNumber = Number(limit);

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
