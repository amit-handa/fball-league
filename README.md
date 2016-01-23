# League-Mgr

Server based on nodejs, koa(web framework), mongoose(ORM for mongo) supporting
* REST : client/server communication
* JWT : JsonWebToken for admin authentication

## Live Example on *localhost:9995*

## Specs
* Public APIs: Expose Public APIs to get the following info
+ List of upcoming games
  curl -i "http://localhost:9995/v1/league/5697d05d920eb16b4f2bc4f3/games?gametime=n"
+ List of past games
  curl -i "http://localhost:9995/v1/league/5697d05d920eb16b4f2bc4f3/games?gametime=p"
+ List of Teams
  curl -i "http://localhost:9995/v1/league/5697d05d920eb16b4f2bc4f3/teams"
+ Team Info
  curl -i "http://localhost:9995/v1/team/5697d05e920eb16b4f2bc503"

added
+ list of leagues : /v1/league?season=<year>
  - by default, current season is assumed
  curl -i "http://localhost:9995/v1/league?season=2015"

* Admin APIs: Expose Admin APIs to get the following info

Please refer to the 'Testing' section for admin operations
+ Create/Update/Delete Tournament : /v1/league CRUD
  - cascade delete games, teams if league is deleted

+ Create/Update/Delete Games  : /v1/league/<league-id>/game, /v1/game/<game-id> CRUD
  - check for league id validity during creation/updation
  - check for team league equality with game league validity during creation/updation
  - delete teamname updation through game updation

+ Create/Update/Delete Teams  : /v1/league/<league-id>/team, /v1/team/<team-id> CRUD
  - check for league id validity during creation/updation
  - update team name in game docs during team updation
  - delete games if team is deleted

* populate league info
+ Build a simple Server Side Batch Job to Read and populate Barclays Premier League or any other league tournament info feel free to use any available public data, or perform web scraping
```
#  using data from http://www.football-data.co.uk/englandm.php
#  football-data.org : X-Auth-Token: 75e849c09ea84724a4f30043b52e08e2
./script/insertLeague.js -y 2015  
```

TODO : automated testing

## Running
### server
```bash
# edit server/config/config.js
node app.js
```

## Testing

For PUT, DELETE, POST operations, admin user signin header need to be supplied. as follows:
```
-H 'authorization: bearer <auth-jwt>'
```

For the same, an admin user needs to be created, as follows:
```
curl -i http://localhost:9995/v1/signup?pin=92111 -X POST -H 'content-type:application/json' -d '{ "name" : "admin", "password" : "fl@123", "phone" : "9711993235", "roles" : ["admin"] }'
```

Once created, authorization response header can be received by signing into the server, as follows:
```
curl -i http://localhost:9995/v1/signin -X POST -H 'content-type:application/json' -d '{ "userId" : "9711993235", "password" : "fl@123" }'
```

### League
* get
```
curl -i http://localhost:9995/v1/league?season=2016
```

* create
```
curl -i http://localhost:9995/v1/league -X POST -H 'content-type:application/json' -d '{ "name" : "Barclays Premier League 2016", "league" : "BPL", "season" : 2016}'
```

* update
```
curl -i http://localhost:9995/v1/league/<league-id> -X PUT -H 'content-type:application/json' -d '{ "name" : "Barclays Premier League 2016" }'
```

* delete
```
curl -i http://localhost:9995/v1/league/<league-id> -X DELETE
```

### Team
* get
```
curl -i http://localhost:9995/v1/league/<league-id>/teams
```

* create
```
curl -i http://localhost:9995/v1/league/56974bb4cf59f89b231aebc7/team -X POST -H 'content-type:application/json' -d '{ "name" : "Manchester United", "nickName" : "ManU", "site" : "http://www.manu.com" }'
```

* update
```
curl -i http://localhost:9995/v1/team/<team-id> -X PUT -H 'content-type:application/json' -d '{ "nickName" : "MANU" }'
```

* delete
```
curl -i http://localhost:9995/v1/team/56969dfd5224d439173c5f7a -X DELETE
```

### Game
* get
```
curl -i http://localhost:9995/v1/league/<league-id>/games
curl -i http://localhost:9995/v1/league/<league-id>/games?gametime=p|n&gamedate=<date>
gametime
p => past
n => upcoming

gamedate
greater/less than the date (depending on <gametime>)
  games are order by date descending
```

* create
```
curl -i http://localhost:9995/v1/league/56974bb4cf59f89b231aebc7/game -X POST -H 'content-type:application/json' -d '{ "date" : "2016/01/16 20:00:00", "homeTeamId" : "569753bda6b8385c27bc45ed", "awayTeamId" : "569756afd378653f286d5fde" }'
```

* update
```
curl -i http://localhost:9995/v1/game/<game-id> -X PUT -H 'content-type:application/json' -d '{ "date" : "2016/02/17" }'
```

* delete
```
curl -i http://localhost:9995/v1/game/<game-id> -X DELETE
```

### User
* Add a user

```
curl -i http://localhost:9995/v1/signup?pin=92111 -X POST -H 'content-type:application/json' -d '{ "name" : "admin", "password" : "fl@123", "phone" : "9711993235", "roles" : ["admin"] }'
```

* sign in using the created user

```
curl -i http://localhost:9995/v1/signin -d '{ "userId" : "9711993235", "password" : "fl@123" }' -X POST -H 'Content-Type:application/json'
```

* signout
```
curl -i http://localhost:9995/v1/signout  (secured)
```

* Update a user. In url provide Object id of user as returned in response by server while user creation.

```
curl -i http://localhost:9995/v1/user?pin=92111 -d '{ "password" : "ah@123" }' -X PUT -H 'content-type: application/json'
```

* Delete a user. In url provide object id of user as returned in response by server while user creation.

```
curl -i http://localhost:9995/v1/user -X DELETE
curl -i http://localhost:9995/v1/user/<userid> -X DELETE
```

## Debug the server
launch it as follows:
```bash
node-debug app.js
```

## batch job to populate league data
*populate barclays data*

```bash
node scripts/insertBPL.js
```

## Code layout

### config
./server/config/config.js

### middleware config
./server/config/koa.js

### Data models
refer ./fl-common/models

### controllers
refer ./server/controllers

## Credits
Server side simply utilizes generally accepted Koa middleware and Node.js best practices.

## The Name
The project name is League Mgr

## License
Copyright, Amit Handa
