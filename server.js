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
//middleware for user authentication if no cookies, redircted to login
app.use((req, res, next)=>{
  const login = req.cookies.login;
  if(req.path==='/login' || req.path==='/signup'){
    console.log("Login middleware will stop running here");
    next()
  }else if(login === 'TRUE'){
  next();
  }
  else{
    console.log("theres no login cookie");
    res.render("./login");}
    return;
});
//middleware to check if the user is the owner of group 
// const checkOwner = ((groupID)=>{
// const userID = req.cookies.ID;
// console.log(userID);
// const sqlQuery = `SELECT * FROM "Groups" WHERE "ID"=${groupID};`
// })

app.get('/', (req,res)=>{
  res.render("./login");
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
    const userID = results.rows[0].ID;
    res.cookie('login', 'TRUE');
    res.cookie('ID', `'${userID}'`);
    const data = results.rows[0];
    console.log(data);
    res.render("./userPage", {data});
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

app.get('/logout', (request, response) => {
  response.clearCookie('ID');
  response.clearCookie('login');
  response.redirect('/login')
})

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
  console.log(req.cookies.ID);
  const sqlQuery = `Select * FROM "Users" WHERE "ID"=${req.cookies.ID};`;
  pool.query(sqlQuery).then((results)=>{
    const data = results.rows[0];
    console.log(data);
res.render("./userPage", {data});
  }).catch((err)=>{
    if(err){
      console.log('You got an error' + err);
    }
  });
});

app.get('/edituser', (req,res)=>{
  const userID = req.cookies.ID;
  console.log(userID);
  const sqlQuery = `SELECT * FROM "Users" WHERE "ID"=${userID};`
  pool.query(sqlQuery).then((results)=>{
    const data = results.rows[0];
    console.log(data);
    res.render('./edituser', {data});
  }).catch((err)=>{
    if(err){
      console.log('YOu got an error' + err);
    }
  });
});

app.put('/edituser', (req,res)=>{
const data = req.body;
const userID = req.cookies.ID;
console.log(userID);
console.log(data);
const sqlQuery = `UPDATE "Users" SET "Name"='${data.name}', "Email"='${data.email}', "Phone_Number"='${data.phone}', "Introduction"='${data.introduction}' WHERE "ID"=${userID} ;`
pool.query(sqlQuery).then(()=>{
  const sqlQuery2 = `SELECT * FROM "Users" Where "ID"=${userID};`
  pool.query(sqlQuery2).then((results)=>{
  const data = results.rows[0];
  console.log(data);
  res.render('./userPage', {data});
})
}).catch((err)=>{
    if(err){
      console.log('You got an error' + err);
    }
  });
});

app.get('/createGroup', (req,res)=>{
  ///////////////take data and put into groups 
  res.render("./createGroup");
})

app.post('/createGroup', (req,res)=>{
  const data = req.body;
  const sqlQuery = `SELECT "ID","Name" FROM "Users" WHERE "Email"='${data.email}';`
  
  pool.query(sqlQuery).then((results)=>{
    console.log(results.rows);
    const sqlQuery2 =`INSERT INTO "Groups" ("Name", "Creator_ID", "Description") VALUES ('${data.name}', '${results.rows[0].ID}' ,'${data.introduction}') ;`
    pool.query(sqlQuery2);
  }).then(()=>{
    const sqlQuery3 = `SELECT * FROM "Groups"  ;`;
    pool.query(sqlQuery3).then((results)=>{
    const data= results.rows;
    res.render('./groups', {data});
    });
  }).catch((err)=>{
  if(err){
    console.log("You got an error: " + err);
  }
});
});

app.get('/groups', (req,res)=>{
  const sqlQuery = `SELECT * FROM "Groups"  ;`;

  pool.query(sqlQuery).then((results)=>{  
    const data = results.rows;
    console.log(data);
    res.render("./groups.ejs", {data});
  }).catch((err)=>{
      console.log("YOU got an " + err);
  });
});

app.get('/groups/:ID', (req,res)=>{
  const {ID} = req.params;
  const sqlQuery = `SELECT * FROM "Groups" WHERE "ID"=${Number(ID)};`
  pool.query(sqlQuery).then((results)=>{  
    const data = results.rows[0];
    console.log(data);
    res.render("./group.ejs", {data});
  }).catch((err)=>{
      console.log("YOU got an " + err);
  });
});

// make route to join group
app.get('/groups/:ID/join', (req,res)=>{
const groupID = req.params.ID;
const userID = req.cookies.ID;
console.log(groupID);
console.log(userID);
const sqlQuery = `INSERT INTO "Users_Groups" ("User_id", "Group_id") VALUES (${userID},${groupID});`;
pool.query(sqlQuery)
.then(()=>{
  const sqlQuery2 = `SELECT * FROM "Groups";`
    pool.query(sqlQuery2).then((results)=>{
      const data = results.rows;
      console.log(data);
      res.render('./groups', {data});
    })
}).catch((err)=>{
      console.log("YOU got an " + err);
  });
});
//render form to edit group/id/ details
app.get('/groups/:ID/edit', (req,res)=>{
  //Get the data from the users
  const groupID = req.params.ID;
  console.log(groupID);
  const sqlQuery = `SELECT * FROM "Groups" WHERE "ID"=${groupID} ;`
  pool.query(sqlQuery).then((results)=>{
    const data = results.rows[0];
    console.log(data);
    res.render("./editgroup", {data});
  }).catch((err)=>{
      console.log("YOU got an " + err);
  });
  });

app.put('/groups/:ID/edit', (req, res)=>{
  const data = req.body;
  // console.log(data);
  console.log(data);
  const sqlQuery = `UPDATE "Groups" SET "Name"='${data.name}', "Description"='${data.introduction}' WHERE "ID"=${data.groupid} ;`
  pool.query(sqlQuery).then(()=>{
    const sqlQuery2 = `SELECT * FROM "Groups" WHERE "ID"=${data.groupid};`;
    pool.query(sqlQuery2).then((results)=>{
      console.log(results.rows[0]);
      const data=results.rows[0];
      res.render(`./group`, {data});
    })
}).catch((err)=>{
    if(err){
      console.log("You got an error: " + err);
    }
  });
});

app.delete('/groups/:ID', (req,res)=>{
  const groupID = req.params.ID;
  console.log(groupID);
  const sqlQuery = `DELETE FROM "Groups" WHERE "ID"=${groupID};`
  pool.query(sqlQuery).then(()=>{
    const sqlQuery2 = `SELECT * FROM "Groups";`
    pool.query(sqlQuery2).then((results)=>{
      const data = results.rows;
      console.log(data);
      res.render('./groups', {data});
    })
  }).catch((err)=>{
      console.log("You got an " + err);
  });
});
app.get("/createListing", (req, res)=>{
  res.render("./createListing");
});

app.post("/createListing", (req,res)=>{
  const data = req.body;
  console.log(data.groupName);
  const sqlQuery = `SELECT "ID" FROM "Groups" WHERE "Name"='${data.groupName}';`
  pool.query(sqlQuery).then((results)=>{
    console.log(results.rows[0].ID);
    const sqlQuery2 = `INSERT INTO "Listings" ( "Date", "Location", "Time", "Description", "group_id", "name" ) VALUES ( '${data.date}', '${data.location}' ,'${data.time}',  '${data.details}', '${results.rows[0].ID}', '${data.name}') ;`
    pool.query(sqlQuery2);
  }).then(()=>{
    const sqlQuery3 = `SELECT * FROM "Listings";`;
    pool.query(sqlQuery3).then((results)=>{
      const data = results.rows;
      res.render('./listings', {data});
    })
  }).catch((err)=>{
  if(err){
    console.log("You got an error: " + err);
    return
  }
});
});

app.get("/listings", (req, res)=>{
  const sqlQuery = `SELECT * FROM "Listings"; `;
  pool.query(sqlQuery).then((results)=>{
    const data = results.rows;
    console.log(data);
    res.render("./listings", {data})
  })
})

app.get('/listings/:ID', (req,res)=>{
  const {ID} = req.params;
  const sqlQuery = `SELECT * FROM "Listings" WHERE "ID"=${Number(ID)};`
  pool.query(sqlQuery).then((results)=>{  
    const data = results.rows[0];
    console.log(data);
    res.render("./listing.ejs", {data});
  }).catch((err)=>{
      console.log("You got an " + err);
  });
});

app.get('/listings/:ID/edit', (req,res)=>{
  //Get the data from the users
  const listingID = req.params.ID;
  const sqlQuery = `SELECT * FROM "Listings" WHERE "ID"=${listingID} ;`
  pool.query(sqlQuery).then((results)=>{
    const data = results.rows[0];
    console.log(data);
    res.render("./editlisting", {data});
  }).catch((err)=>{
      console.log("You got an " + err);
  });
})

app.put('/listings/:ID/edit', (req,res)=>{
const data = req.body;
const sqlQuery = `UPDATE "Listings" SET "Date"='${data.date}', "Location"='${data.location}', "Time"='${data.time}', 
"Description" ='${data.details}', 
"name"='${data.name}' WHERE "ID"=${data.listingid} ;`
pool.query(sqlQuery).then(()=>{
  const sqlQuery2 = `SELECT * FROM "Listings" WHERE "ID"=${data.listingid};`;
    pool.query(sqlQuery2).then((results)=>{
      console.log(results.rows[0]);
      const data = results.rows[0];
      res.render(`./listing`, {data});
    }).catch((err)=>{
      console.log("You got an " + err);
  });
})
});

app.delete('/listings/:ID', (req,res)=>{
  const listingID = req.params.ID;
  console.log(listingID);
  const sqlQuery = `DELETE FROM "Listings" WHERE "ID"=${listingID};`
  pool.query(sqlQuery).then(()=>{
    const sqlQuery2 = `SELECT * FROM "Listings";`
    pool.query(sqlQuery2).then((results)=>{
      const data = results.rows;
      console.log(data);
      res.render('./listings', {data});
    })
  }).catch((err)=>{
      console.log("You got an " + err);
  });
});


app.get('/mygroups', (req,res)=>{
  const userID = req.cookies.ID;
  const sqlQuery = `SELECT "Group_id" FROM "Users_Groups" WHERE "User_id"=${userID};`
  const groupIDs = [];
  //change into a string 
  pool.query(sqlQuery).then((results)=>{
    const data = results.rows;
    data.forEach((element)=>{
    groupIDs.push(element.Group_id);
    console.log(groupIDs);
    })
  }).then(()=>{
      const queryString = groupIDs.toString();
      console.log(queryString);
      const sqlQuery2=`SELECT * FROM "Groups" WHERE "ID" IN (${queryString});`
      pool.query(sqlQuery2).then((results)=>{
        const data2 = results.rows;
        console.log(data2);
        res.render('./mygroups', {data2});
      });
    }).catch((err)=>{
      console.log("You got an " + err);
  });
})

app.listen(3005);


