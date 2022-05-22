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
  const sqlQuery = `Select * FROM "Users" WHERE "Email"='${req.body.email}';`;

  pool.query(sqlQuery).then((results)=>{
    if(hash===results.rows[0].Password){
    console.log("This is the right password");
    res.cookie('login', 'TRUE');
    const data = results.rows[0];
    console.log(data);
    res.render("./userPage", data);
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

  const sqlQuery = `INSERT INTO "Users" ("Name", "Email", "Password", "Phone_Number", "Introduction" ) VALUES ( '${data.name}', '${data.email}', '${hash}', '${data.phone}', '${data.introduction}');`

  console.log('hashed text');
  console.log(hash);
  pool.query(sqlQuery).then((results)=>{
    console.log(results);
    res.render("./login");
  }).catch((err)=>{
    console.log("You got an error" + err);
  })
})

app.get('/userPage', (req,res)=>{
  res.render("./userPage");
})

app.get('/createGroup', (req,res)=>{
  ///////////////take data and put into groups 
  res.render("./createGroup");
})

app.post('/createGroup', (req,res)=>{
  const data = req.body;
  const sqlQuery = `SELECT "ID","Name" FROM "Users" WHERE "Email"='${data.email}';`
  
  pool.query(sqlQuery).then((results)=>{
    console.log(results.rows[0].ID);
    const sqlQuery2 =`INSERT INTO "Groups" ("Name", "Creator_ID", "Description") VALUES ('${data.name}', '${results.rows[0].ID}' ,'${data.introduction}') ;`
    pool.query(sqlQuery2);
  }).catch((err)=>{
  if(err){
    console.log("YOu got an error: " + err);
  }
});
  res.send("data being sent to SQL")
});

app.get('/groups', (req,res)=>{
  const sqlQuery = `SELECT * FROM "Groups" ;`

  pool.query(sqlQuery).then((results)=>{  
    const data = results.rows;
    console.log(data);
    console.log(data[0].Name);
    res.render("./groups.ejs", {data});
  }).catch((err)=>{
      console.log("YOU got an " + err);
  });
});

app.get('/groups/:index', (req,res)=>{
  const sqlQuery = `SELECT * FROM "Groups" ;`
  const {index} = req.params;
  pool.query(sqlQuery).then((results)=>{  
    const data = results.rows[index];
    console.log(data);
    res.render("./group.ejs", {data});
  }).catch((err)=>{
      console.log("YOU got an " + err);
  });
});

app.get("/createListing", (req, res)=>{
  res.render("./createListing");
})

app.listen(3004);