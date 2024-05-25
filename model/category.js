const mongoose = require("mongoose"); // Corrected require statement

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
    },
    description: { // Corrected typo here
        type: String,
    },
    isVisible: { // Changed property name to camelCase
        type: Boolean,
        default: false,
    }
});

const categoryCollection = mongoose.model("category", categorySchema);
module.exports = categoryCollection;
