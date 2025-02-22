// nothing in timer
//
// new file that contains the api route information.
// moved from server.js file
//
var express = require("express");
var fs = require('fs');
var router = express.Router();
var db = require("../models");
// just the image Schema
//var imgModel = require("../model"); // this is now being removed from code below.
// require method to sort ages array by number
// var sortAges = require("sort-ids");

// var reorder = require("array-rearrange");
var path = require("path");
// added with the suggestion of gemini
const util = require('util');
console.log(fs);
const unlinkAsync = util.promisify(fs.unlink);

//following is more from images upload to mongodb process - step 5
//set up multer for storing uploaded files  -- not being used currently, code in server.js
var multer = require("multer");

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads")
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
var upload = multer({ storage: storage });
//and from Step 1 of uploading images to mongodb:

// initialize image variables
var imgHold = [];
var imagesHold = [];

module.exports = function(router) {

    // route for getting all the items out of the db
    router.get("/getAllItems", function(req, res) {
        db.Item.find({})
            .then(function(dbAllItems) {
                //console.log("dbAllItems from /getAllItems; ", dbAllItems);
                res.json(dbAllItems);
            })
            .catch(function(err) {
                // or send the error
                res.json(err);
            });
    });
  
    // Route for getting a specific Item by id, and then populate it with an array for Images
    router.get("/popItem/:id", function(req, res) {
        // Using the id passed in the id parameter, and make a query that finds the matching one in the db
        console.log("in /popItem/:id, req.params.id: ", req.parapms.id);
        db.Item.findOne({ _id: req.params.id })
            // then populate the kitten schema associated with it
            .populate([
                {
                    path: "image",
                    model: "Image"
                }
            ])
            .then(function(dbItem) {
            // If successful, find a User with the given id, send it back to the client
            console.log("api-routes.js, /ppItem/:id, JUST POPULATE ITEM, dbItem: ", dbItem);
            res.json(dbItem);
            })
            .catch(function(err) {
            // but if an error occurred, send it to the client
            res.json(err);
            });
    });

    // Route for creating a new Item
    router.get("/createItem/", function(req, res) {
        console.log("from /createItem, req.query: ", req.query);
        db.Item.create(req.query)
            .then(function(dbItem) {
                // View the added result in the console
            console.log("what was created in the item db, dbItem: ", dbItem);
            res.json(dbItem);
            })
            .catch(function(err) {
            // If an error occurred, send it to the client
            return res.json(err);
            });
    });

    // Uploading images
    // This is from Gemini
    router.post("/createImageItem/:id", upload.array("itemImageInput[]", 20), function(req, res, next) {
        console.log("req.files: ", req.files);
    
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" }); // Handle no files case
        }
    
        const promises = req.files.map(file => { // Use map to create an array of promises
            return new Promise((resolve, reject) => { // Use a Promise for each file
                console.log("file.filename: ", file.filename);
                const image = {
                    title: "Title", // Or get from req.body if needed
                    desc: "Description", // Or get from req.body if needed
                    img: {
                        data: fs.readFileSync(path.join(__dirname + "/../uploads/" + file.filename)),
                        contentType: file.mimetype || "image/jpeg" // Get mimetype from file or default
                    },
                    filename: file.filename // Crucial: Store the filename here!
                };
    
                db.Image.create(image)
                    .then(dbImage => {
                        return db.Item.findOneAndUpdate(
                            { _id: req.params.id }, // Access req.params.id correctly
                            { $push: { image: dbImage._id } },
                            { new: true }
                        );
                    })
                    .then(dbItem => {
                        resolve(dbItem); // Resolve with the updated item
                    })
                    .catch(reject); // Reject if there's an error
            });
        });
    
        Promise.all(promises)  // Wait for all promises to resolve
            .then(results => {
                res.json(results); // Send back all the updated items
            })
            .catch(err => {
                console.error("Error creating images:", err);
                res.status(500).json(err); // Send a 500 error with the error details
            });
    }); 
    //
    //This is Step 8 from notes on uploading the images chosen by the user
    //It's now being called from item.js, not directly from html form
    // router.post("/createImageItem/:id", upload.array("itemImageInput[]", 6), function(req, res, next) {
    //     console.log("req.files: ", req.files);
    //     console.log("from api-routes step 8, req.files.filename: ", req.files.filename);
    //     var obj=[];
    //     if(req.files) {
    //         for(var i=0; i<req.files.length; i++) {
    //             obj[i] = {
    //                 title: "Title",
    //                 desc: "Description",
    //                 img: {
    //                     data: fs.readFileSync(path.join(__dirname + "/../uploads/" + req.files[i].filename)),
    //                     contentType: "image/jpeg"
    //                 }
    //             }
    //             db.Image.create(obj[i])
    //             .then(function(dbImage) {
    //                 //console.log("after .create Image - dbImage: ", dbImage);
    //                 //pushing the new kitten image into the document kitten array
    //                 return db.Item.findOneAndUpdate(
    //                     { _id: req.params[i].id },
    //                     { $push: { image: dbImage._id } },
    //                     { new: true }
    //                 );
    //             })
    //             .then(function(dbItem) {
    //                 //send back the correct item with the new data in the image array
    //                 res.json(dbItem);

    //             })
    //             .catch(function(err) {
    //                 //If an error occurred, send back
    //                 res.json(err);
    //             });
    //         }
    //     }
    // });

    //This route gets one item document from item collection
    router.get("/getAItem/:id", function(req, res) {
        //console.log("inside api-routes: req.params: ", req.params);
        // need to find the correct item, and retrieve it's data, 
        db.Item.find({ _id: req.params.id })
            .then(function(dbAItem) {
                res.json(dbAItem);
                console.log("from route /getAItem:id, dbAItem: ", dbAItem);
            })
            .catch(function(err) {
            // However, if an error occurred, send it to the client
            res.json(err);
            });
    });
    
    // the GET route for getting all the images from one item in the db
    router.get("/getImages/:id" , (req, res) => {
        //console.log("in /getImages/, req.params.id: ", req.params.id );
            db.Image.find({ _id: req.params.id})
            .then((records) => {
                // console.log("this is records from api route /getImages/: ", records);
                //for loop to create array of item images from records from db
                //study: I'm only getting one record, instead of all of them, so this loop doesn't really need to be here,
                // it's only going through once, and client side has the .forEach to go through the full array. Leaving it for now...
                for (i=0; i<records.length; i++) {
                    imgHold[i] = Buffer.from(records[i].img.data, "base64");
                    imagesHold.push(imgHold[i]);
                }
                //console.log("inside /getImages/, records[0]._id: " + records[0]._id);
                //console.log("inside /getImages/, records[0].title: " + records[0].title);
                const formattedImages = imagesHold.map(buffer => {
                    //return `<img data-title=` + records[0].title + ` data-id=` + records[0]._id + ` class="theImages" title=` + records[0].title + ` src="data:image/jpeg;base64,${buffer.toString("base64")}"/>`
                    return `<img data-id=` + records[0]._id + ` id="itemImg" class="theImages" data-desc="` + records[0].desc + 
                    `" title="` + records[0].title + `" alt="itempic" src="data:image/jpeg;base64,${buffer.toString("base64")}"/>`
                });
                res.send(formattedImages)  //this should be going back to items.js
                //empty out arrays
                imgHold = [];
                imagesHold = [];
            })
                .catch(error => {
                    console.log("Iam getting an error", error);
                });
        
    });

    // changing the name of a item in the db
       
       router.post("/editItemName/:itemId", function(req, res) {
        console.log("req.params.itemId: ", req.params.itemId);
        //console.log("req.body: ", req.body);
        console.log("req.body.name: ", req.body.name);
        // if the name has been emptied out by mistake, "None" should be entered insted of blank
        if (req.body.name === "") {
            req.body.name = "Name";
        }
        // find the intended item properties, and change the values accordingly
        db.Item.findOneAndUpdate (
            { _id: req.params.itemId },
            {$set: { 
                name: req.body.name, 
            }},
            { new: true } //send new one back
        )
            .then(function(dbItem) {
                console.log("dbItem: ", dbItem);
                // If successful, send the newly edited data back to the client
                res.json(dbItem);
            })
            .catch(function(err) {
            // but if an error occurred, send it to the client
                res.json(err);
            });
    });

    // changing the bio of a item in the db
       
    router.post("/editItemBio/:itemId", function(req, res) {
        console.log("req.params.itemId: ", req.params.itemId);
        //console.log("req.body: ", req.body);
        console.log("req.body.bio: ", req.body.bio);
        // if bio has been emptied out, "None" should be entered insted of blank
        if (req.body.bio === "") {
            req.body.bio = "Biography";
        }
        // find the intended item properties, and change the values accordingly
        db.Item.findOneAndUpdate (
            { _id: req.params.itemId },
            {$set: { 
                bio: req.body.bio, 
            }},
            { new: true } //send new one back
        )
            .then(function(dbItem) {
                console.log("dbImage: ", dbItem);
                // If successful, send the newly edited data back to the client
                res.json(dbItem);
            })
            .catch(function(err) {
            // but if an error occurred, send it to the client
                res.json(err);
            });
    });

    // changing the order of a item in the db
       
    router.post("/editItemOrder/:itemId", function(req, res) {
        console.log("req.params.itemId: ", req.params.itemId);
        //console.log("req.body: ", req.body);
        console.log("req.body.order: ", req.body.order);
        // if order has been emptied out, "None" should be entered insted of blank
        if (req.body.order === "") {
            req.body.order = "3000"; //should this be something besides a string?
        }
        // find the intended item properties, and change the values accordingly
        db.Item.findOneAndUpdate (
            { _id: req.params.itemId },
            {$set: { 
                order: req.body.order, 
            }},
            { new: true } //send new one back
        )
            .then(function(dbItem) {
                console.log("dbImage: ", dbItem);
                // If successful, send the newly edited data back to the client
                res.json(dbItem);
            })
            .catch(function(err) {
            // but if an error occurred, send it to the client
                res.json(err);
            });
    });

    // changing the title of an image in the db
       //Route to edit the title of a kitten's image
    router.post("/editImageTitle/:imageId", function(req, res) {
        console.log("req.params.imageId: ", req.params.imageId);
        //console.log("req.body: ", req.body);
        console.log("req.body.title: ", req.body.title);
        // if title has been emptied out, "None" should be entered insted of blank
        if (req.body.title === "") {
            req.body.title = "Title";
        }
        // find the intended image properties, and change the values accordingly
        db.Image.findOneAndUpdate (
            { _id: req.params.imageId },
            {$set: { 
                title: req.body.title, 
            }},
            { new: true } //send new one back
        )
            .then(function(dbImage) {
                console.log("dbImage: ", dbImage);
                // If successful, send the newly edited data back to the client
                res.json(dbImage);
            })
            .catch(function(err) {
            // but if an error occurred, send it to the client
                res.json(err);
            });
    });

    // changing the description of an image in the db
       //Route to edit the description of a kitten's image
       router.post("/editImageDesc/:imageId", function(req, res) {
        console.log("req.params.imageId: ", req.params.imageId);
        //console.log("req.body: ", req.body);
        console.log("req.body.desc: ", req.body.desc);
        // if desc has been emptied out, "None" should be entered insted of blank
        if (req.body.desc === "") {
            req.body.desc = "Description";
        }
        // find the intended image properties, and change the values accordingly
        db.Image.findOneAndUpdate (
            { _id: req.params.imageId },
            {$set: { 
                desc: req.body.desc, 
            }},
            { new: true } //send new one back
        )
            .then(function(dbImage) {
                console.log("dbImage: ", dbImage);
                // If successful, send the newly edited data back to the client
                res.json(dbImage);
            })
            .catch(function(err) {
            // but if an error occurred, send it to the client
                res.json(err);
            });
    });

    // This is the route to delete an image the User wants to delete
    // Helped out by Gemini
    router.delete("/image/delete/:id", async (req, res) => {
        console.log("in image/delete, req.params.id: ", req.params.id);
        try {
            // 1. Find the image to get the filename
            const image = await db.Image.findById(req.params.id);

            if (!image) {
                return res.status(404).json({ message: "Image not found" });
            }
            const filename = image.filename; // Get the filename
            console.log("filename: ", filename);
            // 2. Delete the image from the database
            const dbImage = await db.Image.deleteOne({ _id: req.params.id });
            console.log("delete an image, dbImage: ", dbImage);
            // 3. Delete the file from the uploads folder
            if (filename) { // Check if filename exists
                const filePath = path.join(__dirname, "/../uploads/", filename);
                console.log("File path to delete:", filePath); // Add this line
                try { // new way from Gemini
                    await unlinkAsync(filePath);
                    console.log(`WHAT ABOUT THIS: File ${filename} deleted successfully.`);
                } catch (err) {
                    console.error("Error deleting file:", err);
                }
            }
            //
            // if (filename) { // Check if filename exists
            //     const filePath = path.join(__dirname, "/../uploads/", filename);
            //     console.log("File path to delete:", filePath); // Add this line
            //     fs.unlink(filePath, (err) => {
            //         if (err) {
            //             console.error("Error deleting file:", err);
            //             // Optionally log, but don't stop the response
            //         } else {
            //             console.log(`WHAT ABOUT THIS: File ${filename} deleted successfully.`);
            //         }
            //     });
            // }
            //
            res.json(dbImage); // Send the database response
        } catch (err) {
            console.error("Error deleting image:", err);
            res.status(500).json(err); // Send a 500 error
        }
    });

    // This route deletes the image the User wants to delete
    // router.delete("/image/delete/:id", function(req, res) {
    //     console.log("in image/delete, req.params.id: ", req.params.id);
    //     // delete the whole metric group
    //     db.Image.deleteOne(
    //         { _id: req.params.id }
    //     )
    //     .then(function(dbImage) {
    //         //  
    //         console.log("delete an image, dbImage: ", dbImage);
    //         res.json(dbImage);
    //     })
    //     .catch(function(err) {
    //         // but if an error occurred, send it to the client
    //         res.json(err);
    //     });
    // });

    // This route deletes the reference to the image document in the associated item document
    router.post("/item/removeRef/:id", function(req, res) {
        //console.log("req:", req);
        console.log("remove an image reference: item id: ", req.params.id);
        console.log("data transferred to remove image reference, req.body: ", req.body);
        console.log("req.body.imageId: ", req.body.imageId);
    // delete (or pull) the id of the image and pass the req.body to the entry
    db.Item.findOneAndUpdate(
        { _id: req.params.id },
        { $pull: { image: req.body.imageId }}, // this imageId should be the image's id to be removed
        { new: true }
    )
        .then(function(dbItem) {
            console.log("after .then db.Item.findOneAndUpdate $pull, dbItem: ", dbItem);
            res.json(dbItem);
        })
        .catch(function(err) {
        // If an error occurred, send it to the client
            res.json(err);
        });
    });

    // This route deletes the item the user wants to delete
    router.delete("/item/delete/:id", function(req, res) {
        console.log("in /item/delete, req.params: ", req.params);
        console.log("in /item/delete/, req.params.id: ", req.params.id);
        // delete the whole item group
        db.Item.deleteOne(
            { _id: req.params.id }
        )
        .then(function(dbItem) {
            console.log("delete a item, dbItem: ", dbItem);
            res.json(dbItem);
        })
        .catch(function(err) {
            // but if an error occurred, send it to the client
            res.json(err);
        });
    });
    
};