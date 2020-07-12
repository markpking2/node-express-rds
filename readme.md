# Deploying a Node.js Express API onto AWS Elastic Beanstalk with RDS

In this guide I am going to show you how to create a simple API with a database using Node.js and Express.  It will use SQLite for development, and PostgreSQL  for production with RDS (Amazon Relational Database Service ) on AWS Elastic Beanstalk.

Everything we will be doing in this guide is covered under the AWS free tier.

## Step One: Generating a sample Node.js application environment

First let's create an Elastic Beanstalk application. Log in to the AWS console. 

Go to **Services** > **Elastic Beanstalk**.

On the left side, click **Applications** > **Create a new application**. Name your application whatever you want. I'll call mine **node-express-rds**. You can leave the description and other options empty. Click **create**.

Back in the Elastic Beanstalk dashboard with your new application selected, click **Create a new environment**. Select **Web server environment** then continue. We'll keep the default environment name and generated domain. Under **Platform**, we'll be using a **Managed platform**. 

Select **Node.js** for the **platform**, and **Node.js 12** for the **platform branch**. We'll use the recommended **platform version**. For application code, select **sample application**. Finally click **create environment**.

It will take a few minutes for the environment to be created.  Once it is finished, select your environment and on the right click **Go to environment**. Yay! Your sample application is deployed on AWS. Now we need to start writing some code.

## Step Two:  Create starter code repo and setup AWS CodePipeline with GitHub

Let's start creating our API. Create an empty directory then in your terminal, `git init` and `npm init -y` to generate a **package.json** file.

`npx gitignore node` to generate a **.gitignore** file.

Create an empty repository on GitHub, copy the repository URL, then in the directory of your project: `git remote add origin <YOUR REPOSITORY URL>`.

Now we'll install the dependencies. In your terminal in the root directory of the project, `npm i express cors knex knex-cleaner pg`

Install sqlite3 and nodemon dev dependencies.  `npm i -D sqlite3 nodemon` 

**nodemon** makes development easier by automatically restarting your application when any file changes are detected.

Create a file **app.js** in the root directory.

In **app.js** we'll initiate our Express server with the following:

```javascript
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("<h1>Hello from Express!</h1>");
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
```

Now lets modify the scripts in **package.json** by adding the following:

```json
"scripts": {
        "start": "node app.js",
        "dev": "nodemon app.js",
        "test": "echo \"Error: no test specified\" && exit 1"
},
```

We can start our application with `npm run dev`. Enter `localhost:5000` in your browser to test out the server.

Next, create a file called **Profile** with the following command to tell Elastic Beanstalk how to start our application:

```
web: npm start
```

Lets make a commit and push our app to GitHub. Then we'll set up a CodePipeline on AWS to automatically deploy our app whenever we make changes to its master branch.

`git add .` 	`git commit -m "init express app"	` 	`git push origin master`

Back in our AWS console, go to **Services** > **CodePipeline** > **Create pipeline**. I'll call mine **node-express-rds-pipeline** but you can name it anything. Select **New service role** and click **Next**.

Select **GitHub** as the source provider. Then click **Connect to GitHub**, and authorize your GitHub account. Search for the **repository** you just pushed to GitHub, and select **master** for the branch.

Select **Github webhooks** under **change detection options**. Click **Next** and **Skip build stage** > **Skip**. Select **AWS Elastic Beanstalk** for the deploy provider. 

Make sure the region is the one you created your application in, and select your **application** and the **environment** for your application.  ![Deploy provider](https://res.cloudinary.com/markpkng/image/upload/v1594582011/deploy_hmzm2a.png)

Also if you are ever looking for an application/service you created on AWS and can't find it, always check that you are in the correct region, otherwise the application you're looking for won't be there. You can see your current region at the top right of the AWS console.



Click **Next** > **Create pipeline**. You should now see your application start being deployed to AWS!

Once your application shows **Succeeded** under **Source** and **Deploy**, navigate back to **Elastic Beanstalk** > **Environments** and select the environment for your application. Click on the link at the top to check and see your deployed app on AWS!

![deployed app](https://res.cloudinary.com/markpkng/image/upload/v1594582011/deployed_app_yitsae.png)



## Step Three:  Add an RDS database to our application and set up Knex and an endpoint to get data from our API.

Now lets setup a PostgreSQL database on **RDS** to use for our application.

Back in the environment for your application, on the left click **Configuration**. Look for **Database** at the bottom and click **Edit**. Under **Database Settings** select  **PostgreSQL** for the **Engine**. We'll use **Engine version** **11.6**. For the **Instance class** select **db.t2.micro**. We'll leave the size at **5GB**.

Enter a **username** and **password** for your database.  For this guide I'll use `dbuser` for the **username** and `dbpassword` for the **password** but you can set your credentials to anything. Click **Apply** to create the RDS instance.

Now let's dive back into some code and set up our server to connect to a database! 

As you may have noticed earlier when we installed our dependencies, we'll be using a query builder called [Knex.js](http://knexjs.org/) to connect our API to our database.

In the root of our project folder, create a file called **knexfile.js** where we'll specify the following database configurations:

```javascript
module.exports = {
    development: {
        client: "sqlite3",
        useNullAsDefault: true,
        connection: {
            filename: "./data/dev.sqlite3",
        },
        pool: {
            afterCreate: (conn, done) => {
                conn.run("PRAGMA foreign_keys = ON", done);
            },
        },
        migrations: {
            directory: "./data/migrations",
        },
        seeds: {
            directory: "./data/seeds",
        },
    },

    production: {
        client: "pg",
        connection: {
            host: process.env.RDS_HOSTNAME,
            user: process.env.RDS_USERNAME,
            password: process.env.RDS_PASSWORD,
            database: process.env.RDS_DB_NAME,
        },
        migrations: {
            directory: "./data/migrations",
        },
        seeds: {
            directory: "./data/seeds",
        },
    },
};
```

As you can see we're using SQLite for development and PostgreSQL for our deployment.  When deployed, Elastic Beanstalk will automatically inject the necessary database environment variables for PostgreSQL.

Next, create a folder called **data**, and inside it create a file **dbConfig.js** with the following:

```javascript
const knex = require("knex");
const config = require("../knexfile.js");
const dbEnv = process.env.DB_ENV || "development";

module.exports = knex(config[dbEnv]);
```

In this file we are configuring Knex to use the right database based on our environment variables, which we'll configure later on AWS. Without them, development is the default configuration.

Now we'll create a table for our SQL database using the Knex CLI.  For the sake of this guide we'll use dogs 🐕  to store in our database. You can install the Knex CLI (Command Line Interface) in NPM globally with `npm i knex -g` .  You can also use it without installing with `npx` e.g. `npx knex migrate:make dogs`.  **npx** is an npm package runner that runs the latest version of a package without having to install it. If you plan on using a package frequently, using an installed version will save time over using npx.

Create a SQL table migration for the dogs with `knex migrate:make dogs`.  This will create a **migrations** folder in the **data** directory we created earlier.  Inside the file that was generated we'll define the schema for our dogs table with the following:

```javascript
exports.up = function (knex) {
    return knex.schema.createTable("dogs", (tbl) => {
        tbl.increments();
        tbl.varchar("name", 255).notNullable();
        tbl.varchar("breed").notNullable();
        tbl.integer("age").notNullable();
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists("dogs");
};
```

`.increments()` defines an auto-generating primary key. Each dog will have a name, breed, and age.

Run `knex migrate:latest` to generate the dogs table in our database.  The `exports.down` function tells Knex how to reverse the changes to our database whenever we run `knex migrate:rollback`.

After running `knex migrate:latest` you'll notice Knex created a dev.sqlite3 file in our data folder.

Add `*.sqlite3` to the end of your **.gitignore** file so the development database is not pushed to GitHub.

Lets add some seed data so our database isn't empty! In your terminal run `knex seed:make 01-dogs`. Knex will generate a new directory called **seeds** in our data folder.  Inside **00-cleaner.js** update it to contain the following:

```javascript
const cleaner = require('knex-cleaner');

exports.seed = function(knex) {
  return cleaner.clean(knex, {
    mode: 'truncate',
    ignoreTables: ['knex_migrations', 'knex_migrations_lock']
  });
};
```

**knex-cleaner** is a helper library that makes reseeding/cleaning our database easier. Knex will ignore our migrations tables and remove other tables in their correct order.

Run `knex seed:make 01-dogs` and update **01-dogs.js** with the following:

```javascript
exports.seed = function (knex) {
    return knex("dogs").insert([
        { name: "Meleez", breed: "Australian Shepherd", age: 6 },
        { name: "York", breed: "Australian Shepherd", age: 2 },
        { name: "Lilo", breed: "Australian Shepherd", age: 4 },
        { name: "Bear", breed: "Wheaton Terrier", age: 12 },
    ]);
};
```

We can now run `knex seed:run` to seed our database with the dogs in our seed file.  Whenever we want to reset the values in our database, we can run `knex migrate:rollback` to empty all our tables. Then `knex migrate:latest` to re-create them, and finally `knex seed:run` to re-populate our tables with the seed data.

Now that our development database has some data in it, let's finally create a simple endpoint to interact with our API.

In the root directory, create a new folder called **routers** with a file inside called **dogsRouter.js**. Update it with the following:

```javascript
const router = require("express").Router();
const db = require("../data/dbConfig");

router.get("/", async (req, res) => {
    try {
        const dogs = await db("dogs");
        if (dogs.length) {
            res.status(200).json({ dogs });
        } else {
            const err = new Error("There are no dogs in the database.");
            err.status = 404;
            throw err;
        }
    } catch (err) {
        if (err.status) {
            res.status(err.status).json({ message: err.message });
        } else {
            res.status(500).json({
                message: "Error retrieving dogs from database.",
            });
        }
    }
});

module.exports = router;

```

Here we created an endpoint to retrieve all the dogs in our database. Now lets tell our app to use our dogs router.

At the top of **app.js**, import our dogs router.

```javascript
const express = require("express");
const cors = require("cors");

const dogsRouter = require("./routers/dogsRouter");

/*code omitted..*/
```

Now let's tell our app to use our router with the `/dogs` route.

```javascript
/*code omitted..*/

app.use(cors());
app.use(express.json());

app.use("/dogs", dogsRouter);

/*code omitted..*/
```

If you run your server now, you can send a GET request to `localhost:5000/dogs` and you should get a response containing the dogs we added into our database. You can also open up `http://localhost:5000/dogs` in your browser to see the result.

Two of my favorite tools for easily sending requests to APIs are [Insomnia](https://insomnia.rest/) and [Postman](https://www.postman.com/product/api-client/).

Before we deploy our updated app, go back to the Elastic Beanstalk dashboard and select your application's environment.  On the left click **Configuration** > **Software** > **Edit**. At the bottom under **Environment properties**, add the following key : value pairs:

```
NODE_ENV : production
DB_ENV : production
```

Click **Apply** to save the environment variables configuration.

After the environment is finished updating, make a commit and push the updates to GitHub. Since our CodePipeline is set up, our application will automatically re-deploy.

Once the server is deployed, we need to SSH (Secure Shell; used to securely connect to another computer) into our instance to run the DB migrations.

Go to the AWS console, then under **Services** > **EC2** > **Running instances**. Click on your running server instance. 

Below in the description you'll need the **Public DNS (IPv4)** address if you want to SSH from your own terminal.  You'll also need a private key (.pem) file.  You can read more about how SSH into an EC2 instance [here](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstancesLinux.html).

An easier way is to right click your instance and click **Connect** > **EC2 Instance Connect** > **Connect**.

![connect to ec2 instance](https://res.cloudinary.com/markpkng/image/upload/v1594582011/connect_wkkhjn.png)

Either way you choose to SSH into your instance, eventually you will get something like this:

![ec2 ssh](https://res.cloudinary.com/markpkng/image/upload/v1594582011/ssh_ozbyjs.png)

Once you're in, type `cd ../../opt/elasticbeanstalk/deployment` 

In this directory is an **env** file with the key : value pairs that AWS loads into our server. We will need to export these values so we can use them in the terminal.

You can view the values by typing `cat env`

![env variables](https://res.cloudinary.com/markpkng/image/upload/v1594582011/env_ppia89.png)

Export these variables so we can use them by typing `export $(grep -v '^#' env | xargs)`

Now, cd into the directory of our deployed application by typing:

`cd ~`

`cd ../../var/app/current`

For each Knex command we want to run, we need to prefix our command with the variables we exported earlier. Run the following commands to migrate our database and insert seeds:

`sudo RDS_DB_NAME=${RDS_DB_NAME} RDS_HOSTNAME=${RDS_HOSTNAME} RDS_USERNAME=${RDS_USERNAME}  RDS_PASSWORD=${RDS_PASSWORD} npx knex migrate:latest --env production`

`sudo RDS_DB_NAME=${RDS_DB_NAME} RDS_HOSTNAME=${RDS_HOSTNAME} RDS_USERNAME=${RDS_USERNAME}  RDS_PASSWORD=${RDS_PASSWORD} npx knex seed:run --env production`

Now we are finished! You can use your Elastic Beanstalk application's URL or the EC2's public IP address to test our your application.

![insomnia](https://res.cloudinary.com/markpkng/image/upload/v1594582011/insomnia_nwykaq.png)

