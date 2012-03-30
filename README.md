#### JS Extensible Dice InitiativE (jeDIE) ####
Version 3.2
A string parser that extracts and replaces dice rolls in text
by Jay Crossler, Open Source CC-BY license


### Usage ###
    <script type="text/javascript" src="diceRoller.js"></script>
    <script type="text/javascript">
        var revisedText = TextParsers.replaceDiceRolls("I Roll [5W] or [3d6+10]",'fullhtml');
        alert(revisedText);
    </script>

### Advanced Usage ###
#### jQuery Plugin to style dice results ####
If you are storing results in a database and want to later access each individual roll and data (and potentially switch between display modes), you can use 'xml' as the data type. There is also a jquery plugin that changes the xml on screen to a stylized display that you can rotate through when clicking on them.
    <script type="text/javascript" src="jquery-1.6.2.min.js"></script>
    <script type="text/javascript" src="jquery.parseDice.js"></script>
If you use XML mode, then the diceParser can add styling and let you click through options. After calculating the dice data in xml mode, use:
    <script type="text/javascript">
       $("#resulttext dice").parseDice();
    </script>

#### NodeJS Plugin to have dice rolled on the server ####
diceRoller implenets a nodeJS interface to have rolls occur on the server. Sample (simplified) usage with now.js is:

    <script type="text/javascript">
        var blipText = input; // pull this from data typed by a client
        var revisedText = textParser.parseBlip(blipText);
        if (blipText != revisedText) {
            everyone.now.receiveMessage(nowUserName, '{"event" : "diceRoll"}');
        }
    </script>


## Options ##
    <script type="text/javascript">
var result1 = TextParsers.replaceDiceRolls("1d20+7",'longhtml');// html, longer text showing each die result, mouseover for more details
var result2 = TextParsers.replaceDiceRolls("1d20+7",'fullhtml');// html, all dice rolls listed in page
var result3 = TextParsers.replaceDiceRolls("1d20+7",'shorthtml');// html, short concatenation of all die rolls
var result4 = TextParsers.replaceDiceRolls("1d20+7",'longtext');// text, showing ech die result in shorthand
var result5 = TextParsers.replaceDiceRolls("1d20+7",'shorttext');// text, showing result
var result6 = TextParsers.replaceDiceRolls("1d20+7",'result');// number, resulting total or total number of successes
var result7 = TextParsers.replaceDiceRolls("1d20+7",'array');// object with arrays of dice results and data
var result8 = TextParsers.replaceDiceRolls("1d20+7",'json');// json version of 'array' call
var result9 = TextParsers.replaceDiceRolls("1d20+7",'xml');// XML of all results in standardized format
    </script>
You can also use the shortcut "roll" instead of "replaceDiceRolls", or "d" for DND-type dice, or "w" for NWOD-type dice:
    <script type="text/javascript">
var result = TextParsers.roll("I roll [3w]")
var resxml = TextParsers.roll("I roll [5wr!]","xml")
var resjson = TextParsers.roll("[5w]","json")
var result = TextParsers.roll("[10d4+3d2+5]!","result")
var result = TextParsers.die("20")
var result = TextParsers.d("2d20")
var result = TextParsers.d("3d10+4")
var result = TextParsers.w("5w")

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
