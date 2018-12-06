const express = require("express");
const bodyParser = require("body-parser");
const path = require("path"); //core node.js module
const crypto = require("crypto"); //core node.js module
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");

const app = express();
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.use(express.static("public"));

// mongoose.set('useFindAndModify', false);
// mongoose.connect(
//   "mongodb://localhost/lisa_app_v2",
//   { useNewUrlParser: true }
// ).then(() => console.log('connecting to database successful'))
// .catch(err => console.error('could not connect to mongo DB', err));

// Mongo URI
const mongoURI = "mongodb://localhost/mongouploads";

// Create Mongo Connection
const conn = mongoose.createConnection(mongoURI, { useNewUrlParser: true });
// const db = await mongoose.createConnection(url, { useNewUrlParser: true });
// mongoose.set('useCreateIndex', true);
// mongoose.set('useFindAndModify', false);

// Init a var for the gfs stream
let gfs;

conn.once("open", () => {
  //init our stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          // if err through the err using the promise rejector
          return reject(err);
        }
        //create filename with the extension
        const filename = buf.toString("hex") + path.extname(file.originalname);
        // we gonna have an obj called fileInfo
        const fileInfo = {
          filename: filename,
          bucketName: "uploads" // the bucketName should macth the collection name
        };
        // we're going to resolve the promise with that fileInfo
        resolve(fileInfo);
      });
    });
  }
});
// Create a var called upload and set it to multer and pass in thye Storage engine
const upload = multer({ storage });
///ALL OF THESE ABOVE ALLOWS US TO MAKE OUR POST ROUTE // so it alows us to use "upload" as our middleware

//=======================================================================
//=======================================================================

// // @route GET /
// // @desc Loads form
// app.get("/", (req, res) => {
//   res.render("index");
// });


// @route GET /
// @desc Loads form
app.get("/", (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            res.render("index", {files:false});
        } else {
            // Check which ones are images 
            files.map(file => {
                if(file.contentType === "image/jpeg" || file.contentType === "image/png") 
                {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            });
            res.render("index", {files:files});
        }
    });
});

// @route POST /upload
// @desc Uploads files to DB
app.post("/upload", upload.single("file"), (req, res) => {
  //upload.single(), we're using single because we're just uploading a single file, with multer you can actually upload multiple file as an array...btw the parenths () you wanna pass in the value of "name" attribute used in the form field
  //res.json({ file: req.file }); // this would give us the info
  res.redirect("/");
});

// @route GET /files
// @desc Display all files in JSON
app.get("/files", (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: "No files exist"
            });
        }
        // Files exist
        return res.json(files);
    });
});

// @route GET /files/:filename
// @desc Display single file object
// http://localhost:5000/files/cd9417301c98b71e935a14e9ffccd799.jpg
app.get("/files/:filename", (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "No file exist"
            });
        }
        // File exist
        return res.json(file);
    });
});


// @route GET /image/:filename
// @desc Display image
// http://localhost:5000/files/cd9417301c98b71e935a14e9ffccd799.jpg
app.get("/image/:filename", (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "No such file exist"
            });
        }
        // Check if image
        if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            // else if not an Image
            return res.status(404).json({
                err: "Not an image"
            });
        }
    });
});

// @route delete /files/:id
// @desc Delete file
app.delete("/files/:id", (req, res) => {
    gfs.remove({_id: req.params.id, root: "uploads"}, (err, gridStore) => {
        if(err) {
            return res.status(404).json({err: err});
        }
        res.redirect("/");
    });
});
//let's put our PORT into a variable
const port = 5000;

app.listen(port, () => console.log(`Server started at port ${port}`));