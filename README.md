#### JS Extensible Dice InitiativE (jeDIE) ####
Version 3.4
A string parser that extracts and replaces dice rolls in text
by Jay Crossler, Open Source CC-BY license


### Usage ###
    <script type="text/javascript" src="src/diceRoller.js"></script>
    <script type="text/javascript">
        var revisedText = TextParsers.replaceDiceRolls("I Roll [5W] or [3d6+10]",'fullhtml');
        alert(revisedText);
    </script>

### Advanced Usage ###
#### jQuery Plugin to style dice results ####
If you are storing results in a database and want to later access each individual roll and data (and potentially switch between display modes), you can use 'xml' as the data type. There is also a jquery plugin that changes the xml on screen to a stylized display that you can rotate through when clicking on them.

    <script type="text/javascript" src="src/libs/jquery-1.7.2.min.js"></script>
    <script type="text/javascript" src="src/jquery.parseDice.js"></script>

If you use XML mode, then the diceParser can add styling and let you click through options. After calculating the dice data in xml mode, use:

    <script type="text/javascript">
       $("#resulttext dice").parseDice();
    </script>

#### NodeJS Plugin to have dice rolled on the server ####
diceRoller implements a nodeJS interface to have rolls occur on the server. Sample (simplified) usage with now.js is:

    <script type="text/javascript">
        var blipText = input; // pull this from data typed by a client
        var revisedText = textParser.parseBlip(blipText);
        if (blipText != revisedText) {
            everyone.now.receiveMessage(nowUserName, '{"event" : "diceRoll"}');
        }
    </script>


## Options ##
You can use javascript to receive dice output in a variety of formats. The result is an object that has a .text (easily readable parsed result) and a .rolls[] (array with every roll made within the text):

    <script type="text/javascript">
        var result1 = TextParsers.replaceDiceRolls("1d20+7",'longhtml').text;// html, longer text showing each die result, mouseover for more details
        var result2 = TextParsers.replaceDiceRolls("1d20+7",'fullhtml').text;// html, all dice rolls listed in page
        var result3 = TextParsers.replaceDiceRolls("1d20+7",'shorthtml').text;// html, short concatenation of all die rolls
        var result4 = TextParsers.replaceDiceRolls("1d20+7",'longtext').text;// text, showing ech die result in shorthand
        var result5 = TextParsers.replaceDiceRolls("1d20+7",'shorttext').text;// text, showing result
        var result6 = TextParsers.replaceDiceRolls("1d20+7",'result').text;// number, resulting total or total number of successes
        var result7 = TextParsers.replaceDiceRolls("1d20+7",'json').text;// json version of 'array' call
        var result8 = TextParsers.replaceDiceRolls("1d20+7",'xml').text;// XML of all results in standardized format
        var result9 = TextParsers.roll("I roll [Note:3w]").text //Embed notes in the rolls
        var result10 = TextParsers.roll("I roll [Character.Strength:3w]").text //Notes can have two levels, separated by a .
        var result11 = TextParsers.roll("Go to [http://www.com]").text // Embed links in as well
        var resultArray = TextParsers.replaceDiceRolls("1d20+7",'array');// object with arrays of dice results and data
    </script>

You can also use the shortcut "roll" instead of "replaceDiceRolls", or "d" for DND-type dice, or "w" for NWOD-type dice:

    <script type="text/javascript">
        var result = TextParsers.roll("I roll [3w] and [2d8]") //Returns arrays of both results
        var resxml = TextParsers.roll("I roll [5wr!]","xml").text
        var resjson = TextParsers.roll("[5w]","json").text
        var result = TextParsers.roll("[10d4+3d2+5]!","result").text
        var result = TextParsers.die("20").text
        var result = TextParsers.d("2d20").text
        var result = TextParsers.d("3d10+4").text
        var result = TextParsers.w("5w").text
    </script>


### Utilities ###

* rollTester.html gives a testing page that makes it easier to validate and test content
* diceMatrix.html gives a matrix of many die rolls

### Styling ###

    <style>
        .rollresponse {background-color: #caf;}
        .dieinput {font-style: italic; font-size: small;}
        .dieresult {font-weight: bold; border:1px solid blue;}
        .diesuccess {background-color: #4D4;}
        .diefailure {background-color: #d88}
    </style>
