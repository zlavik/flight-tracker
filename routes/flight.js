var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
const catchError = require("../lib/catch-error");
const { validationResult } = require("express-validator");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require("../lib/config");

const appId = config.APP_ID;
const appKey = config.APP_KEY;

const flightStatusUrl = "https://api.flightstats.com/flex/flightstatus/rest/";
const airportDataUrl = 'https://api.flightstats.com/flex/airports/rest';
const airlineDataUrl = "https://api.flightstats.com/flex/airlines/rest/"
const airplaneDataUrl = "https://api.flightstats.com/flex/equipment/rest/"


router.get('/', function(req, res, next) {
  res.redirect("/");
});

async function getAirportData(iataCode) {
  let airportQueryParams = `/v1/json/iata/${iataCode}?appId=${appId}&appKey=${appKey}`;
  const getData = await fetch(airportDataUrl+airportQueryParams);
  const data = await getData.json();
  return data;
}

async function getAirlineData(iataCode) {
  let airlineQueryParams = `v1/json/fs/${iataCode}?appId=${appId}&appKey=${appKey}`
  const getData = await fetch(airlineDataUrl+airlineQueryParams);
  const data = await getData.json();
  return data.airline.name
}

async function getAirplaneInfo(iataCode) {
  let airplaneQueryParams = `v1/json/iata/${iataCode}?appId=${appId}&appKey=${appKey}`;
  const getData = await fetch(airplaneDataUrl+airplaneQueryParams);
  const data = await getData.json();
  return data.equipment[0];
}

router.post('/',
  catchError(async (req, res) => {
    let errors = validationResult(req);
    // let flightNumber = req.body.flightNumber;
    let departureDate = new Date(req.body.departureDate);
    const origin = req.body.origin;
    const destination = req.body.destination;
    const year = departureDate.getFullYear();
    const month = departureDate.getMonth() + 1;
    const day = departureDate.getDate();

    let routeQueryParams = `v2/json/route/status/${origin}/${destination}/dep/` + 
                  `${year}/${month}/${day}?appId=${appId}&appKey=${appKey}&hourOfDay=0&utc=false&numHours=24&maxFlights=5`;
    const getRouteData = await fetch(flightStatusUrl+routeQueryParams);
    const routeData = await getRouteData.json();

    let originAirportData = await getAirportData(origin, appId, appKey);
    let destinationAirportData = await getAirportData(destination, appId, appKey);

    

    let flightStatuses = routeData.flightStatuses;
    routeData.originLocationName = `${originAirportData.airports[0].city}, ${originAirportData.airports[0].stateCode} `;
    routeData.destinationLocationName = `${destinationAirportData.airports[0].city}, ${destinationAirportData.airports[0].stateCode} `;
    routeData.origin = origin;
    routeData.destination = destination;


   
    for (let idx = 0; idx < flightStatuses.length; idx++) {
      let flight = flightStatuses[idx];
      flight.airline = await getAirlineData(flight.carrierFsCode);
      flight.airplaneInfo = await getAirplaneInfo(flight.flightEquipment.scheduledEquipmentIataCode);

      switch (flight.status) {
        case 'S':
          flight.status = 'Scheduled';
          break;
        case 'A':
          flight.status = 'Active';
          break;
        case 'R':
          flight.status = 'Redirected';
          break;
        case 'L':
          flight.status = 'Landed';
          break;
        case 'D':
          flight.status = 'Diverted';
          break;
        case 'C':
          flight.status = 'Cancelled';
          break;
        default:
          flight.status = 'Unkown'
      }
    }


    if (errors.isEmpty() && !routeData.error) {
      res.render('flight', { 
        flights : flightStatuses,
        routeData,
      });
    } else {
      console.log(routeData.error.errorMessage)
      res.redirect("/");
    }
  })
)

module.exports = router;