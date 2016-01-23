# Instructions

* untar the tarball
* cd <untarred-directory>
* install deps
```
npm install
```

* configure the mongodb url in ./server/config/config.js
```
#start server
node app
```

* create admin user :
```
curl -i http://localhost:9995/v1/signup?pin=92111 -X POST -H 'content-type:application/json' -d '{ "name" : "admin", "password" : "fl@123", "phone" : "9711993235", "roles" : ["admin"] }'
# in response header, you shall receive an 'authorization' header. use it to perform admin operations
# please dont change this data, we are using it in the batch script to do admin ops with the server
```

* start batch script to populate Barclays Premier League data (sourced from football-data.org apis):
```
./scripts/insertLeague.js -y 2015
```

* refer to README.md and execute the public APIs operations detailed there.
+ list of leagues : /v1/league?season=<year>
  - by default, current season is assumed
  curl -i "http://localhost:9995/v1/league?season=2015"
+ List of upcoming games
  curl -i "http://localhost:9995/v1/league/5697d05d920eb16b4f2bc4f3/games?gametime=n"
+ List of past games
  curl -i "http://localhost:9995/v1/league/5697d05d920eb16b4f2bc4f3/games?gametime=p"
+ List of Teams
  curl -i "http://localhost:9995/v1/league/5697d05d920eb16b4f2bc4f3/teams"
+ Team Info
  curl -i "http://localhost:9995/v1/team/5697d05e920eb16b4f2bc503"

* Also, CRUD operations for league, team, game are listed there. kindly refer to the same.


For any issue, please email me at : amit.handa@gmail.com
