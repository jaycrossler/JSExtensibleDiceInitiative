// JS Extensible Dice InitiativE (jeDIE) v3.2
// This file contains extensions to a "TextParsers" class to parse and swap text with Dice rolls
//
// Summary: A string parser that extracts and replaces dice rolls in text, allows both D&D-type (D) dice rolls and World Of Darkness (NWOD)-type rolls
//
// Currently supports calls such as:
// var result = TextParsers.replaceDiceRolls("I roll [3d6]")
// var result = TextParsers.roll("I roll [3w]")
// var resxml = TextParsers.roll("I roll [5wr!]","xml")
// var resjson = TextParsers.roll("[5w]","json")
// var result = TextParsers.roll("[10d4+3d2+5]!","result")
// var result = TextParsers.die("20")
// var result = TextParsers.d("2d20")
// var result = TextParsers.d("3d10+4")
// var result = TextParsers.w("5w")

//
// by Jay Crossler, Open Source CC-BY license - feel free to use/reuse/derive/make $, just give me credit!

//Next steps:
//TODO: Return an object that has each roll in it and user who made it
//TODO: Integrate with the DiceBoard HTML5 Canvas grapher project
// On the horizon:
//TODO: Either show images of dice as results, or generate them on the fly using canvas or three.js
//TODO: Have a different random number generator, potentially with a deterministic seed: http://davidbau.com/archives/2010/01/30/random_seeds_coded_hints_and_quintillions.html

// Exporter function for including within NodeJS for server-based rolls.
// Remove these three lines if you are having trouble with an existing exports class
if (typeof exports != "undefined") exports.parseBlip = function (text, format) {
    return TextParsers.replaceDiceRolls(text, format || 'xml');
};

//The TextParsers Library for parsing through dice roll text
if (typeof TextParsers == "undefined") TextParsers = {}; // Create the class if it doesn't already exist

TextParsers.defaultDiceFormatReturned = 'shorthtml';
TextParsers.replaceDiceRolls = TextParsers.roll =  function(text, formatType) {
    //Note, when building REs, suggest using: http://regexpal.com/ (and take out the starting and ending / when pasting into page)
    var parsingExpressions = [
        {
//                exp: /(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+|\[\s*(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+\s*\]/ ,
            exp: /\[\s*(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+\s*\]/ ,
            func: this.buildResponseStringFromStandardDiceRolls,
            parserName: "Dice Roller",
            sampleUsage: "[1d8] or [2d10] or [3d5+7] or [2d10+4+1d4 - 1d10]"
        },
        {
            exp: /\[\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE\?]*|[!])*\s*)+\]|\/roll[\s:=]*\[{0,1}\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE\?]*|[!])*\s*)+\]{0,1}/ ,
            func: this.buildResponseStringFromNWODRolls,
            parserName: "NWOD Success Calculator",
            sampleUsage: "[1w] or [2W!] (reroll 9s not just 10s) or [5wRote] (1st aren't a failure) or /roll 2w or /roll: [ 2w + 4w!]"
        },
        {
            exp: /^(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+/ ,
            func: this.buildResponseStringFromStandardDiceRolls,
            runOnce: true,
            parserName: "Dice Roller",
            sampleUsage: "1d8 or 2d10 or 3d5+7 or 2d10+4+1d4 - 1d10"
        },
        {
            exp: /^(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE\?]*|[!])*)+/ ,
            func: this.buildResponseStringFromNWODRolls,
            runOnce: true,
            parserName: "NWOD Success Calculator",
            sampleUsage: "1w or 2W! or 5wRote"
        }

    ];

    var numEmptyMatches = 0;
    var loopCount = 0;
    var breakAfterFound = false;
    var parsedtext = "";
    var remainingtext = text;

    while ((numEmptyMatches < parsingExpressions.length) && (loopCount < 20)) {
        loopCount++;
        numEmptyMatches = 0;
        for (var i = 0; i < parsingExpressions.length; i++) {
            var re = parsingExpressions[i];

            var item_matched = remainingtext.match(re.exp);

            if (item_matched && item_matched.length > 0) {
                var dicetext = item_matched[0];
                var loc = remainingtext.indexOf(dicetext);
                var result_roll = TextParsers.rollTheDice(re.func, dicetext, formatType || this.defaultDiceFormatReturned);
                parsedtext += remainingtext.substr(0,loc) + result_roll;
                remainingtext = remainingtext.substr(loc + dicetext.length);
                if (re.runOnce) {
                    breakAfterFound = true;
                    break;
                }
            } else {
                numEmptyMatches++;
            }
        }
        if (breakAfterFound) break; //The RegEx should only be run once, so exit
    }
    return parsedtext + remainingtext;
};

//==String building functions==========================================================
TextParsers.buildStringFromXML = function(diceArray, type, formatType) {
    if (type) switch (type.toLowerCase() || 'd') {
        case 'nwod':
            return TextParsers.buildResponseStringFromNWODRolls('', formatType, diceArray);
            break;
        case 'd':
            return TextParsers.buildResponseStringFromStandardDiceRolls('', formatType, diceArray);
            break;
    }
    return JSON.stringify(diceArray);
};
TextParsers.buildResponseStringFromNWODRolls = TextParsers.w = function(input, formatType, useArrayInstead) {
    var response = useArrayInstead || TextParsers.buildArrayFromNWODDiceRolls(input);
    //Rules:
    //Ones don't cancel. Otherwise: if (rolls[j]==1) successes--;
    //Gain extra roll with a 10, or 9 with !, or 8 with !! (can result in multiple extra rolls)
    //If have rote power, reroll first failure

    var successes = "";
    var output = "";
    var resultText = "";

    switch (formatType) {
        case 'array':
            output = response;
            break;
        case 'json':
            output = JSON.stringify(response);
            break;
        case 'xml':
            var strX = "";
            successes = 0;
            var diceText = "";
            for (var j = 0; j < response.rolls.length; j++) {
                var roll = response.rolls[j];
                var successat = response.rollsuccess[j];
                var history = response.rollhistorymin[j];
                var againat = response.rollagains[j];
                var ifsuccess = false;
                if (roll >= successat) {
                    successes++;
                    ifsuccess = true;
                }
                strX += "<roll value='" + roll + "' succeeds='" + ifsuccess + "' detail='" + history + "' againat='" + againat + "'></roll>";
                diceText += roll + "/" + successat + ":" + history.charAt(0);
            }
            diceText = '<text>' + successes + " " + TextParsers.pluralizeSuccess(successes) + ": " + diceText + "</text>";
            output = "<dice type='nwod' text='" + response.input + "' successes='" + successes + "' die='10'>";
            output += diceText + strX + "</dice>";
            break;
        case 'fullhtml':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += "<span class='dieresult" + (response.rolls[j] >= response.rollsuccess[j] ? " diesuccess" : " diefailure") + "'>";
                resultText += "die " + (j + 1) + ": " + response.rolls[j] + "(" + response.rollsuccess[j] + " succeeds, " + response.rollagains[j] + " rolls again) " + response.rollhistory[j] + "</span><br/>";
            }
            output = "<span class='rollresponse'>{<span class='dieinput'>" + response.input + ":</span> <span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") + "'>";
            output += successes + " " + TextParsers.pluralizeSuccess(successes) + "</span>}</span><br/><div class='dieinput'>" + resultText + "</div>";
            break;
        case 'longhtml':
            var titletext = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                titletext += "die " + (j + 1) + ": " + response.rolls[j] + "(" + response.rollsuccess[j] + " succeeds, " + response.rollagains[j] + " rolls again) " + response.rollhistory[j] + "\n";
            }

            resultText = "";
            for (j = 0; j < response.rolls.length; j++) {
                resultText += " " + response.rolls[j] + ":" + response.rollsuccess[j] + response.rollhistory[j].charAt(0) + ",";
            }
            output = "<span class='rollresponse' title='" + titletext.substr(0, titletext.length - 1) + "'>{<span class='dieinput'>" + response.input + ":" + resultText + "</span>";
            output += "<span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") + "'>";
            output += successes + " " + TextParsers.pluralizeSuccess(successes) + "</span>}</span>";
            break;
        case 'shorthtml':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += "die " + (j + 1) + ": " + response.rolls[j] + "(" + response.rollsuccess[j] + " succeeds, " + response.rollagains[j] + " rolls again) " + response.rollhistory[j] + "\n";
            }
            output = "<span class='rollresponse' title='" + resultText.substr(0, resultText.length - 1) + "'>{<span class='dieinput'>" + response.input + ":</span>";
            output += "<span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") + "'>";
            output += successes + " " + TextParsers.pluralizeSuccess(successes) + "</span>}</span>";
            break;
        case 'longtext':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += " " + response.rolls[j] + ":" + response.rollsuccess[j] + response.rollhistory[j].charAt(0) + ",";
            }
            output = successes + " {" + response.input + "=" + resultText.substr(0, resultText.length - 1) + "} ";
            break;
        case 'shorttext':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += " " + response.rolls[j] + ":" + response.rollsuccess[j] + response.rollhistory[j].charAt(0) + ",";
            }
            output = " {" + response.input + ": " + successes + "}";
            break;
        case 'result':
        default:
            successes = 0;
            for (j = 0; j < response.rolls.length; j++)
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
            output = successes;
            break;
    }
    //If no format option matched, return the entered text
    return output;
};

TextParsers.buildResponseStringFromStandardDiceRolls = TextParsers.d = function(input, formatType, useArrayInstead) {
    var response = useArrayInstead || TextParsers.buildArrayFromStandardDiceRolls(input);

    var total = 0;
    var output = input;
    var result = 0;
    var dicety = 0;
    var resultText = "";
    var rollnum = 0;

    switch (formatType) {
        case 'array':
            return response;
            break;
        case 'json':
            return JSON.stringify(response);
            break;
        case 'xml':
            total = 0;
            output = [];
            var diceText = "";
            var strX = "";
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];
                total += result;
                if (dicety == 0) {
                    strX += "<mod value='" + ((result > 0) ? "+" : "") + result + "'></mod>";
                    output.push (((result > 0) ? " + " : "") + result);
                } else {
                    strX += "<roll value='" + result + "' die='" + dicety + "'></roll>";
                    output.push ( result + "/" + dicety);
                }
            }
            diceText = '<text>{' + total + ": " + output.join(",") + '}</text>';
            output = "<dice type='d' text='" + response.input + "' total='" + total + "'>" + diceText + strX + "</dice>";
            break;
        case 'fullhtml':
        case 'longhtml':
            total = 0;
            output = [];
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];
                total += parseInt(result);

                if (dicety == 0) {
                    output.push(((result > 0) ? "+" : "") + result);
                } else {
                    output.push(result + "/" + dicety);
                }
            }
            resultText = "<span class='rollresponse'>{<span class='dieinput'>" + response.input;
            resultText += ":</span> <span class='dieresult diesuccess'>" + total + "</span>:" + output.join(",") + "}</span>";
            output = resultText;
            break;
        case 'shorthtml':
            total = 0;
            output = [];
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];
                total += parseInt(result);

                if (dicety == 0) {
                    output.push(((result > 0) ? "+" : "") + result);
                } else {
                    output.push(result + "/" + dicety);
                }
            }
            resultText = "<span class='rollresponse' title='" + output.join(", ") + "'>{<span class='dieinput'>" + response.input;
            resultText += ":</span> <span class='dieresult diesuccess'>" + total + "</span>}</span>";
            output = resultText;
            break;
        case 'longtext':
        case 'shorttext':
            resultText = "";
            total = 0;
            output = [];
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];

                if (dicety == 0) {
                    output.push(((result > 0) ? "+" : "") + result);
                } else {
                    output.push(result + "/" + dicety);
                }
                total += result;
            }
            output = total + " [" + output.join(", ") + "]";
            break;
        case 'result':
        default:
            total = 0;
            for (rollnum = 0; rollnum < response.res.length; rollnum++)
                total += response.res[rollnum];
            output = total;
            break;
    }
    //If no format option matched, return the entered text
    return output;
};

//==Rolling and Parsing functions==========================================================
TextParsers.buildArrayFromNWODDiceRolls = function(input) {
    //parse the text, roll dice, and output an array

    if (!input || (input.length < 2)) return input;
    input = input.replace(/W/, 'w');
    input = input.replace(/- */, '+ -');
    input = input.replace(/\/roll[:= ]*/, '');
    input = input.replace(/R/, 'r');
    input = input.replace(/ote/, '');

    var first = input.charAt(0);
    var last = input.charAt(input.length - 1);
    if (((first == "[") && (last == "]")) || ((first == "(") && (last == ")"))) {
        input = input.substr(1, input.length - 2).trim();
    }
    var re = / *\+ */;
    var items = input.split(re);
    var rolls = [];
    var rollhistory = [];
    var rollhistorymin = [];
    var rollsuccess = [];
    var rollagains = [];
    for (var i = 0; i < items.length; i++) {
        var die = items[i];
        var wpos = die.indexOf("w");
        if (wpos < 1) break;

        var numrolls = parseInt(die.substr(0, wpos) || 1);
        var options = die.substr(wpos + 1) || "";
        var isrote = options.indexOf("r") > -1;
        var successat = 8;
        if (options && (options.length > 0) && (parseInt(options) > 0)) {
            successat = parseInt(options) || successat;
        }
        var numagains = options.replace(/[^!]/g, '').length;
        var rollagain = 10 - numagains;

        var extrarolls = 0; //Rerolls from rote failures
        var rollhistmin;
        for (var j = 0; j < numrolls; j++) {
            roll = TextParsers.die(10);
            rollid = j;
            rollhist = "";
            rollhistmin = "";

            if (isrote && (roll < successat)) {
                //Rote power, reroll failure once
                rollhist = "Rote: Failure, but reroll once";
                rollhistmin = "Rote Reroll";
                extrarolls++;
            } else if (roll >= rollagain) {
                //Power gives extra roll
                rollhist = "Again: Extra roll from " + TextParsers.repeatString("!", numagains) + ", " + (roll < successat) ? "Success" : "Failure";
                rollhistmin = "Bonus Roll";
                numrolls++;
            } else if (roll < successat) {
                rollhist = "Normal Roll: Fail";
                rollhistmin = "Fail";
            } else {
                rollhist = "Normal Roll: Success";
                rollhistmin = "Success";
            }

            rolls[rollid] = roll;
            rollsuccess[rollid] = successat;
            rollhistory[rollid] = rollhist;
            rollagains[rollid] = rollagain;
            rollhistorymin[rollid] = rollhistmin;
        }
        for (j = 0; j < extrarolls; j++) {
            var roll = TextParsers.die(10);
            var rollhist = "Extra Roll";
            var rollid = numrolls + j;
            if (roll >= rollagain) {
                //Power gives extra roll
                rollhist = "Again: Extra roll from " + TextParsers.repeatString("!", numagains) + ", " + (roll < successat) ? "Success" : "Failure";
                rollhistmin = "Bonus Roll";
                extrarolls++;
            } else if (roll < successat) {
                rollhist = "Extra Roll: Fail";
                rollhistmin = "Fail";
            } else {
                rollhist = "Extra Roll: Success";
                rollhistmin = "Success";
            }
            rolls[rollid] = roll;
            rollsuccess[rollid] = successat;
            rollhistory[rollid] = rollhist;
            rollagains[rollid] = "X";
            rollhistorymin[rollid] = rollhistmin;
        }

    }
    return {rolls:rolls, rollhistory:rollhistory, rollhistorymin:rollhistorymin, rollsuccess:rollsuccess, rollagains:rollagains, input:input};
};

TextParsers.buildArrayFromStandardDiceRolls = function(input) {
    //Derived from diceroller Github Opensource project
    //Rolls dice pared from normal [3d6] pattern, returns array of results
    if (!input || (input.length < 2)) return input;
    var first = input.charAt(0);
    var last = input.charAt(input.length - 1);
    if (((first == "[") && (last == "]")) || ((first == "(") && (last == ")"))) {
        input = input.substr(1, input.length - 2).trim();
    }

    var dice = input.replace(/- */, '+ -');
    dice = dice.replace(/D/, 'd');
    dice = dice.replace(/S/, 's');
    dice = dice.replace(/^\s*|\s*$/g, '');
    var re = / *\+ */;
    var items = dice.split(re);
    var res = new Array();
    var type = new Array();
    for (var i = 0; i < items.length; i++) {
        var match = items[i].match(/^[ \t]*(-)?(\d+)?(?:(d)(\d+))?[ \t]*$/);
        if (match) {
            var sign = match[1] ? -1 : 1;
            var num = parseInt(match[2] || "1");
            var max = parseInt(match[4] || "0");
            if (match[3]) {
                for (var j = 1; j <= num; j++) {
                    res[res.length] = sign * TextParsers.die(max);
                    type[type.length] = max;
                }
            } else {
                res[res.length] = sign * num;
                type[type.length] = 0;
            }
        }
        else return {"res":[], "type":[]};
    }
    if (res.length == 0) return {res:[], type:[], input:""};
    return {res:res, type:type, input:input};
};
TextParsers.rollTheDice = function(diceType, input, formatType) {
    //Reflexive function applier
    return diceType(input, formatType);
};
TextParsers.die = function(sides) {
    //Rolls an "n-sided die"
    return Math.ceil(sides * Math.random());
};
TextParsers.pluralizeSuccess = function(num) {
    return (num > 1) ? "successes" : (num == 1) ? "success" : "failure";
};
TextParsers.repeatString = function(str, times) {
    var returnstr = "";
    for (var i = 0; i < times; i++) returnstr += str;
    return returnstr;
};
