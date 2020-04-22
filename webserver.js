var http = require('http').createServer(handler); //require http server, and create server with function handler()
var fs = require('fs'); //require filesystem module
var io = require('socket.io')(http) //require socket.io module and pass the http object (server)
var socketsList = [];

var players = [{id:"player1", nextCardIndex:0, socket:null},{id:"player2", nextCardIndex:1, socket:null}];

// Callback function to compare an object using its .socket.id attribute
function compareSocketId(obj){
	if(obj.socket){
		if(typeof obj.socket === 'object'){
			return obj.socket.id == this;
		}
		else{return false;}
	}
	else{return false;}
}
// Callback function to compare an object using its id attribute
function compareId(obj){
	return obj.id == this;
}
// Callback function to compare an object using its name attribute
function compareName(obj){
	return obj.name == this;
}

var cardArray;
fs.readFile(__dirname + '/data/solarSystemStats.json', function(err, data) { //read json stats file
	if (err) {
		console.log("unable to read stats file");
	}
	else {
		cardArray = JSON.parse(data);
		cardArray.forEach(function (value, index, array){
			value.player = null;
			value.sortRnd = Math.random();
		});
		cardArray.sort(function (a, b) {
			return a.sortRnd - b.sortRnd;
		});
		cardArray.forEach(function (value, index, array){
			value.player = "player" + ((index % 2) + 1);	// Modulus + 1 deals out cards to players. Change "2" to any number of players and it still works.
		});
		console.log("Loaded stats file, first entry:");
		console.log(JSON.stringify(cardArray[0]));
	}
});
  
function nextCard (player) {
	var breakCounter = 0;
	var retval = cardArray[player.nextCardIndex];
	do{
		player.nextCardIndex++;
		if(player.nextCardIndex >= cardArray.length){
			player.nextCardIndex = 0;
		}
		breakCounter++;
	}
	while ((cardArray[player.nextCardIndex].player != player.id) && (breakCounter < cardArray.length));
	return retval;
}

http.listen(8080); //listen to port 8080

function handler (req, res) { //create server
  fs.readFile(__dirname + '/public/index.html', function(err, data) { //read file index.html in public folder
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'}); //write HTML
    res.write(data); //write data from index.html
    return res.end();
  });
}

io.sockets.on('connection', function (socket) {	// WebSocket Connection
  socket.join("game1");
  console.log("New socket connection: " + socket.id);
  
  socket.on('next', function(data) { //get next card
	var player = players.find(compareSocketId, socket.id);
	if (player){
		var nextCardValue = nextCard(player);
		socket.emit("newCard", JSON.stringify(nextCardValue));
		socket.to("game1").emit("clearOpponentCard", 1);
		console.log(player.id + ":" +nextCardValue.name); // show it in console.log
	}
	else{
		console.log("Error: No known player on socket " + socket.id);
	}
  });
  
  socket.on('playerChange', function(data) { //get next card
	var playerID = "player" + data;
	socket.join(playerID);
	var player = players.find(compareId, playerID);
	player.socket = socket;
    console.log("Socket: " + socket.id + " is now " + playerID); // show it in console.log
  });
  
  socket.on('show', function(data) { // Show card to other player
    console.log("Show: " + data); // show it in console.log
	var card = cardArray.find(compareName, data);
	if(card){
		socket.to("game1").emit("newOpponentCard", JSON.stringify(card));
	}
	else{
		console.log("Error: Unable to find card with name " + data);
	}
  });
  
  socket.on('pass', function(data) { //Pass card to other player
	var card = cardArray.find(compareName, data.card);
	if(card){
		card.player = data.player;
		console.log("Pass: " + JSON.stringify(data)); // show it in console.log
	}
	else{
		console.log("Error unable to find card with name " + data.card);
	}
  });
  
  socket.on('declare', function(data) { //Pass card to other player
  	socket.to("game1").emit("opponentDeclaration", data);
	console.log("Declaration: " + JSON.stringify(data));
  });
});
