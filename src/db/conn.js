const mongoose = require('mongoose')
const mongoURI = process.env.MOGOURI;


//this is local database after test we have to add atlas
mongoose.connect(mongoURI).then(() => {
    console.log("Database connectio is succesful");
}).catch((e) => {
    console.log("NO connection");
})
