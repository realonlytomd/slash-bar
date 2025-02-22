// Step 3 - this is the code for ./models.js
 
var mongoose = require('mongoose');

// Save a reference to the Schema constructor
var Schema = mongoose.Schema;
 
var ImageSchema = new Schema({
    title: String,
    desc: String,
    img:
    {
        data: Buffer,
        contentType: String
    },
    filename: String
}, {
    // adding timestamps: created at and updated at
    timestamps: true
});

// This creates our model from the above schema, using mongoose's model method
var Image = mongoose.model("Image", ImageSchema);

 
//Image is a model which has a schema imageSchema
 
module.exports = Image;