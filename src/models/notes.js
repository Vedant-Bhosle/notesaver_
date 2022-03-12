
const mongoose = require('mongoose')
const { Schema } = mongoose;
const NotesSechema = new mongoose.Schema({



    user: {
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'user'
    },
    title: {
        type: String,
        required: true
    }
    ,
    description: {
        type: String,
        required: true
    },
    date: {
        type: String,
        default: Date.now
    }



})
const Note = new mongoose.model("Note", NotesSechema)
module.exports = Note;