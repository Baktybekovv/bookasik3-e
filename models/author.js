const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the AuthorSchema
const AuthorSchema = new Schema({
    // Assuming authors have a first and last name, adjust according to your needs
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    }
    // Add other fields as needed
});

// Create the Author model using the schema
const Author = mongoose.model('Author', AuthorSchema);

// Assuming RequestHistory is defined correctly in the same file or elsewhere
const RequestHistorySchema = new mongoose.Schema({
    searchQuery: String,
    timestamp: { type: Date, default: Date.now }
});
const RequestHistory = mongoose.model('RequestHistory', RequestHistorySchema);

module.exports = { Author, RequestHistory };
