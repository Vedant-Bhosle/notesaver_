require('dotenv').config()
const { urlencoded } = require('express');
const express = require('express');
const auth = require("./middleware/auth")
const cookieParser = require('cookie-parser')
const { reset } = require('nodemon');
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator')


const bcrypt = require('bcryptjs')
require('./db/conn')
const User = require('./models/registers')
const Note = require('./models/notes')
const port = process.env.PORT || 3000;

const app = express();



app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())


// app.use('/public', express.static('public'))
app.use(express.static(__dirname + "/public"));
// console.log(__dirname + '/public');

app.set("view engine", "hbs")

app.get("/", (req, res) => {
    res.render("index")
})
app.get("/About", (req, res) => {
    res.render("About")
})
app.get("/secret", auth, (req, res) => {
    // console.log(req.cookies.jwt)
    res.render("secret")
})
app.get("/logout", auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((elem) => {
            return elem.token !== req.token;
        })


        res.clearCookie("jwt")
        // console.log("Logout Succesfully");
        await req.user.save();
        res.render("login")
    } catch (err) {
        res.status(500).render("catcherror", { errormsg: "Something went wrong.Please refresh the site." })
    }

})

//login routs ///////////////////////////////////////////////////////////////////
app.get("/login", (req, res) => {
    res.render("login")
    // res.send("hello")
})
app.post("/login", async (req, res) => {
    try {

        const email = req.body.email;
        const password = req.body.password;
        const useremail = await User.findOne({ email: email })
        // hash check
        const isMatch = await bcrypt.compare(password, useremail.password)
        console.log(isMatch);
        const token = await useremail.generateAuthToken()
        res.cookie("jwt", token, {
            expires: new Date(Date.now() + 3600000),
            httpOnly: true
        })


        if (isMatch) {

            res.status(201).render("index")

        } else {
            res.render("login", {
                alert: "Invalid Credentials !"
            })
        }

    }
    catch (err) {
        res.render("login", {
            alert: "Invalid Credentials !"
        })
    }
})
///secret page



// registeration routs/////////////////////////////////////////////////////

app.get("/register", (req, res) => {
    res.render("register")
    // res.send("hello")
})
app.post("/register", [
    check("firstname", 'this must be 3+ character long').exists().isLength({ min: 3 }),
    check("lastname", 'this must be 3+ character long').exists().isLength({ min: 3 }),
    check("email", 'Enter a valid Email').exists().isEmail().normalizeEmail(),
    check("phone", 'Phone Number must have 10 digits').isLength({ min: 10 }),
    check("password", 'password is too short').exists().isLength({ min: 4 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const alerts = errors.array();
        res.render("register", { alerts })
    }
    else {

        try {
            const password = req.body.password;
            const cpassword = req.body.confirmpassword;
           


            if (password === cpassword) {
                const registerUser = new User({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email: req.body.email,
                    phone: req.body.phone,
                    password: req.body.password,
                    confirmpassword: req.body.confirmpassword
                })

                //create token
                const token = await registerUser.generateAuthToken()


                //cookie
                // res.cookie("jwt", token, {
                //     expiresIn: "1m",
                //     httpOnly: true
                // })

                ////



                const registered = await registerUser.save();
                // console.log("user saved succesfully");
                res.status(200).render("login", { msg: [{ message: "You Are Registered Succesfully" }] })
            }
            else {
                // res.send("passwords are not matching")
                res.render("catcherror", { errormsg: "Confirm password and password should be same." })

            }
        }
        catch (err) {
            res.status(500).render("catcherror", { errormsg: "Something went wrong,error during registeration.Please refresh the site." })

        }
    }

})

//NOtes routes/////////////////////////////////


app.get("/mynotes", auth, async (req, res) => {
    const notes = await Note.find({ user: req.user._id });
    const repos = notes.map((note) => ({
        title: note.title,
        description: note.description,
        id: note._id,
        user: note.user
    }));
    console.log(repos)
    res.render("mynotes", { notes: repos })
})
app.get("/createnote", auth, (req, res) => {
    res.render("Createnote", { display: "none" })
})
app.post("/createnote", auth, async (req, res) => {
    if (req.body._id == "") {
        try {
            const { title, description } = req.body;
            const note = new Note({ user: req.user._id, title, description })
            const savednote = await note.save();
            // console.log("ok");
            const alerts = [{ message: "Note is Successfully Saved." }]
            res.status(201).render("Createnote", { alerts: alerts })

        }
        catch (err) {
            res.status(500).render("catcherror", { errormsg: "Something went wrong,error during creating a note.Please refresh the site." })

        }
    }
    else {
        //for updating note
        try {
            const { title, description } = req.body;
            const newnote = {};
            if (title) { newnote.title = title; };
            if (description) { newnote.description = description; };


            let note = await Note.findById(req.body._id);
            if (!note) { res.send("note is not found") }

            if (note.user.toString() !== req.user._id.toString()) {
                res.status(500).render("catcherror", { errormsg: "YOU ARE NOT ALLOWED TO UPDATE THE NOTE." })

            }
            note = await Note.findByIdAndUpdate(req.body._id, { $set: newnote }, { new: true })
            const alerts = [{ message: "Note is Successfully updated." }]
            res.status(201).render("Createnote", {

                alerts: alerts
            })
        } catch (err) {
            res.status(500).render("catcherror", { errormsg: "Something went wrong,error during updating the note.Please refresh the site." })

        }

    }
})


// app.get("/getnote", auth, async (req, res) => {

//     const notes = await Note.find({ user: req.user._id });
//     res.json(notes);
// })

app.get("/delete/:id", auth, async (req, res) => {

    try {
        let note = await Note.findById(req.params.id);
        if (!note) {

            res.status(500).render("catcherror", { errormsg: "NOTE THAT YOU TRYING TO DELTE IS NOT EXIST." })

        }
        if (note.user.toString() !== req.user._id.toString()) {

            res.status(500).render("catcherror", { errormsg: "YOU ARE NOT ALLOWED TO DELETE THIS NOTE." })

        }
        await note.remove();

        res.redirect('back');
    }
    catch (err) {
        res.status(500).render("catcherror", { errormsg: "Something went wrong,error during deleting the note.Please refresh the site." })

        // console.log("error from delete side");
    }

})

app.get("/updatenote/:id", auth, async (req, res) => {

    let note = await Note.findById(req.params.id);
    if (note) {
        res.render("Createnote", { current_user: note })
    } else {
        res.status(500).render("catcherror", { errormsg: "THIS NOTE IS NOT EXIST" })

    }

})

//Error Route

app.get("*", (req, res) => {
    res.render("errorpage")
})
app.listen(port, () => {
    console.log("server running on port 5000");
})