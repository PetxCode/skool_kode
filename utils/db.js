const mongoose = require("mongoose");
const url =
	"mongodb+srv://schoolManagement:schoolManagement@cluster0.lzdw3.mongodb.net/schoolManagement?retryWrites=true&w=majority";

const urls = "mongodb://localhost/schoolManagementDB";

mongoose.connect(url).then(() => {
	console.log("database connected...");
});

module.exports = mongoose;
