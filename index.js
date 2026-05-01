require('dotenv').config()
const express = require('express');
var cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;

const serviceAccount = require("./smart-deals-firebase-adminsdk.json");
const e = require('express');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors())
app.use(express.json())

const logger = (req, res, next) => {
    console.log("logger information");
    next()
}

const verifyFireBaseToken = async (req, res, next) => {
    // console.log("in the verify middleware", req.headers.authorization);

    if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    const token = req.headers.authorization.split(' ')[1]
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    //verify id token
    try {
        const tokenInfo = await admin.auth().verifyIdToken(token);
        req.token_email = tokenInfo.email;
        console.log("after token validation", tokenInfo);
        next()
    }
    catch {
        console.log("invalid");
        return res.status(401).send({ message: "unauthorized access" });
    }

}

const verifyJWTToken = (req, res, next) => {
    console.log("in middleware", req.headers);

    if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized accesss" });
        }
        req.token_email = decoded.email

        next()

    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q3bebek.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const smartdb = client.db("smartdb");
        const productsCollection = smartdb.collection("products");
        const bidsCollection = smartdb.collection("bids");
        const usersCollection = smartdb.collection("users");

        //jwt related api's
        app.post('/getToken', (req, res) => {
            const loggedUser = req.body
            const token = jwt.sign(loggedUser, process.env.JWT_SECRET, { expiresIn: '1h' })
            res.send({ token: token })
        })

        //users related api's
        app.post("/users", async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email };
            const existingEmail = await usersCollection.findOne(query);
            if (existingEmail) {
                res.send({ message: "user already exists. do not insert again" })
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result)

            }

        })

        //products related api's
        app.get("/products", async (req, res) => {
            // const projectFields = {title: 1,price_min:1,price_max: 1,image:1}
            // const sortFields = { price_min: -1 };
            // const result = await productsCollection.find().sort(sortFields).skip(2).limit(4).project(projectFields).toArray();

            //getting products based on email using query parameter

            const email = req.query.email;
            console.log(email);
            const query = {};
            if (email) {
                query.email = email;
            }

            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/latest-products", async (req, res) => {
            const result = await productsCollection.find().sort({ created_at: -1 }).limit(6).toArray();
            res.send(result)
        })

        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        app.post("/products", async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result)
        })

        app.patch("/products/:id", async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    name: updatedProduct.name,
                    age: updatedProduct.age,
                }
            };
            const result = await productsCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        //bids related api's

        app.get("/bids", verifyJWTToken, async (req, res) => {

            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyer_email = email;
            }

            //verify user have access to see this data
            if(email !== req.token_email){
                return res.status(403).send({message: "forbidden access"});
            }

            const result = await bidsCollection.find(query).toArray();
            res.send(result);
        })

        // app.get("/bids", logger, verifyFireBaseToken, async (req, res) => {
        //     // console.log("header",req.headers);
        //     // console.log(req);

        //     const email = req.query.email;
        //     const query = {};
        //     if (email) {
        //         if (email !== req.token_email) {
        //             return res.status(403).send({ message: "forbidden access" })
        //         }
        //         query.buyer_email = email;
        //     }
        //     const result = await bidsCollection.find(query).toArray();
        //     res.send(result);
        // })

        app.get("/bids/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsCollection.findOne(query);
            res.send(result);
        })

        app.get("/products/bids/:productId", verifyFireBaseToken, async (req, res) => {
            const productId = req.params.productId;
            const query = { product: productId };
            const result = await bidsCollection.find(query).sort({ bid_price: -1 }).toArray();
            res.send(result);
        })

        app.post("/bids", async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result)
        })

        app.delete("/bids/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsCollection.deleteOne(query);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("smart server is running")
})

app.listen(port, () => {
    console.log(`smart server is running on port ${port}`)
})