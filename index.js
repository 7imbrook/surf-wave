'use strict';

const jsdom      = require('jsdom'),
      tableToCsv = require('node-table-to-csv'),
      fs         = require('fs'),
      crypto     = require('crypto'),
      influx     = require('influx')
;

let client = influx({
  host: "192.168.99.100",
  username: "admin",
  password: "admin",
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
  .slice(1)
  .map( row => {
    return Array.from(row.cells).map( (i, idx) => {
      switch (idx) {
        case 0:
          return { time: (new Date(i.innerHTML)).getTime() };
        case 1:
          let value = parseInt(i.innerHTML[0]);
          console.log(typeof value)
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
  client.writePoints('test_series', data, (err, res) => {
    console.log(err, res);
  });
}
