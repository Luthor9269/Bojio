import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import jsSHA from 'jssha';
import cookieParser from 'cookie-parser';


const { Pool } = pg;
const app = express();

const pgConnectionConfigs = {
  user: 'luthor',
  password: 'luthor',
  host: 'localhost',
  database: 'bojio',
  port: 5432, // Postgres server always runs on this port
};

const pool = new Pool(pgConnectionConfigs);

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride('_method'));
//create a key in req.cookies for every cookie inside the req
app.use(cookieParser());

app.get('/', (req,res)=>{
  console.log(req.cookies);
  if(req.cookies.login==="TRUE"){
  res.render("./userPage");
  }
})

app.get('/login', (req,res)=>{
 res.render('./login');
})

app.post('/login', (req,res)=>{
  //getting and hashing the password
  const password = req.body.password;

  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(password);
  const hash = shaObj.getHash('HEX');
  console.log("hash from req: " + hash);
  console.log("Email from req is : "+ req.body.email);
  const sqlQuery = `Select "password" FROM "Users" WHERE "email"='${req.body.email}';`

  pool.query(sqlQuery).then((results)=>{
    if(hash===results.rows[0].password){
    console.log("This is the right password");
    res.cookie('login', 'TRUE');
    const email = req.body.email;
    res.render("./userPage", email);
    //access the cookies
    }else{
    console.log("Please key in the right password")
    res.render("./signup");
    return;
    }
    }).catch((err)=>{
    console.log("You got an error: "  + err)
  })
});

app.get('/signup', (req,res)=>{
  res.render('./signup');
})

app.post('/signup', (req,res)=>{
  //make the logic to store the data in the database
  const data = req.body;
  // hasshing password
  const password = data.password;
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  shaObj.update(password);
  const hash = shaObj.getHash('HEX');

  const sqlQuery = `INSERT INTO "Users" ("name", "email", "password", "phone_number", "introduction" ) VALUES ( '${data.name}', '${data.email}', '${hash}', '${data.phone}', '${data.introduction}');`

  console.log('hashed text');
  console.log(hash);
  pool.query(sqlQuery).then((results)=>{
    console.log(results);
    res.send(results);
  }).catch((err)=>{
    console.log("You got an error" + err);
  })
})

app.get('/userPage', (req,res)=>{
  res.render("./userPage");
})

app.get('/groups', (req,res)=>{
  res.send("this is the group");
})

app.listen(3004);