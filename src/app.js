require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const hbs = require("hbs");
const methodOverride = require('method-override');
const path = require("path");
const port = process.env.PORT || 3000;
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");
const author = require("./middleware/author");
const poss = require("./middleware/poss");
require("./db/conn");

const Register = require("./models/user");
const Coursedata = require("./models/course");
const Blogdata = require("./models/blog")
const Contactuser = require("./models/contacts");

const static_path = path.join(__dirname, "../public");
const template_path = path.join(__dirname, "../templates/views");
const partial_path = path.join(__dirname, "../templates/partials");

const blogrouter = require("./routes/blogs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(static_path));
app.set("view engine", "hbs");
app.set("views", template_path);
hbs.registerPartials(partial_path);

app.get('/', author, (req, res) => {
    //res.render('index');
});


app.get('/secret', auth, async(req, res) => {

    const articles = await Coursedata.find();
    res.render("secret", { post: articles });
});

app.post('/secret', async(req, res) => {
    try {
        let cb = req.body.subjectName;
        let co = req.body.courseName;
        if (req.body.yesno == 1) {
            const act = await Coursedata.find({ subject: cb });
            if (act.length > 0) {
                res.render("listcourse", { post: act });
            } else {
                res.redirect('/secret');
            }
        } else if (req.body.yesno == 2) {
            const act = await Coursedata.find({ title: co });
            if (act.length > 0) {
                res.render("listcourse", { post: act });
            } else {
                res.redirect('/secret');
            }
        } else {
            res.redirect('/secret');
        }

    } catch (e) {
        res.status(400).redirect('/404error');
    }
})

app.get('/secret/:id', async(req, res) => {
    const co = await Coursedata.findById({ _id: req.params.id });
    if (co == null) res.redirect('/');
    else
        res.render("show", { post: co });
})


app.get('/courses', async(req, res) => {
    const articles = await Coursedata.findOne({ title: 'doctor' });
    console.log(articles);
    res.render('car', {
        post: articles
    });
})

//for inserting data into database

app.post('/courses', async(req, res) => {
    try {
        const addingMensRecords = new Coursedata(req.body);
        const insertMens = await addingMensRecords.save();
        res.status(201).send(insertMens);
    } catch (e) {
        res.status(400).redirect('/404error');

    }
})

app.get('/logout', auth, async(req, res) => {
    try {
        //delete token from datbase

        req.user.tokens = req.user.tokens.filter((currElement) => {
            return currElement.token !== req.token;
        })

        res.clearCookie("jwt");
        console.log('logout done');

        await req.user.save();
        res.redirect('/')
    } catch (error) {
        res.status(500).redirect("/");
    }
});

app.post('/register', async(req, res) => {
    try {
        const password = req.body.password;
        const cpassword = req.body.confirmpassword;
        if (password === cpassword) {
            const registerEmployee = new Register({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                password: req.body.password,
                confirmpassword: cpassword
            })

            const token = await registerEmployee.generateAuthToken();
            //cookies

            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 3000000),
                httpOnly: true
            });


            //password hashing bcryptjs
            const registered = await registerEmployee.save();
            const articles = await Coursedata.find({});
            res.status(201).redirect('/effect');

        } else {
            res.status(400).render("register", {
                post: " password are not matched"
            });
        }

    } catch (error) {
        res.status(400).render("register", {
            post: "Already have account"
        });
    }
})

app.get('/login', (req, res) => {
    res.render("login", { post: "" });
});
app.get('/register', (req, res) => {
    res.render('register', { post: "" });
});

//login check
app.post('/login', async(req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const useremail = await Register.findOne({ email: email });

        const isMatch = await bcrypt.compare(password, useremail.password);

        const token = await useremail.generateAuthToken();

        res.cookie("jwt", token, {
            expires: new Date(Date.now() + 3000000),
            httpOnly: true,
            //secure: true
        });



        if (isMatch) {
            const articles = await Coursedata.find({});
            res.status(201).redirect('/effect');
        } else {
            res.status(400).render("login", { post: "invalid credentials" });
        }

    } catch (error) {
        res.status(400).render("login", { post: 'Register first' });
    }
})

app.get('/')

app.get('/autocomplete/', function(req, res, next) {
    var regex = new RegExp(req.query["term"], "i");
    var employeeFilter = Coursedata.find({ title: regex }, { 'title': 1 }).sort({ "updated_at": -1 }).sort({ 'cretaed_at': -1 }).limit(20);
    employeeFilter.exec(function(err, data) {
        var result = [];
        if (!err) {
            if (data && data.length && data.length > 0) {
                data.forEach(user => {
                    let obj = {
                        id: user._id,
                        label: user.title
                    };
                    result.push(obj);
                })
            }
            if (result.length != 0) {
                res.jsonp(result);
            } else {
                let obj = {
                    id: 122,
                    label: 'no match found'
                }
                result.push(obj);
                res.jsonp(result);
            }
        };

    });

});

app.get('/autocomplete1/', function(req, res, next) {
    var regex = new RegExp(req.query["term"], "i");
    var employeeFilter = Coursedata.find({ subject: regex }).limit(20);
    var address = new RegExp(req.query.term, "i");
    employeeFilter.exec(function(err, data) {
        var result = [];
        if (!err) {
            if (data && data.length && data.length > 0) {
                data.forEach(user => {
                    var i = 1;
                    var a = user.subject;
                    a.forEach(user1 => {
                        if (address.test(user1)) {
                            let obj = {
                                id: i,
                                label: user1
                            };
                            result.push(obj);
                        }
                    })

                })
            }
            const uniqueAr = result.filter((thing, index) => {
                const _thing = JSON.stringify(thing);
                return index === result.findIndex(obj => {
                    return JSON.stringify(obj) === _thing;
                })
            })
            if (uniqueAr.length != 0) {
                res.jsonp(uniqueAr);
            } else {
                let obj = {
                    id: 122,
                    label: 'no match found'
                }
                uniqueAr.push(obj);
                res.jsonp(uniqueAr);
            }
        };

    });

});

app.get('/contact', async(req, res) => {
    try {
        res.render("contact");
    } catch (e) {
        res.status(400).redirect('/404error');
    }
})

app.post('/contact', poss, async(req, res) => {
    try {
        const review = new Contactuser({
            username: req.user.email,
            name: req.user.firstname,
            comment: req.body.comment
        })

        await review.save();
        res.redirect('/');
    } catch (e) {
        res.status(400).redirect('/404error');
    }
})

app.get('/404error', (req, res) => {
    res.render('404error');
})

app.get('/blog', async(req, res) => {
    try {
        const getMens = await Blogdata.find({}).sort({ createdAt: 'desc' });;
        res.render("blogarticles", { post: getMens })
    } catch (e) {
        res.status(400).redirect('/404error');
    }
})
app.get('/effect', async(req, res) => {
    res.render('effect');
})

app.use('/blog', blogrouter);
app.listen(port, () => {
    console.log('connection');
});