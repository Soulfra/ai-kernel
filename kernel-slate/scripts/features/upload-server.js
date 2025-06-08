#!/usr/bin/env node
const express = require("express");
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const app = express();
const upload = multer({ dest: path.join(__dirname, "..", "..", "uploads") });
const PORT = process.env.PORT || 3000;
const docsDir = path.join(__dirname, "..", "..", "docs");
const publicDir = path.join(__dirname, "..", "..", "public");

app.use("/docs", express.static(docsDir));
app.use(express.static(publicDir));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const inputPath = req.file.path;
  const script = path.join(__dirname, "chatlog-parser", "from-export.js");
  const proc = spawn("node", [script, inputPath]);
  proc.on("error", (err) => {
    console.error("Failed to run parser", err);
    res.status(500).json({ error: "Parser error" });
  });
  proc.on("close", (code) => {
    fs.unlinkSync(inputPath);
    if (code !== 0) {
      return res.status(500).json({ error: "Parsing failed" });
    }
    res.json({ url: "/docs/chat-summary.md" });
  });
});

app.listen(PORT, () => {
  console.log(`Upload server running at http://localhost:${PORT}`);
});
