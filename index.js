const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.port || 3000;

// middleware
app.use(cors());
app.use(express.json());

// /mongodb

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oapnwos.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const dbConnect = async () => {
    try {
        client.connect()
        console.log('Database connected successfully')
    } catch (error) {
        console.log(error.name, error.message)
    }
}

dbConnect()

// api

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is runing on port, ${port}`);
});
