'use strict';

const jsdom      = require('jsdom'),
      influx     = require('influx')
;

let client = influx({
  host: process.env.IN_HOST || "192.168.99.100",
  username: process.env.IN_USER,
  password: process.env.IN_PASS,
  database: "modem"
});

const PREFIX = 'http://192.168.100.1';
const ENDPOINTS_TO_PULL = {
  // '/indexData.htm',
  '/cmLogsData.htm' : scrapeLogData,
  // '/cmAddressData.htm',
  // '/cmSignalData.htm'
};

Object.keys(ENDPOINTS_TO_PULL).forEach( ep => {
  jsdom.env(PREFIX + ep,
    (err, window) => {
      const section = window.document.getElementsByTagName('table');
      for (const table of section) {
        ENDPOINTS_TO_PULL[ep](table)
      }
    }
  );
});

function scrapeLogData(table) {
  let data = Array.from(table.rows)
  .slice(1) // Removes table headers
  .map( row => {
    return Array.from(row.cells).map( (i, idx) => {
      switch (idx) {
        case 0:
          return { time: (new Date(i.innerHTML)).getTime() };
        case 1:
          let value = parseInt(i.innerHTML[0]);
          return { status: i.innerHTML, code: value };
        case 3:
          return { message: i.innerHTML };
        default:
          return;
      }
    })
    .reduce( (acc, curr) => {
      if (curr) {
        Object.keys(curr).forEach( key => acc[0][key] = curr[key] );
      }
      return acc;
    }, [{}]);
  });
  console.log(data);
  client.writePoints('logs', data, (err, res) => {
    console.log(err, res);
  });
}
