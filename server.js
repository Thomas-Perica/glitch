"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const Str = require("@supercharge/strings");
var bodyParser = require("body-parser");
var cors = require("cors");
const dns = require("dns");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

// mongoose.connect(process.env.DB_URI);
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
// setup the database schema
var Schema = mongoose.Schema;
var urlSchema = new Schema({
  shortUrl: { type: String, required: true, unique: true },
  longUrl: { type: String, required: true }
});

var Url = mongoose.model("Url", urlSchema);

// function to save url into database, returning the short version
function saveUrl(urlToShorten) {
  const shorty = Str.random(5);
  const doc = new Url({ shortUrl: shorty, longUrl: urlToShorten });

  doc.save((err, data) => {
    if (err) return console.error(err);
  });
  return shorty;
}

function saveResult(family) {
  return;
}

// function to lookup short url and return long version
function lookupUrl(shortUrl) {
  console.log("looking up " + shortUrl);
  return new Promise((resolve, reject) => {
    Url.findOne({ shortUrl: shortUrl }, "longUrl", (err, longUrl) => {
      if (err) {
        console.log(err);
        return resolve(null);
      } else {
        console.log(shortUrl + " found, long version is " + longUrl);
        return resolve(longUrl);
      }
    });
  });
}

function validateUrl(url) {
  console.log("running validate Url on " + url);
  return new Promise((resolve, reject) => {
    dns.lookup(url, (err, address, family) => {
      if (err) {
        return resolve(false);
      }
      return resolve(true);
    });
  });
  // validate the url, return true or false
}

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: "false" }));

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl/new", async function(req, res) {
  // strip out the http:// or other beginning part
  if (req.body.url.indexOf("://") >= 0) {
    var thisUrl = req.body.url.split("://")[1];
  } else {
    var thisUrl = req.body.url;
  }
  // call function to validate url
  if (await validateUrl(thisUrl)) {
    // call function to save url and return the new stuff
    console.log("saving url");
    const shorty = saveUrl(thisUrl);
    res.json({ original_url: thisUrl, short_url: shorty });
  } else {
    // return error message for bad url
    console.log("invalid url");
    res.json({ error: "invalid URL" });
  }
});

app.get("/api/shorturl/:shortUrl?", async function(req, res) {
  const urlToRedirect = await lookupUrl(req.params.shortUrl);
  if (urlToRedirect) {
    res.redirect("http://" + urlToRedirect.longUrl);
  } else {
    res.status(400).send("Bad Request");
  }
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
