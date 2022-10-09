const { clearCookie } = require("express/lib/response");
const express = require("express");
const { connectToDb, getDb } = require("./db");
require("dotenv").config();

//dummy account for bot

const email = process.env.EMAIL;
const password = process.env.PASSWORD;

//init app & middleware
const puppeteer = require("puppeteer");
const fse = require("fs-extra");

const app = express();
app.use(express.json()); //so express.json() let use take in json from the request and be able to use it here in our server IS A MIDLE WARE
const port = process.env.PORT || 3000;
//db connection
let db;
//here we use a callback from the db we created to see if we catch an error or not
connectToDb((err) => {
  if (!err) {
    app.listen(port, () => {
      console.log(`app listening on port ${port}`);
    });
    //if we did not get the erro so we get the db
    db = getDb();
  }
});

const getMaps = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: "./cache",
    args: ["--start-fullscreen"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");
  await client.send("Network.clearBrowserCache");
  await page.goto(`https://snazzymaps.com/my-maps`, {
    waitUntil: "networkidle2",
  });
  await page.waitForSelector("[type='email']");

  await page.type("[type='email']", email, { delay: 40 });
  setTimeout(() => {}, 3000);
  await page.type("[type='password']", password, { delay: 60 });
  setTimeout(() => {}, 5000);
  await page.click("[type='submit']");
  setTimeout(() => {}, 50000);

  await page.waitForSelector(".col-sm-6.col-md-4.container-preview");
  let { maps, links } = await page.evaluate(() => {
    let pageCount = document.querySelector(
      ".pagination.list-unstyled.text-center"
    ).children[
      document.querySelector(".pagination.list-unstyled.text-center").children
        .length - 2
    ].innerText;
    let links = [];
    for (let i = 2; i <= pageCount; i++) {
      let link = "https://snazzymaps.com/my-maps?page=" + i;
      links.push(link);
    }

    let items = document.querySelectorAll(
      ".col-sm-6.col-md-4.container-preview"
    );

    let maps = [];
    let nobody = {
      title: "",
      imageLink: "",
      link: "",
    };

    for (let i = 0; i < items.length; i++) {
      nobody.title =
        items[i].children[0].children[0].children[1].children[0].innerText;
      nobody.link = items[i].children[0].children[0].getAttribute("href");
      nobody.imageLink =
        items[i].children[0].children[0].children[0].children[0].getAttribute(
          "src"
        );

      maps = maps.concat(nobody);
      nobody = {
        title: "",
        imageLink: "",
        link: "",
      };
    }
    return { maps, links };
  });

  for (let j = 0; j < links.length; j++) {
    await page.goto(`${links[j]}`, {
      waitUntil: "networkidle2",
    });
    try {
      await page.waitForSelector(".col-sm-6.col-md-4.container-preview", {
        timeout: 1000,
      });
      let newMap = await page.evaluate(() => {
        let items;
        try {
          items = document.querySelectorAll(
            ".col-sm-6.col-md-4.container-preview"
          );
        } catch (err) {
          return;
        }
        let maps = [];
        let nobody = {
          title: "",
          imageLink: "",
          link: "",
        };

        for (let i = 0; i < items.length; i++) {
          nobody.title =
            items[i].children[0].children[0].children[1].children[0].innerText;
          nobody.link = items[i].children[0].children[0].getAttribute("href");
          nobody.imageLink =
            items[
              i
            ].children[0].children[0].children[0].children[0].getAttribute(
              "src"
            );

          maps = maps.concat(nobody);
          nobody = {
            title: "",
            imageLink: "",
            link: "",
          };
        }
        return maps;
      });
      maps = maps.concat(newMap);
    } catch {
      //this will triger when a page does not have any content
    }
  }
  return { maps };
  browser.close();
};
// getResponse();
//dondista
//dr_kapadia
app.get("/maps", (req, res) => {
  let maps = [];
  //db.books
  db.collection("snazzy")
    .find() //after we done with the command of the mongodb server than we have to use a curser to get the information and push it to a variable
    .forEach((user) => {
      maps.push(user);
    })
    .then(() => {
      res.status(200).json(maps);
    })
    .catch(() => {
      res.status(500).json({ error: "Could not fetch the documents" });
    });
});

app.get("/refresh", (req, res) => {
  getMaps()
    .then(({ maps }) => {
      maps.forEach((map) => {
        db.collection("snazzy")
          .findOne({ title: map.title })
          .then((is) => {
            if (is === null) {
              db.collection("snazzy").insertOne(map);
            }
          });
      });
    })
    .then(() => {
      res.status(200).json({ success: "database has been refresh" });
    })
    .catch(() => {
      res.status(500).json({ error: "Could not fetch the documents" });
    });
});
// .then(() => {
//   res.status(200).json({ testing: "test" });
// })
// .catch(() => {
//   res.status(500).json({ error: "Could not fetch the documents" });
// });
