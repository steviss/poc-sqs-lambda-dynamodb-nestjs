const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const express = require("express");
const serverless = require("serverless-http");

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);
const DEFAULT_LIMIT = 10;

console.log("USERS_TABLE", USERS_TABLE);

app.use(express.json());

app.get("/users", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || DEFAULT_LIMIT;
  const lastEvaluatedKey = req.query.lastEvaluatedKey
    ? JSON.parse(req.query.lastEvaluatedKey)
    : undefined;

  const params = {
    TableName: USERS_TABLE,
    Limit: limit,
    ExclusiveStartKey: lastEvaluatedKey,
  };

  try {
    const command = new ScanCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    res.json({
      users: Items,
      lastEvaluatedKey: LastEvaluatedKey
        ? JSON.stringify(LastEvaluatedKey) // Send as string for client to handle
        : null,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Could not retrieve users" });
  }
});

app.get("/users/:userId", async (req, res) => {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});

app.post("/users", async (req, res) => {
  const { userId, name } = req.body;
  console.log("req.body", req.body);
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: { userId, name },
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.json({ userId, name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create user" });
  }
});

app.patch("/users", async (req, res) => {
  const { userId, name } = req.body;
  console.log("req.body", req.body);

  if (typeof userId !== "string") {
    return res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== "string") {
    return res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: "SET #name = :name",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": name,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const command = new UpdateCommand(params);
    const { Attributes } = await docClient.send(command);

    res.json({ message: "User updated successfully", user: Attributes });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Could not update user" });
  }
});

app.delete("/users/:userId", async (req, res) => {
  const { userId } = req.params;

  // Validate the request parameter
  if (typeof userId !== "string" || !userId) {
    return res
      .status(400)
      .json({ error: '"userId" must be a non-empty string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Key: { userId }, // Ensure the key matches your table's schema
  };

  try {
    const command = new DeleteCommand(params);
    await docClient.send(command);

    res.json({ message: `User with ID ${userId} deleted successfully` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Could not delete user" });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

exports.handler = serverless(app);
